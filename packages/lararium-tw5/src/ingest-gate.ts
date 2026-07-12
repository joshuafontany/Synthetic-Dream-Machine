/**
 * ingest-gate — the pure three-way decision at the heart of disk→records
 * ingest (handoff #pattern-integrities §6, the Nucleus triangle).
 *
 * Three states meet per carrier:
 *   - the DISK bytes (what the operator's hands left),
 *   - the SYNCED hash (last-projected canonical bytes — the merge base),
 *   - the RECORDS' current canonical render (the merge seat's view).
 *
 * The gate decides; it never writes. Callers (the `lares ingest` gesture,
 * later the watcher daemon) own I/O. Hashes arrive as opaque strings — the
 * gate compares, never computes, so it stays isomorphic and hash-agnostic.
 *
 * Decision law (in order):
 *   1. disk == synced            → NOOP (nothing happened on disk)
 *   2. the parse grades error    → REFUSE (the author lost their meaning)
 *      anything milder            → carry the diagnostics forward, never drop the bytes
 *   3. render(parse(disk)) == current render → NOOP canonical-equivalent
 *      (the edit changed framing only; the gofmt-loop guard)
 *   4. current render == synced  → INGEST (records unmoved since last
 *      projection; the disk edit applies cleanly)
 *   5. both moved                → CONFLICT (surface, never overwrite —
 *      Unison's law; the CRDT diff-splice path refines this later)
 */

import { memeticWikitextDeserializer, expandMemeRefs } from "./deserializer.js";
import type { TiddlerFields } from "./deserializer.js";
import { parseMemeText } from "./meme-ast/parse.js";
import { failuresToDiagnostics, gradeOf } from "./meme-ast/diagnostics.js";
import type { MemeDiagnostic } from "./meme-ast/diagnostics.js";
import { getGrammar } from "./grammar-cache.js";

export type IngestDecision =
  | { readonly kind: "noop"; readonly reason: "disk-matches-synced" | "canonical-equivalent" }
  | { readonly kind: "ingest"; readonly records: readonly TiddlerFields[]; readonly canonicalText: string; readonly diagnostics: readonly MemeDiagnostic[] }
  | { readonly kind: "conflict"; readonly records: readonly TiddlerFields[]; readonly canonicalText: string; readonly diagnostics: readonly MemeDiagnostic[] }
  | { readonly kind: "refuse"; readonly warnings: readonly string[]; readonly diagnostics: readonly MemeDiagnostic[] };

export interface IngestGateInput {
  /** The carrier-root lar: URI this disk path projects. */
  readonly uri: string;
  /** Raw bytes read from disk (settled: quiet + stat-stable + hash-confirmed). */
  readonly diskText: string;
  /** Hash of diskText, computed by the caller. */
  readonly diskHash: string;
  /** Hash of the last-projected canonical bytes (the Synced tree); null = never projected. */
  readonly syncedHash: string | null;
  /** Hash of render(current records) — the merge seat's present canonical view. */
  readonly currentRenderHash: string;
  /** The caller's hash function — applied to the candidate canonical render. */
  readonly hash: (text: string) => string;
}

export function decideIngest(input: IngestGateInput): IngestDecision {
  const { uri, diskText, diskHash, syncedHash, currentRenderHash, hash } = input;

  // 1 — echo gate: the disk holds exactly what the projector last wrote.
  if (syncedHash !== null && diskHash === syncedHash) {
    return { kind: "noop", reason: "disk-matches-synced" };
  }

  // 2 — the membrane refuses only where the carrier stops round-tripping, since that alone loses
  // the operator's bytes. A recovery keeps them: the driver already stood the text back up and
  // graded how far it fell, so refusing on a recovery would drop the carrier to protect the
  // grammar. Every decision below therefore carries the gradient forward as a receipt.
  const failures = parseMemeText(uri, diskText, getGrammar() ?? undefined).failures;
  const diagnostics = failuresToDiagnostics(failures, diskText.length);
  const records = memeticWikitextDeserializer(diskText, { title: uri });
  const warnRecords = records.filter((r) => String(r.title ?? "").includes("/parse-warning/"));
  if (warnRecords.length > 0) {
    return {
      kind: "refuse",
      warnings: warnRecords.map((w) => String(w.text ?? "")),
      diagnostics,
    };
  }
  const map = new Map(records.map((r) => [String(r.title), r] as const));
  const canonicalText = expandMemeRefs((t) => map.get(t), uri) ?? "";
  if (canonicalText === "") {
    return { kind: "refuse", warnings: [`${uri}: membrane produced no canonical render`], diagnostics };
  }

  // 3 — canonical-equivalence gate: the edit changed framing only.
  const candidateHash = hash(canonicalText);
  if (candidateHash === currentRenderHash) {
    return { kind: "noop", reason: "canonical-equivalent" };
  }

  // 4 — clean ingest: the records stand where the last projection left them.
  if (syncedHash !== null && currentRenderHash === syncedHash) {
    return { kind: "ingest", records, canonicalText, diagnostics };
  }
  // Never-projected carriers (syncedHash null) with no current-render match
  // read as fresh adoptions — clean ingest by definition.
  if (syncedHash === null) {
    return { kind: "ingest", records, canonicalText, diagnostics };
  }

  // 5 — both moved since the merge base: surface, never overwrite.
  return { kind: "conflict", records, canonicalText, diagnostics };
}
