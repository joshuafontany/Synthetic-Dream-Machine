#!/usr/bin/env node
/**
 * host-ts parity gate — BOTH hosts answer to the same pinned hashes.
 *
 * Folds every frozen specimen and compares its canonical structural hash against the
 * manifest the py host bakes. A full pass witnesses cross-host parity byte-for-byte —
 * UTF-16 conversion, containment order, canonical JSON — through one sha256 per specimen.
 *
 * The ground is `fixtures/specimens/`, which moves only in a commit that also moves it.
 * A hash that drifts here names a disagreement between the hosts, never a content edit.
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadArtifact } from "./loader.mjs";
import { fold, structuralHash } from "./fold.mjs";

const PKG_DIR = path.normalize(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const SPECIMEN_DIR = path.join(PKG_DIR, "fixtures", "specimens");

const pkg = JSON.parse(await readFile(path.join(PKG_DIR, "package.json"), "utf8"));
const version = pkg.artifact.specimenManifest ?? pkg.artifact.corpusManifest;
const manifest = JSON.parse(await readFile(
  path.join(PKG_DIR, "fixtures", `specimens-${version}.json`), "utf8"));

const artifact = await loadArtifact();
const drifted = [];
const missing = [];
let matched = 0;

for (const [name, want] of Object.entries(manifest.specimens)) {
  let data;
  try {
    data = await readFile(path.join(SPECIMEN_DIR, name));
  } catch {
    missing.push(name); // a specimen the manifest names must stand beside it
    continue;
  }
  const got = structuralHash(fold(new Uint8Array(data), artifact));
  if (got === want.hash) matched += 1;
  else drifted.push(`${name}  ts:${got.slice(0, 16)}  py:${want.hash.slice(0, 16)}`);
}

// A specimen the manifest never names goes unwitnessed, so the gate names it here.
const onDisk = (await readdir(SPECIMEN_DIR)).filter((f) => f.endsWith(".mem"));
const unpinned = onDisk.filter((f) => !(f in manifest.specimens));

console.log(`host-ts parity vs specimens-${version}: `
  + `${matched} match · ${drifted.length} drift · ${missing.length} missing`);
if (drifted.length) {
  console.error("DRIFT — the ts fold does not match the pinned hash. Either the hosts disagree, or a specimen moved without a re-bake:");
  for (const line of drifted) console.error(`  ${line}`);
  process.exit(1);
}
if (missing.length) {
  console.error(`the manifest names a specimen that does not stand: ${missing.join(", ")}`);
  process.exit(1);
}
if (unpinned.length) {
  console.error(`a specimen stands unpinned, so no host witnesses it: ${unpinned.join(", ")}`);
  process.exit(1);
}
