/**
 * stream-palace — the node WIRING of the stream compose_palace seam: run the sensorium planes over
 * ANY {@link StreamAdapter}'s frames, backed by the real corpus sidecars.
 *
 * The pure abstraction (the {@link StreamAdapter} / {@link StreamFrame} contract + the
 * {@link composePalace} driver) lives VM-free in @lararium/mesh. THIS module supplies the impure
 * plane bank — the python sidecars behind the {@link PlaneSink} — and the `composeStreamPalace` entry
 * that generalizes the ephemeral corpus-palace lifecycle to consume frames from any adapter.
 *
 * Two paths, by the corpus.md role line ("compose_palace(caps) instantiated EPHEMERALLY over any
 * corpus"):
 *   · BATCH over a PATH source ⇒ the existing corpus run IS the plane application. A text-batch
 *     adapter delegates content · structure · bands · form to {@link defaultCorpusIngest} (the
 *     path-based sidecars are per-file, not per-frame) — "batch = the existing corpus run". The frames
 *     are the normalized VIEW that proves the abstraction (verified in @lararium/mesh).
 *   · DIRECT-SIGNAL / LIVE ⇒ the per-plane frame driver over {@link defaultStreamPlaneSink}: the
 *     natively-numeric door — a stream's `signal` frames feed `bands_sidecar analyze --signal` +
 *     `couple --signal` (the NDJSON contract) DIRECTLY, no corpus, no chroma. This is the seam the
 *     NEXT adapter (a non-text on-box stream) builds against; the content/structure planes on the live
 *     path stay a documented seam (a numeric stream carries neither).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/corpus#the-caps
 */

import { existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolveBandsSidecarSpawn, resolveComputeCapEnv } from "@lararium/mempalace";
import { composePalace, type PalaceComposition, type PlaneSink, type StreamAdapter, type StreamFrame } from "@lararium/mesh";
import { defaultCorpusIngest, type CorpusIngest } from "./corpus-palace.js";

// ── the frame-native signal door — bands + coupling over a raw numeric stream (NDJSON) ────────────

/** Marshal frames' `signal` vectors to an NDJSON matrix (one JSON array per row) under palaceDir. */
function writeSignalNdjson(frames: readonly StreamFrame[], palaceDir: string): string {
  const path = join(palaceDir, `stream-signal-${randomBytes(3).toString("hex")}.ndjson`);
  const body = frames.map((f) => JSON.stringify(Array.from(f.signal))).join("\n") + "\n";
  writeFileSync(path, body);
  return path;
}

/**
 * Run one `bands_sidecar` verb over a frame-signal NDJSON (the direct numeric door). Returns the last
 * JSON summary object, or null when the sidecar is absent / faults (graceful — the plane skips). The
 * NDJSON temp is always swept.
 */
function runSignalSidecar(
  verb: "analyze" | "couple",
  frames: readonly StreamFrame[],
  palaceDir: string,
): Record<string, unknown> | null {
  const { python, script, submoduleRoot, scriptPresent } = resolveBandsSidecarSpawn();
  if (!python || !scriptPresent || frames.length === 0) return null;
  const ndjson = writeSignalNdjson(frames, palaceDir);
  try {
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveComputeCapEnv(python) };
    const out = execFileSync(python, [script, verb, "--signal", ndjson], {
      cwd: submoduleRoot, env, maxBuffer: 1 << 30, encoding: "utf8", timeout: 300_000,
    });
    const lines = out.trim().split(/\r?\n/).filter((l) => l.trim().startsWith("{"));
    const last = lines[lines.length - 1];
    return last ? (JSON.parse(last) as Record<string, unknown>) : null;
  } catch {
    return null; // graceful: the numeric door skips when the sidecar / R is absent or faults
  } finally {
    try { rmSync(ndjson, { force: true }); } catch { /* best effort */ }
  }
}

/**
 * The DIRECT-SIGNAL / LIVE plane bank — the numeric door. Implements ONLY the planes a natively-numeric
 * stream affords: `bands` (MODWT+ecp over the raw signal) + `coupling` (RTransferEntropy lead-lag).
 * No dead content/structure legs — a numeric stream carries neither, so those planes skip by absence
 * (the SourceAdapter lesson: only the genuinely-per-modality legs exist).
 *
 * The bands leg's DERIVED door (text: signal from content embeddings) rides the batch corpus run, NOT
 * this frame sink — so a `derivedFromContent` call returns 0 here (the content path already banded it).
 */
export function defaultStreamPlaneSink(palaceDir: string): PlaneSink {
  return {
    bands(frames, { derivedFromContent }) {
      if (derivedFromContent) return 0; // the derived door is the path-based corpus run, not this sink
      const summary = runSignalSidecar("analyze", frames, palaceDir);
      return summary ? Number(summary["cells"] ?? 0) : 0;
    },
    coupling(frames) {
      const summary = runSignalSidecar("couple", frames, palaceDir);
      return summary ? Number(summary["edges"] ?? 0) : 0;
    },
  };
}

// ── the compose_palace entry — generalize the corpus lifecycle to any adapter ─────────────────────

/** A source carrying an on-disk path (the batch-corpus-run fast path reads it). */
function pathOf(source: unknown): string | null {
  const p = (source as { path?: unknown } | null)?.path;
  return typeof p === "string" && p.length > 0 ? p : null;
}

export interface ComposeStreamOptions<Raw> {
  /** The per-modality adapter (its `ingest` is the ONLY per-modality surface). */
  readonly adapter: StreamAdapter<Raw>;
  /** The raw source the adapter ingests. */
  readonly source: Raw;
  /** The scratch palace dir the planes fill (a corpus instance dir, or any writable scratch). */
  readonly palaceDir: string;
  /** Override the plane bank (tests inject a fake; default = the batch corpus run or the numeric door). */
  readonly sink?: PlaneSink;
  /** Override the batch corpus ingest leg (tests inject a no-python fake). */
  readonly ingest?: CorpusIngest;
}

/**
 * compose_palace over a stream — the generalized corpus lifecycle. BATCH over a path source delegates
 * to the existing corpus run (batch = corpus run); a direct-signal / live adapter (or one with no
 * path) rides the per-plane frame driver over {@link defaultStreamPlaneSink}. An explicit `sink` always
 * takes the frame-driver path (the test + custom-plane seam).
 */
export function composeStreamPalace<Raw>(opts: ComposeStreamOptions<Raw>): PalaceComposition {
  const { adapter, source, palaceDir } = opts;

  // BATCH + a path source + no explicit sink ⇒ the existing corpus run IS the plane application.
  const path = pathOf(source);
  if (adapter.mode === "batch" && path && !opts.sink) {
    const frames = adapter.ingest(source); // the normalized VIEW — proves the abstraction + tallies grain
    const ingest = opts.ingest ?? defaultCorpusIngest;
    const r = ingest({ sourcePath: path, palaceDir });
    return {
      modality: adapter.modality,
      mode: "batch",
      frames: frames.length,
      content: r.drawers,
      structure: r.structures,
      bands: r.bands,
      coupling: 0, // a text corpus has no cross-stream coupling; the numeric door carries it
      bandsDerived: true, // text's bands rode the content embeddings (the derived door)
      note: `batch=corpus-run (${frames.length} frames) · ${r.note}`,
    };
  }

  // DIRECT-SIGNAL / LIVE / custom-sink ⇒ the per-plane frame driver (the numeric door + documented
  // live seam for content/structure).
  return composePalace(adapter, source, opts.sink ?? defaultStreamPlaneSink(palaceDir));
}
