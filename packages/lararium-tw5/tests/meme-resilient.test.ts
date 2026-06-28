/**
 * meme-ast resilient recovery — the builder-as-driver contains malformation on a gradient
 * (graceful-parsing#sigil-self-defined-gradient): an orphan close becomes a water Error node, an
 * unclosed frame force-closes marked `repaired`, both recorded out-of-band on result.failures — never
 * silently dropped, never a crash. Clean parses stay untouched (no failures, no Error nodes).
 */

import { describe, expect, test } from "vitest";

import { parseMemeText } from "../src/meme-ast/parse.js";
import type { GrammarRules } from "../src/meme-ast/types.js";

const URI = "lar:///test.resilient.parses";

describe("meme-ast resilient recovery", () => {

  test("a clean parse records no failures and emits no Error nodes", () => {
    const r = parseMemeText(URI, "<<~ ahu #x >>\n\nbody\n\n<<~/ahu >>");
    expect(r.failures).toEqual([]);
    expect(r.nodes.some((n) => n.kind === "Error")).toBe(false);
  });

  test("an orphan close is contained as a water Error node (verbatim), not dropped", () => {
    const r = parseMemeText(URI, "before <<~/ahu >> after");
    expect(r.failures.some((f) => f.reason.startsWith("orphan-close"))).toBe(true);
    const errs = r.nodes.filter((n) => n.kind === "Error");
    expect(errs.length).toBeGreaterThan(0);
    const e = errs[0] as { recoveredAs?: string; content?: string };
    expect(e.recoveredAs).toBe("water");
    expect(e.content).toContain("ahu"); // lossless — the verbatim span survives
  });

  test("an unclosed frame force-closes marked `repaired` + recorded, never silently", () => {
    const r = parseMemeText(URI, "<<~ ahu #x >>\n\nunclosed body to EOF");
    expect(r.failures.some((f) => f.reason === "unclosed-frame")).toBe(true);
    const ahu = r.nodes.find((n) => n.kind === "Ahu") as { recoveredAs?: string; confidence?: number } | undefined;
    expect(ahu).toBeDefined();
    expect(ahu!.recoveredAs).toBe("repaired");
    expect(ahu!.confidence).toBe(9);
    expect(JSON.stringify(ahu)).toContain("unclosed body"); // the valid content inside still parsed
  });

  test("a sigil self-declares its degradation posture via recoverAs (water, not the default repaired)", () => {
    // The driver consults the per-sigil `recoverAs` for an unclosed frame. Here `ahu` declares "water"
    // → inert (confidence 2); without a declaration it defaults to "repaired" (confidence 9, above).
    const grammar = { sigils: [{
      name: "ahu", kind: "context", recoverAs: "water",
      openPattern: "<<~\\s*ahu\\s+(#[\\w-]+)\\s*>>",
      closePattern: "<<~\\/ahu\\s*>>",
    }], families: [] } as unknown as GrammarRules;
    const r = parseMemeText(URI, "<<~ ahu #x >>\n\nbody to EOF", grammar);
    const recovered = r.nodes.find((n) => (n as { recoveredAs?: string }).recoveredAs) as
      { recoveredAs?: string; confidence?: number } | undefined;
    expect(recovered).toBeDefined();
    expect(recovered!.recoveredAs).toBe("water");  // the sigil's OWN declared posture, not the default
    expect(recovered!.confidence).toBe(2);
  });
});
