/**
 * stream-adapter — the per-modality intake abstraction + the TEXT reference adapter. Verifies the
 * text adapter reproduces the corpus-palace planes (content/structure/bands frames, per-stream order)
 * and that the driver routes the two doors (derived-from-content vs direct signal) + coupling.
 */
import { describe, test, expect } from "vitest";
import {
  composePalace,
  textStreamAdapter,
  type NestedTree,
  type PlaneSink,
  type StreamAdapter,
  type StreamFrame,
  type TextSource,
} from "../src/index.js";

/** A recording fake plane bank — captures the frames each leg saw, returns the counts. */
function recordingSink(): PlaneSink & { seen: Record<string, StreamFrame[]>; derived: boolean | null } {
  const seen: Record<string, StreamFrame[]> = { content: [], structure: [], bands: [], coupling: [] };
  const sink = {
    seen,
    derived: null as boolean | null,
    content(frames: readonly StreamFrame[]) { seen["content"] = [...frames]; return frames.length; },
    structure(frames: readonly StreamFrame[]) { seen["structure"] = [...frames]; return frames.length; },
    bands(frames: readonly StreamFrame[], ctx: { derivedFromContent: boolean }) { seen["bands"] = [...frames]; sink.derived = ctx.derivedFromContent; return frames.length; },
    coupling(frames: readonly StreamFrame[]) { seen["coupling"] = [...frames]; return frames.length; },
  };
  return sink;
}

const FIXTURE = `First paragraph of the corpus.

Second paragraph, a little longer, carries more words.

Third and final paragraph.`;

describe("textStreamAdapter — the corpus content intake as a stream", () => {
  test("modality/mode tags + per-chunk frames in per-stream order", () => {
    const adapter = textStreamAdapter();
    expect(adapter.modality).toBe("text");
    expect(adapter.mode).toBe("batch");
    const frames = adapter.ingest({ text: FIXTURE });
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.seq)).toEqual([0, 1, 2]); // per-stream ordering, no global now
    expect(frames[0]!.content).toBe("First paragraph of the corpus.");
    expect(frames.every((f) => f.signal.length === 0)).toBe(true); // text derives bands, empty at ingest
    expect(frames.every((f) => f.structure === undefined)).toBe(true); // no parse wired ⇒ no structure
  });

  test("an injected parse fills structure per chunk (structure_router door)", () => {
    const parse = (chunk: string): NestedTree => ({ type: "doc", children: [{ type: "text", children: [] }] });
    const frames = textStreamAdapter({ parse }).ingest({ text: FIXTURE });
    expect(frames.every((f) => f.structure?.type === "doc")).toBe(true);
  });

  test("a custom chunker overrides the paragraph grain", () => {
    const chunk = (t: string) => t.split(".").map((s) => s.trim()).filter(Boolean);
    const frames = textStreamAdapter({ chunk }).ingest({ text: "a. b. c" });
    expect(frames.map((f) => f.content)).toEqual(["a", "b", "c"]);
  });
});

describe("composePalace — the shared plane router", () => {
  test("text reproduces content + structure planes; bands DERIVE from content", () => {
    const parse = (): NestedTree => ({ type: "doc", children: [] });
    const adapter = textStreamAdapter({ parse });
    const sink = recordingSink();
    const out = composePalace(adapter, { text: FIXTURE }, sink);

    expect(out.modality).toBe("text");
    expect(out.frames).toBe(3);
    expect(out.content).toBe(3); // content plane saw every chunk
    expect(out.structure).toBe(3); // structure plane saw every parsed chunk
    expect(out.bands).toBe(3); // bands ran (derived door)
    expect(out.bandsDerived).toBe(true); // text derives bands from content, not from `signal`
    expect(sink.derived).toBe(true);
    expect(out.coupling).toBe(0); // univariate text → no lead-lag matrix
    expect(sink.seen["bands"]).toEqual(sink.seen["content"]); // derived door bands the content frames
  });

  test("no parse ⇒ structure plane skips gracefully, content + bands still stand", () => {
    const out = composePalace(textStreamAdapter(), { text: FIXTURE }, recordingSink());
    expect(out.content).toBe(3);
    expect(out.structure).toBe(0);
    expect(out.bands).toBe(3);
    expect(out.bandsDerived).toBe(true);
  });

  test("an absent sink leg skips its plane (graceful, like the corpus caps)", () => {
    const onlyContent: PlaneSink = { content: (f) => f.length };
    const out = composePalace(textStreamAdapter(), { text: FIXTURE }, onlyContent);
    expect(out.content).toBe(3);
    expect(out.structure).toBe(0);
    expect(out.bands).toBe(0);
  });
});

describe("composePalace — the DIRECT numeric door (the next adapter's shape)", () => {
  /** A minimal natively-numeric adapter — the shape a non-text on-box stream builds against. */
  const numeric: StreamAdapter<number[][]> = {
    modality: "sensor",
    mode: "live",
    ingest: (rows) => rows.map((r, i): StreamFrame => ({ seq: i, signal: r })),
  };

  test("direct signal ⇒ bands read `signal` (NOT derived); univariate ⇒ no coupling", () => {
    const rows = [[1], [2], [3], [4]];
    const sink = recordingSink();
    const out = composePalace(numeric, rows, sink);
    expect(out.frames).toBe(4);
    expect(out.content).toBe(0); // numeric stream carries no content
    expect(out.structure).toBe(0);
    expect(out.bands).toBe(4); // bands read the raw signal frames
    expect(out.bandsDerived).toBe(false); // the DIRECT door
    expect(sink.derived).toBe(false);
    expect(out.coupling).toBe(0); // 1 column → no lead-lag
  });

  test("multivariate signal (≥2 columns) ⇒ coupling plane fires", () => {
    const rows = [[1, 5], [2, 4], [3, 3], [4, 2]];
    const out = composePalace(numeric, rows, recordingSink());
    expect(out.bands).toBe(4);
    expect(out.coupling).toBe(4); // 2 columns → a directional lead-lag matrix
  });
});

// A compile-time proof that the adapter surface is EXACTLY modality/mode/ingest (composition-thin):
// this typechecks only because no other member is required.
const _thin: StreamAdapter<TextSource> = { modality: "text", mode: "batch", ingest: () => [] };
void _thin;
