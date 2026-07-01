/**
 * stream-palace — the node wiring of the stream compose_palace seam. Verifies batch=corpus-run
 * delegation (text-batch over a path) and the direct-signal frame-driver path (a custom sink), both
 * without touching python.
 */
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { textStreamAdapter, type PlaneSink, type StreamAdapter, type StreamFrame } from "@lararium/mesh";
import { composeStreamPalace } from "../src/stream-palace.js";
import type { CorpusIngest } from "../src/corpus-palace.js";

let dir: string;
let src: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lar-stream-palace-"));
  src = join(dir, "corpus.md");
  writeFileSync(src, "First para.\n\nSecond para is longer here.\n\nThird para.\n");
});
afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("composeStreamPalace — batch = the existing corpus run", () => {
  test("a text-batch adapter over a path delegates to the corpus ingest", () => {
    const fakeIngest: CorpusIngest = ({ sourcePath }) => {
      expect(sourcePath).toBe(src); // the path source threaded through to the corpus run
      return { drawers: 3, structures: 2, bands: 5, forms: 4, note: "fake-corpus-run" };
    };
    const out = composeStreamPalace({
      adapter: textStreamAdapter(),
      source: { text: "First para.\n\nSecond para is longer here.\n\nThird para.", path: src },
      palaceDir: dir,
      ingest: fakeIngest,
    });
    expect(out.modality).toBe("text");
    expect(out.mode).toBe("batch");
    expect(out.frames).toBe(3); // the frames are the normalized VIEW that proves the abstraction
    expect(out.content).toBe(3); // r.drawers
    expect(out.structure).toBe(2); // r.structures
    expect(out.bands).toBe(5); // r.bands
    expect(out.bandsDerived).toBe(true);
    expect(out.note).toContain("batch=corpus-run");
    expect(out.note).toContain("fake-corpus-run");
  });
});

describe("composeStreamPalace — the direct-signal / custom-sink frame driver", () => {
  const numeric: StreamAdapter<number[][]> = {
    modality: "sensor",
    mode: "live",
    ingest: (rows) => rows.map((r, i): StreamFrame => ({ seq: i, signal: r })),
  };

  test("a live numeric adapter rides the per-plane frame driver over the injected sink", () => {
    const sink: PlaneSink = {
      bands: (frames, { derivedFromContent }) => { expect(derivedFromContent).toBe(false); return frames.length; },
      coupling: (frames) => frames.length,
    };
    const out = composeStreamPalace({ adapter: numeric, source: [[1, 5], [2, 4], [3, 3], [4, 2]], palaceDir: dir, sink });
    expect(out.modality).toBe("sensor");
    expect(out.mode).toBe("live");
    expect(out.content).toBe(0); // numeric stream carries no content
    expect(out.bands).toBe(4); // direct signal door
    expect(out.coupling).toBe(4); // multivariate → coupling fires
    expect(out.bandsDerived).toBe(false);
  });

  test("a numeric stream attaches the PREDICTIVE read (F = Σπε² + complexity + the CSD forecast)", () => {
    // an AR series whose coefficient ramps toward 1 (critical slowing down — rising lag-1-AC)
    let s = 5 >>> 0;
    const u = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 0xffffffff; };
    const norm = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
    const x: number[] = [0];
    for (let t = 1; t < 360; t++) x.push((0.2 + 0.75 * (t / 360)) * x[t - 1]! + 0.5 * norm());
    const rows = x.map((v) => [v]); // a univariate numeric stream
    const oneCol: StreamAdapter<number[][]> = {
      modality: "sensor", mode: "live",
      ingest: (rs) => rs.map((r, i): StreamFrame => ({ seq: i, signal: r })),
    };
    const sink: PlaneSink = { bands: (f) => f.length };
    const out = composeStreamPalace({ adapter: oneCol, source: rows, palaceDir: dir, sink });
    // F = Σ π·ε² + complexity, computed and EXPOSED on the composition
    expect(out.freeEnergy).toBeDefined();
    expect(out.freeEnergy!.F).toBeCloseTo(out.freeEnergy!.accuracy + out.freeEnergy!.complexity, 6);
    expect(out.freeEnergy!.complexity).toBeGreaterThan(0);
    // the critical-slowing-down forecast fires on the approaching bifurcation
    expect(out.forecast).toBeDefined();
    expect(out.forecast!.fired).toBe(true);
    expect(out.note).toContain("F=");
  });

  test("an explicit sink forces the frame driver even for a batch path adapter", () => {
    const sink: PlaneSink = { content: (f) => f.length };
    const out = composeStreamPalace({
      adapter: textStreamAdapter(),
      source: { text: "a\n\nb\n\nc", path: src },
      palaceDir: dir,
      sink,
    });
    expect(out.content).toBe(3); // routed through the frame driver, not the corpus run
    expect(out.note).not.toContain("batch=corpus-run");
  });
});
