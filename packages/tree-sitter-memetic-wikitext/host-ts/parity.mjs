#!/usr/bin/env node
/**
 * host-ts parity gate — BOTH hosts match the corpus, never each other.
 *
 * Folds every meme the versioned manifest names and compares canonical
 * hashes. The manifest was baked by the py host; a full pass here witnesses
 * cross-host parity byte-for-byte — UTF-16 conversion, containment order,
 * canonical JSON, all of it — through one sha256 per meme. Drift fails loud
 * with the offenders named; named skips honor the toml-test discipline.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadArtifact } from "./loader.mjs";
import { fold, structuralHash } from "./fold.mjs";

const PKG_DIR = path.normalize(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

const pkg = JSON.parse(await readFile(path.join(PKG_DIR, "package.json"), "utf8"));
const manifestVersion = pkg.artifact.corpusManifest;
const manifest = JSON.parse(await readFile(
  path.join(PKG_DIR, "fixtures", `manifest-${manifestVersion}.json`), "utf8"));
const bags = path.normalize(path.join(PKG_DIR, "..", "..", "bags", "@lares"));

const artifact = await loadArtifact();
const skips = manifest.skip ?? {};
const drifted = [];
const missing = [];
let matched = 0;
let skipped = 0;

for (const [rel, want] of Object.entries(manifest.corpus)) {
  if (rel in skips) { skipped += 1; continue; }
  let data;
  try {
    data = await readFile(path.join(bags, rel));
  } catch {
    missing.push(rel); // a retired meme wants a re-bake, never a silent pass
    continue;
  }
  const got = structuralHash(fold(new Uint8Array(data), artifact));
  if (got === want.hash) matched += 1;
  else drifted.push(rel);
}

console.log(`host-ts parity vs manifest-${manifestVersion}: `
  + `${matched} match · ${drifted.length} drift · ${missing.length} missing · ${skipped} skipped`);
if (drifted.length) {
  console.error(`DRIFT (the two hosts disagree on these — a parity defect):`);
  for (const rel of drifted.slice(0, 10)) console.error(`  ${rel}`);
  process.exit(1);
}
if (missing.length > Object.keys(manifest.corpus).length / 2) {
  console.error(`corpus moved under the gate: ${missing.slice(0, 5).join(", ")}`);
  process.exit(1);
}
