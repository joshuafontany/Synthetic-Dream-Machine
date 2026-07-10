/**
 * genesis-intake.test.ts — the ONE genesis intake core (isomorphism sweep).
 *
 * Node and browser carried near-identical validate→import→verify and
 * CID-reconcile logic (genesis-artifact.ts ⇆ browser-genesis.ts), already
 * drifted (record shape, authority string). This core lives beside the
 * emitter (genesis-doc.ts) in mesh; the platform wrappers keep only their
 * byte SOURCES (fs · bundle/IDB/OPFS/peer).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/genesis-intake
 */

import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import {
  validateGenesisBytes,
  importGenesisIsland,
  reconcileGenesisCid,
} from "../src/genesis-intake.js";
import {
  emptyLarDoc,
  ENGINE_CORE_ID,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
  GENESIS_CID_ENGINE_TIDDLER,
  GENESIS_CID_PLUGINS_TIDDLER,
  cidV1Sha256,
  type LarDoc,
} from "../src/index.js";

const CORE_BYTES = new TextEncoder().encode("fake-tw5-core");

function blobEntry(id: string, payload: string) {
  return {
    id,
    version:  "test",
    sha256:   "00",
    mimeType: "application/javascript",
    blob:     new TextEncoder().encode(payload),
  };
}

describe("genesis-intake — the one intake core", () => {
  const repos: Repo[] = [];

  afterEach(async () => {
    for (const r of repos.splice(0)) await r.shutdown();
  });

  function newRepo(): Repo {
    const r = new Repo({ sharePolicy: async () => true });
    repos.push(r);
    return r;
  }

  /** Author a genesis-shaped doc and export its bytes. */
  async function genesisBytes(mutate?: (d: LarDoc) => void): Promise<Uint8Array> {
    const repo   = newRepo();
    const handle = repo.create<LarDoc>(emptyLarDoc());
    handle.change((d) => {
      const doc = d as { blobs?: Record<string, unknown>; tiddlers: Record<string, unknown> };
      doc.blobs = {
        [ENGINE_CORE_ID]:                    blobEntry(ENGINE_CORE_ID, "fake-tw5-core"),
        [LARES_MEMETIC_WIKITEXT_PLUGIN_URI]: blobEntry(LARES_MEMETIC_WIKITEXT_PLUGIN_URI, "fake-plugin"),
      };
      if (mutate) mutate(d);
    });
    const bytes = await repo.export(handle.url);
    if (!bytes) throw new Error("export failed");
    return new Uint8Array(bytes);
  }

  test("valid bytes validate, import, and verify whole", async () => {
    const bytes  = await genesisBytes();
    const repo   = newRepo();

    const preview = validateGenesisBytes(bytes, "test-intake");
    expect(preview.blobs?.[ENGINE_CORE_ID]).toBeTruthy();

    const handle = await importGenesisIsland(repo, bytes, "test-intake");
    expect(handle.doc()?.blobs?.[ENGINE_CORE_ID]).toBeTruthy();
  });

  test("missing TW5 core blob refuses loudly, naming the blob id", async () => {
    const repo   = newRepo();
    const handle = repo.create<LarDoc>(emptyLarDoc());
    const bytes  = new Uint8Array((await repo.export(handle.url))!);

    expect(() => validateGenesisBytes(bytes, "test-intake")).toThrow(new RegExp(ENGINE_CORE_ID));
  });

  test("CID reconcile: divergence merges + records both regions; equality no-ops", async () => {
    const engineCid  = cidV1Sha256(new TextEncoder().encode("engine-region"));
    const pluginsCid = cidV1Sha256(new TextEncoder().encode("plugins-region"));
    // The incoming genesis carries both region witness tiddlers (the source of truth).
    const bytes = await genesisBytes((d) => {
      const t = (d as { tiddlers: Record<string, unknown> }).tiddlers;
      t[GENESIS_CID_ENGINE_TIDDLER]  = { tiddler: { title: GENESIS_CID_ENGINE_TIDDLER,  cid: engineCid  }, meta: { authority: "genesis" } };
      t[GENESIS_CID_PLUGINS_TIDDLER] = { tiddler: { title: GENESIS_CID_PLUGINS_TIDDLER, cid: pluginsCid }, meta: { authority: "genesis" } };
    });

    const repo     = newRepo();
    const live     = repo.create<LarDoc>(emptyLarDoc());
    const incoming = await importGenesisIsland(repo, bytes, "test-intake");

    // Divergence: live carries no recorded region CIDs → merge + record both.
    const first = reconcileGenesisCid(live, incoming);
    expect(first.updated).toBe(true);
    expect(first.previousEngineCid).toBeNull();
    expect(first.previousPluginsCid).toBeNull();
    expect(first.incomingEngineCid).toBe(engineCid);
    expect(first.incomingPluginsCid).toBe(pluginsCid);
    expect(live.doc()?.blobs?.[ENGINE_CORE_ID]).toBeTruthy();             // merge landed
    const engRec = live.doc()?.tiddlers?.[GENESIS_CID_ENGINE_TIDDLER];
    expect(engRec?.tiddler?.["cid"]).toBe(engineCid);                     // engine cid recorded
    expect(engRec?.meta?.["authority"]).toBe("genesis-reconcile");        // ONE record shape
    expect(live.doc()?.tiddlers?.[GENESIS_CID_PLUGINS_TIDDLER]?.tiddler?.["cid"]).toBe(pluginsCid);

    // Equality: second pass reads current → no-op.
    const second = reconcileGenesisCid(live, incoming);
    expect(second.updated).toBe(false);
    expect(second.previousEngineCid).toBe(engineCid);
    expect(second.previousPluginsCid).toBe(pluginsCid);
  });
});
