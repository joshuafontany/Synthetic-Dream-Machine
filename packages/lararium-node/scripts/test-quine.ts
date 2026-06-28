/**
 * test-quine — genesis boot smoke.
 *
 * Proves: the genesis artifact contains a bootable TW5 core + compiled plugin,
 * and the compiled plugin carries the full SharktoothSigil grammar tiddler set.
 *
 * Steps:
 *   1. Load genesis/island.bin
 *   2. Verify genesis-cid self-ref tiddler
 *   3. Extract TW5 core blob + compiled plugin blob from the artifact
 *   4. Boot TW5Engine with compiled plugin preloaded
 *   5. Assert SharktoothSigil tiddlers present via wiki.filterTiddlers
 *   6. Assert required sigils present: ahu, pranala, aka, loulou, toml
 *
 * Run via:  tsx scripts/test-quine.ts
 * Or via:   pnpm --filter @lararium/node test:quine
 */

import { automergeLoad, GENESIS_CID_ENGINE_TIDDLER, GENESIS_CID_PLUGINS_TIDDLER } from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";
import { createHash }      from "crypto";
import { readFileSync, existsSync } from "fs";
import { join }             from "path";

import { TW5Engine }       from "@lararium/tw5";
import type { TW5TiddlerFields } from "@lararium/tw5";
import type { LarDoc } from "@lararium/mesh";
import { ENGINE_CORE_ID, GRAMMAR_TAG, LARES_MEMETIC_WIKITEXT_PLUGIN_URI } from "@lararium/mesh";
import { readGenesisManifest, genesisCasDir } from "../src/genesis-artifact.js";
import { readCasBlobFromFs } from "../src/node-cas.js";

const LARES_TW5_PLUGIN_TITLE = LARES_MEMETIC_WIKITEXT_PLUGIN_URI;

// One root law: genesis lives at <root>/genesis (the repo IS the vessel).
const GENESIS_BIN = join(repoRoot, "genesis/island.bin");

function sha256hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

