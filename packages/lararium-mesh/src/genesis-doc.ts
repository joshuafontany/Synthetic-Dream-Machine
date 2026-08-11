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
 * Schema: lar:///ha.ka.ba/lararium/mesh/genesis-doc
 */

import {
  init  as automergeInit,
  change as automergeChange,
  save   as automergeSave,
  load   as automergeLoad,
} from "@automerge/automerge";
import { PLUGIN_ATTESTATION_DOMAIN } from "./domains.js";
import { stringifyAutomergeUrl } from "@automerge/automerge-repo";
import { canonicalJsonBytes } from "./crypto.js";
import type { AutomergeUrl, BinaryDocumentId } from "@automerge/automerge-repo";
import { cidV1Sha256, sha256HexBytesSync, sha256BytesSync, utf8Bytes } from "./crypto.js";
import { buildGenesisCasManifest, type GenesisCasManifest } from "./cas.js";
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
  /**
   * The builder's signature over the canonical bytes of every field above.
   *
   * WHY AN UNSIGNED ATTESTATION CERTIFIES NOTHING. The hashes here bind BYTES excellently and bind
   * PROVENANCE not at all — anyone who can write the file can write the digests to match whatever they
   * shipped. The signature names WHO stood behind the build, which is the only thing a reader could not
   * have recomputed for themselves.
   *
   * OPTIONAL, and the absence reads honestly rather than fatally: an unsigned attestation still carries
   * usable diff handles, and `verifyPluginAttestation` reports UNSIGNED as its own verdict rather than
   * folding it into "invalid". A reader decides what an unsigned build may seed.
   */
  readonly builder?:                { readonly signer: string; readonly sig: string };
}

/** The domain an attestation signs within. A signature means nothing without the domain it was made in. */
export { PLUGIN_ATTESTATION_DOMAIN } from "./domains.js";
/** The canonical bytes an attestation signs over — every field EXCEPT the signature that covers them. */
export function pluginAttestationBytes(a: Omit<PluginBuildAttestation, "builder">): Uint8Array {
  return canonicalJsonBytes({ domain: PLUGIN_ATTESTATION_DOMAIN, ...a });
}

/**
 * Sign an attestation. The caller supplies the signer — this module holds no key and mints no authority,
 * the same discipline `cabal-invite` keeps.
 */
