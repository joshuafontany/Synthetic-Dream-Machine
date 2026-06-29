/**
 * wing-stamp-flush — the per-record routing the @daemon capture path otherwise lacks. The producer
 * prefixes the source_file with `<wing>/`; this flush decodes it into `metadata.wing` at the node
 * boundary (no mesh/tw5 edit). Composed with the AST split, a SPIRIT turn lands BOTH a wing-routed
 * verbatim drawer AND an AST keyed to the spirit transcript — the subagent-AST gap, closed.
 */

import { describe, expect, test, vi } from "vitest";
import type { CaptureFlush, CaptureRecord } from "@lararium/mesh";
import { makeWingStampFlush, makeAstSplitFlush } from "../src/node-capture-engine.js";

const SPIRIT_SRC = "wing_synthetic_dream_machine__spirits/Mapper__agent-abc123__run-r99.jsonl";

/** A flush that records what it received, returning a filed count. */
function recorder(): { flush: CaptureFlush; seen: CaptureRecord[] } {
  const seen: CaptureRecord[] = [];
  return { seen, flush: async (batch) => { seen.push(...batch); return batch.length; } };
}

describe("makeWingStampFlush", () => {
  test("decodes the `<wing>/` prefix into metadata.wing (the spirits-wing routing)", async () => {
    const { flush, seen } = recorder();
    const stamp = makeWingStampFlush(flush);
    await stamp([{ content: "x", source_file: SPIRIT_SRC, metadata: { lar_agent: "Mapper" } }]);
    expect(seen[0]?.metadata?.["wing"]).toBe("wing_synthetic_dream_machine__spirits");
    expect(seen[0]?.metadata?.["lar_agent"]).toBe("Mapper"); // existing annotation preserved
  });

  test("no `<wing>/` prefix → no wing stamped (untouched)", async () => {
    const { flush, seen } = recorder();
    await makeWingStampFlush(flush)([{ content: "x", source_file: "agent-only.jsonl", metadata: {} }]);
    expect(seen[0]?.metadata?.["wing"]).toBeUndefined();
  });

  test("a record that already carries a wing is left untouched (idempotent — record's own wing wins)", async () => {
    const { flush, seen } = recorder();
    await makeWingStampFlush(flush)([{ content: "x", source_file: SPIRIT_SRC, metadata: { wing: "wing_explicit" } }]);
    expect(seen[0]?.metadata?.["wing"]).toBe("wing_explicit");
  });
});

describe("spirit turn → verbatim (winged) AND AST (spirit provenance)", () => {
  test("wing-stamp ∘ ast-split: the drawer is winged + carries lar_ast_hash; the AST provenance points at the spirit", async () => {
    const { flush, seen } = recorder();
    const put = vi.fn(async (_tree: unknown, v: { source_file: string; content: string }) => ({
      hash: "deadbeef", verbatimSha: "cafe" + v.source_file.length,
    }));
    const astPalace = { put, get: async () => null, hashOf: async () => "h", close: async () => {} };

    // Compose exactly as makeNodeCaptureEngine does: wing-stamp OUTERMOST, ast-split beneath.
    const composed = makeWingStampFlush(makeAstSplitFlush(flush, astPalace));
    const ast = JSON.stringify({ kind: "meme", children: [] });
    const filed = await composed([{ content: "Lares (Mapper): leads", source_file: SPIRIT_SRC, metadata: { lar_agent: "Mapper", lar_ast: ast } }]);

    expect(filed).toBe(1);
    // AST routed to .astpalace with the SPIRIT source_file as provenance.
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0]?.[1]?.source_file).toBe(SPIRIT_SRC);
    // The verbatim drawer: winged + the deterministic AST join, inline tree stripped.
    const drawer = seen[0]?.metadata as Record<string, unknown>;
    expect(drawer["wing"]).toBe("wing_synthetic_dream_machine__spirits");
    expect(drawer["lar_agent"]).toBe("Mapper");
    expect(drawer["lar_ast_hash"]).toBe("deadbeef");
    expect(drawer["lar_verbatim_sha"]).toBeTypeOf("string");
    expect(drawer["lar_ast"]).toBeUndefined(); // inline tree split out into .astpalace
  });
});
