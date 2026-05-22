import { IslandAccumulator, type LarTiddlerStore } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import { IslandAdaptor } from "./island-adaptor.js";

export interface VmIslandBridgeOptions {
  readonly engine: TW5Engine;
  readonly store: LarTiddlerStore;
  readonly instanceId: string;
  readonly targetBag: string;
  readonly accumulatorCount: number;
}

export interface VmIslandBridge {
  readonly adaptor: IslandAdaptor;
  readonly accumulators: IslandAccumulator[];
  stop(): void;
}

export function openVmIslandBridge(opts: VmIslandBridgeOptions): VmIslandBridge {
  const adaptor = new IslandAdaptor(opts.engine, opts.store, opts.instanceId, opts.targetBag);
  const accumulators = Array.from({ length: opts.accumulatorCount }, () => new IslandAccumulator());
  const stopAdaptor = adaptor.start();
  const stopAccumulators = accumulators.map((acc) => {
    if (typeof opts.store.addProjection === "function") return opts.store.addProjection(acc);
    return opts.store.subscribe((change) => acc.onUriChanged(change));
  });

  return {
    adaptor,
    accumulators,
    stop(): void {
      for (const stop of stopAccumulators) stop();
      stopAdaptor();
    },
  };
}