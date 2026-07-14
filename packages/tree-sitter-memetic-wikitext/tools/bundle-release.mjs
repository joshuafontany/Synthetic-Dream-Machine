#!/usr/bin/env node
// bundle-release — assemble the versioned artifact bundle the ship plan names:
// one directory carrying everything a host subscribes to, nothing it must
// reach around for: the grammar wasm, the query files (extraction + editor
// vocabularies), the versioned corpus manifests, and the quad declaration.
// Runs AFTER the gates (release:bundle chains them); it never re-verifies.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const out = join(pkgDir, "dist", `${pkg.name}-${pkg.version}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(join(pkgDir, "tree-sitter-memetic_wikitext.wasm"), join(out, "tree-sitter-memetic_wikitext.wasm"));
cpSync(join(pkgDir, "queries"), join(out, "queries"), { recursive: true });
for (const f of readdirSync(join(pkgDir, "fixtures")).filter((f) => f.startsWith("manifest-"))) {
  mkdirSync(join(out, "fixtures"), { recursive: true });
  cpSync(join(pkgDir, "fixtures", f), join(out, "fixtures", f));
}
writeFileSync(
  join(out, "artifact.json"),
  JSON.stringify({ name: pkg.name, version: pkg.version, ...pkg.artifact }, null, 1) + "\n",
);

console.log(`[bundle] ${out}`);
for (const f of readdirSync(out, { recursive: true })) console.log(`[bundle]   ${f}`);
