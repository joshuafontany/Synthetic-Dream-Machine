import { type LarBlobEntry, type LarTiddlerStore, type MemeRecipeVm, type VmPool, CompositeStore } from "@lararium/mesh";
import {
  ActiveWikiLayerSlot,
  type ActiveWikiSlotPlan,
} from "./active-wiki.js";
import { openVmIslandBridge, type VmIslandBridge } from "./vm-island-bridge.js";
import { openVmSession, type VmSessionFactoryOptions, type VmSessionResult } from "./vm-session.js";
import type { TW5CoreBootBlob, TW5Engine } from "./tw5-vm.js";

export interface MountedWikiFlushDriver {
  start(flush: () => void): () => void;
}

export interface MountedWikiMountOptions {
  readonly plan: ActiveWikiSlotPlan;
  readonly wikiStore: LarTiddlerStore;
  readonly draftStore: LarTiddlerStore;
  readonly recipeUri: string;
  readonly coreBlob: TW5CoreBootBlob;
  readonly blobs?: Record<string, LarBlobEntry>;
  readonly bootstrapPlugin?: Record<string, unknown> | null;
  readonly vmFactory?: VmSessionFactoryOptions["vmFactory"];
  readonly driver: MountedWikiFlushDriver;
  readonly bridgeStore?: LarTiddlerStore;
  readonly flushBatchSize?: number;
}

export interface MountedWikiSession {
  readonly plan: ActiveWikiSlotPlan;
  readonly engine: TW5Engine;
  readonly pool: VmPool<MemeRecipeVm>;
  readonly bridge: VmIslandBridge;
  readonly bagStack: readonly string[];
  readonly preloadedTiddlers: Array<Record<string, unknown>>;
}

interface MountedWikiControllerState {
  readonly session: MountedWikiSession;
  readonly stopDriver: () => void;
}

export interface MountedWikiControllerDeps {
  readonly openSession?: (opts: VmSessionFactoryOptions) => Promise<VmSessionResult>;
  readonly openBridge?: typeof openVmIslandBridge;
}

export class MountedWikiController {
  private readonly layerSlot: ActiveWikiLayerSlot;
  private readonly openSession;
  private readonly openBridge;
  private state: MountedWikiControllerState | null = null;

  constructor(
    private readonly composite: CompositeStore,
    deps: MountedWikiControllerDeps = {},
  ) {
    this.layerSlot = new ActiveWikiLayerSlot(composite);
    this.openSession = deps.openSession ?? openVmSession;
    this.openBridge = deps.openBridge ?? openVmIslandBridge;
  }

  get current(): MountedWikiSession | null {
    return this.state?.session ?? null;
  }

  async mount(opts: MountedWikiMountOptions): Promise<MountedWikiSession> {
    if (this.state) return this.swap(opts);

    this.layerSlot.mount({
      plan: opts.plan,
      wikiStore: opts.wikiStore,
      draftStore: opts.draftStore,
    });

    let vmSession: VmSessionResult | null = null;
    let bridge: VmIslandBridge | null = null;
    let stopDriver: (() => void) | null = null;

    try {
      const vmRecipe = await this.composite.getRecipe(opts.recipeUri);
      const bagStack = vmRecipe?.bagStack ?? this.composite.layerIds;
      vmSession = await this.openSession({
        recipeUri: opts.recipeUri,
        coreBlob: opts.coreBlob,
        bagStack,
        recipePlugins: vmRecipe?.plugins ?? [],
        ...(opts.blobs ? { blobs: opts.blobs } : {}),
        ...(opts.bootstrapPlugin !== undefined ? { bootstrapPlugin: opts.bootstrapPlugin } : {}),
        ...(opts.vmFactory ? { vmFactory: opts.vmFactory } : {}),
      });

      bridge = this.openBridge({
        engine: vmSession.engine,
        store: opts.bridgeStore ?? this.composite,
        instanceId: opts.plan.wikiSlug,
        targetBag: opts.plan.wikiBagId,
        accumulatorCount: bagStack.length,
      });

      const flushBatchSize = opts.flushBatchSize ?? 200;
      stopDriver = opts.driver.start(() => {
        bridge?.adaptor.flushAll(bridge.accumulators, flushBatchSize);
      });

      const session: MountedWikiSession = {
        plan: opts.plan,
        engine: vmSession.engine,
        pool: vmSession.pool,
        bridge,
        bagStack,
        preloadedTiddlers: vmSession.preloadedTiddlers,
      };
      this.state = { session, stopDriver };
      return session;
    } catch (error) {
      stopDriver?.();
      bridge?.stop();
      vmSession?.pool.releaseAll();
      vmSession?.engine.dispose();
      this.layerSlot.unmount();
      throw error;
    }
  }

  async swap(opts: MountedWikiMountOptions): Promise<MountedWikiSession> {
    this.stop();
    return this.mount(opts);
  }

  stop(): void {
    if (!this.state) return;
    this.state.stopDriver();
    this.state.session.bridge.stop();
    this.state.session.pool.releaseAll();
    this.state.session.engine.dispose();
    this.layerSlot.unmount();
    this.state = null;
  }
}