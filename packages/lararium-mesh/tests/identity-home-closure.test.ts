/**
 * identity-home-closure — whether a vessel's identity home stands closed to other users.
 *
 * ── AN INVARIANT THE CODE STATES AND NOTHING ENFORCES ───────────────────────────────────────────
 * The vessel identity module writes its keypairs at 0600 and then says the rest belongs to somebody
 * else: "caller must ensure the identity dir is not world-readable". No caller does, and the directory
 * gets created with the process umask.
 *
 * What sits there decides why that matters. Persona-root signing seeds rest in cleartext, so a reader
 * of that directory can mint this vessel's signatures — which means seat a chair, sign a stamp, or
 * counter-sign a quorum act as one of its faces.
 *
 * ── AND THIS CHECKS THE BOUNDARY THAT EXISTS, NOT ONE IT WOULD LIKE TO ──────────────────────────
 * A mode bit stops another USER, and it stops nothing that already runs as this one. So this reads
 * the group and other bits and answers about them alone. A same-uid neighbour stays reachable however
 * this reads, and saying otherwise would sell a boundary the filesystem does not draw.
 *
 * It reports rather than repairs. A vessel that widened its own home may have reasons, and a reading
 * that silently chmod'd would hide a misconfiguration the operator wants to see.
 */
import { describe, it, expect } from "vitest";
import { identityHomeClosure } from "../src/identity-home-closure.js";

describe("identity-home-closure — what a mode bit can and cannot promise", () => {
  it("★ 0700 stands closed to other users ★", () => {
    const r = identityHomeClosure(0o700);
    expect(r.closed).toBe(true);
    expect(r.reading).toMatch(/closed|owner/i);
  });

  it("★ a GROUP-readable home stands open, and names which bit opened it ★", () => {
    const r = identityHomeClosure(0o750);
    expect(r.closed).toBe(false);
    expect(r.reading).toMatch(/group/i);
  });

  it("★ a WORLD-readable home stands open — the case the code names and nothing checks ★", () => {
    const r = identityHomeClosure(0o755);
    expect(r.closed).toBe(false);
    expect(r.reading).toMatch(/other users|world/i);
  });

  it("★ 0755 from a default umask reads open — the shape a plain mkdir leaves ★", () => {
    // `mkdirSync(..., {recursive:true})` takes the process umask, so this reads the ordinary case.
    expect(identityHomeClosure(0o755).closed).toBe(false);
  });

  it("★ write and execute bits count too — a listable home leaks which faces stand ★", () => {
    for (const mode of [0o710, 0o701, 0o720, 0o702]) {
      expect(identityHomeClosure(mode).closed).toBe(false);
    }
  });

  it("★ every reading says what a mode bit does NOT promise ★", () => {
    // The honest half: a same-uid neighbour reaches this home whatever the bits say.
    for (const mode of [0o700, 0o755]) {
      expect(identityHomeClosure(mode).reading).toMatch(/same user|same uid|already runs as/i);
    }
  });

  it("★ an unreadable mode reports UNKNOWN rather than closed ★", () => {
    // A stat that failed says nothing about the directory, and a guess would say the safe-sounding
    // thing on no evidence.
    const r = identityHomeClosure(null);
    expect(r.closed).toBe(false);
    expect(r.reading).toMatch(/cannot|unread|no mode/i);
  });
});
