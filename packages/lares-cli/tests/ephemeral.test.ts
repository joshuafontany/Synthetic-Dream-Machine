/**
 * ephemeral — the EPHEMERAL mark's verdict law (the two grains + the three-gate contract).
 *
 * The verdict reads off the transcript's CONTENT (recorded cwd) + explicit markers, never this
 * process's ambience alone; ephemeral ≠ deleted (the gates decline, the transcript survives).
 */
import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sessionEphemeral, scratchRoots, transcriptCwd, partitionEphemeral } from "../src/ephemeral.js";

const cleanups: string[] = [];
afterEach(() => { for (const d of cleanups.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** A minimal Claude-shaped transcript whose first row records `cwd`. */
function mkTranscript(dir: string, name: string, cwd: string): string {
  const p = join(dir, name);
  writeFileSync(p, [
    JSON.stringify({ type: "user", cwd, sessionId: name.replace(/\.jsonl$/, ""), uuid: "u1", message: { content: "hi" }, timestamp: "2026-07-01T00:00:00Z" }),
    JSON.stringify({ type: "assistant", cwd, uuid: "a1", parentUuid: "u1", message: { content: [{ type: "text", text: "ho" }] }, timestamp: "2026-07-01T00:00:01Z" }),
  ].join("\n") + "\n");
  return p;
}

/** A transcript home OUTSIDE every scratch root (the "real project dir" stand-in). */
function mkHome(): string {
  // tmpdir would read as scratch — home the fixture under the repo's own tests dir instead.
  const d = mkdtempSync(join(__dirname, ".eph-fixture-"));
  cleanups.push(d);
  return d;
}

describe("grain (a) — derived: the recorded cwd under a scratch root", () => {
  it("a session whose cwd sits under /tmp reads ephemeral", () => {
    const home = mkHome();
    const t = mkTranscript(home, "s1.jsonl", join(tmpdir(), "claude-sandbox", "run-1"));
    const v = sessionEphemeral(t);
    expect(v.ephemeral).toBe(true);
    expect(v.reason).toMatch(/^derived: cwd .* under scratch root /);
  });

  it("a session whose cwd sits under a live project dir reads LIVE", () => {
    const home = mkHome();
    const t = mkTranscript(home, "s2.jsonl", "/home/someone/real-project");
    expect(sessionEphemeral(t)).toEqual({ ephemeral: false, reason: null });
  });

  it("the verdict rides the CONTENT, not the transcript file's location (staged copies keep it)", () => {
    // Transcript file lives under tmp (like a stage dir), cwd records a real project → LIVE.
    const stagedDir = mkdtempSync(join(tmpdir(), "eph-stage-"));
    cleanups.push(stagedDir);
    const t = mkTranscript(stagedDir, "staged.jsonl", "/home/someone/real-project");
    expect(sessionEphemeral(t).ephemeral).toBe(false);
  });

  it("scratchRoots carries tmpdir + /tmp + the sensorium scratch (and LAR_ROOT only when set)", () => {
    // The sensorium scratch sits in the CACHE home — ephemeral by siting, safe to sweep — so a session
    // recorded there reads ephemeral without any marker.
    const roots = scratchRoots();
    expect(roots).toContain("/tmp");
    expect(roots.some((r) => r.endsWith(join("scratch", "sensoriums")))).toBe(true);
  });

  it("a LAR_ROOT sandbox joins the scratch roots only while it is set", () => {
    const prior = process.env["LAR_ROOT"];
    try {
      delete process.env["LAR_ROOT"];
      const without = scratchRoots();
      process.env["LAR_ROOT"] = "/tmp/lar-sandbox-probe";
      const withRoot = scratchRoots();
      expect(withRoot.length).toBeGreaterThanOrEqual(without.length);
      expect(withRoot).toContain(resolve("/tmp/lar-sandbox-probe"));
    } finally {
      if (prior === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = prior;
    }
  });
});

describe("grain (b) — declared: explicit markers", () => {
  it("a `<session>.ephemeral` sibling beside the transcript declares it", () => {
    const home = mkHome();
    const t = mkTranscript(home, "s3.jsonl", "/home/someone/real-project");
    writeFileSync(join(home, "s3.ephemeral"), "");
    const v = sessionEphemeral(t);
    expect(v.ephemeral).toBe(true);
    expect(v.reason).toBe("declared: s3.ephemeral");
  });

  it("a `.lar-ephemeral` marker in the session's recorded cwd declares it", () => {
    const home = mkHome();
    const cwd = join(home, "scratch-project");
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, ".lar-ephemeral"), "");
    const t = mkTranscript(home, "s4.jsonl", cwd);
    const v = sessionEphemeral(t);
    expect(v.ephemeral).toBe(true);
    expect(v.reason).toBe(`declared: .lar-ephemeral in ${cwd}`);
  });
});

describe("edges", () => {
  it("a non-.jsonl target (the copilot sqlite store) reads LIVE — no per-session cwd to read", () => {
    expect(sessionEphemeral("/home/x/.copilot/session-store.db").ephemeral).toBe(false);
  });

  it("a transcript with no recorded cwd reads LIVE (derive, never guess)", () => {
    const home = mkHome();
    const p = join(home, "nocwd.jsonl");
    writeFileSync(p, JSON.stringify({ type: "user", uuid: "u", message: { content: "x" } }) + "\n");
    expect(transcriptCwd(p)).toBeNull();
    expect(sessionEphemeral(p).ephemeral).toBe(false);
  });

  it("partitionEphemeral splits live from skipped and names each reason", () => {
    const home = mkHome();
    const live = mkTranscript(home, "live.jsonl", "/home/someone/real-project");
    const eph = mkTranscript(home, "eph.jsonl", join(tmpdir(), "sandbox"));
    const r = partitionEphemeral([live, eph], "test-gate");
    expect(r.live).toEqual([live]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]?.file).toBe(eph);
    expect(r.skipped[0]?.reason).toMatch(/^derived/);
  });
});
