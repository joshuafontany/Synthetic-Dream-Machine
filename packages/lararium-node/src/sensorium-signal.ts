/**
 * sensorium-signal — the auto-extraction PROJECTOR: read a poured target sensorium's child streams into a
 * `ChildSignalMV[]` signal-matrix, the shape the coupling/flow instruments read (couple_r · mismatch · flow).
 * Where sensorium-coupling reads each child's STATIC salience sidecar (the sheaf / H¹-gate path), this reads
 * each child's per-ordinal TIME-SERIES (the R-effective-TE / Gaussian-CMI path) — two representations of the
 * SAME `coupling.children` cover, each feeding its own instrument family.
 *
 * THE RE-POUR INVERSION — stable ground now, feature-gated (the no-lean discipline: the plumbing lands, only
 * its DATA-signal calibration waits on the re-pour). Today no poured sensorium carries an extractable
 * per-child signal: the single-stream corpuses (mark-twain · memory) host NO children — a coupling matrix
 * needs ≥2 coupled streams — and the mesh lobes (who ⊥ authority ⊥ flow) stand declared with empty streams.
 * So the extraction STRUCTURE lands now — a pluggable per-child reader, shared-ordinal alignment, the honest
 * <2-child floor — and the default reader reads a `signal.json` sidecar the re-pour will land per child.
 * Absent (every real sensorium today) ⇒ the child drops (never fabricated), the matrix reads empty, and the
 * flow/couple/mismatch surface NAMES the calibration data-wait rather than couple an empty matrix.
 *
 * THE CALIBRATION (the one genuine data-wait). What scalar/vector series a child carries per ordinal — an
 * embedding-innovation, a salience, a rhythm tick — and the shared time axis the children align on, settles
 * with the re-pour that lands child streams. The sidecar interface fixes the SHAPE now; the re-pour fills it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readManifest, resolveCapDir } from "./sensorium.js";
import type { SensoriumChild, SensoriumManifest } from "./sensorium.js";
import type { ChildSignalMV } from "@lararium/mesh";

/** The per-child SIGNAL sidecar filename — a time-series the re-pour lands per child (rows=time, cols=dims). */
export const CHILD_SIGNAL_SIDECAR = "signal.json";

/** the coupling instruments need at least this many time samples to read a directed flow (TE needs a lag). */
const MIN_SAMPLES = 2;

/**
 * The pluggable per-child signal reader: map a resolved child (its edge, dir, manifest) to its TIME-SERIES
 * {@link ChildSignalMV} — or `null` when the child carries no readable signal yet (it drops out of the
 * matrix, never fabricated). The re-pour lands the signal the default reader reads.
 */
export type ChildSignalReader = (args: {
  readonly child: SensoriumChild;
  readonly childDir: string;
  readonly manifest: SensoriumManifest | null;
}) => ChildSignalMV | null;

/** Coerce a parsed JSON value into a rows=time × cols=dims matrix — accept `number[][]`, a bare `number[]`
 *  (one univariate column), or `{ signal: number[][] | number[] }`. Anything else ⇒ null (drops). */
function coerceSeries(raw: unknown): number[][] | null {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) && "signal" in (raw as object)
    ? (raw as { signal: unknown }).signal
    : raw;
  if (!Array.isArray(body) || body.length === 0) return null;
  // a bare number[] reads as one univariate column (each sample a scalar → a 1-dim row).
  if (typeof body[0] === "number") {
    const col = body as unknown[];
    if (!col.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    return col.map((x) => [x as number]);
  }
  // a number[][] reads rows=time, cols=dims — every row same width, all finite.
  const rows = body as unknown[];
  const width = Array.isArray(rows[0]) ? (rows[0] as unknown[]).length : -1;
  if (width < 1) return null;
  const out: number[][] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.length !== width) return null;
    if (!r.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    out.push(r as number[]);
  }
  return out;
}

/**
 * The DEFAULT per-child signal reader — read `<childDir>/signal.json` as the child's time-series. Absent /
 * malformed / empty ⇒ `null` (the child drops; graceful, never fabricated). The signal name is the child's
 * `sensorium` role. This is the feature-gate seam: the sidecar fills at the re-pour; until then it reads null.
 */
