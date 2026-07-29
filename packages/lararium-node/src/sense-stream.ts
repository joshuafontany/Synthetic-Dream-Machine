/**
 * sense-stream — the node wiring for sensing stream frames through a rooted sensorium.
 * ANY {@link StreamAdapter}'s frames, backed by the real corpus sidecars.
 *
 * The pure abstraction (the {@link StreamAdapter} / {@link StreamFrame} contract + the
 * {@link composePalace} driver) lives VM-free in @lararium/mesh. THIS module supplies the impure
 * plane bank — the Python sidecars behind the {@link PlaneSink} — and the `composeStreamSensorium` entry
 * that generalizes the ephemeral sensorium lifecycle to consume frames from any adapter.
 *
 * Two paths, by the corpus.md role line ("compose_palace(caps) instantiated EPHEMERALLY over any
 * corpus"):
 *   · BATCH over a PATH source ⇒ the existing sensorium run IS the plane application. A text-batch
 *     adapter delegates content · structure · bands · form to {@link defaultSensoriumIngest} (the
 *     path-based sidecars are per-file, not per-frame) — "batch = the existing sensorium run". The frames
 *     are the normalized VIEW that proves the abstraction (verified in @lararium/mesh).
 *   · DIRECT-SIGNAL / LIVE ⇒ the per-plane frame driver over {@link defaultStreamPlaneSink}: the
 *     natively-numeric door — a stream's `signal` frames feed `bands_sidecar analyze --signal` +
 *     `couple --signal` (the NDJSON contract) DIRECTLY, no corpus, no chroma. This is the shore the
 *     NEXT adapter (a non-text on-box stream) builds against; the content/structure planes on the live
 *     path stay a documented shore (a numeric stream carries neither).
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/sensorium#the-caps
 */

import { existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolveBandsSpawn, resolveSidecarCapEnv } from "@lararium/mempalace";
import { composePalace, freeEnergy, forecastEws, type PalaceComposition, type PlaneSink, type StreamAdapter, type StreamFrame } from "@lararium/mesh";
import { defaultSensoriumIngest, type SensoriumIngest } from "./sense-sensorium.js";

// ── the frame-native signal door — bands + coupling over a raw numeric stream (NDJSON) ────────────

