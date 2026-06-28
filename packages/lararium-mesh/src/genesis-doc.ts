/**
 * genesis-doc.ts — platform-neutral genesis island document builder.
 *
 * Accepts assembled byte inputs; returns a deterministic Automerge binary.
 * No filesystem, no network, no DOM. Pure mesh concern.
 *
 * Callers supply the blobs. buildGenesisDoc() constructs the LarDoc and runs
 * the two-pass CID injection. The output bytes write to any sink: disk, IndexedDB,
 * bundler inline, or test fixture.
 *
 * Schema: lar:///ha.ka.ba/@lararium/mesh/genesis-doc
 */

import {
  init  as automergeInit,
  change as automergeChange,
  save   as automergeSave,
  load   as automergeLoad,
} from "@automerge/automerge";
import { cidV1Sha256, sha256HexBytesSync, utf8Bytes } from "./crypto.js";
import {
  ORACLE_DOC_URI,
  LARARIUM_DOC_URI,
  CATALOG_DOC_URI,
  LARES_DOC_URI,
  IDENTITIES_DOC_URI,
  CIRCLES_DOC_URI,
  SESSIONS_DOC_URI,
  bagDescriptorUri,
  recipeUri,
} from "./lar-uris.js";
import { wikiDraftBagUri } from "./wiki-recipe.js";
import type { LarDoc, LarBlobEntry } from "./base-doc.js";
import { ENGINE_CORE_ID, blobDescriptorUri } from "./base-doc.js";

// ---------------------------------------------------------------------------
// Shared attestation contract
// ---------------------------------------------------------------------------

/**
 * PluginBuildAttestation — schema written by @lararium/tw5 build-plugin-tiddler.ts.
 *
 * Promoted from a build-script local to the shared mesh contract so the genesis
 * builder and the plugin build pipeline speak the same type without coupling
 * @lararium/node to @lararium/tw5 at the type level.
 *
 * Format string: "lararium-tw5-plugin-build/v1"
 */
