/**
 * hearth-ready-budget — the window a vessel gives a doc it just wrote.
 *
 * ── WHAT THE BUDGET COVERS, AND WHAT IT REFUSES TO ──────────────────────────────────────────────
 * A hearth-private doc never crosses the tideline, so this clock waits on no peer: an absent one
 * answers `unavailable` and the resolver fails fast on that signal. The clock exists for the other
 * case — a vessel asking for a doc IT JUST WROTE, where readiness waits on a local flush.
 *
 * A cold founding puts real work in that window: keypair, pre-rotation inception, keyhive wasm init,
 * ContactCard, bootstrap. MEASURED at 3s: a relay failed to resolve the doc id it had just seeded, on
 * an idle machine with no peer involved, and exhausted eight container restarts doing it.
 *
 * The budget stays low enough to keep failing usefully — a local doc unready past it reads broken
 * rather than slow — and moves by environment for a constrained host without a rebuild.
 */
import { describe, it, expect, afterEach } from "vitest";

const KEY = "LAR_HEARTH_READY_MS";
const prior = process.env[KEY];
afterEach(() => { if (prior === undefined) delete process.env[KEY]; else process.env[KEY] = prior; });

async function budget(): Promise<number> {
  const mod = await import("../src/boot-resolver.js");
  return (mod as unknown as { hearthReadyMs?: () => number }).hearthReadyMs?.() ?? -1;
}

describe("hearth-ready-budget — sized for a cold found, not a warm read", () => {
  it("★ the default clears a cold founding by a wide margin ★", async () => {
    delete process.env[KEY];
    expect(await budget()).toBeGreaterThanOrEqual(10_000);
  });

  it("★ and stays low enough that a broken local read still fails usefully ★", async () => {
    // A doc this vessel wrote and cannot read back is broken rather than slow; a minute of patience
    // would turn a fault into a hang.
    delete process.env[KEY];
    expect(await budget()).toBeLessThanOrEqual(30_000);
  });

  it("★ a constrained host moves it without a rebuild ★", async () => {
    process.env[KEY] = "25000";
    expect(await budget()).toBe(25_000);
  });

  it("★ a torn or absent value falls back rather than reading as zero ★", async () => {
    // A zero budget would fail every boot instantly, so garbage must never become a deadline.
    for (const bad of ["", "soon", "-5", "0"]) {
      process.env[KEY] = bad;
      expect(await budget()).toBeGreaterThanOrEqual(10_000);
    }
  });
});
