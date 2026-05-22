/**
 * build-genesis-island — build-time genesis artifact builder.
 *
 * Produces packages/lararium-node/genesis/island.bin:
 *   a deterministic Automerge binary carrying engine blobs (TW5 core + vendored plugins).
 *
 * Corpus memes (bags/@lares, bags/@lararium) are NOT packed here.
 * They load at runtime via the LaresDoc / LarariumDoc bag stores in the recipe stack.
 *
 * Determinism invariant:
 *   actorId = sha256hex(sorted content hashes of all walked inputs).
 *   Two builds from identical source produce identical island.sha256.
 *
 * Oracle tiddlers (LARARIUM_DOC_URI → handle.url, etc.) are NOT written here.
 * They embed the runtime DocUrl which is assigned by repo.import() at boot time.
 * reconcileWellKnownTiddlers() writes them after loading.
 *
 * Run via:  tsx scripts/build-genesis-island.ts
 * Or via:   pnpm --filter @lararium/node build:genesis
 */

import * as Automerge            from "@automerge/automerge";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename, resolve } from "path";
import { fileURLToPath }         from "url";

import { LARES_MEMETIC_WIKITEXT_PLUGIN_URI, cidV1Sha256, sha256HexBytesSync, utf8Bytes } from "@lararium/mesh";
import { TW5Engine }             from "@lararium/tw5";
import { tw5PluginsRoot } from "@lararium/tw5/tw5-memes-root";
import { TW5_VERSION, TW5_CORE_SCRIPT_FILENAME, TW5_CORE_DIR } from "@lararium/tw5";

import type { LarDoc, LarBlobEntry } from "@lararium/mesh";
import {
  ENGINE_CORE_ID,
  LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI,
  blobDescriptorUri, recipeUri, bagDescriptorUri,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GENESIS_DIR = join(__dir, "../genesis");
const REPO_ROOT   = join(__dir, "../../..");
const BAGS_ROOT   = join(REPO_ROOT, "bags");
const LARARIUM_TW5_DIST_PLUGIN = join(REPO_ROOT, "packages", "lararium-tw5", "dist-plugin");
const LARES_TW5_PLUGIN_TITLE = LARES_MEMETIC_WIKITEXT_PLUGIN_URI;
const LARES_TW5_PLUGIN_ATTESTATION = join(LARARIUM_TW5_DIST_PLUGIN, "lares-memetic-wikitext.attestation.json");

function resolveGenesisDir(): string {
  const args = process.argv.slice(2);
  const index = args.indexOf("--genesis");
  const flagged = index !== -1 ? args[index + 1] : undefined;
  return resolve(flagged ?? process.env["LAR_GENESIS"] ?? DEFAULT_GENESIS_DIR);
}

interface PluginBuildAttestation {
  readonly format: string;
  readonly canonicalTitle: string;
  readonly compatibilityTitle?: string;
  readonly moduleManifestPath: string;
  readonly moduleManifestSha256: string;
  readonly sourceManifestPath?: string;
  readonly sourceManifestSha256?: string;
  readonly packTranscriptPath?: string;
  readonly packTranscriptSha256?: string;
  readonly moduleCount: number;
  readonly packedTiddlerCount: number;
  readonly pluginJsonSha256: string;
}

/**
 * The memetic corpus lives under repo-root bags/. Each `.md` carrier is already
 * stored at its canonical bag path; package-local `memes/` trees were the old
 * pre-bag layout and are intentionally ignored by genesis.
 */
function findBagMemeRoots(): string[] {
  return existsSync(BAGS_ROOT) ? [BAGS_ROOT] : [];
}


function walkMdFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkMdFiles(full));
      else if (entry.name.endsWith(".md")) results.push(full);
    }
  } catch { /* directory absent — skip */ }
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
  } catch { /* directory absent — skip */ }
  return results.sort();
}

