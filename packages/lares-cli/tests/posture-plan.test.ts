/**
 * posture-plan — what `lares vessel stand` does with a flag the chosen posture cannot carry.
 *
 * ── THE SEAM ────────────────────────────────────────────────────────────────────────────────────
 * One verb, four postures, four handlers. The default reads `--observe`, `--init`, `--install`,
 * `--admit` and the four surface flags; `--foreground` reads four other things; `--with-app` reads
 * NOTHING AT ALL. So a flag typed beside the wrong posture vanishes — no warning, exit 0, and a
 * reader who watched the command succeed believes it did what they asked.
 *
 * ── WHY `--observe` REFUSES WHERE THE OTHERS WARN ───────────────────────────────────────────────
 * Observing is not a preference. It is a VOW that the run touches nothing, and callers lean on it —
 * harnesses, hooks, the wake report. `--observe --foreground` dropped that vow and booted a node:
 * the one flag whose silent loss inverts its own meaning. It refuses.
 *
 * Everything else names what it dropped and carries on, because a person who typed one extra flag
 * wants the vessel standing more than they want a lecture.
 */
import { describe, it, expect } from "vitest";
import { posturePlan } from "../src/commands/posture-plan.js";

describe("posture-plan — a dropped flag names itself", () => {
  it("the bare stand carries everything the default posture reads", () => {
    const p = posturePlan(["observe", "init", "claude"]);
    expect(p.posture).toBe("report");
    expect(p.dropped).toEqual([]);
    expect(p.refuse).toBe(null);
  });

  it("★ `--observe --foreground` REFUSES — the vow inverts rather than degrades ★", () => {
    const p = posturePlan(["observe", "foreground"]);
    expect(p.posture).toBe("foreground");
    // The refusal names BOTH halves: which vow broke, and which posture broke it.
    expect(p.refuse).toMatch(/observe/i);
    expect(p.refuse).toMatch(/foreground/i);
  });

  it("★ `--observe` refuses beside EVERY acting posture, never just the first ★", () => {
    for (const acting of ["foreground", "with-app", "restart"]) {
      expect(posturePlan(["observe", acting]).refuse).not.toBe(null);
    }
  });

  it("★ `--init --foreground` names the drop and stands anyway ★", () => {
    const p = posturePlan(["init", "foreground"]);
    expect(p.posture).toBe("foreground");
    expect(p.refuse).toBe(null);        // a warning, never a wall
    expect(p.dropped).toContain("init");
  });

  it("★ `--with-app` drops the most, and says the most ★", () => {
    // It reads its args not at all, so even `--port` goes. A person aiming a second vessel at
    // another port with `--with-app` gets 8080 and no word about it.
    const p = posturePlan(["with-app", "init", "claude"]);
    expect(p.posture).toBe("with-app");
    expect(p.dropped).toEqual(expect.arrayContaining(["init", "claude"]));
  });

  it("a flag the posture reads never counts as dropped", () => {
    // `--restart` reads the port; `--foreground` reads the wiki. Neither belongs in a warning.
    expect(posturePlan(["restart", "port"]).dropped).not.toContain("port");
    expect(posturePlan(["foreground", "wiki"]).dropped).not.toContain("wiki");
  });

  it("an unknown flag stays silent — this reads postures, never spellings", () => {
    // Arg parsing owns unknown flags. A posture reader that also policed spelling would refuse
    // things it has no standing to judge.
    expect(posturePlan(["foreground", "some-flag-we-never-defined"]).dropped)
      .not.toContain("some-flag-we-never-defined");
  });

  it("★ two postures at once resolve by the door's own order, and say which won ★", () => {
    // `standVessel` tests with-app first, then restart, then foreground. A person who typed two
    // gets one, and the plan names it rather than leaving them to read the dispatcher.
    const p = posturePlan(["with-app", "foreground"]);
    expect(p.posture).toBe("with-app");
    expect(p.shadowed).toContain("foreground");
  });
});
