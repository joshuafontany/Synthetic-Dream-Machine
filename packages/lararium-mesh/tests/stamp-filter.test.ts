/**
 * stamp-filter — the recall stamp-filter predicate (pure).
 *
 * Two clause families, matched by what each read path carries: source-derived
 * (surface · agent, exact off the staged source_file name) and instrument
 * (voice · band · drift — exact lar_* metadata on the list path, the sovereign
 * gradient re-read on the search path). Honest empties stay the caller's law;
 * here we prove the predicates themselves.
 */
import { describe, test, expect } from "vitest";
import {
  readStampFilters,
  hitPassesStampFilters,
  drawerPassesStampFilters,
} from "../src/stamp-filter.js";

const CODEX_MAIN = "codex__run-cdx-1.jsonl";
const CLAUDE_MAIN = "claude__run-cl-1.jsonl";
const CLAUDE_SPIRIT = "claude__Query-Wright__agent-a1d5606__run-0425c035.jsonl";

// A turn that harvests a Voice + a canon-band frame (mirrors bearing-harvest's clean shape).
const CANON_TURN = [
  "<<~ lares aim lar:///operator.intent.lands/x -> lar:///council.options.cuts/y>>",
  "<<~ hud Aperture(10) OODA-HA(3)>>",
  "<<~ ward * L-Prime>>",
  "",
  "Council (Lares): the fork holds.",
  "",
  "<<~ ward ! · ↻ L-Prime>>",
  "<<~ hud Aperture(10 -> 11) OODA-HA(1↺)>>",
  "<<~ lares yield lar:///council.fork.named/z -> ?>>",
].join("\n");

const BARE_TURN = "just prose, no sigils at all";

describe("readStampFilters", () => {
  test("returns null when no filter args present", () => {
    expect(readStampFilters({ query: "x", wing: "w" })).toBeNull();
  });

  test("reads the five filters; drift accepts boolean or string", () => {
    expect(readStampFilters({ voice: "Council", band: "canon", agent: "a1", surface: "codex", drift: "true" }))
      .toEqual({ voice: "Council", band: "canon", agent: "a1", surface: "codex", drift: true });
  });

  test("throws loud on an unknown band (never a silent wrong filter)", () => {
    expect(() => readStampFilters({ band: "mythic" })).toThrow(/--band must be one of/);
  });
});

describe("hitPassesStampFilters (search path)", () => {
  test("--surface codex keeps only codex-sourced hits", () => {
    const f = readStampFilters({ surface: "codex" })!;
    expect(hitPassesStampFilters(f, { text: BARE_TURN, source_path: `/stage/${CODEX_MAIN}` })).toBe(true);
    expect(hitPassesStampFilters(f, { text: BARE_TURN, source_path: `/stage/${CLAUDE_MAIN}` })).toBe(false);
  });

  test("--agent matches the spirit id prefix and the handle prefix off the source name", () => {
    const f = readStampFilters({ agent: "a1d5" })!;
    expect(hitPassesStampFilters(f, { text: BARE_TURN, source_path: CLAUDE_SPIRIT })).toBe(true);
    expect(hitPassesStampFilters(f, { text: BARE_TURN, source_path: CLAUDE_MAIN })).toBe(false);
    const byRun = readStampFilters({ agent: "0425c035" })!;
    expect(hitPassesStampFilters(byRun, { text: BARE_TURN, source_path: CLAUDE_SPIRIT })).toBe(true);
  });

  test("--voice re-reads the gradient off the hit's verbatim text", () => {
    const f = readStampFilters({ voice: "council" })!;
    expect(hitPassesStampFilters(f, { text: CANON_TURN, source_path: CLAUDE_MAIN })).toBe(true);
    expect(hitPassesStampFilters(f, { text: BARE_TURN, source_path: CLAUDE_MAIN })).toBe(false);
  });

  test("--band separates a framed turn from bare prose", () => {
    const canon = readStampFilters({ band: "canon" })!;
    const raw = readStampFilters({ band: "raw" })!;
    expect(hitPassesStampFilters(canon, { text: CANON_TURN })).toBe(true);
    expect(hitPassesStampFilters(canon, { text: BARE_TURN })).toBe(false);
    expect(hitPassesStampFilters(raw, { text: BARE_TURN })).toBe(true);
  });

  test("filters COMPOSE (surface AND voice must both pass)", () => {
    const f = readStampFilters({ surface: "claude", voice: "council" })!;
    expect(hitPassesStampFilters(f, { text: CANON_TURN, source_path: CLAUDE_MAIN })).toBe(true);
    expect(hitPassesStampFilters(f, { text: CANON_TURN, source_path: CODEX_MAIN })).toBe(false);
  });
});

describe("drawerPassesStampFilters (list path, exact lar_* metadata)", () => {
  const stamped = {
    source_file: CLAUDE_SPIRIT,
    lar_surface: "claude",
    lar_band: "canon",
    lar_voices: "Council (Lares)|Ink-Clerk (Lorekeeper)",
    lar_agent: "Query-Wright",
    lar_agent_handle: "0425c035.a1d5606",
  };

  test("surface + band + voice match the stamps exactly", () => {
    expect(drawerPassesStampFilters(readStampFilters({ surface: "claude" })!, stamped)).toBe(true);
    expect(drawerPassesStampFilters(readStampFilters({ surface: "codex" })!, stamped)).toBe(false);
    expect(drawerPassesStampFilters(readStampFilters({ band: "canon" })!, stamped)).toBe(true);
    expect(drawerPassesStampFilters(readStampFilters({ band: "raw" })!, stamped)).toBe(false);
    expect(drawerPassesStampFilters(readStampFilters({ voice: "ink-clerk" })!, stamped)).toBe(true);
  });

  test("--agent matches pet-name exactly or handle/id prefix", () => {
    expect(drawerPassesStampFilters(readStampFilters({ agent: "query-wright" })!, stamped)).toBe(true);
    expect(drawerPassesStampFilters(readStampFilters({ agent: "a1d5" })!, stamped)).toBe(true);
    expect(drawerPassesStampFilters(readStampFilters({ agent: "zzz" })!, stamped)).toBe(false);
  });

  test("--drift keeps only drift-stamped drawers; un-stamped fails honestly", () => {
    const f = readStampFilters({ drift: true })!;
    expect(drawerPassesStampFilters(f, { ...stamped, lar_drift: "arity:2" })).toBe(true);
    expect(drawerPassesStampFilters(f, stamped)).toBe(false);
  });

  test("an un-stamped drawer fails a band clause honestly (un-stamped ≠ match)", () => {
    expect(drawerPassesStampFilters(readStampFilters({ band: "canon" })!, { source_file: CLAUDE_MAIN })).toBe(false);
  });
});
