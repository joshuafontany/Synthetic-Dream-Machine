import { describe, expect, test } from "vitest";
import { mempalaceStageName } from "../src/commands/mempalace-harvest.js";

describe("mempalace comparator staging", () => {
  test("keeps same-named transcripts from separate roots distinct", () => {
    const a = mempalaceStageName({ file: "/one/workspace/transcript.jsonl", source: "copilot-vscode", stageName: "transcript.jsonl" });
    const b = mempalaceStageName({ file: "/two/workspace/transcript.jsonl", source: "copilot-vscode", stageName: "transcript.jsonl" });
    expect(a).not.toBe(b);
    expect(a).toMatch(/^copilot-vscode\/[0-9a-f]{16}\/transcript\.jsonl$/);
  });

  test("keeps one source's stage path stable across runs", () => {
    const e = { file: "/one/workspace/transcript.jsonl", source: "claude", stageName: "transcript.jsonl" } as const;
    expect(mempalaceStageName(e)).toBe(mempalaceStageName(e));
  });
});