async function main(): Promise<void> {
  console.log("[quine] genesis boot smoke");

  // ------------------------------------------------------------------
  // 1. Load the genesis artifact
  // ------------------------------------------------------------------
  if (!existsSync(GENESIS_BIN)) {
    throw new Error(
      `[quine] genesis/island.bin not found.\n  → run: pnpm --filter @lararium/node build:genesis`,
    );
  }
  const genesisBytes = new Uint8Array(readFileSync(GENESIS_BIN));
  const doc          = automergeLoad<LarDoc>(genesisBytes);

  const blobCount    = Object.keys(doc.blobs ?? {}).length;
  const tiddlerCount = Object.keys(doc.tiddlers ?? {}).length;
  console.log(`[quine] artifact loaded  blobs=${blobCount}  tiddlers=${tiddlerCount}`);

  // ------------------------------------------------------------------
  // 2. Verify both region witness tiddlers (engine = true-name, plugins = fast ratchet)
  // ------------------------------------------------------------------
  const readWitnessCid = (title: string): string => {
    const rec = doc.tiddlers?.[title] as { tiddler?: { cid?: string } } | undefined;
    if (!rec?.tiddler?.cid) {
      throw new Error(`[quine] witness tiddler ${title} missing or has no cid field — re-run build:genesis.`);
    }
    return rec.tiddler.cid;
  };
  const engineCid  = readWitnessCid(GENESIS_CID_ENGINE_TIDDLER);
  const pluginsCid = readWitnessCid(GENESIS_CID_PLUGINS_TIDDLER);
  console.log(`[quine] engineCid (true-name) = ${engineCid.slice(0, 20)}…  pluginsCid = ${pluginsCid.slice(0, 20)}…`);

  // ------------------------------------------------------------------
  // 3. Extract TW5 core blob + compiled plugin blob — from the CAS plane.
  //    The CRDT carries METADATA only; the bytes ride genesis/cas/<cid> (G-CAS slice 1).
  // ------------------------------------------------------------------
  const manifest = readGenesisManifest();
  if (!manifest) {
    throw new Error(`[quine] genesis CAS manifest (island.manifest.json) absent — re-run build:genesis`);
  }
  const casDir = genesisCasDir();
  const coreEntry = doc.blobs?.[ENGINE_CORE_ID];
  if (!coreEntry?.sha256) {
    throw new Error(`[quine] TW5 core blob metadata (${ENGINE_CORE_ID}) missing from artifact`);
  }
  const coreBytes = readCasBlobFromFs(coreEntry.sha256, casDir);
  if (!coreBytes) {
    throw new Error(`[quine] TW5 core bytes absent from CAS for cid ${coreEntry.sha256} — re-run build:genesis`);
  }
  const coreBlob = {
    bytes:  coreBytes,
    sha256: coreEntry.sha256,
    source: coreEntry.source ?? ENGINE_CORE_ID,
  };
  console.log(`[quine] TW5 core blob  ${(coreBlob.bytes.byteLength / 1024).toFixed(0)} KB (from CAS)`);

  const pluginEntry = doc.blobs?.[LARES_TW5_PLUGIN_TITLE];
  if (!pluginEntry?.sha256) {
    throw new Error(
      `[quine] compiled plugin blob metadata (${LARES_TW5_PLUGIN_TITLE}) missing from artifact\n` +
      `  → run: pnpm --filter @lararium/tw5 build:plugin && pnpm --filter @lararium/node build:genesis`,
    );
  }
  const pluginBytes = readCasBlobFromFs(pluginEntry.sha256, casDir);
  if (!pluginBytes) {
    throw new Error(`[quine] compiled plugin bytes absent from CAS for cid ${pluginEntry.sha256} — re-run build:genesis`);
  }
  const pluginJson = new TextDecoder().decode(pluginBytes);
  const pluginTiddler = JSON.parse(pluginJson) as Record<string, unknown>;
  console.log(`[quine] compiled plugin  sha=${pluginEntry.sha256.slice(0, 12)}… (from CAS)`);

  // ------------------------------------------------------------------
  // 4. Boot TW5Engine with compiled plugin preloaded
  // ------------------------------------------------------------------
  console.log("[quine] booting TW5Engine…");
  const vm = new TW5Engine();
  await vm.boot(coreBlob, [pluginTiddler]);
  console.log("[quine] TW5Engine ready");

  // ------------------------------------------------------------------
  // 5. Assert SharktoothSigil grammar tiddlers present
  // ------------------------------------------------------------------
  // Plugin contents load as TW5 shadow tiddlers; include shadows in the filter.
  const sigilTitles = vm.$tw.wiki.filterTiddlers(`[all[tiddlers+shadows]tag[${GRAMMAR_TAG}]]`);
  if (!sigilTitles.length) {
    throw new Error(
      `[quine] FAIL — no SharktoothSigil tiddlers found (tag: ${GRAMMAR_TAG})\n` +
      `  Grammar tiddlers were not packed into the compiled plugin.\n` +
      `  → run: pnpm --filter @lararium/tw5 build:plugin`,
    );
  }
  console.log(`[quine] ✓ SharktoothSigil tiddlers present  count=${sigilTitles.length}`);

  // ------------------------------------------------------------------
  // 6. Assert required sigils present by lar-name field
  // ------------------------------------------------------------------
  const sigilNames = sigilTitles.map((t: string) => {
    const fields: Readonly<TW5TiddlerFields> = vm.$tw.wiki.getTiddler(t)?.fields ?? { title: t };
    const larName = fields["lar-name"];
    if (larName) return String(larName);
    const last = t.split("/").at(-1) ?? t;
    return last.startsWith("sigil-") ? last.slice(6) : last;
  });
  for (const required of ["ahu", "pranala", "aka", "loulou", "toml"]) {
    if (!sigilNames.includes(required)) {
      throw new Error(`[quine] FAIL — grammar missing required sigil: "${required}"`);
    }
  }
  console.log(`[quine] ✓ required sigils present  ${["ahu", "pranala", "aka", "loulou", "toml"].join(", ")}`);

  vm.dispose?.();

  console.log("");
  console.log("=== Genesis Boot Smoke: PASS ===");
  console.log(`  blobs in artifact        : ${blobCount}`);
  console.log(`  tiddlers in artifact     : ${tiddlerCount}`);
  console.log(`  SharktoothSigil tiddlers : ${sigilTitles.length}`);
  console.log("");
  console.log("[quine] ✓ genesis carries bootable engine + compiled plugin + self-hosted grammar");
}

main().catch(err => {
  console.error("[quine] FATAL:", err);
  process.exit(1);
});
