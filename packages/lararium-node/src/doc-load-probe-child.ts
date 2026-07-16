/**
 * doc-load-probe-child — the disposable boundary (L1). A short-lived child process that
 * attempts to materialize ONE persisted doc through Automerge and reports the verdict on
 * stdout as a single JSON line. It exists because an Automerge WASM `panic=abort` (a torn
 * doc read as a giant allocation) is NOT catchable in-process — it poisons the WASM linear
 * memory and terminates the runtime. Isolating the load in a child means the parent daemon
 * survives the abort: the child dies with a signal / non-zero code, the parent reads that
 * as `aborted` and quarantines the poison doc, and the house boots on.
 *
 * Protocol — argv: <storageDir> <documentId> [--clean-tail]. Output: exactly one JSON line.
 *   { ok: true, heads, chunks }            → exit 0   (loads clean)
 *   { ok: false, reason }                   → exit 2   (catchable load error — malformed but not a WASM abort)
 *   <no line, signal / non-zero exit>       →          (WASM abort — the uncatchable poison; parent infers it)
 *
 * `--clean-tail` (L3) runs the RECOVERY variant: gate each stored record through the L5b
 * framing check, load ONLY the clean prefix (records ahead of the first tear), and report
 * the torn tail files by name so the parent moves exactly those aside. A torn BASE (the
 * first record) leaves an empty prefix → unrecoverable, reported ok:false.
 *   { ok: true, heads, chunks: kept, tornTail: [paths] }   → exit 0   (clean prefix loads)
 *   { ok: false, reason }                                   → exit 2   (base torn / prefix rejects)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { init, load, loadIncremental, getHeads } from "@automerge/automerge";
import { partitionCleanTail } from "@lararium/mesh";

function listBlobs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((name) => join(dir, name))
      .filter((p) => {
        try { return statSync(p).isFile(); } catch { return false; }
      })
      .sort();
  } catch {
    return [];
  }
}

function emit(line: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(line) + "\n");
}

function main(): number {
  const storageDir = process.argv[2];
  const documentId = process.argv[3];
  const cleanTail = process.argv.includes("--clean-tail");
  if (!storageDir || !documentId) {
    emit({ ok: false, reason: "usage: doc-load-probe-child <storageDir> <documentId> [--clean-tail]" });
    return 2;
  }
  const base = join(storageDir, documentId.slice(0, 2), documentId.slice(2));
  const snapshots = listBlobs(join(base, "snapshot"));
  const incrementals = listBlobs(join(base, "incremental"));
  // Path+bytes pairs in the canonical load order (snapshot(s) then incrementals) — the same
  // order the whole-doc concat below uses, so the clean-tail cut names the true tail.
  const files = [...snapshots, ...incrementals].map((path) => ({ path, data: readFileSync(path) }));
  const chunks = files.length;

  if (chunks === 0) {
    // No stored bytes — a fresh/blank doc materializes empty. Not a tear.
    emit({ ok: true, heads: [], chunks: 0, ...(cleanTail ? { tornTail: [] } : {}) });
    return 0;
  }

  if (cleanTail) {
    // L3 recovery — split records at the first tear (the mesh partition owns the cut law),
    // load ONLY the clean prefix (framing-clean bytes cannot drive the capacity_overflow
    // abort), and name the torn tail for the parent to move aside. The file path rides in
    // `name` so the partition's verdict maps straight back to the file to relocate.
    const { keep, tornTail } = partitionCleanTail(files.map((f) => ({ kind: "incremental" as const, name: f.path, data: f.data })));
    if (keep.length === 0) {
      emit({ ok: false, chunks, reason: "torn base record — no clean prefix to recover" });
      return 2;
    }
    try {
      let doc = init();
      for (const blob of keep) doc = loadIncremental(doc, blob.data);
      emit({ ok: true, heads: getHeads(doc), chunks: keep.length, tornTail: tornTail.map((b) => b.name) });
      return 0;
    } catch (e) {
      emit({ ok: false, chunks, reason: `clean prefix rejected: ${(e as Error)?.message ?? e}` });
      return 2;
    }
  }

  const blobs = files.map((f) => f.data);

  // Concatenate snapshot(s)+incrementals and load — the shape automerge-repo persists.
  // Below this line a torn doc may abort the WASM runtime; that abort is the SIGNAL the
  // parent reads. A catchable JS throw is a softer malformed-but-not-poison verdict.
  const merged = Buffer.concat(blobs);
  try {
    const doc = load(merged);
    emit({ ok: true, heads: getHeads(doc), chunks });
    return 0;
  } catch (loadErr) {
    // `load` rejected the concatenation — retry progressively (snapshot as base, then each
    // incremental) so a single bad chunk is distinguishable from a whole-doc reject.
    try {
      let doc = init();
      for (const blob of blobs) doc = loadIncremental(doc, blob);
      emit({ ok: true, heads: getHeads(doc), chunks });
      return 0;
    } catch (incErr) {
      emit({
        ok: false,
        chunks,
        reason: `load failed: ${(loadErr as Error)?.message ?? loadErr}; incremental: ${(incErr as Error)?.message ?? incErr}`,
      });
      return 2;
    }
  }
}

process.exit(main());