export interface PluginBuildAttestation {
  readonly format:                  string;
  readonly canonicalTitle:          string;
  readonly compatibilityTitle?:     string;
  readonly moduleManifestPath:      string;
  readonly moduleManifestSha256:    string;
  readonly sourceManifestPath?:     string;
  readonly sourceManifestSha256?:   string;
  readonly packTranscriptPath?:     string;
  readonly packTranscriptSha256?:   string;
  readonly moduleCount:             number;
  readonly packedTiddlerCount:      number;
  readonly pluginJsonSha256:        string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/**
 * GenesisPluginEntry — one vendored plugin blob plus its optional attestation.
 */
export interface GenesisPluginEntry {
  readonly id:          string;
  readonly version:     string;
  readonly sha256:      string;
  readonly mimeType:    string;
  readonly blob:        Uint8Array;
  readonly license?:    string;
  readonly author?:     string;
  readonly source?:     string;
  readonly attestation?: PluginBuildAttestation;
}

/**
 * GenesisInputs — everything buildGenesisDoc() needs to construct the artifact.
 *
 * All byte values arrive as Uint8Array. The caller owns how they obtained them
 * (readFileSync, fetch, bundler inline, test fixture). buildGenesisDoc() treats
 * them as opaque byte sequences and hashes/stores them accordingly.
 *
 * actorSeed: caller-derived hex string (e.g. sha256 of sorted input hashes).
 *   buildGenesisDoc() uses it as the Automerge actor ID for determinism.
 *
 * systemTitles: list of TW5 shadow tiddler titles from a bare core boot.
 *   Caller boots TW5Engine and passes the result. buildGenesisDoc() does not
 *   depend on @lararium/tw5.
 */
export interface GenesisInputs {
  /** Deterministic actor seed — hex string. */
  readonly actorSeed:     string;
  /** TW5 core JavaScript blob. */
  readonly coreBlob:      Uint8Array;
  /** TW5 version string for the core blob. */
  readonly coreVersion:   string;
  /** TW5 core sha256 hex (caller-computed or buildGenesisDoc computes it). */
  readonly coreSha256?:   string;
  /** Vendored plugin blobs. Must include the Lares memetic-wikitext plugin. */
  readonly plugins:       readonly GenesisPluginEntry[];
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * GenesisArtifact — output of buildGenesisDoc().
 *
 * bytes: the final island.bin content.
 * sha256: hex hash of the final bytes (forward integrity over the finished doc).
 * cid: CIDv1 raw-sha256 of the final bytes (forward integrity).
 * engineCid: content-CID of the engine region (TW5 core + version) — the hearth
 *   TRUE-NAME (G-D3) and the SLOW ratchet. A pure function of inputs, never of doc bytes.
 * pluginsCid: content-CID of the plugins region (sorted plugin id/version/sha256) —
 *   the FAST ratchet. A plugin-only change bumps this, leaving engineCid stable.
 *
 * The two region CIDs are INPUTS (content functions), not derived from the saved
 * bytes — so the witness tiddlers carry them in a SINGLE write pass. No self-referential
 * fixpoint: the old "strip the genesis-cid tiddler → hash === preSha256" dance is gone.
 */
export interface GenesisArtifact {
  readonly bytes:      Uint8Array;
  readonly sha256:     string;
  readonly cid:        string;
  readonly engineCid:  string;
  readonly pluginsCid: string;
}

// ---------------------------------------------------------------------------
// Region content-CIDs (G-D2: one doc, two ratchets; G-D3: engineCid = true-name)
// ---------------------------------------------------------------------------

/** The two genesis witness tiddlers — one per ratchet region, both in the @oracle plane. */
export const GENESIS_CID_ENGINE_TIDDLER  = `${ORACLE_DOC_URI}/genesis-cid-engine`;
export const GENESIS_CID_PLUGINS_TIDDLER = `${ORACLE_DOC_URI}/genesis-cid-plugins`;

/**
 * engineCid — content-CID of the engine region. A pure function of the TW5 core
 * version + its sha256 (which binds the core blob); deterministic, no doc bytes.
 * This IS the hearth true-name (G-D3) — a plugin change must NEVER perturb it.
 */
export function computeEngineCid(coreVersion: string, coreSha256: string): string {
  return cidV1Sha256(utf8Bytes(`engine/v1\ncore-version:${coreVersion}\ncore-sha256:${coreSha256}`));
}

/**
 * pluginsCid — content-CID of the plugins region: the sorted {id,version,sha256}
 * triples, canonical-JSON. Sorted by id so plugin write-order never perturbs it.
 */
export function computePluginsCid(
  plugins: readonly { readonly id: string; readonly version: string; readonly sha256: string }[],
): string {
  const triples = plugins
    .map((p) => ({ id: p.id, version: p.version, sha256: p.sha256 }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return cidV1Sha256(utf8Bytes(`plugins/v1\n${JSON.stringify(triples)}`));
}

// ---------------------------------------------------------------------------
// Root bag catalog
// ---------------------------------------------------------------------------

const ROOT_BAGS = [
  { bagId: ORACLE_DOC_URI,     label: "ha — runtime system island (Oracle)",       readPolicy: "public",  writePolicy: "private" },
  { bagId: LARARIUM_DOC_URI,   label: "ha — memetic corpus (Lararium)",            readPolicy: "public",  writePolicy: "private" },
  { bagId: CATALOG_DOC_URI,    label: "ka — corpus discovery (Catalog)",            readPolicy: "public",  writePolicy: "private" },
  { bagId: LARES_DOC_URI,      label: "ba — persona & doctrine (Lares)",            readPolicy: "public",  writePolicy: "private" },
  { bagId: IDENTITIES_DOC_URI, label: "ha — principals (Identities)",               readPolicy: "private", writePolicy: "private" },
  { bagId: CIRCLES_DOC_URI,    label: "ka — collective authority (Circles)",        readPolicy: "private", writePolicy: "private" },
  { bagId: SESSIONS_DOC_URI,   label: "ba — live operator sessions (Sessions)",     readPolicy: "private", writePolicy: "private" },
] as const;

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------

/**
 * buildGenesisDoc() — construct a deterministic genesis island Automerge binary.
 *
 * Platform-neutral. No filesystem, no DOM. Accepts assembled byte inputs;
 * returns a GenesisArtifact ready for any write sink.
 *
 * Steps:
 *   1. Init Automerge doc with pinned actorSeed.
 *   2. Write schema, blobs (core + plugins), systemTitles.
 *   3. Write recipe and bag descriptor tiddlers.
 *   4. Write blob descriptor tiddlers.
 *   5. Witness the two region content-CIDs (engine + plugins, single pass).
 *   6. Return artifact.
 */
export function buildGenesisDoc(inputs: GenesisInputs): GenesisArtifact {
  const coreSha = inputs.coreSha256 ?? sha256HexBytesSync(inputs.coreBlob);
  const coreVersion = inputs.coreVersion;

  // 1. Init with pinned actor.
  let doc = automergeInit<LarDoc>({ actor: inputs.actorSeed });
  doc = automergeChange(doc, { time: 0 }, d => {
    const r = d as unknown as Record<string, unknown>;
    r["schemaVersion"] = "0.1";
    r["blobs"]         = {};
    r["tiddlers"]      = {};
  });

  // 2a. Write TW5 core blob.
  const coreEntry: LarBlobEntry = {
    id:       ENGINE_CORE_ID,
    version:  coreVersion,
    sha256:   coreSha,
    mimeType: "application/javascript",
    blob:     inputs.coreBlob,
    license:  "BSD-3-Clause",
    author:   "UnaMesa Association",
    source:   "https://tiddlywiki.com",
  };
  doc = automergeChange(doc, { time: 0 }, d => {
    (d.blobs as Record<string, LarBlobEntry>)[ENGINE_CORE_ID] = coreEntry;
  });

  // 2b. Write vendored plugin blobs.
  for (const entry of inputs.plugins) {
    const blobEntry: LarBlobEntry = {
      id:       entry.id,
      version:  entry.version,
      sha256:   entry.sha256,
      mimeType: entry.mimeType,
      blob:     entry.blob,
      ...(entry.license && { license: entry.license }),
      ...(entry.author  && { author:  entry.author }),
      ...(entry.source  && { source:  entry.source }),
    };
    doc = automergeChange(doc, { time: 0 }, d => {
      (d.blobs as Record<string, LarBlobEntry>)[entry.id] = blobEntry;
    });
  }

  // Genesis seeds the SYSTEM wiki-recipes (operator ruling 2026-06-16, GD-6):
  // @lares and @lararium are DreamNet system bags, each a quine wiki; their
  // recipes ride the @oracle system plane (this genesis doc), never @catalog.
  // USER recipes still mint into @catalog by init-wiki — genesis stays pure of
  // user composition.

  // 4. Write bag descriptor tiddlers.
  doc = automergeChange(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;
    for (const { bagId, label, readPolicy, writePolicy } of ROOT_BAGS) {
      tiddlers[bagDescriptorUri(bagId)] = {
        tiddler: {
          title: bagDescriptorUri(bagId),
          label, readPolicy, writePolicy,
          "origin-bag": ORACLE_DOC_URI,
        },
        meta: { authority: "genesis" },
      };
    }
  });

  // 4b. Write the SYSTEM wiki-recipes into the @oracle plane. Quine wikis — the
  // wiki bag IS the @ bag. @lares wiki = @oracle floor + @lararium library +
  // @lares write-layer; @lararium wiki = @oracle floor + @lararium write-layer.
  // recipe-watch reads these via recipeUri("@oracle", slug) for system wikis.
  doc = automergeChange(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;
    const systemRecipe = (slug: string, bagStack: string, writableBag: string) => {
      const title = recipeUri("@oracle", slug);
      tiddlers[title] = {
        tiddler: { title, label: slug, "bag-stack": bagStack, "writable-bag": writableBag },
        meta: { authority: "genesis" },
      };
    };
    systemRecipe(
      "lares",
      `${ORACLE_DOC_URI} ${LARARIUM_DOC_URI} ${LARES_DOC_URI} ${wikiDraftBagUri("lares")}`,
      wikiDraftBagUri("lares"),
    );
    systemRecipe(
      "lararium",
      `${ORACLE_DOC_URI} ${LARARIUM_DOC_URI} ${wikiDraftBagUri("lararium")}`,
      wikiDraftBagUri("lararium"),
    );
  });

  // 5. Write blob descriptor tiddlers.
  doc = automergeChange(doc, { time: 0 }, d => {
    const tiddlers = d.tiddlers as Record<string, unknown>;
    const blobs    = (d.blobs ?? {}) as Record<string, LarBlobEntry>;
    for (const [blobId, entry] of Object.entries(blobs)) {
      const isPlugin = blobId.startsWith("$:/plugins/") || blobId.startsWith("lar:///plugins/");
      const att = inputs.plugins.find(p => p.id === blobId)?.attestation;
      tiddlers[blobDescriptorUri(blobId)] = {
        tiddler: {
          title:  blobDescriptorUri(blobId),
          text:   blobId,
          sha256:   entry.sha256,
          version:  entry.version,
          mimeType: entry.mimeType,
          ...(entry.author  && { author:  entry.author }),
          ...(entry.source  && { source:  entry.source }),
          ...(entry.license && { license: entry.license }),
          ...(isPlugin && { pluginInstallable: "true", pluginTitle: blobId }),
          ...(att && {
            buildAttestationFormat:    att.format,
            canonicalTitle:            att.canonicalTitle,
            ...(att.compatibilityTitle   && { compatibilityTitle:   att.compatibilityTitle }),
            moduleManifestPath:          att.moduleManifestPath,
            moduleManifestSha256:        att.moduleManifestSha256,
            ...(att.sourceManifestPath   && { sourceManifestPath:   att.sourceManifestPath }),
            ...(att.sourceManifestSha256 && { sourceManifestSha256: att.sourceManifestSha256 }),
            ...(att.packTranscriptPath   && { packTranscriptPath:   att.packTranscriptPath }),
            ...(att.packTranscriptSha256 && { packTranscriptSha256: att.packTranscriptSha256 }),
            moduleCount:        String(att.moduleCount),
            packedTiddlerCount: String(att.packedTiddlerCount),
            pluginJsonSha256:   att.pluginJsonSha256,
          }),
          tags: isPlugin ? "blob-descriptor plugin-descriptor" : "blob-descriptor",
          "origin-bag": ORACLE_DOC_URI,
        },
        meta: { authority: "genesis" },
      };
    }
  });

  // 6. Witness the two region content-CIDs in a SINGLE pass.
  //
  //   The region CIDs are pure functions of the INPUTS (engine: core version + sha;
  //   plugins: sorted id/version/sha256), never of the saved bytes — so they carry
  //   their real values on first write. No placeholder, no two-pass fixpoint.
  //   engineCid = the hearth true-name (slow ratchet); pluginsCid = the fast ratchet.
  const engineCid  = computeEngineCid(coreVersion, coreSha);
  const pluginsCid = computePluginsCid(inputs.plugins);

  doc = automergeChange(doc, { time: 0 }, d => {
    const t = d.tiddlers as Record<string, unknown>;
    t[GENESIS_CID_ENGINE_TIDDLER] = {
      tiddler: {
        title: GENESIS_CID_ENGINE_TIDDLER,
        text:  "",
        cid:   engineCid,
        note:  "engine content-CID (TW5 core + version) — the hearth true-name; slow ratchet",
        "origin-bag": ORACLE_DOC_URI,
      },
      meta: { authority: "genesis" },
    };
    t[GENESIS_CID_PLUGINS_TIDDLER] = {
      tiddler: {
        title: GENESIS_CID_PLUGINS_TIDDLER,
        text:  "",
        cid:   pluginsCid,
        note:  "plugins content-CID (sorted plugin id/version/sha256) — fast ratchet",
        "origin-bag": ORACLE_DOC_URI,
      },
      meta: { authority: "genesis" },
    };
  });

  const bytes  = automergeSave(doc);
  const sha256 = sha256HexBytesSync(bytes);
  const cid    = cidV1Sha256(bytes);

  return { bytes, sha256, cid, engineCid, pluginsCid };
}

// ---------------------------------------------------------------------------
// Smoke verifier
// ---------------------------------------------------------------------------

/**
 * verifyGenesisArtifact() — reload and assert the core blob + BOTH region witness
 * tiddlers present, then RECOMPUTE each region content-CID from the reloaded content
 * and assert it matches the witness AND the artifact. A content-CID is a pure function
 * of inputs, so a mismatch names a corrupt or tampered artifact — never a fixpoint wobble.
 *
 * Throws on failure. Returns tiddler/blob counts for diagnostics.
 * Platform-neutral — uses automergeLoad from mesh.
 */
export function verifyGenesisArtifact(
  artifact: GenesisArtifact,
): { blobCount: number; tiddlerCount: number } {
  const doc = automergeLoad<LarDoc>(artifact.bytes);

  const core = doc.blobs?.[ENGINE_CORE_ID];
  if (!core) {
    throw new Error("[genesis] verify FAILED: TW5 core blob not found after reload");
  }

  const readWitness = (title: string): string => {
    const cid = (doc.tiddlers?.[title] as { tiddler?: { cid?: string } } | undefined)?.tiddler?.cid;
    if (!cid || cid.length < 10) {
      throw new Error(`[genesis] verify FAILED: witness tiddler ${title} absent or empty — stored=${cid}`);
    }
    return cid;
  };
  const storedEngineCid  = readWitness(GENESIS_CID_ENGINE_TIDDLER);
  const storedPluginsCid = readWitness(GENESIS_CID_PLUGINS_TIDDLER);

  const recomputedEngineCid = computeEngineCid(core.version, core.sha256);
  if (recomputedEngineCid !== storedEngineCid || recomputedEngineCid !== artifact.engineCid) {
    throw new Error(
      `[genesis] verify FAILED: engineCid (hearth true-name) mismatch — ` +
      `recomputed=${recomputedEngineCid} stored=${storedEngineCid} artifact=${artifact.engineCid}`,
    );
  }
  const pluginEntries = Object.values(doc.blobs ?? {}).filter((b) => b.id !== ENGINE_CORE_ID);
  const recomputedPluginsCid = computePluginsCid(pluginEntries);
  if (recomputedPluginsCid !== storedPluginsCid || recomputedPluginsCid !== artifact.pluginsCid) {
    throw new Error(
      `[genesis] verify FAILED: pluginsCid mismatch — ` +
      `recomputed=${recomputedPluginsCid} stored=${storedPluginsCid} artifact=${artifact.pluginsCid}`,
    );
  }

  return {
    blobCount:    Object.keys(doc.blobs ?? {}).length,
    tiddlerCount: Object.keys(doc.tiddlers ?? {}).length,
  };
}
