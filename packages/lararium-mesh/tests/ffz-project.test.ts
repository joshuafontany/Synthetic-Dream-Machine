/**
 * ffz-project — the `lar_ffz` rhythmic address as a PURE CACHED PROJECTION.
 *
 * Proves: pure + deterministic (same inputs → same address); prefix-truncation
 * (a coarser read drops trailing bands cleanly); profile-scoping (the bounds cycle
 * differently per profile); and that the projection carries ZERO causality (rhythm
 * only — the PATH-B cut). The build-patch wire is proven here too: `lar_ffz` stamps
 * when a captured time is present and OMITS gracefully when absent.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  ffzProject,
  ffzTruncate,
  FFZ_ADDRESS_ORDER,
  buildPatch,
  harvestTurnGradient,
  FFZ_PROFILES,
} from "../src/index.js";

// A fixed wall-time so the coarse bands are stable across runs.
const T = Date.UTC(2026, 5, 29, 14, 30, 17); // 2026-06-29T14:30:17Z
const h = () => harvestTurnGradient("Lares (Council): the verb leads");

describe("ffzProject — pure, deterministic, stateless", () => {
  test("same inputs → identical address (no hidden state, called twice)", () => {
    const a = ffzProject({ capturedTime: T, sessionPosition: 8, profile: "session" });
    const b = ffzProject({ capturedTime: T, sessionPosition: 8, profile: "session" });
    expect(a).toBe(b);
    expect(a).not.toBeNull();
  });

  test("a full read carries all five coarse→fine bands (Theme first)", () => {
    const addr = ffzProject({ capturedTime: T, sessionPosition: 8, profile: "session" })!;
    const [profile, tuple] = addr.split("/");
    expect(profile).toBe("session");
    expect(tuple!.split(".")).toHaveLength(FFZ_ADDRESS_ORDER.length); // 5 bands
  });

  test("the Beat band equals the turn-index modulo the profile bound", () => {
    const bounds = FFZ_PROFILES["session"]!.bounds; // [b0,b1,b2,b3,Inf]
    const pos = 8;
    const addr = ffzProject({ capturedTime: T, sessionPosition: pos })!;
    const bands = addr.split("/")[1]!.split("."); // [Theme,Arc,Measure,Beat,Pulse]
    expect(Number(bands[3])).toBe(pos % bounds[1]); // Beat = pos % b1
  });

  test("a captured time but NO position projects only the coarse prefix (fine bands unstamped)", () => {
    const addr = ffzProject({ capturedTime: T })!;
    const tuple = addr.split("/")[1]!.split(".");
    expect(tuple).toHaveLength(2); // Theme.Arc only — fine bands NOT fabricated
    // and the coarse prefix matches the head of the full read
    const full = ffzProject({ capturedTime: T, sessionPosition: 8 })!;
    expect(full.startsWith(addr)).toBe(true);
  });

  test("no usable wall-time → null (never fabricates a phase)", () => {
    expect(ffzProject({ capturedTime: NaN })).toBeNull();
    expect(ffzProject({ capturedTime: Infinity })).toBeNull();
    expect(ffzProject({ capturedTime: -1 })).toBeNull();
  });

  test("a negative session position is treated as absent (coarse prefix only)", () => {
    const addr = ffzProject({ capturedTime: T, sessionPosition: -5 })!;
    expect(addr.split("/")[1]!.split(".")).toHaveLength(2);
  });
});

describe("ffzTruncate — prefix-truncation drops trailing (finer) bands cleanly", () => {
  test("a coarser read is a clean prefix of the full address", () => {
    const full = ffzProject({ capturedTime: T, sessionPosition: 8 })!;
    const coarse = ffzTruncate(full, 2); // keep Theme.Arc
    expect(coarse.split("/")[1]!.split(".")).toHaveLength(2);
    expect(full.startsWith(coarse)).toBe(true);
  });

  test("truncating to the coarse prefix equals projecting with no position", () => {
    const full = ffzProject({ capturedTime: T, sessionPosition: 8 })!;
    const noPos = ffzProject({ capturedTime: T })!;
    expect(ffzTruncate(full, 2)).toBe(noPos);
  });

  test("the profile prefix is preserved; clamps to available bands", () => {
    const full = ffzProject({ capturedTime: T, sessionPosition: 8 })!;
    expect(ffzTruncate(full, 99).split("/")[1]!.split(".")).toHaveLength(5); // clamp up
    expect(ffzTruncate(full, 0)).toBe("session/"); // profile kept, no bands
  });
});

describe("profile-scoping — bounds cycle differently per profile", () => {
  test("the profile name rides the address, and differing bounds yield differing reads", () => {
    // A position large enough to roll the diegetic Beat bound (8) but not the session bound (256).
    const pos = 10;
    const session = ffzProject({ capturedTime: T, sessionPosition: pos, profile: "session" })!;
    const diegetic = ffzProject({ capturedTime: T, sessionPosition: pos, profile: "diegetic" })!;
    expect(session.startsWith("session/")).toBe(true);
    expect(diegetic.startsWith("diegetic/")).toBe(true);
    const sBeat = Number(session.split("/")[1]!.split(".")[3]);
    const dBeat = Number(diegetic.split("/")[1]!.split(".")[3]);
    expect(sBeat).toBe(pos % FFZ_PROFILES["session"]!.bounds[1]); // 10 % 256 = 10
    expect(dBeat).toBe(pos % FFZ_PROFILES["diegetic"]!.bounds[1]); // 10 % 8 = 2
    expect(sBeat).not.toBe(dBeat);
  });

  test("an unknown profile falls back to default bounds without throwing", () => {
    const addr = ffzProject({ capturedTime: T, sessionPosition: 8, profile: "no-such-profile" });
    expect(addr).not.toBeNull();
    expect(addr!.startsWith("no-such-profile/")).toBe(true);
  });
});

describe("buildPatch wire — lar_ffz stamps when present, omits gracefully when absent", () => {
  test("no capture context ⇒ no lar_ffz (byte-identical to before)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl");
    expect(p["lar_ffz"]).toBeUndefined();
  });

  test("a captured time ⇒ lar_ffz stamps (coarse prefix when no position)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { capturedTime: T });
    expect(p["lar_ffz"]).toBe("session/" + (ffzProject({ capturedTime: T })!).split("/")[1]);
  });

  test("time + position ⇒ the full five-band address stamps", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { capturedTime: T, sessionPosition: 8 });
    expect(p["lar_ffz"]).toBe(ffzProject({ capturedTime: T, sessionPosition: 8 }));
    expect(String(p["lar_ffz"]).split("/")[1]!.split(".")).toHaveLength(5);
  });

  test("an explicit profile threads through to the stamp", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { capturedTime: T, sessionPosition: 8, ffzProfile: "diegetic" });
    expect(String(p["lar_ffz"]).startsWith("diegetic/")).toBe(true);
  });

  test("a present-but-invalid captured time omits lar_ffz (no phantom phase)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { capturedTime: NaN, sessionPosition: 8 });
    expect(p["lar_ffz"]).toBeUndefined();
  });

  test("lar_ffz carries NO causality field — it is a rhythm-only string", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { capturedTime: T, sessionPosition: 8 });
    expect(typeof p["lar_ffz"]).toBe("string");
    // the patch holds only the str/int chroma scalars — no edge/causal field rode in
    expect(Object.keys(p).some((k) => /causal|edge|happens|itc/i.test(k))).toBe(false);
  });
});
