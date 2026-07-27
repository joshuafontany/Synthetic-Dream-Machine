/**
 * ingest-gate — THE CONFLUENCE: the pure three-way decision at the heart of
 * disk→records ingest, where three streams (disk · last-synced · records) meet
 * and reconcile — a conflict SURFACES rather than one stream drowning another
 * (Unison's law: surface, never overwrite). The human-facing name for this flow
 * is "the Confluence" (the Nucleus triangle; handoff #pattern-integrities §6).
 *
 * ONE gate, parameterized by a semantic congruence `≈` (Unison + SafeMerge: a
 * merge stays conflict-free BECAUSE it reads through a congruence, never raw
 * bytes). The `IngestOps` bundle carries that congruence for a carrier family:
 * how the family deserializes disk bytes, renders records to the canonical text
 * the gate hashes (`render(parse(disk)) ≈ current` names "framing only"), which
 * structural surface a round-trip MUST preserve, and how it grades a fault. The
 * DEFAULT ops read the memetic-wikitext family; a native filetype passes its own
 * `IngestOps`, so BOTH carrier families run this one triangle — one decision path,
 * each family reading it through its own congruence.
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
 *   2. the parse grades error    → REFUSE (the carrier stopped round-tripping)
 *      anything milder            → carry the diagnostics forward, never drop the bytes
 *      (native ops never grade error — a native deserialize throws — so the refuse
 *       leg rides dormant for that family, present in the shared shape, unfired)
 *   3. render(parse(disk)) == current render → NOOP canonical-equivalent
 *      (the edit changed framing only; the gofmt-loop guard), UNLESS the round-trip
 *      drops a declared structural slot (the ahu-fidelity guard; native declares
 *       ∅ structure, so the guard is a no-op for it)
 *   4. current render == synced  → INGEST (records unmoved since last
 *      projection; the disk edit applies cleanly)
 *   5. both moved                → CONFLICT (surface, never overwrite —
 *      Unison's law; the CRDT diff-splice path refines this later)
 */

import { digestsEqual } from "@lararium/mesh";
import { deserializeCarrier, expandMemeRefs } from "./deserializer.js";
import type { TiddlerFields } from "./deserializer.js";
import { collectAhuSlots } from "./meme-ast/ahu-scan.js";
import { parseMemeText } from "./meme-ast/parse.js";
import { failuresToDiagnostics, gradeOf } from "./meme-ast/diagnostics.js";
import type { MemeDiagnostic, DiagnosticSeverity } from "./meme-ast/diagnostics.js";
import { getGrammar } from "./grammar-cache.js";

export type IngestDecision<R = TiddlerFields> =
  | { readonly kind: "noop"; readonly reason: "disk-matches-synced" | "canonical-equivalent" }
  | { readonly kind: "ingest"; readonly records: readonly R[]; readonly canonicalText: string; readonly diagnostics: readonly MemeDiagnostic[] }
  | { readonly kind: "conflict"; readonly records: readonly R[]; readonly canonicalText: string; readonly diagnostics: readonly MemeDiagnostic[] }
  | { readonly kind: "refuse"; readonly warnings: readonly string[]; readonly diagnostics: readonly MemeDiagnostic[] };

/**
 * The per-family congruence the gate reads through — the `≈` that decides what
 * counts as "the same carrier." A family (memetic-wikitext by default, a native
 * filetype otherwise) supplies:
 *   - `deserialize` — disk bytes → records + the fault diagnostics,
 *   - `render`      — records → the canonical text the gate hashes (the `≈` seat:
 *                     two disks that render equal read as framing-only),
 *   - `declaredStructure` — the structural surface a faithful round-trip preserves
 *                     (ahu slots for memetic; ∅ for native, opting out of the guard),
 *   - `grade`       — the fault severity; `error` refuses.
 * The hash itself rides `IngestGateInput.hash` — the gate compares, never digests.
 */
export interface IngestOps<R = TiddlerFields> {
  deserialize(uri: string, text: string): { records: readonly R[]; diagnostics: readonly MemeDiagnostic[] };
  render(uri: string, records: readonly R[]): string;
  declaredStructure(text: string): ReadonlySet<string>;
  grade(diagnostics: readonly MemeDiagnostic[]): DiagnosticSeverity | "clean";
}

/**
 * The memetic-wikitext ops — the DEFAULT congruence. `decideIngest` reads these
 * when a caller passes no `ops`, so the memetic callers (and their vectors) run
 * unchanged: deserialize through the parser + shore on the shared diagnostics
 * channel, render through `expandMemeRefs`, guard fidelity on the ahu slot-set.
 */
