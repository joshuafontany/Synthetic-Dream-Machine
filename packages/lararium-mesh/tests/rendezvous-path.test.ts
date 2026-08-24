/**
 * THE RENDEZVOUS PATH — where two processes meet, inside a budget the kernel sets.
 *
 * ── WHY THIS SITS APART FROM THE DATA HOME ───────────────────────────────────────────────────────────────
 * One path was answering two questions. A data home answers WHOSE IT IS — the spirits' substrate under
 * `lares`, the house's shelf under `lararium`, split so a wipe reaches exactly one. A socket answers
 * something else entirely: WHERE DO TWO PROCESSES MEET, in at most ~104 bytes of `sockaddr_un.sun_path`.
 * Fusing them means the second question inherits the first's depth, and a root three directories deeper
 * than expected takes the rendezvous down while every other thing about the vessel stands correctly. That
 * is measured, not hypothetical: `listen EINVAL` on a scratch root, with the daemon serving throughout.
 *
 * ── WHY NOT `$XDG_RUNTIME_DIR` (OPERATOR RULING, 2026-08-23) ─────────────────────────────────────────────
 * "Herms/larariums at all scales serve as civic infrastructure" — a lararium daemon MUST survive its
 * operator logging out. `/run/user/$UID` is destroyed at logout by contract, so nothing that must be found
 * alive tomorrow may live there. The split in the field's practice does not run modern-vs-legacy; it runs
 * along exactly this question, and this house has answered it. `/tmp/lares-<uid>/` is the siting for a
 * process that outlives its session.
 *
 * ── WHAT ISOLATION REQUIRES ──────────────────────────────────────────────────────────────────────────────
 * A shared short directory would be worse than a deep one: two throwaway roots would collide on a single
 * rendezvous, and a rehearsal would reach the real machine's daemon while believing itself isolated. So the
 * name DERIVES from the root — same root, same socket; different roots, never.
 */

import { describe, test, expect } from "vitest";
import {
  rendezvousPath, SUN_PATH_BUDGET, rendezvousFits,
} from "../src/rendezvous-path.js";

const DEEP = "/tmp/claude-1000/-home-joshu-Synthetic-Dream-Machine/60b5a3fe-6314-472a-8f27-94a1cde2a2f2/scratchpad/found-walk";

describe("the rendezvous fits the kernel's budget, however deep the root", () => {
  test("a root far past the budget still yields a path that fits", () => {
    // THE MEASURED FAILING CASE. This root produced `listen EINVAL` when the socket sat beside the data.
    expect(DEEP.length).toBeGreaterThan(100);
    const p = rendezvousPath({ root: DEEP, uid: 1000 });
    expect(p.length).toBeLessThan(SUN_PATH_BUDGET);
    expect(rendezvousFits(p)).toBe(true);
  });

  test("the budget leaves room for a tail this design does not own", () => {
    // lima reserves 25 chars because OpenSSH's ControlMaster appends 16 random bytes to a socket name. A
    // budget measuring only our own path underestimates by exactly the amount someone else appends.
    expect(SUN_PATH_BUDGET).toBeLessThanOrEqual(104);
    const p = rendezvousPath({ root: DEEP, uid: 1000 });
    expect(SUN_PATH_BUDGET - p.length).toBeGreaterThanOrEqual(16);
  });
});

describe("the rendezvous isolates by root — a shared short home would be worse than a deep one", () => {
  test("two different roots never meet on one socket", () => {
    const a = rendezvousPath({ root: "/tmp/lares-rehearsal-a", uid: 1000 });
    const b = rendezvousPath({ root: "/tmp/lares-rehearsal-b", uid: 1000 });
    expect(a).not.toBe(b);
  });

  test("one root always answers to one socket — a client can find what a daemon bound", () => {
    expect(rendezvousPath({ root: DEEP, uid: 1000 })).toBe(rendezvousPath({ root: DEEP, uid: 1000 }));
  });

  test("two operators on one machine never collide", () => {
    // The directory carries the uid, so a shared /tmp does not become a shared rendezvous.
    expect(rendezvousPath({ root: "/same", uid: 1000 })).not.toBe(rendezvousPath({ root: "/same", uid: 1001 }));
    expect(rendezvousPath({ root: "/same", uid: 1000 })).toContain("lares-1000");
  });
});

describe("the siting follows the ruling: it survives a logout", () => {
  test("the path never sits under a runtime dir the session destroys", () => {
    // THE CLAIM IS THE SITING, NOT A KNOB. An earlier shape took `xdgRuntimeDir` and ignored it, so the
    // signature advertised a choice the ruling had already closed — a parameter whose whole job was doing
    // nothing still invites a caller to pass it and expect an effect. The siting is asserted directly.
    const p = rendezvousPath({ root: "/some/root", uid: 1000 });
    expect(p.startsWith("/run/user/")).toBe(false);
    expect(p.startsWith("/tmp/lares-1000/")).toBe(true);
  });
});

describe("the budget check is a READING, offered before anything binds", () => {
  test("a path past the budget reads unfit rather than throwing at bind time", () => {
    // lima validates at instance-CREATE, VS Code warns at derive time with the cure. The check moves
    // earlier than the bind, so the answer arrives before the two-minute wait rather than after it.
    expect(rendezvousFits("/tmp/lares-1000/" + "x".repeat(200))).toBe(false);
    expect(rendezvousFits("/tmp/lares-1000/abc.sock")).toBe(true);
  });
});
