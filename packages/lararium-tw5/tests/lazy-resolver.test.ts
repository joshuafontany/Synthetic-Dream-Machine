/**
 * lazy-resolver — the READ side of the skinny handle rehydrates a body on lazyLoad.
 *
 * A skinny handle stands in the wiki with `_is_skinny`/`textCid` + NO `text`. TW5's
 * `getTiddlerText` fires `dispatchEvent("lazyLoad", title)` for exactly that shape. The
 * resolver answers: pull the body from the corpus CAS by content-address, re-verify
 * cid == sha256(bytes), and splice `text` in through the GUARDED nalu rail (so it never
 * echoes back to the CRDT). A CAS miss, an integrity fault, or a web2 `_canonical_uri`
 * leaves the handle bodyless — the body is never faked.
 */

import { describe, test, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { installLazyResolver, skinnyCid, type CarrierResolver } from "../src/lazy-resolver.js";
import { cidUri } from "@lararium/mesh";
import type { LarTiddlerChange } from "@lararium/mesh";

const cidOf = (s: string) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const bytesOf = (s: string) => new TextEncoder().encode(s);
const flush = () => new Promise<void>((r) => setImmediate(r));

/** A minimal wiki + $tw.lares stand-in — enough surface for the resolver, no TW5 boot. */
function makeFakeEngine() {
  const tiddlers = new Map<string, { fields: Record<string, unknown> }>();
  let lazyHandler: ((t: string) => void) | null = null;
  const enqueued: LarTiddlerChange[] = [];

  const wiki = {
    getTiddler: (t: string) => tiddlers.get(t),
    addEventListener: (name: string, fn: (t: string) => void) => { if (name === "lazyLoad") lazyHandler = fn; },
    removeEventListener: (name: string) => { if (name === "lazyLoad") lazyHandler = null; },
  };
  const lares = {
    enqueueNalu: (change: LarTiddlerChange) => {
      enqueued.push(change);
      // Model the guarded drain: the splice lands in the wiki, so a re-fire sees `text`.
      const rec = change.record;
      if (rec) tiddlers.set(change.title, { fields: { ...rec.tiddler } });
    },
  };
  const engine = { $tw: { wiki, lares } } as never;

  return {
    engine,
    tiddlers,
    enqueued,
    setTiddler: (fields: Record<string, unknown>) => tiddlers.set(fields["title"] as string, { fields }),
    fireLazyLoad: (t: string) => lazyHandler?.(t),
  };
}

describe("skinnyCid — source discrimination", () => {
  test("textCid wins as the direct CAS key", () => {
    expect(skinnyCid({ textCid: "abc123", _canonical_uri: cidUri("def456") })).toBe("abc123");
  });
  test("a lar cid _canonical_uri yields its hash", () => {
    expect(skinnyCid({ _canonical_uri: cidUri("deadbeef") })).toBe("deadbeef");
  });
  test("a web2 http(s) src yields null — native path owns it", () => {
    expect(skinnyCid({ _canonical_uri: "https://example.org/pic.png" })).toBeNull();
    expect(skinnyCid({ _canonical_uri: "data:image/png;base64,AAAA" })).toBeNull();
  });
  test("no body reference yields null", () => {
    expect(skinnyCid({ title: "x" })).toBeNull();
  });
});

describe("installLazyResolver — rehydrate on lazyLoad", () => {
  test("a skinny handle with textCid pulls + splices its body", async () => {
    const body = "the whole book body that left the CRDT for the cid tier";
    const cid = cidOf(body);
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/library/book", _is_skinny: "yes", textCid: cid, size: String(body.length) });

    const resolveByCid: CarrierResolver = vi.fn(async (c) => (c === cid ? bytesOf(body) : null));
    installLazyResolver(engine, resolveByCid);

    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/library/book");
    await flush();

    expect(resolveByCid).toHaveBeenCalledWith(cid);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.record?.tiddler.text).toBe(body);
    // the skinny fields survive the splice — the projector still reads the handle at rest (T3)
    expect(enqueued[0]!.record?.tiddler._is_skinny).toBe("yes");
    expect(enqueued[0]!.record?.tiddler.textCid).toBe(cid);
    // the splice never echoes to the CRDT — it rides the crdt-remote (non-tw-local) origin
    expect(enqueued[0]!.origin).toEqual({ kind: "crdt-remote", edgeIsland: "cas-rehydrate" });
  });

  test("a lar-cid _canonical_uri (no textCid) resolves too", async () => {
    const body = "media body under a canonical lar cid uri";
    const cid = cidOf(body);
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/media/clip", _is_skinny: "yes", _canonical_uri: cidUri(cid) });

    installLazyResolver(engine, async (c) => (c === cid ? bytesOf(body) : null));
    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/media/clip");
    await flush();

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.record?.tiddler.text).toBe(body);
  });

  test("a web2 _canonical_uri is left to the native path — never resolved", async () => {
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/media/web2", _is_skinny: "yes", _canonical_uri: "https://example.org/pic.png" });
    const resolveByCid: CarrierResolver = vi.fn(async () => bytesOf("x"));
    installLazyResolver(engine, resolveByCid);

    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/media/web2");
    await flush();

    expect(resolveByCid).not.toHaveBeenCalled();
    expect(enqueued).toHaveLength(0);
  });

  test("an integrity fault never splices unverified bytes", async () => {
    const cid = cidOf("the-claimed-body");
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/library/tampered", _is_skinny: "yes", textCid: cid });

    // resolver returns DIFFERENT bytes than the cid names → hash mismatch
    installLazyResolver(engine, async () => bytesOf("a-different-body"));
    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/library/tampered");
    await flush();

    expect(enqueued).toHaveLength(0);
  });

  test("a CAS miss holds PENDING, and a later re-fire re-tries", async () => {
    const body = "eventually-available body";
    const cid = cidOf(body);
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/library/pending", _is_skinny: "yes", textCid: cid });

    let present = false;
    installLazyResolver(engine, async (c) => (present && c === cid ? bytesOf(body) : null));

    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/library/pending");
    await flush();
    expect(enqueued).toHaveLength(0);   // PENDING — the body isn't in the CAS yet

    present = true;
    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/library/pending");
    await flush();
    expect(enqueued).toHaveLength(1);   // the re-fire resolves it
    expect(enqueued[0]!.record?.tiddler.text).toBe(body);
  });

  test("an already-hydrated tiddler never re-pulls", async () => {
    const { engine, enqueued, setTiddler, fireLazyLoad } = makeFakeEngine();
    setTiddler({ title: "lar:///ha.ka.ba/bags/crossroads/library/warm", _is_skinny: "yes", textCid: cidOf("b"), text: "already here" });
    const resolveByCid: CarrierResolver = vi.fn(async () => bytesOf("b"));
    installLazyResolver(engine, resolveByCid);

    fireLazyLoad("lar:///ha.ka.ba/bags/crossroads/library/warm");
    await flush();

    expect(resolveByCid).not.toHaveBeenCalled();
    expect(enqueued).toHaveLength(0);
  });
});
