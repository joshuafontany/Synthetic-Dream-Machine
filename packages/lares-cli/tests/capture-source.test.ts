/**
 * capture-source — every ingress must hand the NALU one source identity for
 * one transcript.  The source string participates in sink-side dedup, so a
 * staging-only prefix cannot mint a second memory drawer.
 */

import { describe, expect, test } from "vitest";
import { captureSourceFile, stageSourceDir } from "../src/commands/harvest.js";

const wing = "wing_synthetic_dream_machine";
const run = "session-123.jsonl";

describe("capture source identity", () => {
  test("live Claude staging and a direct Claude capture converge", () => {
    expect(captureSourceFile(wing, `/home/op/.claude/projects/project/${run}`))
      .toBe(`${wing}/claude__${run}`);
    expect(captureSourceFile(wing, `/state/harvest-stage/live/${wing}/claude/hash/${run}`))
      .toBe(`${wing}/claude__${run}`);
  });

  test("the --all stage carries the same identity without double-prefixing", () => {
    expect(captureSourceFile(wing, `/state/harvest-stage/bulk/${wing}/claude/hash/${run}`))
      .toBe(`${wing}/claude__${run}`);
  });

  test("Codex and Copilot preserve their own surface while staging remains transparent", () => {
    expect(captureSourceFile(wing, `/home/op/.codex/sessions/2026/rollout-a.jsonl`))
      .toBe(`${wing}/codex__rollout-a.jsonl`);
    expect(captureSourceFile(wing, `/state/harvest-stage/live/${wing}/codex/hash/rollout-a.jsonl`))
      .toBe(`${wing}/codex__rollout-a.jsonl`);
    expect(captureSourceFile(wing, "/home/op/.config/Code/User/workspaceStorage/x/GitHub.copilot-chat/transcripts/chat.jsonl"))
      .toBe(`${wing}/copilot-vscode__chat.jsonl`);
  });

  test("uses the directory, never a filename prefix, to isolate same-named sources", () => {
    const root = "/state/harvest-stage/bulk/wing";
    const a = stageSourceDir(root, { file: "/one/transcript.jsonl", source: "claude" });
    const b = stageSourceDir(root, { file: "/two/transcript.jsonl", source: "claude" });
    expect(a).not.toBe(b);
    expect(a).toMatch(/\/claude\/[0-9a-f]{16}$/);
  });
});