export const memeticIngestOps: IngestOps<TiddlerFields> = {
  deserialize(uri, text) {
    const failures = parseMemeText(uri, text, getGrammar() ?? undefined).failures;
    const carrier = deserializeCarrier(text, { title: uri });
    return {
      records: carrier.records,
      diagnostics: [...failuresToDiagnostics(failures, text.length), ...carrier.diagnostics],
    };
  },
  render(uri, records) {
    const map = new Map(records.map((r) => [String(r.title), r] as const));
    return expandMemeRefs((t) => map.get(t), uri) ?? "";
  },
  declaredStructure(text) {
    return collectAhuSlots(text);
  },
  grade(diagnostics) {
    return gradeOf(diagnostics);
  },
};

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

export function decideIngest<R = TiddlerFields>(
  input: IngestGateInput,
  ops?: IngestOps<R>,
): IngestDecision<R> {
  const { uri, diskText, diskHash, syncedHash, currentRenderHash, hash } = input;
  // Default to the memetic congruence — a caller that names none reads the memetic
  // family, so the memetic gate + its vectors stay byte-identical to the single-family era.
  const congruence = ops ?? (memeticIngestOps as unknown as IngestOps<R>);

  // 1 — echo gate: the disk holds exactly what the projector last wrote.
  // `digestsEqual` normalizes the tag boundary: `diskHash` rides freshly computed
  // (tagged `sha256:hex`) while `syncedHash` may be a pre-agile bare value still
  // resting in the tree — same content reads equal across the two forms.
  if (syncedHash !== null && digestsEqual(diskHash, syncedHash)) {
    return { kind: "noop", reason: "disk-matches-synced" };
  }

  // 2 — the gradient gate. The family's deserialize reports the parse + shore
  // faults on one diagnostics channel; the gate reads a grade rather than sniffing a
  // synthesised tiddler title. It refuses at `error`, the one fault that costs the
  // operator their bytes: a carrier that stopped round-tripping. Every recovery grades
  // below that, keeps its text, rides forward with its receipt. A family whose deserialize
  // THROWS on malformed input (the native filetypes) never grades error here — the refuse
  // leg rides dormant in the shared shape, present but unfired for that family.
  const { records, diagnostics } = congruence.deserialize(uri, diskText);
  if (congruence.grade(diagnostics) === "error") {
    return {
      kind: "refuse",
      warnings: diagnostics.filter((d) => d.severity === "error").map((d) => d.message),
      diagnostics,
    };
  }
  const canonicalText = congruence.render(uri, records);
  if (canonicalText === "") {
    return { kind: "refuse", warnings: [`${uri}: shore produced no canonical render`], diagnostics };
  }

  // 3 — canonical-equivalence gate: the edit changed framing only.
  // The NOOP rests on ONE trust — that render(parse(disk)) faithfully carries
  // every byte the disk holds. A LOSSY shore breaks that trust: a structural
  // slot the disk declares that the render drops (the ahu-drop — a slash-path kahea
  // ref the recompose once clipped) makes render(parse(disk)) collapse toward the
  // stale current render, so an edit INSIDE the dropped slot reads as "framing
  // only" and never lands. The fidelity guard forbids the NOOP whenever the
  // round-trip loses a declared structural slot; a genuinely cosmetic edit keeps its
  // slot-set intact and still converges here. A family that declares ∅ structure
  // (the native filetypes) skips the guard by construction — nothing to drop.
  const candidateHash = hash(canonicalText);
  if (candidateHash === currentRenderHash) {
    const declared = congruence.declaredStructure(diskText);
    const rendered = congruence.declaredStructure(canonicalText);
    const dropped = [...declared].filter((s) => !rendered.has(s));
    if (dropped.length === 0) {
      return { kind: "noop", reason: "canonical-equivalent" };
    }
    // A lossy round-trip surfaces, never swallows: the disk carries slots the
    // render cannot reproduce, so the records have not caught up — treat it as
    // a clean ingest (never-projected or records-unmoved) or a conflict below.
  }

  // 4 — clean ingest: the records stand where the last projection left them.
  // Same tag-boundary normalization as the echo gate above — `currentRenderHash`
  // comes freshly computed (tagged) while `syncedHash` may still be stored bare.
  if (syncedHash !== null && digestsEqual(currentRenderHash, syncedHash)) {
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
