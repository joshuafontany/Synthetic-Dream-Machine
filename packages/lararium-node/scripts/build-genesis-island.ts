/**
 * build-genesis-island — node I/O runner for genesis artifact construction.
 *
 * Layer A (this file): read blobs from disk, assemble GenesisInputs.
 * Layer B (mesh):      buildGenesisDoc(inputs) — platform-neutral Automerge construction.
 * Layer C (this file): write artifact bytes to disk.
 *
 * Corpus memes (bags/@lares, bags/@lararium) load at runtime via the bag store
 * recipe stack. Oracle tiddlers (runtime DocUrls) write after repo.import() in
 * reconcileWellKnownTiddlers(). Neither belongs here.
 *
 * Determinism invariant:
 *   actorSeed = sha256hex(sorted content hashes of all walked inputs).
 *   Two builds from identical source produce identical island.sha256.
 *
 * Run via:  tsx scripts/build-genesis-island.ts
 * Or via:   pnpm --filter @lararium/node build:genesis
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, basename, resolve }                                          from "path";

import { repoRoot } from "@lararium/mesh/node";
import {
  sha256HexBytesSync,
  utf8Bytes,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
  buildGenesisDoc,
  verifyGenesisArtifact,
  type GenesisInputs,
  type GenesisPluginEntry,
  type PluginBuildAttestation,
} from "@lararium/mesh";

import { TW5_VERSION, TW5_CORE_SCRIPT_FILENAME, TW5_CORE_DIR } from "@lararium/tw5";
import { tw5PluginsRoot } from "@lararium/tw5/tw5-memes-root";

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------

// One root law: the repo IS the vessel — repoRoot from mesh, never path arithmetic.
const REPO_ROOT               = repoRoot;
const DEFAULT_GENESIS_DIR     = join(REPO_ROOT, "genesis");
const BAGS_ROOT               = join(REPO_ROOT, "bags");
const LARARIUM_TW5_DIST_PLUGIN = join(REPO_ROOT, "packages", "lararium-tw5", "dist-plugin");
const LARES_TW5_PLUGIN_ATTESTATION = join(LARARIUM_TW5_DIST_PLUGIN, "lares-memetic-wikitext.attestation.json");

// ---------------------------------------------------------------------------
// Layer A helpers — filesystem only
// ---------------------------------------------------------------------------

function resolveGenesisDir(): string {
  const args  = process.argv.slice(2);
  const index = args.indexOf("--genesis");
  const flagged = index !== -1 ? args[index + 1] : undefined;
  return resolve(flagged ?? process.env["LAR_GENESIS"] ?? DEFAULT_GENESIS_DIR);
}

function walkMdFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkMdFiles(full));
      else if (entry.name.endsWith(".md")) results.push(full);
    }
  } catch { /* absent — skip */ }
  return results.sort();
}

function walkFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkFiles(full, ext));
      else if (entry.name.endsWith(ext)) results.push(full);
    }
  } catch { /* absent — skip */ }
  return results.sort();
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

/** Derive deterministic actor seed from sorted content hashes of all inputs. */
function deriveActorSeed(tw5CorePath: string): string {
  const chunks: Uint8Array[] = [];

  if (existsSync(tw5CorePath)) {
    chunks.push(utf8Bytes("tw5-core:"));
    chunks.push(new Uint8Array(readFileSync(tw5CorePath)));
  }

  for (const memeRoot of existsSync(BAGS_ROOT) ? [BAGS_ROOT] : []) {
    for (const f of walkMdFiles(memeRoot)) {
      chunks.push(utf8Bytes(`md:${f}:`));
      chunks.push(new Uint8Array(readFileSync(f)));
    }
  }

  for (const f of walkFiles(tw5PluginsRoot, ".json")) {
    chunks.push(utf8Bytes(`plugin:${f}:`));
    chunks.push(new Uint8Array(readFileSync(f)));
  }

  for (const f of walkFiles(LARARIUM_TW5_DIST_PLUGIN, ".attestation.json")) {
    chunks.push(utf8Bytes(`attestation:${f}:`));
    chunks.push(new Uint8Array(readFileSync(f)));
  }

  return sha256HexBytesSync(concatBytes(chunks));
}

function readPluginAttestations(): Map<string, PluginBuildAttestation> {
  const out = new Map<string, PluginBuildAttestation>();
  if (!existsSync(LARES_TW5_PLUGIN_ATTESTATION)) return out;
  const att = JSON.parse(readFileSync(LARES_TW5_PLUGIN_ATTESTATION, "utf8")) as PluginBuildAttestation;
  if (att.format !== "lararium-tw5-plugin-build/v1") {
    throw new Error(`[genesis] unsupported plugin attestation format: ${att.format}`);
  }
  out.set(att.canonicalTitle, att);
  return out;
}

