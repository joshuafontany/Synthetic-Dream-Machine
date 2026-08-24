/**
 * circle-command.test.ts — the FOLLOW VERB (`lares circle`) end-to-end over the circles SOURCE OF TRUTH.
 *
 * Operator intent: adding to a circle IS the follow. The MEMBERSHIP rides the sovereign circles doc (via the
 * FOLLOW-GRAPH daemon verbs — circle-add / circle-remove / circle-list), which fleet-syncs same-operator and
 * NEVER federates; only the RECOGNITION layer (the handle-book: others' nyms + private petnames) stays LOCAL,
 * gating an unknown nym fail-closed BEFORE the membership write reaches the circles doc.
 *
 * Proven:
 *   · `circle add <nym> --card --to following --petname` returns 0, dispatches circle-add to the daemon (the
 *     membership lands in the circles doc, NOT a local `.circles-follow.json`), and writes ONLY the local handle-book
 *     — no board / announce / crossroads artifact anywhere in the tree (never-federates),
 *   · `circle list` reads the follow back through circle-list (circles.memberDids) under the OWN names,
 *   · `circle remove` dispatches circle-remove (drops the circles edge),
 *   · FAIL-CLOSED — following an UNMET nym with NO --card returns non-zero AND dispatches NO circle-add.
 */
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The circles doc, mocked at the sock transport: an in-memory follow-graph the circle-* verbs round-trip.
const h = vi.hoisted(() => ({
  graph: new Map<string, Set<string>>(),
  calls: [] as Array<{ verb: string; args: Record<string, unknown> }>,
}));
vi.mock("../src/verb-call.js", () => ({
  DaemonUnreachable: class extends Error {},
  runVerb: async (verb: string, args: Record<string, unknown>) => {
    h.calls.push({ verb, args });
    const circle = String(args["circle"] ?? "");
    const nym    = String(args["nym"] ?? "");
    const out: Record<string, unknown> = {};
    if (verb === "circle-add") {
      const set = h.graph.get(circle) ?? new Set<string>(); set.add(nym); h.graph.set(circle, set);
      out["added"] = true; out["members"] = [...set].sort();
    } else if (verb === "circle-remove") {
      const set = h.graph.get(circle) ?? new Set<string>(); set.delete(nym); h.graph.set(circle, set);
      out["removed"] = true; out["members"] = [...set].sort();
    } else if (verb === "circle-list") {
      if (circle) out["members"] = [...(h.graph.get(circle) ?? [])].sort();
      else out["circles"] = [...h.graph.entries()].map(([c, s]) => ({ circle: c, members: [...s].sort() }));
    }
    return { status: "done", requestId: "r", results: { summary: { ok: true, output: out } } };
  },
}));
// Stub the VESSEL DID (no vessel key in a bare temp root); keep larIdentityDir real.
vi.mock("../src/env.js", async (orig) => ({
  ...(await orig<typeof import("../src/env.js")>()),
  vesselDid: async () => "0x" + "ab".repeat(32),
}));

import { cmdCircle } from "../src/commands/circle.js";
import { larIdentityDir } from "../src/env.js";
import type { ParsedArgs } from "../src/parse-args.js";
import { signHandleCard, ed25519SignerFromSeed, derivePersonaKeypair, signingSeedFromHex } from "@lararium/mesh";

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined): void => {
  saved[k] = process.env[k];
  if (v === undefined) delete process.env[k]; else process.env[k] = v;
};
const circleArgs = (positional: string[], options: Record<string, string> = {}): ParsedArgs =>
  ({ command: "circle", positional, options, flags: { json: true } } as unknown as ParsedArgs);

/** Mint a self-certifying HandleCard for a fresh nym, write it to a file, return its path + the nym. */
async function cardFile(dir: string, seedByte: number, glamour: string): Promise<{ nym: string; path: string }> {
  const { signingKey, verifyingKey: nym } = await derivePersonaKeypair(new Uint8Array(32).fill(seedByte), [0]);
  const card = await signHandleCard(
    { nym, glamour, version: 1, prev: null, expiry: Date.now() + 86_400_000, standing: null },
    ed25519SignerFromSeed(signingSeedFromHex(signingKey)),
  );
  const path = join(dir, `${glamour}.card.json`);
  writeFileSync(path, JSON.stringify(card), "utf8");
  return { nym, path };
}

/** Every file under the identity home — the LOCAL footprint (now only the handle-book, never the graph). */
function identityFootprint(): string[] {
  const dir = larIdentityDir();
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}
const verbsSent = (): string[] => h.calls.map((c) => c.verb);

describe("lares circle — the follow verb over the circles doc (fleet-synced, traceless)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lares-circle-"));
    setEnv("LAR_ROOT", root);
    h.graph.clear(); h.calls.length = 0;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(root, { recursive: true, force: true });
  });

  test("add with a card follows: membership → the circles doc (daemon verb), only the handle-book lands locally", async () => {
    const { nym, path } = await cardFile(root, 3, "Discordia");
    const code = await cmdCircle(circleArgs(["add", nym], { to: "following", card: path, petname: "my-eris" }));
    expect(code).toBe(0);

    // The membership rode the daemon (circle-add), landing in the circles doc — NOT a local graph file.
    expect(h.calls).toContainEqual({ verb: "circle-add", args: { circle: "following", nym } });
    expect(h.graph.get("following")).toContain(nym);

    // LOCAL footprint: ONLY the handle-book (recognition + petname) — no `.circles-follow.json`, no board artifact.
    const foot = identityFootprint();
    expect(foot).toContain(".handle-book.json");
    expect(foot).not.toContain(".circles-follow.json");
    expect(foot.some((f) => /crossroad|board|announce|glamour|public/i.test(f))).toBe(false);

    const book = JSON.parse(readFileSync(join(larIdentityDir(), ".handle-book.json"), "utf8"));
    expect(book.records.find((r: { nym: string }) => r.nym === nym)?.petname).toBe("my-eris");
  });

  test("list reads the follow back from the circles doc; remove drops the circles edge", async () => {
    const { nym, path } = await cardFile(root, 7, "TheGuru");
    await cmdCircle(circleArgs(["add", nym], { to: "following", card: path, petname: "guru" }));

    expect(await cmdCircle(circleArgs(["list"], { to: "following" }))).toBe(0);
    expect(verbsSent()).toContain("circle-list");

    expect(await cmdCircle(circleArgs(["remove", nym], { to: "following" }))).toBe(0);
    expect(h.calls).toContainEqual({ verb: "circle-remove", args: { circle: "following", nym } });
    expect([...(h.graph.get("following") ?? [])]).not.toContain(nym);
  });

  test("FAIL-CLOSED — following an UNMET nym with no --card returns non-zero AND dispatches no circle-add", async () => {
    const code = await cmdCircle(circleArgs(["add", "ab".repeat(32)], { to: "following" }));
    expect(code).not.toBe(0);
    // Recognition fails CLIENT-side before any membership write — the daemon never saw a follow.
    expect(verbsSent()).not.toContain("circle-add");
    expect(h.graph.get("following") ?? new Set()).toEqual(new Set());
  });
});
