/**
 * ingest-core — the disk→records gesture, factored out of `cmdIngest` so the
 * one-shot CLI command AND the long-lived watcher daemon run the SAME path.
 *
 * Two legs live here; the third leg lives on the island:
 *   scan  — walk source for `.mem` carriers, derive each uri by the loci law,
 *           NFC-assert at the shore, hash, diff disk-hash vs synced-hash
 *   submit — pack NEW+CHANGED carriers (hashes riding with the text) into one
 *            INGEST verb; the island's gate supplies currentRenderHash (leg 3)
 *
 * The gesture holds the disk grant and the Synced tree; the island holds
 * neither (readiness reads local on both sides of the shore). A watcher is
 * just this gesture fired on a settle instead of on an operator keystroke.
 *
 * Meme: lar:///ha.ka.ba/lares/docs/handoff
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, sep, extname } from "node:path";
import { newChangeId, taskContentId, carrierHash, digestsEqual, BAG_MANIFEST_FILE } from "@lararium/mesh";
import { SyncedTree, syncedTreeKey, bagsFileToUri, wikisFileToUri, larProjectionDir } from "@lararium/node";
import type { SubmitResult } from "./verb-result.js";
import { runVerb } from "./verb-call.js";
import { stageBodyToCas, carrierCasFlagged } from "./cas-stage.js";

export type ScanStatus = "new" | "unchanged" | "changed" | "non-nfc" | "deleted" | "renamed";

/** A vanished carrier the Synced tree still projects — rides an INGEST wave's
 *  `deletions[]`; the island gate splits rename re-links from tombstones. */
export interface PendingDeletion {
  readonly uri:        string;
  readonly syncedHash: string;
}

export interface ScanRow {
  readonly file:       string;
  readonly uri:        string;
  readonly text:       string;
  readonly diskHash:   string;
  readonly syncedHash: string | null;
  readonly status:     ScanStatus;
  /** The file's extension (".mem" / ".tid" / ".json" / ".md" …); rides the
   *  INGEST carrier so the island routes by TW5's own filetype registry. */
  readonly ext:        string;
  /** The body failed the utf8 round-trip (a raw binary shard rides base64) — feeds the
   *  opt-in-CAD backstop, which externalizes a binary body even absent the `_lar_cas` flag. */
  readonly binary?:    boolean;
  /** Raw `<file>.meta` sidecar text when one sits beside a content file — rides
   *  the carrier so the island keeps the sidecar's fields across a body edit.
   *  Absent for a self-contained filetype (`.mem`/`.tid`) or no sidecar. */
  readonly meta?:      string;
  /** R2 — set on a `renamed` row: the VANISHED source URI whose byte-identical
   *  observation this carrier re-homes. The row rides as an ADD (so the island
   *  re-links records change-id-preserving via the delete-gate), the source rides
   *  the wave as a rename-deletion, and the CLI moves the observation post-confirm. */
  readonly renameFrom?: string;
}

export interface ScanResult {
  readonly rows:    ScanRow[];
  readonly skipped: string[];
  /** R2 — the rename-deletions a FULL scan discovered (each `renamed` row's gone
   *  source), threaded into the INGEST wave's `deletions[]` so the island pairs
   *  them and re-homes records. Absent on a partial (watcher) scan, which keeps
   *  its own grace-window + delete-gate rename path. */
  readonly renameDeletions?: PendingDeletion[];
}

/** Open the Synced tree at the canonical projection-state path (larProjectionDir() —
 *  runtime vessel state, not corpus). */
export function openSyncedTree(): SyncedTree {
  return new SyncedTree(join(larProjectionDir(), "synced-tree.json"));
}

/**
 * Read a carrier's bytes as the string form the tiddler `text` field holds — utf8
 * for a text filetype, base64 for a binary one (image/PDF). The detection needs no
 * registry and no extension list: bytes that survive a utf8 round-trip ARE text;
 * bytes that do not ARE binary, and ride as base64 (the island stores the base64
 * as-is, the projector decodes it back to raw bytes). A base64 body carries no
 * SOH heading, so it routes to the native filetype path exactly as it should.
 */
