import { describe, test, expect, vi } from "vitest";
import { CompositeStore, BAG_IDS, ENGINE_CORE_ID, wikiSlotUri } from "@lararium/mesh";
import type { DocHandle, LarDoc } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { startEngineWatch, ENGINE_WAITING_ALERT_TITLE } from "../src/engine-watch.js";
import type { IslandContext } from "../src/island-context.js";

const BOOTED = { sha256: "aaa111", version: "5.3.6" };

/** A minimal fake @oracle DocHandle: mutable doc + manual change firing.
 *  (The engine BLOBs live in @oracle since the 2026-06-16 carve.) */
function fakeLarariumHandle(initial: { sha256: string; version: string }) {
  let core = { ...initial };
  const listeners = new Set<() => void>();
  const handle = {
    doc: () => ({ blobs: { [ENGINE_CORE_ID]: { ...core } } }),
    on: (_ev: string, fn: () => void) => { listeners.add(fn); },
    off: (_ev: string, fn: () => void) => { listeners.delete(fn); },
  } as unknown as DocHandle<LarDoc>;
  const setCore = (next: { sha256: string; version: string }) => {
    core = { ...next };
    for (const fn of [...listeners]) fn();
  };
  return { handle, setCore, listenerCount: () => listeners.size };
}

const TEMP_BAG = wikiSlotUri("test-wiki", "temp");

function makeCtx(handle?: DocHandle<LarDoc>) {
  const composite = new CompositeStore();
  composite.addLayer({ bagId: TEMP_BAG, store: new MemoryTiddlerStore(TEMP_BAG), writable: true });
  const handles = new Map<string, DocHandle<LarDoc>>();
  if (handle) handles.set(BAG_IDS.oracle, handle);
  return {
    composite,
    ctx: { composite, handles, engine: { ...BOOTED }, recipe: { wikiSlug: "test-wiki" } } as unknown as IslandContext,
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("engine-watch", () => {
  test("no @oracle slot → no watch, no alert", async () => {
    const { composite, ctx } = makeCtx();
    expect(startEngineWatch(ctx)).toBeUndefined();
    await settle();
    expect(await composite.get(ENGINE_WAITING_ALERT_TITLE)).toBeNull();
  });

  test("booted engine matches the doc → quiet, even across change events", async () => {
    const { handle, setCore } = fakeLarariumHandle(BOOTED);
    const { composite, ctx } = makeCtx(handle);
    const stop = startEngineWatch(ctx);
    setCore(BOOTED);
    await settle();
    expect(await composite.get(ENGINE_WAITING_ALERT_TITLE)).toBeNull();
    stop?.();
  });

  test("newer core arriving writes the engine-waiting alert", async () => {
    const { handle, setCore } = fakeLarariumHandle(BOOTED);
    const { composite, ctx } = makeCtx(handle);
    const stop = startEngineWatch(ctx);
    setCore({ sha256: "bbb222", version: "5.4.0" });
    await settle();
    const alert = await composite.get(ENGINE_WAITING_ALERT_TITLE);
    expect(alert).not.toBeNull();
    expect(alert?.tiddler["tags"]).toBe("$:/tags/Alert");
    expect(alert?.tiddler["alert-kind"]).toBe("engine-waiting");
    expect(alert?.tiddler["waiting-sha256"]).toBe("bbb222");
    expect(alert?.tiddler["waiting-version"]).toBe("5.4.0");
    expect(alert?.tiddler["booted-sha256"]).toBe(BOOTED.sha256);
    expect(String(alert?.tiddler["text"])).toContain("waiting");
    stop?.();
  });

  test("a LOWER incoming version names the rollback in the alert body", async () => {
    const { handle, setCore } = fakeLarariumHandle(BOOTED);
    const { composite, ctx } = makeCtx(handle);
    const stop = startEngineWatch(ctx);
    setCore({ sha256: "ccc333", version: "5.2.0" });
    await settle();
    const alert = await composite.get(ENGINE_WAITING_ALERT_TITLE);
    expect(String(alert?.tiddler["text"])).toContain("BACKWARD");
    stop?.();
  });

  test("an EMPTY booted-version DEFEATS rollback naming — why the kernel must source a real version", async () => {
    // Pins HOLE 2: sovereign-kernel once hardcoded `coreVersion = ""`, so ctx.engine.version
    // arrived blank. compareVersions(incoming, "") sorts EVERY incoming as newer, so a LOWER
    // incoming version silently reads as an upgrade instead of a rollback. The kernel now sources
    // the booted version from the oracle doc's blobs[ENGINE_CORE_ID].version; this guards the
    // consumer's dependency on that being populated.
    const { handle, setCore } = fakeLarariumHandle({ sha256: "aaa111", version: "" });
    const { composite, ctx } = makeCtx(handle);
    (ctx as unknown as { engine: { sha256: string; version: string } }).engine = { sha256: "aaa111", version: "" };
    const stop = startEngineWatch(ctx);
    setCore({ sha256: "ccc333", version: "5.2.0" });
    await settle();
    const alert = await composite.get(ENGINE_WAITING_ALERT_TITLE);
    // With a blank booted-version the rollback is NOT named — the hole this fix closes upstream.
    expect(String(alert?.tiddler["text"])).not.toContain("BACKWARD");
    stop?.();
  });

  test("repeated change events for the same epoch coalesce to one put", async () => {
    const { handle, setCore } = fakeLarariumHandle(BOOTED);
    const { composite, ctx } = makeCtx(handle);
    const putSpy = vi.spyOn(composite, "put");
    const stop = startEngineWatch(ctx);
    setCore({ sha256: "bbb222", version: "5.4.0" });
    setCore({ sha256: "bbb222", version: "5.4.0" });
    setCore({ sha256: "bbb222", version: "5.4.0" });
    await settle();
    expect(putSpy).toHaveBeenCalledTimes(1);
    stop?.();
  });

  test("a doc already carrying a waiting epoch at ea alerts immediately", async () => {
    const { handle } = fakeLarariumHandle({ sha256: "ddd444", version: "5.4.1" });
    const { composite, ctx } = makeCtx(handle);
    const stop = startEngineWatch(ctx);
    await settle();
    expect(await composite.get(ENGINE_WAITING_ALERT_TITLE)).not.toBeNull();
    stop?.();
  });

  test("cleanup unsubscribes — post-stop changes stay silent", async () => {
    const { handle, setCore, listenerCount } = fakeLarariumHandle(BOOTED);
    const { composite, ctx } = makeCtx(handle);
    const stop = startEngineWatch(ctx);
    expect(listenerCount()).toBe(1);
    stop?.();
    expect(listenerCount()).toBe(0);
    setCore({ sha256: "eee555", version: "6.0.0" });
    await settle();
    expect(await composite.get(ENGINE_WAITING_ALERT_TITLE)).toBeNull();
  });
});
