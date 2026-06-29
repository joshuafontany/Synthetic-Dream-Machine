/**
 * worldline-kg — the node seam projecting worldline edges onto the mempalace KG.
 *
 * Two layers:
 *   1. HERMETIC (always runs): a fake `exec` proves the args + NDJSON the seam builds.
 *   2. INTEGRATION (skipped when python/mempalace absent): the REAL kg_io.py against a temp
 *      palace — spawn→Delegation, inject→Communication, handback→close, kapae→close + history kept.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { delegationEdge, communicationEdge, handbackClose } from "@lararium/mesh";
import {
  persistWorldlineEdges,
  closeWorldlineEdges,
  kapaeTurn,
  resolveKgIo,
} from "../src/worldline-kg.js";
import { resolveMempalacePython } from "../src/spawn-resolve.js";

// ── 1. HERMETIC — fake exec ────────────────────────────────────────────────
describe("worldline-kg arg/NDJSON building (fake exec)", () => {
  const calls: Array<{ bin: string; args: string[]; ndjson?: string }> = [];
  const fakeExec = (bin: string, args: readonly string[]): string => {
    const a = [...args];
    // the patchfile is the last arg for add/invalidate — capture its NDJSON before it's removed
    const last = a[a.length - 1] ?? "";
    let ndjson: string | undefined;
    try { ndjson = readFileSync(last, "utf8"); } catch { /* kapae has no patchfile */ }
    calls.push({ bin, args: a, ...(ndjson !== undefined ? { ndjson } : {}) });
    if (a.includes("add")) return JSON.stringify({ added: 2 });
    if (a.includes("invalidate")) return JSON.stringify({ invalidated: 1 });
    if (a.includes("kapae")) return JSON.stringify({ closed: 3, turn_key: "t1", ended: "2026-06-29" });
    return "{}";
  };
  const opts = { python: "python3", script: resolveKgIo(), exec: fakeExec, palacePath: "/tmp/palaceX" };

  test("persist → `add` subcommand with prov triples as NDJSON (turnKey → turn_key)", () => {
    calls.length = 0;
    const res = persistWorldlineEdges(
      [
        delegationEdge("run", "run.child", { validFrom: "2026-06-29T00:00:00Z", turnKey: "t1" }),
        communicationEdge("operator", "run.child", { validFrom: "2026-06-29T01:00:00Z", turnKey: "t2" }),
      ],
      opts,
    );
    expect(res.added).toBe(2);
    const c = calls[0]!;
    expect(c.args).toContain("add");
    expect(c.args).toContain("--palace");
    expect(c.args).toContain("/tmp/palaceX");
    const rows = (c.ndjson ?? "").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows[0]).toMatchObject({ subject: "run", predicate: "prov:Delegation", object: "run.child", turn_key: "t1" });
    expect(rows[1]).toMatchObject({ subject: "operator", predicate: "prov:Communication", turn_key: "t2" });
  });

  test("close → `invalidate` subcommand by S/P/O", () => {
    calls.length = 0;
    const res = closeWorldlineEdges([handbackClose("run", "run.child", "2026-06-29T02:00:00Z")], opts);
    expect(res.invalidated).toBe(1);
    const c = calls[0]!;
    expect(c.args).toContain("invalidate");
    expect(JSON.parse((c.ndjson ?? "").trim())).toMatchObject({ subject: "run", object: "run.child", ended: "2026-06-29T02:00:00Z" });
  });

  test("kapae → `kapae --turn-key` (no patchfile), returns count", () => {
    calls.length = 0;
    const res = kapaeTurn("t1", { ...opts, ended: "2026-06-29" });
    expect(res.closed).toBe(3);
    const c = calls[0]!;
    expect(c.args).toEqual([resolveKgIo(), "--palace", "/tmp/palaceX", "kapae", "--turn-key", "t1", "--ended", "2026-06-29"]);
  });

  test("empty edge lists are no-ops (no exec)", () => {
    calls.length = 0;
    expect(persistWorldlineEdges([], opts).added).toBe(0);
    expect(closeWorldlineEdges([], opts).invalidated).toBe(0);
    expect(calls.length).toBe(0);
  });
});

// ── 2. INTEGRATION — real kg_io.py against a temp palace ─────────────────────
const PY = resolveMempalacePython();
// repoRoot = three levels up from this test (packages/lararium-mempalace/tests → repo).
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

describe.skipIf(!PY)("worldline-kg ↔ real mempalace KG (integration)", () => {
  /** Dump (predicate, valid_from, valid_to, source_drawer_id) rows for assertion. */
  function dump(palace: string): Array<[string, string | null, string | null, string | null]> {
    const code =
      "import sqlite3,sys,json;" +
      "c=sqlite3.connect(sys.argv[1]);" +
      "print(json.dumps([list(r) for r in c.execute('SELECT predicate,valid_from,valid_to,source_drawer_id FROM triples ORDER BY predicate')]))";
    const out = execFileSync(PY!, ["-c", code, join(palace, "knowledge_graph.sqlite3")], {
      cwd: SUBMODULE,
      env: { ...process.env, PYTHONPATH: SUBMODULE },
      encoding: "utf8",
    });
    return JSON.parse(out.trim());
  }

  test("spawn→Delegation · inject→Communication · handback→close · kapae→close (history kept)", () => {
    if (!kgImportable) return; // mempalace not importable in this env — treat as skip
    const dir = mkdtempSync(join(tmpdir(), "lar-wl-kg-"));
    const palace = join(dir, "palace");
    mkdirSync(palace, { recursive: true });
    const opts = { palacePath: palace };
    try {
      // SPAWN + INJECT
      const added = persistWorldlineEdges(
        [
          delegationEdge("run", "run.child", { validFrom: "2026-06-29T00:00:00Z", turnKey: "spawn-turn" }),
          communicationEdge("operator", "run.child", { validFrom: "2026-06-29T01:00:00Z", turnKey: "inject-turn" }),
        ],
        opts,
      );
      expect(added.added).toBe(2);
      let rows = dump(palace);
      expect(rows.length).toBe(2);
      const deleg = rows.find((r) => r[0] === "prov:delegation")!;
      const comm = rows.find((r) => r[0] === "prov:communication")!;
      expect(deleg[2]).toBeNull(); // valid_to open
      expect(comm[3]).toBe("inject-turn"); // turnKey rode source_drawer_id

      // HANDBACK — close the Delegation interval by S/P/O
      const closed = closeWorldlineEdges([handbackClose("run", "run.child", "2026-06-29T02:00:00Z")], opts);
      expect(closed.invalidated).toBe(1);
      rows = dump(palace);
      expect(rows.find((r) => r[0] === "prov:delegation")![2]).toBe("2026-06-29T02:00:00Z");
      expect(rows.find((r) => r[0] === "prov:communication")![2]).toBeNull(); // inject still open

      // KAPAE — rewind the inject turn: close its edge, never delete it
      const kap = kapaeTurn("inject-turn", { ...opts, ended: "2026-06-29T03:00:00Z" });
      expect(kap.closed).toBe(1);
      rows = dump(palace);
      expect(rows.length).toBe(2); // HISTORY KEPT — nothing dropped
      expect(rows.find((r) => r[0] === "prov:communication")![2]).toBe("2026-06-29T03:00:00Z");

      // KAPAE is idempotent — a re-run closes nothing new
      expect(kapaeTurn("inject-turn", { ...opts, ended: "2026-06-29T04:00:00Z" }).closed).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