export function readCarrierText(file: string): { text: string; binary: boolean } {
  const buf  = readFileSync(file);
  const utf8 = buf.toString("utf8");
  if (Buffer.from(utf8, "utf8").equals(buf)) return { text: utf8, binary: false };
  return { text: buf.toString("base64"), binary: true };
}

/**
 * List the carriers under a source — a directory walks recursively for every
 * REAL file (a `.meta` sidecar rides with its content file, never as a carrier
 * of its own), a single file lists itself. Returns null when the source does
 * not resolve. Filetype routing is the ISLAND's job (TW5's registry); the Node
 * gesture only enumerates + carries the extension. Observations only, never a
 * work queue (Confluence: scan is truth, events are hints).
 */
export function listCarriers(source: string): string[] | null {
  let st;
  try { st = statSync(source); } catch { return null; }
  if (!st.isDirectory()) return [source];
  // A bag's OWN declaration is DISK-OWNED and never becomes a record (operator ruling, 2026-08-08). Seeded,
  // it would land in the bag's document and then round-trip through the projection — after which a wiki edit
  // could re-home the bag or loosen its cap-tier. A declaration a rendered surface can move is a declaration
  // nothing holds, so the authority stays on disk where `lares bag declare` writes it. Only the holding
  // ROOT's manifest is excluded: a meme deeper in the tree may legitimately carry that name.
  const bagDeclaration = join(source, BAG_MANIFEST_FILE);
  return (readdirSync(source, { recursive: true }) as string[])
    .map((f) => join(source, f))
    .filter((f) => { try { return statSync(f).isFile(); } catch { return false; } })
    // A `.meta` sidecar carries a content file's fields — it lands WITH that
    // file at the shore, never as a standalone carrier.
    .filter((f) => !f.endsWith(".meta"))
    .filter((f) => f !== bagDeclaration);
}

/** Derive a file's carrier-root URI for one mirror plane (bags/ canon vs
 *  wikis/ working write-layer). The watcher and CLI both feed a source; this
 *  names which loci reverse-derivation a row carries. */
export type FileToUriFn = (root: string, file: string) => string | null;

/**
 * Pick the loci reverse-derivation by which mirror plane the source sits in.
 * Under `<root>/wikis/` → the working write-layer ingest-back derivation
 * (the editing plane); else the bags/ canon derivation. Designation of the
 * target bag stays the caller's (`--to`); the plane only drives the URI.
 */
export function fileToUriForSource(root: string, source: string): FileToUriFn {
  const wikisRoot = join(root, "wikis");
  const abs = resolve(source);
  return abs === wikisRoot || abs.startsWith(wikisRoot + sep) ? wikisFileToUri : bagsFileToUri;
}

/**
 * The two-leg diff over an explicit carrier list: derive uri, NFC-assert, hash,
 * compare against the Synced tree. The watcher feeds the buffered changed paths
 * here; the CLI feeds the whole walked source. `fileToUri` names the mirror
 * plane (default bags/ canon; wikis/ for working ingest-back).
 */
