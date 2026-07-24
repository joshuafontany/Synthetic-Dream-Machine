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
    const ahu = r.nodes.find((n) => n.kind === "Ahu") as { recoveredAs?: string; standing?: number } | undefined;
    expect(ahu).toBeDefined();
    expect(ahu!.recoveredAs).toBe("repaired");
    expect(ahu!.standing).toBe(9);
    expect(JSON.stringify(ahu)).toContain("unclosed body"); // the valid content inside still parsed
  });

  test("a sigil self-declares its degradation posture via recoverAs (water, not the default repaired)", () => {
    // The driver consults the per-sigil `recoverAs` for an unclosed frame. Here `ahu` declares "water"
    // → inert (standing 2); without a declaration it defaults to "repaired" (standing 9, above).
    const grammar = { sigils: [{
      name: "ahu", kind: "context", recoverAs: "water",
      openPattern: "<<~\\s*ahu\\s+(#[\\w-]+)\\s*>>",
      closePattern: "<<~\\/ahu\\s*>>",
    }], families: [] } as unknown as GrammarRules;
    const r = parseMemeText(URI, "<<~ ahu #x >>\n\nbody to EOF", grammar);
    const recovered = r.nodes.find((n) => (n as { recoveredAs?: string }).recoveredAs) as
      { recoveredAs?: string; standing?: number } | undefined;
    expect(recovered).toBeDefined();
    expect(recovered!.recoveredAs).toBe("water");  // the sigil's OWN declared posture, not the default
    expect(recovered!.standing).toBe(2);
  });

  test("a novel sigil form is graded `missing` (the partial rung), not dropped to water", () => {
    // `aperture(0->20)` — a recognizable sigil-name in a param shape no specific pattern matches.
    // The generic catch-all recovers it: recognized sigil, params best-effort, graded partial.
    const r = parseMemeText(URI, "before <<~ aperture(0->20) >> after");
    expect(r.failures.some((f) => f.reason === "partial-form:aperture")).toBe(true);
    const node = r.nodes.find((n) => (n as { recoveredAs?: string }).recoveredAs === "missing") as
      { recoveredAs?: string; standing?: number; sigilName?: string; raw?: string } | undefined;
    expect(node).toBeDefined();
    expect(node!.standing).toBe(13);          // the partial band, above repaired(9) and water(2)
    expect(node!.sigilName).toBe("aperture");   // the sigil survives as recognized, not text
    expect(node!.raw).toContain("aperture(0->20)"); // lossless
  });
});

// ---------------------------------------------------------------------------
// The recovery rungs, read onto the severity ladder core TiddlyWiki closes over.
// A `missing` construct loses the author's meaning; `water` keeps the bytes and drops
// their sense; `repaired` keeps both at lower standing.
// ---------------------------------------------------------------------------

import { failuresToDiagnostics, gradeOf, severityOf, membraneDiagnostic } from "../src/meme-ast/diagnostics.js";
import type { ParseFailure } from "../src/meme-ast/types.js";

describe("the recovery gradient reads onto the core severity ladder", () => {
  const failure = (recoveredAs: ParseFailure["recoveredAs"]): ParseFailure => ({
    pos: 3,
    raw: "<<~ broken",
    reason: "unclosed-sigil",
    recoveredAs,
  });

  // Every recovery keeps the text, so every recovery grades below error. Error names the one fault
  // that costs the operator their bytes: a carrier that stopped round-tripping.
  test("grades every recovery below the line that names lost bytes", () => {
    expect(severityOf(failure("missing"))).toBe("warning");
    expect(severityOf(failure("water"))).toBe("warning");
    expect(severityOf(failure("repaired"))).toBe("info");
  });

  test("clamps a diagnostic span to the source it stands in", () => {
    const [diagnostic] = failuresToDiagnostics([failure("water")], 6);
    expect(diagnostic!.from).toBe(3);
    expect(diagnostic!.to).toBe(6);
    expect(diagnostic!.source).toBe("text/x-memetic-wikitext");
    expect(diagnostic!.code).toBe("unclosed-sigil");
  });

  test("grades a carrier by the worst fault it holds", () => {
    expect(gradeOf(failuresToDiagnostics([failure("repaired"), failure("missing")], 100))).toBe("warning");
    expect(gradeOf(failuresToDiagnostics([failure("repaired")], 100))).toBe("info");
    expect(gradeOf([])).toBe("clean");
  });

  test("only a carrier that stopped round-tripping grades error", () => {
    expect(gradeOf([membraneDiagnostic("the fence mask lost a span", 100)])).toBe("error");
  });
});