/** Collect vendored plugin blobs from tw5PluginsRoot. */
function collectPlugins(attestations: Map<string, PluginBuildAttestation>): GenesisPluginEntry[] {
  const entries: GenesisPluginEntry[] = [];
  if (!existsSync(tw5PluginsRoot)) return entries;

  for (const file of readdirSync(tw5PluginsRoot).filter(f => f.endsWith(".json")).sort()) {
    const blob = new Uint8Array(readFileSync(join(tw5PluginsRoot, file)));
    const sha  = sha256HexBytesSync(blob);
    let id      = basename(file, ".json");
    let version = "unknown";
    let author: string | undefined;
    let source: string | undefined;
    try {
      const meta = JSON.parse(new TextDecoder().decode(blob)) as Record<string, unknown>;
      if (typeof meta["title"]   === "string") id      = meta["title"];
      if (typeof meta["version"] === "string") version = meta["version"];
      if (typeof meta["author"]  === "string") author  = meta["author"];
      if (typeof meta["source"]  === "string") source  = meta["source"];
    } catch { /* use filename-derived id */ }

    const att = attestations.get(id);
    if (att && att.pluginJsonSha256 !== sha) {
      throw new Error(
        `[genesis] plugin attestation sha mismatch for ${id}: ` +
        `attestation=${att.pluginJsonSha256} blob=${sha}`,
      );
    }
    if (att) console.log(`[genesis] plugin attestation  ${id}  modules=${att.moduleCount}  manifest=${att.moduleManifestSha256.slice(0, 12)}…`);
    console.log(`[genesis] vendored plugin  ${id}  v${version}  sha=${sha.slice(0, 12)}…`);

    entries.push({
      id, version, sha256: sha, mimeType: "application/json", blob, license: "MIT",
      ...(author      && { author }),
      ...(source      && { source }),
      ...(att         && { attestation: att }),
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Main — assemble inputs, call mesh builder, write outputs
// ---------------------------------------------------------------------------

function main(): void {
  console.log("[genesis] build-genesis-island starting");
  const genesisDir  = resolveGenesisDir();
  const coreJsPath  = join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);

  if (!existsSync(coreJsPath)) {
    throw new Error(
      `[genesis] TW5 core not found: ${coreJsPath}\n  → run pnpm --filter @lararium/tw5 build:vendor first`,
    );
  }

  // Layer A: read files + derive actor seed.
  console.log("[genesis] deriving actor seed from content hash …");
  const actorSeed        = deriveActorSeed(coreJsPath);
  console.log(`[genesis] actorSeed = ${actorSeed.slice(0, 16)}…`);

  const coreBlob         = new Uint8Array(readFileSync(coreJsPath));
  const coreSha256       = sha256HexBytesSync(coreBlob);
  console.log(`[genesis] TW5 core  v${TW5_VERSION}  sha=${coreSha256.slice(0, 12)}…`);

  const attestations     = readPluginAttestations();
  const plugins          = collectPlugins(attestations);

  if (!plugins.some(p => p.id === LARES_MEMETIC_WIKITEXT_PLUGIN_URI)) {
    throw new Error(
      `[genesis] packed Lares TW5 plugin missing from ${tw5PluginsRoot}\n` +
      `  → run: pnpm --filter @lararium/tw5 build:plugin`,
    );
  }

  // Layer B: build genesis doc — pure mesh, no fs.
  const inputs: GenesisInputs = {
    actorSeed,
    coreBlob,
    coreVersion: TW5_VERSION,
    coreSha256,
    plugins,
  };
  const artifact = buildGenesisDoc(inputs);
  console.log(`[genesis] engineCid (true-name) = ${artifact.engineCid}`);
  console.log(`[genesis] pluginsCid            = ${artifact.pluginsCid}`);

  // Verify integrity before writing (recomputes + matches both region CIDs).
  const counts = verifyGenesisArtifact(artifact);

  // Layer C: write outputs. Two region sidecars (engine = the true-name, slow ratchet;
  // plugins = fast ratchet) alongside the whole-doc forward integrity sidecars.
  mkdirSync(genesisDir, { recursive: true });
  writeFileSync(join(genesisDir, "island.bin"),         artifact.bytes);
  writeFileSync(join(genesisDir, "island.sha256"),      artifact.sha256     + "\n", "utf8");
  writeFileSync(join(genesisDir, "island.cid"),         artifact.cid        + "\n", "utf8");
  writeFileSync(join(genesisDir, "island.cid-engine"),  artifact.engineCid  + "\n", "utf8");
  writeFileSync(join(genesisDir, "island.cid-plugins"), artifact.pluginsCid + "\n", "utf8");

  console.log(`[genesis] ✓ island.bin  ${(artifact.bytes.byteLength / 1024).toFixed(0)} KB`);
  console.log(`[genesis] ✓ blobs=${counts.blobCount}  tiddlers=${counts.tiddlerCount}`);
  console.log(`[genesis] ✓ sha256=${artifact.sha256}  cid=${artifact.cid}`);
  console.log(`[genesis] ✓ engineCid=${artifact.engineCid}  pluginsCid=${artifact.pluginsCid}`);
  console.log(`[genesis] wrote ${join(genesisDir, "island.bin")}`);
  console.log("[genesis] S5 gate A satisfied — plugin blobs wired + two region witness tiddlers injected.");
}

try {
  main();
} catch (err) {
  console.error("[genesis] FATAL:", err);
  process.exit(1);
}
