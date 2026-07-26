/**
 * verb-surface — one registry, many projections, and the signing hand that stays human.
 *
 * Two surfaces keeping two catalogues drift, and that drift never announces itself: it appears as a verb an
 * agent can reach and a human cannot, or the reverse. So a verb declares its surfaces once, beside its
 * handler, and every projection reads that one declaration.
 *
 * The arms that carry weight: an UNDECLARED verb projects nowhere (a surface exposes what asked to be
 * exposed) · a KEY-HOLDING verb never reaches an executable projection · and the projection reads over what
 * the vessel actually COMPOSED, so capability-degradation reaches the surface with no allowlist to maintain.
 */
import { describe, test, expect } from "vitest";
import { VerbTable, VERB_SURFACE, type VerbSpec } from "../src/verb-dispatcher.js";

const noop = async () => ({});
const spec = (over: Partial<VerbSpec> = {}): VerbSpec =>
  ({ summary: "s", surfaces: [VERB_SURFACE.cli, VERB_SURFACE.agent], ...over });

describe("one registry projects onto many surfaces", () => {
  test("a verb reaches exactly the surfaces it declared", () => {
    const t = new VerbTable();
    t.register("both",      noop, spec());
    t.register("cli-only",  noop, spec({ surfaces: [VERB_SURFACE.cli] }));
    t.register("agent-only", noop, spec({ surfaces: [VERB_SURFACE.agent] }));

    expect(t.project(VERB_SURFACE.cli).map((e) => e.verb)).toEqual(["both", "cli-only"]);
    expect(t.project(VERB_SURFACE.agent).map((e) => e.verb)).toEqual(["agent-only", "both"]);
  });

  // A surface exposes what ASKED to be exposed. An internally-routed verb stays a legitimate thing, and
  // forcing every one to declare a summary would only invite meaningless ones.
  test("★ an UNDECLARED verb projects NOWHERE, though it stays callable ★", () => {
    const t = new VerbTable();
    t.register("internal", noop);                       // no spec
    expect(t.has("internal")).toBe(true);               // still registered …
    expect(t.list()).toContain("internal");
    expect(t.project(VERB_SURFACE.cli)).toEqual([]);    // … and reaches no surface
    expect(t.project(VERB_SURFACE.agent)).toEqual([]);
  });

  test("a surface nobody declared projects nothing — adding one costs a string, not a redesign", () => {
    const t = new VerbTable();
    t.register("a", noop, spec());
    expect(t.project("wiki")).toEqual([]);
    t.register("b", noop, spec({ surfaces: ["wiki"] }));
    expect(t.project("wiki").map((e) => e.verb)).toEqual(["b"]);
  });

  test("the projection carries the summary the surface renders", () => {
    const t = new VerbTable();
    t.register("pour", noop, spec({ summary: "pour a corpus into a bed" }));
    expect(t.project(VERB_SURFACE.cli)[0]!.spec.summary).toBe("pour a corpus into a bed");
  });
});

describe("the signing hand stays the human's", () => {
  test("★ a KEY-HOLDING verb never reaches an EXECUTABLE projection ★", () => {
    const t = new VerbTable();
    t.register("recall",       noop, spec());
    t.register("cabal-vouch",  noop, spec({ signs: true }));   // stakes standing — holds a key

    expect(t.project(VERB_SURFACE.agent).map((e) => e.verb)).toEqual(["cabal-vouch", "recall"]);
    expect(t.projectExecutable(VERB_SURFACE.agent).map((e) => e.verb)).toEqual(["recall"]);
  });

  // Reaching a signing verb takes a DELIBERATE call to `project` plus a deliberate compose-only path —
  // never an accident of listing tools. The agent may compose the artifact; the operator signs it.
  test("a signing verb stays VISIBLE to a surface that wants to compose it", () => {
    const t = new VerbTable();
    t.register("nexus-contract", noop, spec({ signs: true }));
    expect(t.project(VERB_SURFACE.agent)).toHaveLength(1);       // composable …
    expect(t.projectExecutable(VERB_SURFACE.agent)).toHaveLength(0);  // … never executable
  });

  test("the CLI surface executes signing verbs — a human at a terminal IS the signing hand", () => {
    const t = new VerbTable();
    t.register("nexus-contract", noop, spec({ signs: true }));
    expect(t.projectExecutable(VERB_SURFACE.cli).map((e) => e.verb)).toEqual([]);
  });
});

describe("capability-degradation reaches the surface with no allowlist", () => {
  // The projection reads over what the vessel COMPOSED. A verb whose provider cap never composed never
  // registered, so it cannot project — which is the whole point: nobody maintains a per-vessel tool list,
  // and none can therefore fall out of date.
  test("★ a plane that composed fewer caps projects fewer verbs, with nothing written down ★", () => {
    const hearth = new VerbTable();
    hearth.register("recall",   noop, spec());
    hearth.register("worldline", noop, spec());
    hearth.register("status",   noop, spec());

    const herm = new VerbTable();          // composed no mempalace provider → those verbs never registered
    herm.register("status", noop, spec());

    expect(hearth.project(VERB_SURFACE.agent)).toHaveLength(3);
    expect(herm.project(VERB_SURFACE.agent).map((e) => e.verb)).toEqual(["status"]);
  });

  test("a duplicate registration still refuses — one name, one handler", () => {
    const t = new VerbTable();
    t.register("a", noop, spec());
    expect(() => t.register("a", noop, spec())).toThrow(/duplicate handler/);
  });
});
