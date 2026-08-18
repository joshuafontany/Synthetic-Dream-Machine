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
 *   V2 — persona-scoped verbs DO NOT REGISTER without a face, the gate the vault verbs already keep:
 *        absent the thing they need, they never register (rather than registering and throwing on call)
 *   V3 — the place-scoped verbs register anyway — carrying and serving is what a faceless place IS FOR
 *   V4 — with a face, the persona verbs return
 */
import { describe, test, expect } from "vitest";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";

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
 * THE SEAM THESE VECTORS WAIT ON.
 *
 * `wireWorkerVerbs` is handed to `makeDaemonBehavior` and called deep inside its `onEa`, over a real
 * VerbTable and a live IslandContext — so nothing can reach the wiring pass without standing a whole daemon.
 * That absence is why a faceless place could throw at wire time with 1,900 tests green: the one pass that
 * decides WHICH verbs a vessel offers has no door of its own.
 *
 * The pono shape: `makeOperatorDaemonBehavior` names its wiring as an exported function over
 * (daemonAuth, deps) that both the behavior and a test can call. Until it does, this helper asserts it
 * reached the pass at all — a registry that stays empty means the vectors below proved nothing, and must
 * say so rather than pass by absence.
 */
const wire = (face: boolean) => {
  const reg = fakeRegistry();
  const behavior = makeOperatorDaemonBehavior(manifest(face)) as unknown as {
    wireWorkerVerbs?: (r: unknown, c: unknown) => void;
  };
  behavior.wireWorkerVerbs?.(reg, fakeCtx());
  // A vacuous green is worse than a red: if the pass never ran, every assertion below reads as "absent"
  // and passes for the wrong reason.
  expect(reg.names.length, "the wiring pass never ran — these vectors need a seam onto it").toBeGreaterThan(0);
  return reg.names;
};

describe("a faceless place stands", () => {
  test("V1 — wiring the daemon's verbs with NO face never throws", () => {
    expect(() => wire(false)).not.toThrow();
  });

  test("V2 — persona-scoped verbs do not register without a face", () => {
    const names = wire(false);
    for (const v of ["persona-label", "persona-handle", "persona-selves", "face-join"]) {
      expect(names).not.toContain(v);
    }
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