/** Marshal frames' `signal` vectors to an NDJSON matrix under one sensorium root. */
function writeSignalNdjson(frames: readonly StreamFrame[], sensoriumRoot: string): string {
  const path = join(sensoriumRoot, `stream-signal-${randomBytes(3).toString("hex")}.ndjson`);
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
  sensoriumRoot: string,
): Record<string, unknown> | null {
  const { python, script, submoduleRoot, scriptPresent } = resolveBandsSpawn();
  if (!python || !scriptPresent || frames.length === 0) return null;
  const ndjson = writeSignalNdjson(frames, sensoriumRoot);
  try {
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveSidecarCapEnv(python) };
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
 * No dead content/structure legs — a numeric stream carries neither, so those planes skip by absence.
 * A leg exists only where the modality genuinely affords it; a leg carried for symmetry is a leg that
 * reports an empty answer as a real one.
 *
 * The bands leg's DERIVED door (text: signal from content embeddings) rides the batch sensorium run, NOT
 * this frame sink — so a `derivedFromContent` call returns 0 here (the content path already banded it).
 */
export function defaultStreamPlaneSink(sensoriumRoot: string): PlaneSink {
  return {
    bands(frames, { derivedFromContent }) {
      if (derivedFromContent) return 0; // the derived door is the path-based sensorium run, not this sink
      const summary = runSignalSidecar("analyze", frames, sensoriumRoot);
      return summary ? Number(summary["cells"] ?? 0) : 0;
    },
    coupling(frames) {
      const summary = runSignalSidecar("couple", frames, sensoriumRoot);
      return summary ? Number(summary["edges"] ?? 0) : 0;
    },
  };
}

// ── the compose_palace entry — generalize the sensorium lifecycle to any adapter ─────────────────────

/** A source carrying an on-disk path (the batch-sensorium-run fast path reads it). */
function pathOf(source: unknown): string | null {
  const p = (source as { path?: unknown } | null)?.path;
  return typeof p === "string" && p.length > 0 ? p : null;
}

export interface ComposeStreamOptions<Raw> {
  /** The per-modality adapter (its `ingest` is the ONLY per-modality surface). */
  readonly adapter: StreamAdapter<Raw>;
  /** The raw source the adapter ingests. */
  readonly source: Raw;
  /** The scratch palace dir the planes fill (a sensorium instance dir, or any writable scratch). */
  readonly sensoriumRoot: string;
  /** Override the plane bank (tests inject a fake; default = the batch sensorium run or the numeric door). */
  readonly sink?: PlaneSink;
  /** Override the batch text-cloud ingest leg (tests inject a no-python fake). */
  readonly ingest?: SensoriumIngest;
}

/**
 * compose_palace over a stream — the generalized sensorium lifecycle. BATCH over a path source delegates
 * to the existing sensorium run (batch = sensorium run); a direct-signal / live adapter (or one with no
 * path) rides the per-plane frame driver over {@link defaultStreamPlaneSink}. An explicit `sink` always
 * takes the frame-driver path (the test + custom-plane shore).
 */
export function composeStreamSensorium<Raw>(opts: ComposeStreamOptions<Raw>): PalaceComposition {
  const { adapter, source, sensoriumRoot } = opts;

  // BATCH + a path source + no explicit sink ⇒ the existing sensorium run IS the plane application.
  const path = pathOf(source);
  if (adapter.mode === "batch" && path && !opts.sink) {
    const frames = adapter.ingest(source); // the normalized VIEW — proves the abstraction + tallies grain
    const ingest = opts.ingest ?? defaultSensoriumIngest;
    const r = ingest({ sourcePath: path, sensoriumRoot });
    return {
      modality: adapter.modality,
      mode: "batch",
      frames: frames.length,
      content: r.drawers,
      structure: r.structures,
      bands: r.bands,
      coupling: 0, // a text corpus has no cross-stream coupling; the numeric door carries it
      bandsDerived: true, // text's bands rode the content embeddings (the derived door)
      note: `batch=sensorium-run (${frames.length} frames) · ${r.note}`,
    };
  }

  // DIRECT-SIGNAL / LIVE / custom-sink ⇒ the per-plane frame driver (the numeric door + documented
  // live shore for content/structure).
  const comp = composePalace(adapter, source, opts.sink ?? defaultStreamPlaneSink(sensoriumRoot));
  return attachPredictiveRead(comp, adapter.ingest(source));
}

/**
 * Attach the sensorium's PREDICTIVE read to a numeric-door composition — the free-energy
 * objective F = Σ π·ε² + complexity and the critical-slowing-down forecast — computed NATIVELY
 * in-process via the {@link freeEnergy} / {@link forecastEws} core (no extra sidecar spawn, the
 * dependency-light hot path). Graceful: a stream with no direct `signal` (text) returns the
 * composition unchanged (the predictive read lives on the numeric door; text's derived-bands
 * read rides the sensorium run). sensorium-machina.md #the-py-r-web.
 */
function attachPredictiveRead(comp: PalaceComposition, frames: readonly StreamFrame[]): PalaceComposition {
  const rows = frames.map((f) => Array.from(f.signal)).filter((r) => r.length > 0);
  if (rows.length < 3) return comp; // no direct signal (or too short) ⇒ leave the composition as-is
  // per-COLUMN planes (each signal channel a plane) → the multi-plane free energy F.
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const planes: Record<string, number[]> = {};
  for (let j = 0; j < width; j++) planes[`signal${j}`] = rows.map((r) => r[j] ?? 0);
  const fe = freeEnergy(planes, { model: "ar1" });
  const fc = forecastEws(rows, {});
  return {
    ...comp,
    freeEnergy: { F: fe.F, accuracy: fe.accuracy, complexity: fe.complexity },
    forecast: { fired: fc.fired, state: fc.state, ar1Tau: fc.ar1Tau, ar1P: fc.ar1P, note: fc.note },
    note: `${comp.note} · F=${fe.F.toFixed(2)} · ${fc.note}`,
  };
}