export function scanFiles(
  root:  string,
  files: readonly string[],
  toBag: string,
  tree:  SyncedTree,
  fileToUri: FileToUriFn = bagsFileToUri,
): ScanResult {
  const rows: ScanRow[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const uri = fileToUri(root, file);
    if (!uri) { skipped.push(file); continue; }
    const ext = extname(file);
    let text: string;
    let binary: boolean;
    try { ({ text, binary } = readCarrierText(file)); } catch {
      // A path gone from disk that the Synced tree still projects = a deletion
      // candidate (the watcher feeds vanished paths; the grace window + the
      // island gate confirm before any tombstone). An unknown gone path skips.
      const goneSynced = tree.get(syncedTreeKey(toBag, uri));
      if (goneSynced !== null) rows.push({ file, uri, text: "", diskHash: "", syncedHash: goneSynced, status: "deleted", ext });
      else skipped.push(file);
      continue;
    }
    // The NFC shore assertion (spec: memetic-wikitext-framing #carrier-bytes) — foreign
    // TEXT bytes first walk in HERE; non-NFC refuses loudly, never enters. A binary
    // carrier rides base64 (pure ASCII), so the NFC law does not touch it.
    if (!binary && text !== text.normalize("NFC")) {
      rows.push({ file, uri, text, diskHash: "", syncedHash: null, status: "non-nfc", ext });
      continue;
    }
    // Pair a `.meta` sidecar sitting beside a content file — its fields ride WITH
    // the carrier, AND fold into the observation hash: `.meta` holds LIVE metadata
    // for the entity, so an edit to it alone must read as CHANGED (a body-only
    // hash let a field-only edit slip past the echo gate).
    let meta: string | undefined;
    try {
      const metaPath = file + ".meta";
      if (existsSync(metaPath)) meta = readFileSync(metaPath, "utf8");
    } catch { /* no readable sidecar — a self-contained filetype needs none */ }
    const diskHash   = carrierHash(text, meta);
    const syncedHash = tree.get(syncedTreeKey(toBag, uri));
    // Dual-read: the tree value may be stored bare (pre-agile) while `diskHash`
    // comes freshly computed (tagged post-step-3) — `digestsEqual` normalizes the
    // straddle, so a byte-identical carrier still reads "unchanged" across the tag
    // boundary (no mass re-land). Behaviour byte-identical on today's all-bare store.
    const status: ScanStatus =
      syncedHash === null ? "new" : digestsEqual(diskHash, syncedHash) ? "unchanged" : "changed";
    rows.push({ file, uri, text, diskHash, syncedHash, status, ext, binary, ...(meta !== undefined ? { meta } : {}) });
  }
  return { rows, skipped };
}

/**
 * Record a landed PACK's synced observation — the gesture's job, because a pack
 * file never projects back (its foreign-titled members don't map to the carrier
 * URI), so the projector never sets its synced hash. Without this every re-scan
 * re-lands the whole bundle; with it, an UNCHANGED pack reads "unchanged" next
 * scan and noops. Returns the count recorded; the caller flushes the tree.
 */
export function recordLandedPacks(
  tree: SyncedTree,
  toBag: string,
  candidates: readonly ScanRow[],
  resultCarriers: ReadonlyArray<Record<string, unknown>>,
): number {
  const byUri = new Map(candidates.map((c) => [c.uri, c] as const));
  let recorded = 0;
  for (const c of resultCarriers) {
    if (c["decision"] === "ingest" && typeof c["pack"] === "string") {
      const cand = byUri.get(String(c["uri"]));
      if (cand) { tree.set(syncedTreeKey(toBag, cand.uri), cand.diskHash); recorded++; }
    }
  }
  return recorded;
}

/**
 * R2 rename-survival — over a FULL scan's rows, recover the observation of a carrier
 * that MOVED (its uri changed) with byte-identical content. For each location-`new`
 * row, ask the Synced tree's content-index for the UNIQUE live carrier already
 * observing that exact content in this bag; when it names a DIFFERENT uri whose file
 * is GONE from disk (not present among this full walk's live carriers — a COPY leaves
 * the source live and never qualifies), the row is a RENAME, not a fresh landing.
 *
 * The renamed row keeps riding as an ADD (so the island's delete-gate re-links its
 * records change-id-preserving), and its gone source rides the wave as a
 * rename-deletion; the caller moves the Synced observation on confirm
 * (`applyConfirmedRenames`). A genuine EDIT never matches (its hash changed); two
 * carriers sharing content decline (the index answers null on a >1 collision).
 *
 * FULL-scan only: `liveUris` must be the WHOLE on-disk carrier set for the gone-guard
 * to read true, which a partial (watcher) wave cannot supply — so the watcher keeps
 * its grace-window + delete-gate path and never calls this.
 */
