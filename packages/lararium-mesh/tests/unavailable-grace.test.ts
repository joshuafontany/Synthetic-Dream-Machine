/**
 * unavailable-grace — when an `unavailable` may be believed.
 *
 * ── THE TWO ABSENCES LOOK IDENTICAL ─────────────────────────────────────────────────────────────
 * A hearth-private doc never crosses the tideline, so the library answering `unavailable` reads as a
 * terminal answer: no peer will ever supply it, and failing fast beats waiting out a deadline for a
 * doc that will never come.
 *
 * That reading holds for a doc nobody wrote. It fails for a doc THIS VESSEL JUST WROTE. A founding
 * seeds the daemon doc, writes a bootstrap, initialises a wasm module, and asks for the doc back — and
 * an in-flight local write is indistinguishable from an absent one at the moment it is asked.
 *
 * MEASURED: a hearth died on `reason: 'doc-unavailable'` for the very doc id it had just seeded, on an
 * idle machine with no peers. Raising the deadline could not touch it, because the terminal path never
 * reaches the deadline.
 *
 * ── SO A LOCAL ABSENCE EARNS A GRACE, AND ONLY ONE ──────────────────────────────────────────────
 * A first `unavailable` on a hearth-private doc buys a short wait; one that persists past the grace
 * gets believed. A genuinely absent doc therefore costs the grace rather than the whole deadline, and
 * a flush in flight gets the moment it needs.
 *
 * A mesh-shared `unavailable` was never terminal and stays that way — the mesh may still deliver.
 */
import { describe, it, expect } from "vitest";
import { unavailableVerdict } from "../src/boot-resolver.js";

describe("unavailable-grace — a local absence is believed, but not instantly", () => {
  it("★ a hearth-private absence WAITS inside the grace — a flush may still land ★", () => {
    expect(unavailableVerdict({ tideline: "hearth-private", expectPresent: true, sinceFirstMs: 0 })).toBe("wait");
    expect(unavailableVerdict({ tideline: "hearth-private", expectPresent: true, sinceFirstMs: 500 })).toBe("wait");
  });

  it("★ and gets BELIEVED once it persists past the grace ★", () => {
    expect(unavailableVerdict({ tideline: "hearth-private", expectPresent: true, sinceFirstMs: 60_000 })).toBe("terminal");
  });

  it("★ a mesh-shared absence NEVER reads terminal — the mesh may still deliver ★", () => {
    for (const ms of [0, 500, 60_000, 10_000_000]) {
      expect(unavailableVerdict({ tideline: "mesh-shared", sinceFirstMs: ms })).toBe("wait");
    }
  });

  it("★ the grace costs far less than the deadline — an absent doc still fails fast ★", () => {
    // The property the fast-fail existed for: a doc nobody wrote must not hold a boot for the full
    // hearth budget. The grace buys a flush its moment and nothing more.
    const grace = [...Array(200).keys()].map((i) => i * 100)
      .find((ms) => unavailableVerdict({ tideline: "hearth-private", expectPresent: true, sinceFirstMs: ms }) === "terminal");
    expect(grace).toBeDefined();
    expect(grace!).toBeLessThan(5_000);
  });

  it("★ a caller that MINTS on absence pays no grace — absence rides its ordinary path ★", () => {
    // `materializeSharedLarDoc` stands a blank board when none exists, so charging it a flush grace
    // would slow every first mint to buy a moment it never needs.
    expect(unavailableVerdict({ tideline: "hearth-private", sinceFirstMs: 0 })).toBe("terminal");
  });

  it("★ a negative or absent elapsed reads as the FIRST sighting, never as expired ★", () => {
    // A clock that went backwards must not convict an absence it has only just seen.
    for (const ms of [-1, -10_000]) {
      expect(unavailableVerdict({ tideline: "hearth-private", expectPresent: true, sinceFirstMs: ms })).toBe("wait");
    }
  });
});
