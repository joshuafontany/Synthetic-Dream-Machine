/**
 * faceless-place-stands — the WAKING FLOOR is a place that boots.
 *
 * A founding splits in two: `vessel found` stands a PLACE that carries and serves the public shelf, and
 * `persona new 0` lights the first FACE on it. Between those two acts a vessel stands FACELESS, and the
 * runbook's own rite walks that window every time a human founds by hand.
 *
 * These vectors say what must hold there, and they name a shape no other suite reaches: every test in this
 * stack founds a face, so a faceless boot has no witness anywhere else.
 *
 *   V1 — wiring the daemon's verbs FACELESS never throws; a place that prints "the PLACE stands" boots
 *   V2 — face-scoped verbs refuse by NAMING THE LIFT, never by stack trace: the reactor reaches for no
 *        face when it is wired, so standing it costs the boot nothing and a caller learns what to do
 *   V3 — the place-scoped verbs register anyway — carrying and serving is what a faceless place IS FOR
 *   V4 — with a face, the persona verbs return
 */
import { describe, test, expect } from "vitest";
import { operatorDaemonOptions } from "@lararium/keyhive/operator-daemon-behavior";
import { VerbTable } from "@lararium/tw5";

/** A recording registry — the surface `wireWorkerVerbs` writes into. */
function fakeRegistry() {
  const names: string[] = [];
  return { names, register: (n: string) => { names.push(n); } };
}

/** The minimum an island context must offer for the wiring pass to run. */
const fakeCtx = () => ({
  composite: {} as never,
  repo:      {} as never,
  catalogUrl: "automerge:fakeCatalog",
  oracleUrl:  "automerge:fakeOracle",
  tw5:       {} as never,
  post:      () => {},
}) as never;

const manifest = (face: boolean) => ({
  daemonAuth: {
    vesselVerifyingKey: "a".repeat(64),
    registerBags: [],
    ...(face ? { personaGroupDocIdHex: "ab".repeat(16), personaGroupAgentIdHex: "cd".repeat(16) } : {}),
  },
}) as never;

/**
 * These call the wiring pass DIRECTLY. It decides which verbs a vessel offers, and it used to have no door of
 * its own — handed to `makeDaemonBehavior` and invoked inside its onEa over a live VerbTable, so nothing could
 * read it without standing a whole daemon. That absence is how a faceless throw hid behind a green suite.
 */
const wire = (face: boolean) => {
  const registry = new VerbTable();
  const names: string[] = [];
  const realRegister = registry.register.bind(registry);
  (registry as unknown as { register: (n: string, f: unknown) => void }).register = (n, f) => {
    names.push(n); realRegister(n, f as never);
  };
  operatorDaemonOptions(manifest(face)).wireWorkerVerbs?.(registry, fakeCtx());
  // A vacuous green is worse than a red: a pass that never ran leaves every assertion below true by absence.
  expect(names.length, "the wiring pass never ran").toBeGreaterThan(0);
  return names;
};

describe("a faceless place stands", () => {
  test("V1 — wiring the daemon's verbs with NO face never throws", () => {
    expect(() => wire(false)).not.toThrow();
  });

  test("V2 — a face-scoped verb the floor CANNOT run refuses by naming the lift", async () => {
    // Absent a face these once went unregistered, and a caller met "no handler registered for
    // persona-selves" — true, and nothing a human can act on. The floor is a state a vessel LIFTS out of,
    // so the name stands and the refusal carries the act that lifts it.
    const registry = new VerbTable();
    const seen: string[] = [];
    const real = registry.register.bind(registry);
    (registry as unknown as { register: (n: string, f: unknown) => void }).register = (n, f) => {
      seen.push(n); real(n, f as never);
    };
    operatorDaemonOptions(manifest(false)).wireWorkerVerbs?.(registry, fakeCtx());
    expect(seen.length, "the wiring pass never ran").toBeGreaterThan(0);

    for (const v of ["persona-label", "persona-handle", "persona-selves"]) {
      expect(seen, `${v} must stand so its refusal can speak`).toContain(v);
      await expect(registry.get(v)!({}, {} as never)).rejects.toThrow(/waking floor|persona new 0/i);
    }
  });

  test("V2b — face-join stays unregistered: a floor seats nobody, and no message changes that", () => {
    // Distinct from the read verbs above. `persona-selves` refuses an act this vessel could perform once
    // lifted; `face-join` would seat another device into a group that does not exist, so it holds no
    // lifted form to describe and stands as an unknown verb rather than a refusal that implies one.
    expect(wire(false)).not.toContain("face-join");
  });

  test("V3 — the place-scoped verbs register anyway; carrying and serving is what it is for", () => {
    const names = wire(false);
    for (const v of ["where", "resolve"]) expect(names).toContain(v);
  });

  test("V4 — with a face, the persona verbs return", () => {
    const names = wire(true);
    for (const v of ["persona-label", "persona-handle", "persona-selves", "face-join"]) {
      expect(names).toContain(v);
    }
  });
});