export const defaultChildSignalReader: ChildSignalReader = ({ child, childDir }) => {
  const p = join(childDir, CHILD_SIGNAL_SIDECAR);
  if (!existsSync(p)) return null;
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
  const signal = coerceSeries(raw);
  if (signal === null || signal.length === 0) return null;
  return { name: child.sensorium, signal };
};

/** The extraction outcome — the readable child series PLUS a ready-to-run rows-matrix (time × N children). */
export interface SignalExtraction {
  /** the parent sensorium whose child streams were projected (or `"(no-manifest)"`). */
  readonly sensorium: string;
  /** every readable child's full multivariate series (the sheaf-parallel shape; `[]` when none read). */
  readonly children: readonly ChildSignalMV[];
  /** the ready-to-couple matrix — rows=time, cols=one univariate column per readable child (its 1st dim),
   *  aligned to the shortest child series. `[]` when fewer than two children read a signal of ≥2 samples
   *  (the honest floor — the coupling instruments never run over an empty/insufficient matrix). */
  readonly rows: number[][];
  /** the column labels for `rows` — the readable children's roles, in order. */
  readonly names: string[];
  /** how many children yielded a readable signal (the column count before the <2 floor). */
  readonly readable: number;
  /** a human note — the extraction verdict, or why the matrix reads empty (the calibration data-wait). */
  readonly note: string;
}

export interface ExtractSignalOptions {
  /** override the per-child signal reader (default {@link defaultChildSignalReader} — the signal.json sidecar). */
  readonly childSignalReader?: ChildSignalReader;
}

/**
 * PROJECT a poured target sensorium's child streams into a signal-matrix. Resolve `coupling.children` → each
 * child's dir → its time-series (via {@link ChildSignalReader}) → a time × N matrix aligned to the shortest
 * readable child (each column the child's first dim). Fewer than two children with a ≥2-sample signal ⇒ an
 * EMPTY matrix with an honest note (the coupling instruments then name the owed calibration, never fabricate).
 */
export function extractSignalFromTarget(sensoriumDir: string, opts: ExtractSignalOptions = {}): SignalExtraction {
  const manifest = readManifest(sensoriumDir);
  if (manifest === null) {
    return { sensorium: "(no-manifest)", children: [], rows: [], names: [], readable: 0,
             note: `no sensorium manifest at ${sensoriumDir}` };
  }
  const reader = opts.childSignalReader ?? defaultChildSignalReader;

  const children: ChildSignalMV[] = [];
  for (const child of manifest.coupling.children) {
    const childDir = resolveCapDir(sensoriumDir, child.dir);
    const sig = reader({ child, childDir, manifest: readManifest(childDir) });
    if (sig !== null && sig.signal.length > 0) children.push(sig);
  }

  const declared = manifest.coupling.children.length;
  if (children.length < 2) {
    const note = declared === 0
      ? "no coupling children — a single-stream sensorium hosts nothing to couple (pass an explicit --signal)"
      : `insufficient child signals (${children.length}/${declared} lands a signal.json) — the calibration awaits the re-pour that lands child streams`;
    return { sensorium: manifest.sensorium, children, rows: [], names: [], readable: children.length, note };
  }

  // align to the shortest readable child series (the shared time axis) — each column the child's first dim.
  const length = Math.min(...children.map((c) => c.signal.length));
  if (length < MIN_SAMPLES) {
    return { sensorium: manifest.sensorium, children, rows: [], names: [], readable: children.length,
             note: `child signals too short (min ${length} samples, need ${MIN_SAMPLES}) — the coupling read needs a lag` };
  }
  const names = children.map((c) => c.name);
  const rows: number[][] = [];
  for (let t = 0; t < length; t++) rows.push(children.map((c) => c.signal[t]![0]!));

  return {
    sensorium: manifest.sensorium, children, rows, names, readable: children.length,
    note: `projected ${children.length} child signal(s) → a ${length}×${children.length} coupling matrix`,
  };
}
