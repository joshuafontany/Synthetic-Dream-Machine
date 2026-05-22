import { describe, expect, test, vi } from "vitest";
import { CompositeStore, type MemeRecipeVm, VmPool } from "@lararium/mesh";
import { MemoryTiddlerStore } from "../src/memory-store.js";
import { MountedWikiController } from "../src/mounted-wiki-controller.js";
import { planActiveWikiSlot } from "../src/active-wiki.js";
import type { TW5CoreBootBlob, TW5Engine } from "../src/tw5-vm.js";
import type { VmIslandBridge, VmIslandBridgeOptions } from "../src/vm-island-bridge.js";
import type { VmSessionFactoryOptions, VmSessionResult } from "../src/vm-session.js";

const CORE_BLOB: TW5CoreBootBlob = {
  bytes: new Uint8Array(),
  source: "test-core",
};

async function flushDisposals(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function makeVm() {
  return {
    onUriChanged: vi.fn(),
    onSyncComplete: vi.fn(),
    filterTiddlers: vi.fn(async () => []),
    renderMeme: vi.fn(async () => null),
    dispose: vi.fn(),
  } satisfies MemeRecipeVm;
}

describe("mounted-wiki-controller", () => {
  test("mounts layers, derives bag stack, and drives bridge flush through the host driver", async () => {
    const composite = new CompositeStore();
    const sessionCalls: VmSessionFactoryOptions[] = [];
    const bridgeCalls: VmIslandBridgeOptions[] = [];
    const fakeVm = makeVm();
    const pool = new VmPool<MemeRecipeVm>();
    await pool.get("lar:///recipes/default", async () => fakeVm);

    const engineDispose = vi.fn();
    const engine = { dispose: engineDispose } as unknown as TW5Engine;
    const flushAll = vi.fn();
    const bridgeStop = vi.fn();
    let flush: (() => void) | null = null;
    const stopDriver = vi.fn();

    const controller = new MountedWikiController(composite, {
      async openSession(opts): Promise<VmSessionResult> {
        sessionCalls.push(opts);
        return {
          engine,
          pool,
          preloadedTiddlers: [{ title: "lar:///bootstrap/plugin" }],
        };
      },
      openBridge(opts): VmIslandBridge {
        bridgeCalls.push(opts);
        return {
          adaptor: { flushAll } as unknown as VmIslandBridge["adaptor"],
          accumulators: [{}, {}] as VmIslandBridge["accumulators"],
          stop: bridgeStop,
        };
      },
    });

    const plan = planActiveWikiSlot({
      hostId: "node-alpha",
      wikiSlug: "altar-fire",
      identityDid: "did:key:test",
    });

    const session = await controller.mount({
      plan,
      wikiStore: new MemoryTiddlerStore(plan.wikiBagId),
      draftStore: new MemoryTiddlerStore(plan.draftBagId),
      recipeUri: "lar:///recipes/default",
      coreBlob: CORE_BLOB,
      driver: {
        start(nextFlush): () => void {
          flush = nextFlush;
          return stopDriver;
        },
      },
    });

    expect(composite.layerIds).toEqual([plan.wikiBagId, plan.draftBagId]);
    expect(session.plan).toEqual(plan);
    expect(session.bagStack).toEqual([plan.wikiBagId, plan.draftBagId]);
    expect(session.preloadedTiddlers).toEqual([{ title: "lar:///bootstrap/plugin" }]);
    expect(sessionCalls[0]?.bagStack).toEqual([plan.wikiBagId, plan.draftBagId]);
    expect(bridgeCalls[0]?.targetBag).toBe(plan.wikiBagId);

    expect(flush).not.toBeNull();
    flush?.();
    expect(flushAll).toHaveBeenCalledWith(session.bridge.accumulators, 200);
  });

  test("swap and stop tear down the prior session before remounting", async () => {
    const composite = new CompositeStore();
    const stopDrivers: Array<ReturnType<typeof vi.fn>> = [];
    const bridgeStops: Array<ReturnType<typeof vi.fn>> = [];
    const engineDisposes: Array<ReturnType<typeof vi.fn>> = [];
    const vmDisposes: Array<ReturnType<typeof vi.fn>> = [];

    const controller = new MountedWikiController(composite, {
      async openSession(opts): Promise<VmSessionResult> {
        const vm = makeVm();
        vmDisposes.push(vm.dispose);
        const pool = new VmPool<MemeRecipeVm>();
        await pool.get(opts.recipeUri, async () => vm);

        const dispose = vi.fn();
        engineDisposes.push(dispose);
        return {
          engine: { dispose } as unknown as TW5Engine,
          pool,
          preloadedTiddlers: [],
        };
      },
      openBridge(): VmIslandBridge {
        const stop = vi.fn();
        bridgeStops.push(stop);
        return {
          adaptor: { flushAll: vi.fn() } as unknown as VmIslandBridge["adaptor"],
          accumulators: [] as VmIslandBridge["accumulators"],
          stop,
        };
      },
    });

    const first = planActiveWikiSlot({
      hostId: "node-alpha",
      wikiSlug: "altar-fire",
      identityDid: "did:key:first",
    });
    const second = planActiveWikiSlot({
      hostId: "node-alpha",
      wikiSlug: "ember-hall",
      identityDid: "did:key:second",
    });

    const driver = {
      start(): () => void {
        const stop = vi.fn();
        stopDrivers.push(stop);
        return stop;
      },
    };

    await controller.mount({
      plan: first,
      wikiStore: new MemoryTiddlerStore(first.wikiBagId),
      draftStore: new MemoryTiddlerStore(first.draftBagId),
      recipeUri: "lar:///recipes/default",
      coreBlob: CORE_BLOB,
      driver,
    });

    await controller.swap({
      plan: second,
      wikiStore: new MemoryTiddlerStore(second.wikiBagId),
      draftStore: new MemoryTiddlerStore(second.draftBagId),
      recipeUri: "lar:///recipes/default",
      coreBlob: CORE_BLOB,
      driver,
    });
    await flushDisposals();

    expect(stopDrivers[0]).toHaveBeenCalledTimes(1);
    expect(bridgeStops[0]).toHaveBeenCalledTimes(1);
    expect(engineDisposes[0]).toHaveBeenCalledTimes(1);
    expect(vmDisposes[0]).toHaveBeenCalledTimes(1);
    expect(composite.layerIds).toEqual([second.wikiBagId, second.draftBagId]);
    expect(controller.current?.plan).toEqual(second);

    controller.stop();
  await flushDisposals();

    expect(stopDrivers[1]).toHaveBeenCalledTimes(1);
    expect(bridgeStops[1]).toHaveBeenCalledTimes(1);
    expect(engineDisposes[1]).toHaveBeenCalledTimes(1);
    expect(vmDisposes[1]).toHaveBeenCalledTimes(1);
    expect(composite.layerIds).toEqual([]);
    expect(controller.current).toBeNull();
  });
});