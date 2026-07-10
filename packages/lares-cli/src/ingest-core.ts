/**
 * ingest-core — the disk→records gesture, factored out of `cmdIngest` so the
 * one-shot CLI command AND the long-lived watcher daemon run the SAME path.
 *
 * Two legs live here; the third leg lives on the island:
 *   scan  — walk source for .md carriers, derive each uri by the loci law,
 *           NFC-assert at the membrane, hash, diff disk-hash vs synced-hash
 *   submit — pack NEW+CHANGED carriers (hashes riding with the text) into one
 *            INGEST verb; the island's gate supplies currentRenderHash (leg 3)
 *
 * The gesture holds the disk grant and the Synced tree; the island holds
 * neither (readiness reads local on both sides of the membrane). A watcher is
 * just this gesture fired on a settle instead of on an operator keystroke.
 *
 * Meme: lar:///ha.ka.ba/@lares/docs/lares/handoff
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { newChangeId, taskContentId, hasMemeExt } from "@lararium/mesh";
import { SyncedTree, contentHash, syncedTreeKey, bagsFileToUri, wikisFileToUri, larProjectionDir } from "@lararium/node";
import type { SubmitResult } from "./verb-result.js";
import { runVerb } from "./verb-call.js";

export type ScanStatus = "new" | "unchanged" | "changed" | "non-nfc" | "deleted";

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
}

export interface ScanResult {
  readonly rows:    ScanRow[];
  readonly skipped: string[];
}

/** Open the Synced tree at the canonical projection-state path (larProjectionDir() —
 *  runtime vessel state, not corpus). */
export function openSyncedTree(): SyncedTree {
  return new SyncedTree(join(larProjectionDir(), "synced-tree.json"));
}

/**
 * List the .md carriers under a source — a directory walks recursively, a
 * single file lists itself. Returns null when the source does not resolve.
 * Observations only, never a work queue (§6: scan is truth, events are hints).
 */
export function listCarriers(source: string): string[] | null {
  let st;
  try { st = statSync(source); } catch { return null; }
  if (!st.isDirectory()) return [source];
  return (readdirSync(source, { recursive: true }) as string[])
    .filter((f) => hasMemeExt(f))
    .map((f) => join(source, f));
}

/** Derive a file's carrier-root URI for one mirror plane (bags/ canon vs
 *  wikis/ @working write-layer). The watcher and CLI both feed a source; this
 *  names which loci reverse-derivation a row carries. */
export type FileToUriFn = (root: string, file: string) => string | null;

/**
 * Pick the loci reverse-derivation by which mirror plane the source sits in.
 * Under `<root>/wikis/` → the @working write-layer ingest-back derivation
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
 * plane (default bags/ canon; wikis/ for @working ingest-back).
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
    let text: string;
    try { text = readFileSync(file, "utf8"); } catch {
      // A path gone from disk that the Synced tree still projects = a deletion
      // candidate (the watcher feeds vanished paths; the grace window + the
      // island gate confirm before any tombstone). An unknown gone path skips.
      const goneSynced = tree.get(syncedTreeKey(toBag, uri));
      if (goneSynced !== null) rows.push({ file, uri, text: "", diskHash: "", syncedHash: goneSynced, status: "deleted" });
      else skipped.push(file);
      continue;
    }
    // The NFC membrane assertion (spec: memetic-wikitext #carrier-bytes) —
    // foreign bytes first walk in HERE; non-NFC refuses loudly, never enters.
    if (text !== text.normalize("NFC")) {
      rows.push({ file, uri, text, diskHash: "", syncedHash: null, status: "non-nfc" });
      continue;
    }
    const diskHash   = contentHash(text);
    const syncedHash = tree.get(syncedTreeKey(toBag, uri));
    const status: ScanStatus =
      syncedHash === null ? "new" : diskHash === syncedHash ? "unchanged" : "changed";
    rows.push({ file, uri, text, diskHash, syncedHash, status });
  }
  return { rows, skipped };
}

/** Walk a source and scan it whole. Returns null when the source does not
 *  resolve. `fileToUri` defaults to the source's mirror plane (bags/ vs wikis/). */
export function scanSource(
  root:   string,
  source: string,
  toBag:  string,
  tree:   SyncedTree,
  fileToUri: FileToUriFn = fileToUriForSource(root, source),
): ScanResult | null {
  const files = listCarriers(source);
  if (files === null) return null;
  return scanFiles(root, files, toBag, tree, fileToUri);
}

/** The rows an INGEST submission carries — NEW and CHANGED only. */
export function candidatesOf(rows: readonly ScanRow[]): ScanRow[] {
  return rows.filter((r) => r.status === "new" || r.status === "changed");
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
   * for `@working` (the per-fingerprint write layer the daemon never reaches).
   * The daemon commands via `wiki-act` wrapping the INGEST; the default path
   * executes daemon-side (canon bags).
   */
  readonly inWiki?: boolean;
}

/**
 * Submit NEW+CHANGED carriers as ONE INGEST verb — hashes travel WITH the content;
 * the island runs the full §6 gate and answers per-carrier decisions. One call =
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
    carriers: opts.candidates.map((r) => ({
      uri: r.uri, text: r.text, diskHash: r.diskHash, syncedHash: r.syncedHash,
    })),
    ...(deletions.length > 0 ? { deletions: deletions.map((d) => ({ uri: d.uri, syncedHash: d.syncedHash })) } : {}),
    ...(opts.massDeleteFraction !== undefined ? { massDeleteFraction: opts.massDeleteFraction } : {}),
  };
  // --in-wiki: wrap the INGEST so it runs IN the active wiki island over its
  // composite (where @working lives), mirroring `lares act --in-wiki`. The
  // default submits daemon-side for canon bags.
  const submitName = opts.inWiki ? "wiki-act" : "INGEST";
  const submitArgs = opts.inWiki ? { verb: "INGEST", args: actionArgs } : actionArgs;
  const requestId = await taskContentId({ subject: opts.toBag, command: submitName, args: submitArgs, nonce: "" });
  const timeoutMs = Math.max(10_000, 10_000 + (opts.candidates.length + deletions.length) * 400);
  return await runVerb(submitName, submitArgs, opts.did, { requestId, timeoutMs });
}
