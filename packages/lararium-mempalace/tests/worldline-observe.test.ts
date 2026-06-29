/**
 * worldline-observe — the OBSERVER trigger: a session transcript's spirit lifecycle → durable
 * spawn (prov:Delegation) + handback (interval-close) edges on the KG. Hermetic (a fake exec proves
 * the args/NDJSON the seam builds), plus the pure derivation over real temp transcript files.
 */
import { describe, test, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveSubagentEdges, observeSubagentWorldlines } from "../src/worldline-observe.js";
import { resolveKgIo } from "../src/worldline-kg.js";

/** Build a session transcript dir with one spirit transcript carrying two timestamped turns. */
function fixture(): { dir: string; transcript: string; run: string; agentId: string; handle: string } {
  const dir = mkdtempSync(join(tmpdir(), "lar-wl-observe-"));
  const run = "sessABC";
  const agentId = "xyz789";
  const transcript = join(dir, `${run}.jsonl`);
  const subagents = join(dir, run, "subagents");
  mkdirSync(subagents, { recursive: true });
  const rows = [
    { type: "user", uuid: "spawn-turn", timestamp: "2026-06-29T00:00:00Z", message: { content: "Mask: Mapper\nyou are a mapper" } },
    { type: "assistant", uuid: "work-turn", timestamp: "2026-06-29T00:05:00Z", message: { content: [{ type: "text", text: "Mapper: done" }] } },
  ];
  writeFileSync(join(subagents, `agent-${agentId}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { dir, transcript, run, agentId, handle: `${run}.${agentId}` };
}

describe("deriveSubagentEdges — pure derivation from the transcript", () => {
  test("a spirit → one spawn Delegation (run→handle) + a handback close, anchored to its turns", () => {
    const fx = fixture();
    try {
      const edges = deriveSubagentEdges(fx.transcript);
      expect(edges).toHaveLength(1);
      const e = edges[0]!;
      expect(e.handle).toBe(fx.handle); // IDENTICAL to buildPatch's lar_agent_handle (<run>.<agentId>)
      expect(e.spawn).toMatchObject({
        subject: fx.run, predicate: "prov:Delegation", object: fx.handle,
        valid_from: "2026-06-29T00:00:00Z", turnKey: "spawn-turn",
      });
      expect(e.handback).toMatchObject({ subject: fx.run, predicate: "prov:Delegation", object: fx.handle, ended: "2026-06-29T00:05:00Z" });
    } finally { rmSync(fx.dir, { recursive: true, force: true }); }
  });

  test("a session with no subagents derives nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "lar-wl-empty-"));
    try { expect(deriveSubagentEdges(join(dir, "sessNone.jsonl"))).toEqual([]); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("observeSubagentWorldlines — persist spawn + close handback (fake exec)", () => {
  function fakeExec() {
    const calls: Array<{ args: string[]; ndjson?: string }> = [];
    const exec = (_bin: string, args: readonly string[]): string => {
      const a = [...args];
      let ndjson: string | undefined;
      try { ndjson = readFileSync(a[a.length - 1] ?? "", "utf8"); } catch { /* no patchfile */ }
      calls.push({ args: a, ...(ndjson !== undefined ? { ndjson } : {}) });
      if (a.includes("add")) return JSON.stringify({ added: 1 });
      if (a.includes("invalidate")) return JSON.stringify({ invalidated: 1 });
      return "{}";
    };
    return { calls, exec };
  }

  test("spawn → `add` prov:Delegation, handback → `invalidate` by S/P/O", () => {
    const fx = fixture();
    const fe = fakeExec();
    try {
      const res = observeSubagentWorldlines(fx.transcript, { python: "python3", script: resolveKgIo(), exec: fe.exec, palacePath: "/tmp/pX" });
      expect(res.observed).toEqual([fx.handle]);
      expect(res.spawned).toBe(1);
      expect(res.handedBack).toBe(1);

      const add = fe.calls.find((c) => c.args.includes("add"))!;
      const addRow = JSON.parse((add.ndjson ?? "").trim());
      expect(addRow).toMatchObject({ subject: fx.run, predicate: "prov:Delegation", object: fx.handle, turn_key: "spawn-turn" });

      const inv = fe.calls.find((c) => c.args.includes("invalidate"))!;
      expect(JSON.parse((inv.ndjson ?? "").trim())).toMatchObject({ subject: fx.run, object: fx.handle, ended: "2026-06-29T00:05:00Z" });
    } finally { rmSync(fx.dir, { recursive: true, force: true }); }
  });

  test("`only` restricts the pass; an unmatched handle is a no-op (no exec)", () => {
    const fx = fixture();
    const fe = fakeExec();
    try {
      const res = observeSubagentWorldlines(fx.transcript, { python: "python3", script: resolveKgIo(), exec: fe.exec, palacePath: "/tmp/pX", only: ["someone.else"] });
      expect(res.observed).toEqual([]);
      expect(fe.calls.length).toBe(0);
    } finally { rmSync(fx.dir, { recursive: true, force: true }); }
  });
});