function readPluginAttestations(): Map<string, PluginBuildAttestation> {
  const out = new Map<string, PluginBuildAttestation>();
  if (!existsSync(LARES_TW5_PLUGIN_ATTESTATION)) return out;
  const att = JSON.parse(readFileSync(LARES_TW5_PLUGIN_ATTESTATION, "utf8")) as PluginBuildAttestation;
  if (att.format !== "lararium-tw5-plugin-build/v1") {
    throw new Error(`[genesis] unsupported plugin attestation format: ${att.format}`);
  }
  if (!att.canonicalTitle) {
    throw new Error(`[genesis] plugin attestation missing canonicalTitle: ${LARES_TW5_PLUGIN_ATTESTATION}`);
  }
  out.set(att.canonicalTitle, att);
  return out;
}

// ---------------------------------------------------------------------------
// Deterministic actor ID
//
// Hash every input file (sorted) and combine hashes so any single-byte change
// in any input propagates to a new actor ID, hence new genesis bytes and CID.
// ---------------------------------------------------------------------------

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function deriveActorId(tw5CorePath: string): string {
  const chunks: Uint8Array[] = [];

  // TW5 core blob
  if (existsSync(tw5CorePath)) {
    chunks.push(utf8Bytes("tw5-core:"));
    chunks.push(new Uint8Array(readFileSync(tw5CorePath)));
  }

  // Canonical bag corpus (sorted for determinism)
  for (const memeRoot of findBagMemeRoots()) {
    for (const f of walkMdFiles(memeRoot)) {
      chunks.push(utf8Bytes(`md:${f}:`));
      chunks.push(new Uint8Array(readFileSync(f)));
    }
  }

  // Vendored plugin JSON files (sorted)
  for (const f of walkFiles(tw5PluginsRoot, ".json")) {
    chunks.push(utf8Bytes(`plugin:${f}:`));
    chunks.push(new Uint8Array(readFileSync(f)));
  }

  // Build attestations are descriptor inputs: they do not change blob bytes,
  // but they do change genesis tiddler metadata and therefore must join the
  // deterministic actor seed.
  for (const f of walkFiles(LARARIUM_TW5_DIST_PLUGIN, ".attestation.json")) {
    chunks.push(utf8Bytes(`attestation:${f}:`));
    chunks.push(new Uint8Array(readFileSync(f)));
  }

  return sha256HexBytesSync(concatBytes(chunks));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[genesis] Sprint 2 — build-genesis-island starting");
  const genesisDir = resolveGenesisDir();

  const coreJsPath = join(TW5_CORE_DIR, TW5_CORE_SCRIPT_FILENAME);
  if (!existsSync(coreJsPath)) {
    throw new Error(
      `[genesis] TW5 core not found: ${coreJsPath}\n  → run pnpm --filter @lararium/tw5 build:vendor first`,
    );
  }

  // 1. Derive deterministic actor ID from all content inputs.
  console.log("[genesis] deriving actor ID from content hash …");
  const actorId = deriveActorId(coreJsPath);
  console.log(`[genesis] actorId = ${actorId.slice(0, 16)}…`);

  // 2. Read TW5 core blob.
  const coreBlob  = new Uint8Array(readFileSync(coreJsPath));
  const coreSha   = sha256HexBytesSync(coreBlob);
  console.log(`[genesis] TW5 core  v${TW5_VERSION}  sha=${coreSha.slice(0, 12)}…`);

  // 3. Collect vendored plugin blobs.
  const vendoredPlugins: LarBlobEntry[] = [];
  const pluginAttestations = readPluginAttestations();
  if (existsSync(tw5PluginsRoot)) {
    for (const file of readdirSync(tw5PluginsRoot).filter(f => f.endsWith(".json")).sort()) {
      const filePath = join(tw5PluginsRoot, file);
      const blob     = new Uint8Array(readFileSync(filePath));
      const sha      = sha256HexBytesSync(blob);
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
      } catch { /* unparseable — use filename-derived id */ }
      vendoredPlugins.push({
        id, version, sha256: sha,
        mimeType: "application/json",
        blob,
        ...(author && { author }),
        ...(source && { source }),
        license: "MIT",
      });
      const att = pluginAttestations.get(id);
      if (att) {
        if (att.pluginJsonSha256 !== sha) {
          throw new Error(
            `[genesis] plugin attestation sha mismatch for ${id}: ` +
            `attestation=${att.pluginJsonSha256} blob=${sha}`,
          );
        }
        console.log(`[genesis] plugin attestation  ${id}  modules=${att.moduleCount}  manifest=${att.moduleManifestSha256.slice(0, 12)}…`);
      }
      console.log(`[genesis] vendored plugin  ${id}  v${version}  sha=${sha.slice(0, 12)}…`);
    }
  }

  if (!vendoredPlugins.some((p) => p.id === LARES_TW5_PLUGIN_TITLE)) {
    throw new Error(
      `[genesis] packed Lares TW5 plugin missing from ${tw5PluginsRoot}\n` +
      `  → run: pnpm --filter @lararium/tw5 build:plugin`,
    );
  }

  // 4. Snapshot systemTitles from a bare VM boot.
  console.log("[genesis] snapshotting system titles …");
  const snapshotVm = new TW5Engine();
  await snapshotVm.boot({ bytes: coreBlob, sha256: coreSha });
  const systemTitles = snapshotVm.$tw.wiki.filterTiddlers("[prefix[$:/]]").sort();
  snapshotVm.dispose();
  console.log(`[genesis] systemTitles count = ${systemTitles.length}`);

  // 5. Create Automerge doc with pinned actor.
  //    Automerge.from() passes {} to its internal _change, ignoring the time option.
  //    Use init() + an explicit first change so every change gets time: 0.
  let doc = Automerge.init<LarDoc>({ actor: actorId });
  doc = Automerge.change(doc, { time: 0 }, d => {
    const r = d as unknown as Record<string, unknown>;
    r["schemaVersion"] = "0.1";
    r["blobs"]         = {};
    r["tiddlers"]      = {};
    r["systemTitles"]  = [];
  });

  // 6. Write TW5 core blob.
  const coreEntry: LarBlobEntry = {
    id:       ENGINE_CORE_ID,
    version:  TW5_VERSION,
    sha256:   coreSha,
    mimeType: "application/javascript",
    blob:     coreBlob,
    license:  "BSD-3-Clause",
    author:   "UnaMesa Association",
    source:   "https://tiddlywiki.com",
  };
  doc = Automerge.change(doc, { time: 0 }, d => {
    (d.blobs as Record<string, LarBlobEntry>)[ENGINE_CORE_ID] = coreEntry;
  });

  // 7. Write vendored plugin blobs.
  for (const entry of vendoredPlugins) {
    doc = Automerge.change(doc, { time: 0 }, d => {
      (d.blobs as Record<string, LarBlobEntry>)[entry.id] = entry;
    });
  }


  // 8. Write systemTitles.
  doc = Automerge.change(doc, { time: 0 }, d => {
    if (d.systemTitles)
      (d.systemTitles as string[]).splice(0, d.systemTitles.length, ...systemTitles);
  });

  // 9. Write default recipe tiddlers.
  //     No `updatedAt` timestamps — genesis tiddlers carry no mutable state.
  doc = Automerge.change(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;

    // Recipe: full
    const fullUri = recipeUri("@lararium", "full");
    tiddlers[fullUri] = {
      title: fullUri,
      fields: {
        label: "Full (content + social plane)",
        bagStack: [
          LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI,
          IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI,
        ].join(" "),
        authority: "genesis", bag: LARARIUM_DOC_URI,
      },
      authority: "genesis",
      bag: LARARIUM_DOC_URI,
    };

    // Recipe: default
    const defaultUri = recipeUri("@lararium", "default");
    tiddlers[defaultUri] = {
      title: defaultUri,
      fields: {
        label: "Default (content Tiga)",
        bagStack: [LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI].join(" "),
        authority: "genesis", bag: LARARIUM_DOC_URI,
      },
      authority: "genesis",
      bag: LARARIUM_DOC_URI,
    };

    // Recipe: catalog default
    const catalogDefaultUri = recipeUri("@catalog", "default");
    tiddlers[catalogDefaultUri] = {
      title: catalogDefaultUri,
      fields: {
        label: "Catalog default (discovery + lares)",
        bagStack: [CATALOG_DOC_URI, LARES_DOC_URI].join(" "),
        authority: "genesis", bag: LARARIUM_DOC_URI,
      },
      authority: "genesis",
      bag: LARARIUM_DOC_URI,
    };
  });

  // 10. Write bag descriptor tiddlers.
  const ROOT_BAGS = [
    { bagId: LARARIUM_DOC_URI,   label: "ha — engine & grammar (Lararium)",   readPolicy: "public",  writePolicy: "private" },
    { bagId: CATALOG_DOC_URI,    label: "ka — corpus discovery (Catalog)",     readPolicy: "public",  writePolicy: "private" },
    { bagId: LARES_DOC_URI,      label: "ba — persona & doctrine (Lares)",     readPolicy: "public",  writePolicy: "private" },
    { bagId: IDENTITIES_DOC_URI, label: "ha — principals (Identities)",             readPolicy: "private", writePolicy: "private" },
    { bagId: CIRCLES_DOC_URI,     label: "ka — collective authority (Circles)",      readPolicy: "private", writePolicy: "private" },
    { bagId: SESSIONS_DOC_URI,   label: "ba — live operator sessions (Sessions)",   readPolicy: "private", writePolicy: "private" },
  ];
  doc = Automerge.change(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;
    for (const { bagId, label, readPolicy, writePolicy } of ROOT_BAGS) {
      const uri = bagDescriptorUri(bagId);
      tiddlers[uri] = {
        title: uri,
        fields: { label, readPolicy, writePolicy, authority: "genesis", bag: LARARIUM_DOC_URI },
        authority: "genesis",
        bag: LARARIUM_DOC_URI,
      };
    }
  });

  // 11. Write blob descriptor tiddlers.
  doc = Automerge.change(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;
    const blobs    = (d.blobs ?? {}) as Record<string, LarBlobEntry>;
    for (const [blobId, entry] of Object.entries(blobs)) {
      const uri               = blobDescriptorUri(blobId);
      const isVendoredPlugin  = blobId.startsWith("$:/plugins/") || blobId.startsWith("lar:///plugins/");
      const att               = pluginAttestations.get(blobId);
      tiddlers[uri] = {
        title:     uri,
        text:      blobId,
        fields: {
          sha256:   entry.sha256,
          version:  entry.version,
          mimeType: entry.mimeType,
          ...(entry.author  && { author:  entry.author }),
          ...(entry.source  && { source:  entry.source }),
          ...(entry.license && { license: entry.license }),
          ...(isVendoredPlugin && { pluginInstallable: "true", pluginTitle: blobId }),
          ...(att && {
            buildAttestationFormat: att.format,
            canonicalTitle: att.canonicalTitle,
            ...(att.compatibilityTitle && { compatibilityTitle: att.compatibilityTitle }),
            moduleManifestPath: att.moduleManifestPath,
            moduleManifestSha256: att.moduleManifestSha256,
            ...(att.sourceManifestPath && { sourceManifestPath: att.sourceManifestPath }),
            ...(att.sourceManifestSha256 && { sourceManifestSha256: att.sourceManifestSha256 }),
            ...(att.packTranscriptPath && { packTranscriptPath: att.packTranscriptPath }),
            ...(att.packTranscriptSha256 && { packTranscriptSha256: att.packTranscriptSha256 }),
            moduleCount: String(att.moduleCount),
            packedTiddlerCount: String(att.packedTiddlerCount),
            pluginJsonSha256: att.pluginJsonSha256,
          }),
          tags:      isVendoredPlugin ? "blob-descriptor plugin-descriptor" : "blob-descriptor",
        },
        bag:       LARARIUM_DOC_URI,
        authority: "genesis",
      };
    }
  });

  // 12. Two-pass CID injection.
  //
  //   Pass 1: serialize the doc without the self-ref tiddler → compute sha256-pre.
  //   Pass 2: inject $:/lararium/genesis-cid tiddler carrying the first
  //           post-injection CID witness → re-serialize.
  //
  //   The invariant: strip the genesis-cid tiddler and hash the result → sha256-pre.
  //   This is verifiable without a true fixpoint and honest about what it proves.
  mkdirSync(genesisDir, { recursive: true });

  const preBytes  = Automerge.save(doc);
  const preSha    = sha256HexBytesSync(preBytes);
  console.log(`[genesis] sha256-pre = ${preSha}`);

  const GENESIS_CID_TIDDLER = `${LARARIUM_DOC_URI}/genesis-cid`;
  doc = Automerge.change(doc, { time: 0 }, d => {
    (d.tiddlers as Record<string, unknown>)[GENESIS_CID_TIDDLER] = {
      title:     GENESIS_CID_TIDDLER,
      text:      "",
      fields:    { cid: "", note: "genesis CID placeholder until island.bin is finalized" },
      bag:       LARARIUM_DOC_URI,
      authority: "genesis",
    };
  });

  const genesisBytes = Automerge.save(doc);
  const genesisCid   = cidV1Sha256(genesisBytes);

  doc = Automerge.change(doc, { time: 0 }, d => {
    (d.tiddlers as Record<string, unknown>)[GENESIS_CID_TIDDLER] = {
      ...(d.tiddlers as Record<string, unknown>)[GENESIS_CID_TIDDLER] as Record<string, unknown>,
      fields: {
        cid: genesisCid,
        note: "CIDv1 raw SHA-256 witness from the first post-placeholder genesis serialization",
      },
    };
  });

  const finalGenesisBytes = Automerge.save(doc);
  const finalGenesisSha   = sha256HexBytesSync(finalGenesisBytes);
  const finalGenesisCid   = cidV1Sha256(finalGenesisBytes);

  writeFileSync(join(genesisDir, "island.bin"),         finalGenesisBytes);
  writeFileSync(join(genesisDir, "island.sha256"),      finalGenesisSha + "\n",  "utf8");
  writeFileSync(join(genesisDir, "island.sha256-pre"),  preSha + "\n",      "utf8");
  writeFileSync(join(genesisDir, "island.cid"),         finalGenesisCid + "\n",  "utf8");

  // 13. Smoke-test: reload and verify core blob + genesis-cid tiddler present.
  const reloaded = Automerge.load<LarDoc>(finalGenesisBytes);
  const blobCount    = Object.keys(reloaded.blobs ?? {}).length;
  const tiddlerCount = Object.keys(reloaded.tiddlers ?? {}).length;
  if (!reloaded.blobs?.[ENGINE_CORE_ID]) {
    throw new Error("[genesis] smoke-test FAILED: TW5 core blob not found after reload");
  }
  const storedCid = (reloaded.tiddlers?.[GENESIS_CID_TIDDLER] as { fields?: { cid?: string } } | undefined)?.fields?.cid;
  if (storedCid !== genesisCid) {
    throw new Error(`[genesis] smoke-test FAILED: genesis-cid tiddler cid mismatch — stored=${storedCid} expected=${genesisCid}`);
  }

  console.log(`[genesis] ✓ island.bin  ${(finalGenesisBytes.byteLength / 1024).toFixed(0)} KB`);
  console.log(`[genesis] ✓ blobs=${blobCount}  tiddlers=${tiddlerCount}  systemTitles=${reloaded.systemTitles?.length ?? 0}`);
  console.log(`[genesis] ✓ sha256=${finalGenesisSha}  cid=${finalGenesisCid}  sha256-pre=${preSha}`);
  console.log(`[genesis] wrote ${join(genesisDir, "island.bin")}`);
  console.log("[genesis] S5 gate A satisfied — plugin blobs wired + genesis-cid tiddler injected.");
}

main().catch(err => {
  console.error("[genesis] FATAL:", err);
  process.exit(1);
});
