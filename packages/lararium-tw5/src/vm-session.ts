import { type LarBlobEntry, VmPool, type MemeRecipeVm } from "@lararium/mesh";
import { DirectMemeRecipeVm } from "./meme-recipe-vm.js";
import type { TW5CoreBootBlob, TW5Engine } from "./tw5-vm.js";
import { TW5Engine as TW5EngineImpl } from "./tw5-vm.js";

export interface VmSessionFactoryOptions {
  readonly recipeUri: string;
  readonly coreBlob: TW5CoreBootBlob;
  readonly bagStack: readonly string[];
  readonly recipePlugins?: readonly string[];
  readonly blobs?: Record<string, LarBlobEntry>;
  readonly bootstrapPlugin?: Record<string, unknown> | null;
  readonly vmFactory?: (recipeUri: string, engine: TW5Engine, bags: readonly string[]) => Promise<MemeRecipeVm>;
}

export interface VmSessionResult {
  readonly engine: TW5Engine;
  readonly pool: VmPool<MemeRecipeVm>;
  readonly preloadedTiddlers: Array<Record<string, unknown>>;
}

export function collectVmPreloadedTiddlers(opts: {
  readonly recipePlugins?: readonly string[];
  readonly blobs?: Record<string, LarBlobEntry>;
  readonly bootstrapPlugin?: Record<string, unknown> | null;
}): Array<Record<string, unknown>> {
  const preloadedTiddlers: Array<Record<string, unknown>> = [];
  const recipePlugins = new Set(opts.recipePlugins ?? []);

  for (const [id, entry] of Object.entries(opts.blobs ?? {})) {
    if (!id.startsWith("$:/plugins/")) continue;
    if (!recipePlugins.has(id)) continue;
    try {
      const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(entry.blob))) as unknown;
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item && typeof item === "object" && (item as Record<string, unknown>)["title"]) {
          preloadedTiddlers.push(item as Record<string, unknown>);
        }
      }
    } catch {
      // Skip malformed vendored plugin payloads; boot continues with the rest.
    }
  }

  if (opts.bootstrapPlugin) preloadedTiddlers.push(opts.bootstrapPlugin);
  return preloadedTiddlers;
}

export async function openVmSession(opts: VmSessionFactoryOptions): Promise<VmSessionResult> {
  const engine = new TW5EngineImpl();
  const preloadedTiddlers = collectVmPreloadedTiddlers(opts);
  await engine.boot(opts.coreBlob, preloadedTiddlers.length > 0 ? preloadedTiddlers : undefined);

  const pool = new VmPool<MemeRecipeVm>();
  const vmFactory = opts.vmFactory ?? (
    async (_uri: string, tw5: TW5Engine, bags: readonly string[]) => new DirectMemeRecipeVm(tw5, bags)
  );
  await pool.get(opts.recipeUri, () => vmFactory(opts.recipeUri, engine, opts.bagStack));

  return {
    engine,
    pool,
    preloadedTiddlers,
  };
}