export function resolveRenames(rows: ScanRow[], toBag: string, tree: SyncedTree): { rows: ScanRow[]; renameDeletions: PendingDeletion[] } {
  const liveUris = new Set(rows.filter((r) => r.status !== "deleted").map((r) => r.uri));
  const renameDeletions: PendingDeletion[] = [];
  const claimedSources = new Set<string>();   // one source re-homes at most once per wave
  const out = rows.map((r) => {
    if (r.status !== "new") return r;
    const src = tree.renameSourceUri(toBag, r.diskHash);
    if (src === null || src === r.uri || liveUris.has(src) || claimedSources.has(src)) return r;
    const srcHash = tree.get(syncedTreeKey(toBag, src));
    if (srcHash === null) return r;             // the index and the map disagree — decline, never guess
    claimedSources.add(src);
    renameDeletions.push({ uri: src, syncedHash: srcHash });
    return { ...r, status: "renamed" as ScanStatus, renameFrom: src };
  });
  return { rows: out, renameDeletions };
}

/** Walk a source and scan it whole. Returns null when the source does not
 *  resolve. `fileToUri` defaults to the source's mirror plane (bags/ vs wikis/).
 *  A full walk resolves renames (R2) — a moved carrier's observation survives. */
export function scanSource(
  root:   string,
  source: string,
  toBag:  string,
  tree:   SyncedTree,
  fileToUri: FileToUriFn = fileToUriForSource(root, source),
): ScanResult | null {
  const files = listCarriers(source);
  if (files === null) return null;
  const scan = scanFiles(root, files, toBag, tree, fileToUri);
  const { rows, renameDeletions } = resolveRenames(scan.rows, toBag, tree);
  return { rows, skipped: scan.skipped, ...(renameDeletions.length > 0 ? { renameDeletions } : {}) };
}

/** The rows an INGEST submission carries — NEW, CHANGED, and RENAMED. A `renamed`
 *  row rides as an ADD so the island's delete-gate pairs it with its gone source and
 *  re-links the records (change-id preserved); it returns `rename-target`, never a
 *  fresh re-land. */
export function candidatesOf(rows: readonly ScanRow[]): ScanRow[] {
  return rows.filter((r) => r.status === "new" || r.status === "changed" || r.status === "renamed");
}

/**
 * R2 — move the Synced observation for each rename the island CONFIRMED. Reads the
 * authoritative `deletions.renames` the gate returned (never the CLI's own guess),
 * so a suspended wave (mass-delete brake) moves nothing. For each `fromUri → toUri`
 * it drops the stale source observation and records the moved carrier's hash at the
 * new location — so the NEXT scan reads the moved carrier `unchanged` and never
 * re-lands it. Returns the count moved; the caller flushes the tree.
 */
export function applyConfirmedRenames(
  tree: SyncedTree,
  toBag: string,
  candidates: readonly ScanRow[],
  deletionSummary: Record<string, unknown> | undefined,
): number {
  if (!deletionSummary || deletionSummary["decision"] !== "apply") return 0;
  const renames = deletionSummary["renames"];
  if (!Array.isArray(renames)) return 0;
  const diskHashByUri = new Map(candidates.map((c) => [c.uri, c.diskHash] as const));
  let moved = 0;
  for (const r of renames as Array<Record<string, unknown>>) {
    const fromUri = String(r["fromUri"]);
    const toUri   = String(r["toUri"]);
    const diskHash = diskHashByUri.get(toUri);
    if (diskHash === undefined) continue;   // a rename we did not submit — leave it be
    tree.delete(syncedTreeKey(toBag, fromUri));
    tree.set(syncedTreeKey(toBag, toUri), diskHash);
    moved++;
  }
  return moved;
}

