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

import * as Automerge      from "@automerge/automerge";
import { createHash }      from "crypto";
import { readFileSync, existsSync } from "fs";
import { join, dirname }   from "path";
import { fileURLToPath }   from "url";

import { TW5Engine }       from "@lararium/tw5";
import type { TW5TiddlerFields } from "@lararium/tw5";
import type { LarDoc } from "@lararium/mesh";
import { ENGINE_CORE_ID, GRAMMAR_TAG, LARES_MEMETIC_WIKITEXT_PLUGIN_URI } from "@lararium/mesh";

const LARES_TW5_PLUGIN_TITLE = LARES_MEMETIC_WIKITEXT_PLUGIN_URI;

const __dir       = dirname(fileURLToPath(import.meta.url));
const GENESIS_BIN = join(__dir, "../genesis/island.bin");

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
  const doc          = Automerge.load<LarDoc>(genesisBytes);

  const blobCount    = Object.keys(doc.blobs ?? {}).length;
  const tiddlerCount = Object.keys(doc.tiddlers ?? {}).length;
  console.log(`[quine] artifact loaded  blobs=${blobCount}  tiddlers=${tiddlerCount}`);

  // ------------------------------------------------------------------
  // 2. Verify the genesis-cid self-ref tiddler (two-pass build check)
  // ------------------------------------------------------------------
  const GENESIS_CID_TIDDLER = "lar:///ha.ka.ba/@lararium/genesis-cid";
  const cidRecord = doc.tiddlers?.[GENESIS_CID_TIDDLER] as
    { fields?: { cid?: string } } | undefined;

  if (!cidRecord?.fields?.cid) {
    throw new Error("[quine] genesis-cid tiddler missing or has no cid field — re-run build:genesis.");
  }
  const storedCid = cidRecord.fields.cid;
  console.log(`[quine] stored genesis-cid = ${storedCid.slice(0, 20)}…`);

  // ------------------------------------------------------------------
  // 3. Extract TW5 core blob + compiled plugin blob
  // ------------------------------------------------------------------
  const coreEntry = doc.blobs?.[ENGINE_CORE_ID];
  if (!coreEntry?.blob) {
    throw new Error(`[quine] TW5 core blob (${ENGINE_CORE_ID}) missing from artifact`);
  }
  const coreBlob = {
    bytes:  new Uint8Array(coreEntry.blob as unknown as ArrayBuffer),
    sha256: coreEntry.sha256,
    source: coreEntry.source ?? ENGINE_CORE_ID,
  };
  console.log(`[quine] TW5 core blob  ${(coreBlob.bytes.byteLength / 1024).toFixed(0)} KB`);

  const pluginEntry = doc.blobs?.[LARES_TW5_PLUGIN_TITLE];
  if (!pluginEntry?.blob) {
    throw new Error(
      `[quine] compiled plugin blob (${LARES_TW5_PLUGIN_TITLE}) missing from artifact\n` +
      `  → run: pnpm --filter @lararium/tw5 build:plugin && pnpm --filter @lararium/node build:genesis`,
    );
  }
  const pluginJson = new TextDecoder().decode(new Uint8Array(pluginEntry.blob as unknown as ArrayBuffer));
  const pluginTiddler = JSON.parse(pluginJson) as Record<string, unknown>;
  console.log(`[quine] compiled plugin  sha=${pluginEntry.sha256.slice(0, 12)}…`);

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
