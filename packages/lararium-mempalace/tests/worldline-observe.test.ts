/**
 * worldline-observe — the OBSERVER trigger: a session transcript's spirit lifecycle → durable
 * spawn (prov:Delegation) + handback (interval-close) edges on the KG. Hermetic (a fake exec proves
 * the args/NDJSON the seam builds), plus the pure derivation over real temp transcript files.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSubagentEdges, observeSubagentWorldlines } from "../src/worldline-observe.js";
import { resolveKgIo } from "../src/worldline-kg.js";
import { resolveMempalacePython } from "../src/spawn-resolve.js";

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

/** A session fixture whose spirit transcript carries a mid-flight SendMessage-continue re-entry (a
 *  second top-level user prompt AFTER the spirit produced output, not a tool-result echo) — the one
 *  detectable injection signal (worldline-inject-detect). */
function injectFixture(): { dir: string; transcript: string; run: string; agentId: string; handle: string } {
  const dir = mkdtempSync(join(tmpdir(), "lar-wl-inject-"));
  const run = "sessINJ";
  const agentId = "spirit42";
  const transcript = join(dir, `${run}.jsonl`);
  const subagents = join(dir, run, "subagents");
  mkdirSync(subagents, { recursive: true });
  const rows = [
    { type: "user", uuid: "spawn-turn", timestamp: "2026-06-29T00:00:00Z", message: { content: "Mask: Mapper\nyou are a mapper" } },
    { type: "assistant", uuid: "work-1", timestamp: "2026-06-29T00:01:00Z", message: { content: [{ type: "text", text: "Mapper: first pass" }] } },
    // a tool-result echo arrives as a `user` turn — must NOT count as an injection
    { type: "user", uuid: "tool-echo", timestamp: "2026-06-29T00:02:00Z", message: { content: [{ type: "tool_result", content: "ok" }] } },
    // THE injection — a re-entry prompt (plain text), the SendMessage-continue
    { type: "user", uuid: "reentry-turn", timestamp: "2026-06-29T00:03:00Z", message: { content: "also check the edge case" } },
    { type: "assistant", uuid: "work-2", timestamp: "2026-06-29T00:04:00Z", message: { content: [{ type: "text", text: "Mapper: done" }] } },
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
      expect(e.inject).toEqual([]); // one-handoff transcript → no mid-flight inject
    } finally { rmSync(fx.dir, { recursive: true, force: true }); }
  });

  test("a SendMessage-continue re-entry → a prov:Communication inject edge (run→handle, the re-entry turn)", () => {
    const fx = injectFixture();
    try {
      const edges = deriveSubagentEdges(fx.transcript);
      expect(edges).toHaveLength(1);
      const e = edges[0]!;
      expect(e.inject).toHaveLength(1); // the tool-result echo excluded, the spawn task excluded
      expect(e.inject[0]).toMatchObject({
        subject: fx.run, predicate: "prov:Communication", object: fx.handle,
        valid_from: "2026-06-29T00:03:00Z", turnKey: "reentry-turn",
      });
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
      expect(res.injected).toBe(0); // one-handoff transcript → no Communication add
    } finally { rmSync(fx.dir, { recursive: true, force: true }); }
  });

  test("SEAM B — a re-entry inject → an `add` prov:Communication row keyed to the re-entry turn", () => {
    const fx = injectFixture();
    const fe = fakeExec();
    try {
      const res = observeSubagentWorldlines(fx.transcript, { python: "python3", script: resolveKgIo(), exec: fe.exec, palacePath: "/tmp/pX" });
      expect(res.injected).toBe(1);

      // The spawn add (Delegation) and the inject add (Communication) BOTH ride `add`; find the Comm one.
      const addCalls = fe.calls.filter((c) => c.args.includes("add"));
      const commRow = addCalls
        .map((c) => JSON.parse((c.ndjson ?? "").trim()))
        .find((r) => r.predicate === "prov:Communication");
      expect(commRow).toMatchObject({
        subject: fx.run, predicate: "prov:Communication", object: fx.handle, turn_key: "reentry-turn",
      });
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

// ── SINK-side idempotence (real kg_io.py) — the watermark demoted to a cache ─────────────
const PY = resolveMempalacePython();
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SUBMODULE = join(REPO_ROOT, "mempalace");
let kgImportable = false;
beforeAll(() => {
  if (!PY) return;
  try {
    execFileSync(PY, ["-c", "import mempalace.knowledge_graph"], {
      cwd: SUBMODULE,
      env: { ...process.env, PYTHONPATH: SUBMODULE },
      stdio: "ignore",
    });
    kgImportable = true;
  } catch { kgImportable = false; }
});

describe.skipIf(!PY)("observeSubagentWorldlines re-run — SINK-side lifecycle idempotence (integration)", () => {
  /** Dump every (predicate, valid_from, valid_to, source_drawer_id, id) row for exact comparison. */
  function dump(palace: string): Array<[string, string | null, string | null, string | null, string]> {
    const code =
      "import sqlite3,sys,json;" +
      "c=sqlite3.connect(sys.argv[1]);" +
      "print(json.dumps([list(r) for r in c.execute('SELECT predicate,valid_from,valid_to,source_drawer_id,id FROM triples ORDER BY id')]))";
    const out = execFileSync(PY!, ["-c", code, join(palace, "knowledge_graph.sqlite3")], {
      cwd: SUBMODULE,
      env: { ...process.env, PYTHONPATH: SUBMODULE },
      encoding: "utf8",
    });
    return JSON.parse(out.trim());
  }

  test("a WIPED-WATERMARK re-run yields IDENTICAL KG rows — no re-add, no valid_to churn", () => {
    if (!kgImportable) return; // mempalace not importable in this env — treat as skip
    const fx = fixture();
    const dir = mkdtempSync(join(tmpdir(), "lar-wl-idem-"));
    const palace = join(dir, "palace");
    mkdirSync(palace, { recursive: true });
    try {
      // Run 1 — the spirit's whole lifecycle observes: spawn adds, handback closes.
      const first = observeSubagentWorldlines(fx.transcript, { palacePath: palace });
      expect(first.observed).toEqual([fx.handle]);
      const rowsAfterFirst = dump(palace);
      expect(rowsAfterFirst).toHaveLength(1);
      expect(rowsAfterFirst[0]![2]).toBe("2026-06-29T00:05:00Z"); // interval closed at handback

      // Run 2 — the watermark "wiped" (this call carries none): the SINK holds the law.
      const second = observeSubagentWorldlines(fx.transcript, { palacePath: palace });
      expect(second.observed).toEqual([fx.handle]); // it re-derived — and the sink absorbed it
      const rowsAfterSecond = dump(palace);
      expect(rowsAfterSecond).toEqual(rowsAfterFirst); // IDENTICAL rows — same ids, same intervals
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
