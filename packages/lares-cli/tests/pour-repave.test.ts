/**
 * pour --all — the sovereign re-pave, as one door over three legs.
 *
 * ── WHAT THE MOTION IS ──────────────────────────────────────────────────────────────────────────
 * Filling a sensorium from what the operator's AI tools have written takes three passes, and they
 * are not interchangeable: DRAWERS land the verbatim content, the BEARING writeback reads those
 * drawers and stamps the navigational gradient onto them, and the PROJECTION re-derives the lexical
 * and entity view over the content plane. The second reads what the first wrote, so the order is a
 * dependency rather than a preference.
 *
 * ── WHY THE ORDER IS ASSERTED, NOT ASSUMED ──────────────────────────────────────────────────────
 * The three legs answer at three doors, and a person who runs them out of order gets a clean exit
 * over an empty stamp — a writeback across drawers that do not exist yet reports zero harvested and
 * calls it success. One door holds the order so nobody has to know it.
 *
 * The wing is asserted for the same reason: two verbs that fill ONE palace derived their default
 * wing two different ways, so an unflagged re-pave split its own corpus across two names.
 */
import { describe, it, expect } from "vitest";
import { repaveStages, runRepave, repaveWing } from "../src/commands/harvest.js";
import type { ParsedArgs } from "../src/parse-args.js";

const args = (flags: Record<string, boolean> = {}, options: Record<string, string> = {}): ParsedArgs =>
  ({ positional: [], flags, options } as unknown as ParsedArgs);

describe("pour --all — one door, three legs, in dependency order", () => {
  it("★ walks the tending rite's movement, in its order ★", () => {
    expect(repaveStages().map((s) => s.name)).toEqual(
      ["quiesce", "baseline", "drawers", "bearing", "projection", "verify", "resume"]);
  });

  it("★ the guard stages stand around the landing ones ★", () => {
    // These land nothing. They exist because a re-pave that skips them cannot be trusted after —
    // and the baseline in particular is the one reading no later pass can go back and take.
    const names = repaveStages().map((s) => s.name);
    expect(names.indexOf("quiesce")).toBeLessThan(names.indexOf("drawers"));
    expect(names.indexOf("baseline")).toBeLessThan(names.indexOf("drawers"));
    expect(names.indexOf("verify")).toBeGreaterThan(names.indexOf("projection"));
    expect(names.at(-1)).toBe("resume");
  });

  it("every leg says why it stands where it stands", () => {
    // The report a person reads while a long re-pave runs — a stage with no reason is a stage
    // nobody can tell has stalled from one that has finished.
    for (const s of repaveStages()) expect(s.why.length).toBeGreaterThan(12);
  });

  it("★ runs every leg in order and reports each ★", async () => {
    const seen: string[] = [];
    const r = await runRepave(args({ all: true }), async (stage) => { seen.push(stage); return 0; });
    expect(seen).toEqual(["quiesce", "baseline", "drawers", "bearing", "projection", "verify", "resume"]);
    expect(r.code).toBe(0);
    expect(r.stages.map((s) => s.name)).toEqual(seen);
  });

  it("★ HALTS at the first leg that refuses — a later leg would stamp over nothing ★", async () => {
    const seen: string[] = [];
    const r = await runRepave(args({ all: true }), async (stage) => {
      seen.push(stage); return stage === "drawers" ? 4 : 0;
    });
    expect(seen).not.toContain("bearing");    // never stamped over an unlanded palace
    expect(r.code).toBe(4);                   // and the refusal rides out, never a green exit
  });

  it("★ HANDS BACK live capture even when the pass halted ★", async () => {
    // The failure that hides: a halt that skipped `resume` leaves the hooks paused with nothing on
    // screen saying so, and the machine stops remembering quietly.
    const seen: string[] = [];
    await runRepave(args({ all: true }), async (stage) => {
      seen.push(stage); return stage === "drawers" ? 4 : 0;
    });
    expect(seen.at(-1)).toBe("resume");
  });

  it("★ carries one wing to every leg — the two legs no longer disagree ★", async () => {
    const wings: string[] = [];
    await runRepave(args({ all: true }, { wing: "wing_named" }), async (_s, a) => {
      wings.push(String(a.options["wing"])); return 0;
    });
    expect(new Set(wings).size).toBe(1);
    expect(wings[0]).toBe("wing_named");
  });

  it("★ RESOLVES the wing before the legs run — an unflagged pass must not let each leg guess ★", async () => {
    // The case that actually bit: with no `--wing` typed, each leg fell back to its OWN default and
    // the bulk leg picked a different name than the bearing leg. A leg must receive a wing already
    // decided, never an absence it is free to fill.
    const wings: (string | undefined)[] = [];
    await runRepave(args({ all: true }), async (_s, a) => {
      wings.push(a.options["wing"] as string | undefined); return 0;
    });
    expect(wings.every((w) => typeof w === "string" && w.length > 0)).toBe(true);
    expect(new Set(wings).size).toBe(1);
  });

  it("★ an unflagged re-pave derives its wing from the ONE law, never per-verb ★", () => {
    // `wingFromDir` is that law. A second derivation (basename of $HOME, say) sends a bulk pass to
    // a wing the per-transcript pass never writes, and a recall over either reads half a corpus.
    expect(repaveWing(args())).toMatch(/^wing_[a-z0-9_]+$/);
    expect(repaveWing(args({}, { wing: "wing_explicit" }))).toBe("wing_explicit");
  });
});
