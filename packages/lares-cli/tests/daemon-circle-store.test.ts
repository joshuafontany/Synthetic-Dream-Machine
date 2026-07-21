/**
 * daemon-circle-store — the CLI follow-graph adapter drives the @circles DAEMON VERBS, never a local file.
 *
 * The source-of-truth move at the CLI seam: composeFollow's CircleStore now writes @circles (via circle-add /
 * circle-remove / circle-list over the sock) instead of a per-device JSON file. These hold that:
 *   · add/remove/members/circles each dispatch the matching circle-* verb, carrying the operator DID.
 *   · members / circles READ the daemon's @circles result back.
 *   · NEVER-FEDERATES: the adapter reaches ONLY circle-* verbs — no @crossroads / board / announce seam.
 *   · a daemon error surfaces as itself (never a silent local fallback — the graph's home moved).
 */

import { describe, expect, test, vi, beforeEach } from "vitest";

// The sock transport, mocked: capture every verb the adapter dispatches + hand back a canned outcome.
const h = vi.hoisted(() => ({
  calls:  [] as Array<{ verb: string; args: Record<string, unknown>; requestedBy: string }>,
  output: {} as Record<string, unknown>,
  status: "done" as "done" | "error",
  errorMessage: undefined as string | undefined,
}));

vi.mock("../src/verb-call.js", () => ({
  runVerb: async (verb: string, args: Record<string, unknown>, requestedBy: string) => {
    h.calls.push({ verb, args, requestedBy });
    return {
      status:  h.status,
      requestId: "r-test",
      ...(h.errorMessage ? { errorMessage: h.errorMessage } : {}),
      results: { summary: { ok: h.status === "done", output: h.output } },
    };
  },
}));

import { makeDaemonCircleStore } from "../src/daemon-circle-store.js";

const OP = "did:key:zOperator";

beforeEach(() => { h.calls.length = 0; h.output = {}; h.status = "done"; h.errorMessage = undefined; });

describe("makeDaemonCircleStore — the @circles-backed CircleStore", () => {
  test("add drives the circle-add daemon verb (not a local file)", async () => {
    await makeDaemonCircleStore(OP).add("following", "aa");
    expect(h.calls).toEqual([{ verb: "circle-add", args: { circle: "following", nym: "aa" }, requestedBy: OP }]);
  });

  test("remove drives the circle-remove daemon verb", async () => {
    await makeDaemonCircleStore(OP).remove("following", "aa");
    expect(h.calls).toEqual([{ verb: "circle-remove", args: { circle: "following", nym: "aa" }, requestedBy: OP }]);
  });

  test("members READS @circles.memberDids back via circle-list", async () => {
    h.output = { members: ["aa", "bb"] };
    const members = await makeDaemonCircleStore(OP).members("following");
    expect(members).toEqual(["aa", "bb"]);
    expect(h.calls[0]).toMatchObject({ verb: "circle-list", args: { circle: "following" } });
  });

  test("circles() lists every circle via circle-list (no circle arg)", async () => {
    h.output = { circles: [{ circle: "following", members: ["aa"] }, { circle: "blocked", members: [] }] };
    const circles = await makeDaemonCircleStore(OP).circles();
    expect(circles).toEqual(["blocked", "following"]);   // sorted
    expect(h.calls[0]).toMatchObject({ verb: "circle-list", args: {} });
  });

  test("NEVER-FEDERATES: the adapter reaches ONLY circle-* verbs — no board seam", async () => {
    const store = makeDaemonCircleStore(OP);
    await store.add("following", "aa");
    await store.remove("following", "aa");
    await store.members("following");
    h.output = { circles: [] };
    await store.circles();
    for (const c of h.calls) {
      expect(c.verb.startsWith("circle-")).toBe(true);
      expect(c.verb).not.toContain("crossroads");
      expect(c.verb).not.toContain("board");
      expect(c.verb).not.toContain("announce");
    }
  });

  test("a daemon error surfaces (no silent local fallback)", async () => {
    h.status = "error";
    h.errorMessage = "circle-add refused";
    await expect(makeDaemonCircleStore(OP).add("following", "aa")).rejects.toThrow("circle-add refused");
  });
});
