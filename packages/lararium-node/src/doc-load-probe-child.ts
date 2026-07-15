/**
 * doc-load-probe-child — the disposable boundary (L1). A short-lived child process that
 * attempts to materialize ONE persisted doc through Automerge and reports the verdict on
 * stdout as a single JSON line. It exists because an Automerge WASM `panic=abort` (a torn
 * doc read as a giant allocation) is NOT catchable in-process — it poisons the WASM linear
 * memory and terminates the runtime. Isolating the load in a child means the parent daemon
 * survives the abort: the child dies with a signal / non-zero code, the parent reads that
 * as `aborted` and quarantines the poison doc, and the house boots on.
 *
 * Protocol — argv: <storageDir> <documentId>. Output: exactly one JSON line on stdout.
 *   { ok: true, heads, chunks }            → exit 0   (loads clean)
 *   { ok: false, reason }                   → exit 2   (catchable load error — malformed but not a WASM abort)
 *   <no line, signal / non-zero exit>       →          (WASM abort — the uncatchable poison; parent infers it)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { init, load, loadIncremental, getHeads } from "@automerge/automerge";

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
  if (!storageDir || !documentId) {
    emit({ ok: false, reason: "usage: doc-load-probe-child <storageDir> <documentId>" });
    return 2;
  }
  const base = join(storageDir, documentId.slice(0, 2), documentId.slice(2));
  const snapshots = listBlobs(join(base, "snapshot"));
  const incrementals = listBlobs(join(base, "incremental"));
  const blobs = [...snapshots, ...incrementals].map((f) => readFileSync(f));
  const chunks = blobs.length;

  if (chunks === 0) {
    // No stored bytes — a fresh/blank doc materializes empty. Not a tear.
    emit({ ok: true, heads: [], chunks: 0 });
    return 0;
  }

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