/** The vanished carriers in a scan — DELETED rows, as INGEST `deletions[]`. */
export function deletionsOf(rows: readonly ScanRow[]): PendingDeletion[] {
  return rows
    .filter((r) => r.status === "deleted" && r.syncedHash !== null)
    .map((r) => ({ uri: r.uri, syncedHash: r.syncedHash as string }));
}

export interface SubmitIngestOpts {
  readonly source:    string;
  readonly toBag:     string;
  readonly candidates: readonly ScanRow[];
  readonly did:       string;
  /** Omit for a fresh change-id; pass one to thread a known id. */
  readonly changeId?: string;
  /** Vanished carriers riding the same wave (rename re-link or tombstone). */
  readonly deletions?: readonly PendingDeletion[];
  /** Operator mass-delete brake dial (0,1]; omitted → island default. */
  readonly massDeleteFraction?: number;
  /**
   * Run the INGEST IN the active wiki island over ITS composite — the path
   * for `working` (the per-fingerprint write layer the daemon never reaches).
   * The daemon commands via `wiki-act` wrapping the INGEST; the default path
   * executes daemon-side (canon bags).
   */
  readonly inWiki?: boolean;
}

/**
 * Submit NEW+CHANGED carriers as ONE INGEST verb — hashes travel WITH the content;
 * the island runs the full Confluence gate and answers per-carrier decisions. One call =
 * one wave, one line over the sock. The one-shot gesture and the watcher's every
 * wave submit identically; the daemon holds the warm replica across both.
 */
export async function submitIngest(opts: SubmitIngestOpts): Promise<SubmitResult> {
  const changeId = opts.changeId ?? newChangeId();
  const deletions = opts.deletions ?? [];
  const actionArgs: Record<string, unknown> = {
    "source-uri": opts.source,
    "to-bag":     opts.toBag,
    "change-id":  changeId,
    // Opt-in CAD (content-resolution.mem): a small un-flagged body rides INLINE `text` — a meme
    // is an inline-by-nature tiddler bundle, no persistent CAS blob. Only a flagged (`_lar_cas`)
    // or backstop-caught (binary / oversized-non-text) body stages to the corpus CAS and rides a
    // skinny `textCid` — keeping the giant out of the CRDT (the automerge scalar-string wall). An
    // oversized un-flagged text stages for transport but rides no `skinny`, so the island faults
    // it (a verb rides a reference, never a body) rather than materializing it — bag-agnostic.
    carriers: opts.candidates.map((r) => {
      const flagged = carrierCasFlagged(r.text, r.meta);
      const staged = stageBodyToCas(r.text, { ext: r.ext, flagged, binary: r.binary ?? false });
      return {
        uri: r.uri, size: staged.size, diskHash: r.diskHash, syncedHash: r.syncedHash, ext: r.ext,
        ...(staged.staged ? { textCid: staged.cid } : { text: r.text }),
        ...(staged.skinny ? { skinny: true } : {}),
        ...(r.meta !== undefined ? { meta: r.meta } : {}),
      };
    }),
    ...(deletions.length > 0 ? { deletions: deletions.map((d) => ({ uri: d.uri, syncedHash: d.syncedHash })) } : {}),
    ...(opts.massDeleteFraction !== undefined ? { massDeleteFraction: opts.massDeleteFraction } : {}),
  };
  // --in-wiki: wrap the INGEST so it runs IN the active wiki island over its
  // composite (where working lives), mirroring `lares act --in-wiki`. The
  // default submits daemon-side for canon bags.
  const submitName = opts.inWiki ? "wiki-act" : "INGEST";
  const submitArgs = opts.inWiki ? { verb: "INGEST", args: actionArgs } : actionArgs;
  const requestId = await taskContentId({ subject: opts.toBag, command: submitName, args: submitArgs, nonce: "" });
  const timeoutMs = Math.max(10_000, 10_000 + (opts.candidates.length + deletions.length) * 400);
  return await runVerb(submitName, submitArgs, opts.did, { requestId, timeoutMs });
}