export async function signPluginAttestation(
  a: Omit<PluginBuildAttestation, "builder">,
  signer: string,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<PluginBuildAttestation> {
  return { ...a, builder: { signer, sig: await sign(pluginAttestationBytes(a)) } };
}

/** What a reader learns about who stood behind a build. UNSIGNED reads as its own answer, never as invalid. */
export type PluginAttestationRead = "unsigned" | "forged" | { readonly signer: string };

/**
 * Read an attestation's provenance OFFLINE — no reachable builder, no clock, nothing to phone.
 *
 * Returns the signer when the signature holds, `forged` when it does not, and `unsigned` when none rides.
 * It reports and never refuses: whether an unsigned or foreign-signed build may seed a hearth stays the
 * reader's policy, because a rule baked here would decide every operator's trust from one seat.
 */
export async function verifyPluginAttestation(
  a: PluginBuildAttestation,
  verify: (bytes: Uint8Array, sigHex: string, signerHex: string) => Promise<boolean>,
): Promise<PluginAttestationRead> {
  const builder = a.builder;
  if (!builder) return "unsigned";
  const { builder: _covered, ...covered } = a;
  return await verify(pluginAttestationBytes(covered), builder.sig, builder.signer)
    ? { signer: builder.signer }
    : "forged";
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
  /**
   * The CAS manifest — the byte SOURCE the genesis doc no longer embeds. Names
   * every `genesis/cas/<cid>` file (engine + plugins) so the loader mirrors exactly
   * them into the runtime CAS. Write it beside island.bin as island.manifest.json.
   */
  readonly casManifest: GenesisCasManifest;
  /**
   * Every CAS-bound blob's {cid, bytes} — what the build sink writes to
   * `genesis/cas/<cid>`. Held in memory only; never embedded in the CRDT.
   */
  readonly casEntries:  readonly { readonly cid: string; readonly bytes: Uint8Array }[];
  /**
   * The PLAIN-DATA genesis seed — the @oracle's initial state as JSON (no Automerge
   * bytes). The build sink writes it to `island.genesis.json`; the boot MATERIALIZES
   * the @oracle CRDT fresh from it under the deterministic doc id (slice 2). This is
   * the boot artifact now — the Automerge `bytes`/island.bin survive only as a test
   * fixture + determinism witness, no longer read at boot.
   */
  readonly seed:        GenesisSeed;
}

// ---------------------------------------------------------------------------
// The plain-data genesis seed (slice 2: genesis is data, not a baked CRDT)
// ---------------------------------------------------------------------------

export const GENESIS_SEED_FORMAT = "lararium-genesis-seed/v1" as const;

/**
 * GenesisSeed — the @oracle's initial state as PLAIN DATA (JSON-serializable).
 *
 * It carries exactly what the @oracle CRDT is seeded with: the schema version, the
 * blob METADATA map (descriptors only — bytes ride the CID plane), and the system
 * tiddlers map (bag descriptors, system recipes, blob descriptors, region witnesses).
 * `actorSeed` pins the Automerge actor so `materializeGenesisDoc(seed)` is byte-stable
 * — two peers materialize byte-identical history, safe to share one deterministic id.
 */
export interface GenesisSeed {
  readonly format:        typeof GENESIS_SEED_FORMAT;
  readonly actorSeed:     string;
  readonly schemaVersion: string;
  readonly blobs:         Record<string, LarBlobEntry>;
  readonly tiddlers:      Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Region content-CIDs (G-D2: one doc, two ratchets; G-D3: engineCid = true-name)
// ---------------------------------------------------------------------------

/** The two genesis witness tiddlers — one per ratchet region, both in the @oracle plane. */
export const GENESIS_CID_ENGINE_TIDDLER  = `${ORACLE_DOC_URI}/genesis-cid-engine`;
export const GENESIS_CID_PLUGINS_TIDDLER = `${ORACLE_DOC_URI}/genesis-cid-plugins`;

// ---------------------------------------------------------------------------
// The @oracle deterministic doc id (slice 2: materialize-fresh, no shipped binary)
// ---------------------------------------------------------------------------

/**
 * The well-known seed for the @oracle's deterministic DocumentId. STABLE FOREVER —
 * it derives from the @oracle's canonical URI alone, never from the engine/plugin
 * content, so the public crossroads board keeps ONE address across every engine
 * churn and every peer (churn advances the pointer, never re-genesis). A
 * content-derived id would fork the board on each rebuild — the anti-pattern.
 */
export const ORACLE_GENESIS_DOC_SEED = `${ORACLE_DOC_URI}#genesis-doc-id` as const;

/**
 * oracleGenesisDocUrl — the @oracle's DETERMINISTIC automerge: url.
 *
 * Derived from the well-known seed: the first 16 bytes of its sha256 form the
 * BinaryDocumentId. Every vessel (this peer across reboots; future mesh peers)
 * computes the SAME url, so a freshly-materialized @oracle re-loads under one
 * stable id (persist-across-restart) and peers materialize one shared board.
 *
 * Cross-VERSION caveat (the epoch-ratchet residual): two peers that materialize
 * fresh from DIFFERENT engine versions seed different histories under this one id.
 * In practice a peer SYNCS an existing board rather than re-materialize; the rare
 * structural shift rides the epoch boundary, far-future.
 */
export function oracleGenesisDocUrl(): AutomergeUrl {
  const binId = sha256BytesSync(utf8Bytes(ORACLE_GENESIS_DOC_SEED)).slice(0, 16) as BinaryDocumentId;
  return stringifyAutomergeUrl({ documentId: binId });
}

/**
 * engineCid — content-CID of the engine region, and the hearth's true-name. A pure function of the
 * core BLOB's sha256; deterministic, no doc bytes. A plugin change must NEVER perturb it.
 *
 * THE VERSION LABEL RIDES NOWHERE NEAR THIS PREIMAGE, deliberately. Folding a version string in beside
 * the digest makes a pure RE-TAG — identical bytes, `5.5.0-prerelease` renamed `5.5.0` — mint a fresh
 * true-name, which manufactures a schism out of an editorial act. The sha256 already binds every byte
 * the label could describe; the label adds a false difference and no true one. `coreVersion` still
 * rides the blob DESCRIPTOR for a human to read, where a wrong label misleads nobody's identity.
 */
export function computeEngineCid(_coreVersion: string, coreSha256: string): string {
  return cidV1Sha256(utf8Bytes(`engine/v1\ncore-sha256:${coreSha256}`));
}

/**
 * pluginsCid — content-CID of the plugins region: the sorted {id,sha256} PAIRS, canonical-JSON, sorted
 * by id so write-order never perturbs it. Versions stay OUT for the same reason they leave the engine
 * preimage — a re-tag must not read as a different composition.
 */
export function computePluginsCid(
  plugins: readonly { readonly id: string; readonly version: string; readonly sha256: string }[],
): string {
  const pairs = plugins
    .map((p) => ({ id: p.id, sha256: p.sha256 }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return cidV1Sha256(utf8Bytes(`plugins/v1\n${JSON.stringify(pairs)}`));
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
 * buildGenesisSeed() — assemble the @oracle's initial state as PLAIN DATA.
 *
 * Platform-neutral, no Automerge: it builds the blob METADATA map (descriptors only;
 * bytes ride the CID plane) and the system tiddlers map (bag descriptors, system
 * recipes, blob descriptors, region witnesses). `materializeGenesisDoc(seed)` turns
 * it into the live @oracle CRDT at boot — the genesis is data, never a baked binary.
 */
export function buildGenesisSeed(inputs: GenesisInputs, coreSha256?: string): GenesisSeed {
  const coreSha     = coreSha256 ?? inputs.coreSha256 ?? sha256HexBytesSync(inputs.coreBlob);
  const coreVersion = inputs.coreVersion;

  // Blob METADATA (core + plugins) — bytes ship as genesis/cas/<cid> files, never here.
  const blobs: Record<string, LarBlobEntry> = {};
  blobs[ENGINE_CORE_ID] = {
    id:       ENGINE_CORE_ID,
    version:  coreVersion,
    sha256:   coreSha,
    mimeType: "application/javascript",
    license:  "BSD-3-Clause",
    author:   "UnaMesa Association",
    source:   "https://tiddlywiki.com",
  };
  for (const entry of inputs.plugins) {
    blobs[entry.id] = {
      id:       entry.id,
      version:  entry.version,
      sha256:   entry.sha256,
      mimeType: entry.mimeType,
      ...(entry.license && { license: entry.license }),
      ...(entry.author  && { author:  entry.author }),
      ...(entry.source  && { source:  entry.source }),
    };
  }

  const tiddlers: Record<string, unknown> = {};

  // Bag descriptor tiddlers.
  for (const { bagId, label, readPolicy, writePolicy } of ROOT_BAGS) {
    tiddlers[bagDescriptorUri(bagId)] = {
      tiddler: { title: bagDescriptorUri(bagId), label, readPolicy, writePolicy, "origin-bag": ORACLE_DOC_URI },
      meta: { authority: "genesis" },
    };
  }

  // SYSTEM wiki-recipes — @lares + @lararium quine
  // wikis ride the @oracle system plane, never @catalog (USER recipes mint into @catalog).
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

  // Blob descriptor tiddlers (sorted by blob id — deterministic).
  for (const blobId of Object.keys(blobs).sort()) {
    const entry    = blobs[blobId]!;
    const isPlugin = blobId.startsWith("$:/plugins/") || blobId.startsWith("lar:///plugins/");
    const att      = inputs.plugins.find(p => p.id === blobId)?.attestation;
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

  // Region content-CID witnesses (engine = slow ratchet / true-name; plugins = fast).
  const engineCid  = computeEngineCid(coreVersion, coreSha);
  const pluginsCid = computePluginsCid(inputs.plugins);
  tiddlers[GENESIS_CID_ENGINE_TIDDLER] = {
    tiddler: {
      title: GENESIS_CID_ENGINE_TIDDLER, text: "", cid: engineCid,
      note:  "engine content-CID (TW5 core + version) — the hearth true-name; slow ratchet",
      "origin-bag": ORACLE_DOC_URI,
    },
    meta: { authority: "genesis" },
  };
  tiddlers[GENESIS_CID_PLUGINS_TIDDLER] = {
    tiddler: {
      title: GENESIS_CID_PLUGINS_TIDDLER, text: "", cid: pluginsCid,
      note:  "plugins content-CID (sorted plugin id/version/sha256) — fast ratchet",
      "origin-bag": ORACLE_DOC_URI,
    },
    meta: { authority: "genesis" },
  };

  return { format: GENESIS_SEED_FORMAT, actorSeed: inputs.actorSeed, schemaVersion: "0.1", blobs, tiddlers };
}

/**
 * materializeGenesisDoc() — build the @oracle Automerge bytes from the plain-data seed.
 *
 * Deterministic: pinned actor (`seed.actorSeed`), `time: 0`, sorted key order — two
 * peers materialize byte-identical history, so they may share one deterministic doc
 * id safely. Called at BOOT (open-node-vessel) to seed a fresh @oracle, and by the
 * build (back-compat island.bin + the verifier). The genesis ships as `seed`, never
 * as these bytes.
 */
export function materializeGenesisDoc(seed: GenesisSeed): Uint8Array {
  let doc = automergeInit<LarDoc>({ actor: seed.actorSeed });
  doc = automergeChange(doc, { time: 0 }, d => {
    const r = d as unknown as Record<string, unknown>;
    r["schemaVersion"] = seed.schemaVersion;
    const blobs: Record<string, unknown> = {};
    for (const k of Object.keys(seed.blobs).sort()) blobs[k] = seed.blobs[k];
    r["blobs"] = blobs;
    const tiddlers: Record<string, unknown> = {};
    for (const k of Object.keys(seed.tiddlers).sort()) tiddlers[k] = seed.tiddlers[k];
    r["tiddlers"] = tiddlers;
  });
  return automergeSave(doc);
}

/**
 * buildGenesisDoc() — construct the genesis artifact: the plain-data seed (the boot
 * artifact), the deterministic Automerge bytes (back-compat island.bin + verifier),
 * the two region CIDs, and the CAS manifest + blob entries (the CID plane).
 *
 * Platform-neutral. No filesystem, no DOM. Accepts assembled byte inputs.
 */
export function buildGenesisDoc(inputs: GenesisInputs): GenesisArtifact {
  const coreSha     = inputs.coreSha256 ?? sha256HexBytesSync(inputs.coreBlob);
  const coreVersion = inputs.coreVersion;

  const seed   = buildGenesisSeed(inputs, coreSha);
  const bytes  = materializeGenesisDoc(seed);
  const sha256 = sha256HexBytesSync(bytes);
  const cid    = cidV1Sha256(bytes);

  const engineCid  = computeEngineCid(coreVersion, coreSha);
  const pluginsCid = computePluginsCid(inputs.plugins);

  // The CAS plane: the bytes the CRDT no longer carries, keyed by sha256 (the CID).
  // The build sink writes each to genesis/cas/<cid>; the loader mirrors them by manifest.
  const casEntries: { cid: string; bytes: Uint8Array }[] = [
    { cid: coreSha, bytes: inputs.coreBlob },
    ...inputs.plugins.map((p) => ({ cid: p.sha256, bytes: p.blob })),
  ];
  const casManifest = buildGenesisCasManifest(engineCid, pluginsCid, [
    { id: ENGINE_CORE_ID, sha256: coreSha, mimeType: "application/javascript", version: coreVersion },
    ...inputs.plugins.map((p) => ({ id: p.id, sha256: p.sha256, mimeType: p.mimeType, version: p.version })),
  ]);

  return { bytes, sha256, cid, engineCid, pluginsCid, casManifest, casEntries, seed };
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
