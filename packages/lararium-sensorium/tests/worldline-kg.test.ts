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
import { delegationEdge, communicationEdge, handbackClose, worldlineHandles, worldlineCompare } from "@lararium/mesh";
import {
  persistWorldlineEdges,
  closeWorldlineEdges,
  kapaeTurn,
  kapaeThenFork,
  resolveKgIo,
} from "../src/worldline-kg.js";
import { resolveMempalacePython } from "@lararium/mempalace";

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

  test("the MEMBRANE truncates ms ISO to whole seconds on EVERY temporal seam (valid_from / ended / kapae)", () => {
    // The whole-second law lives in the membrane now — no caller can forward a ms ISO past it.
    calls.length = 0;
    persistWorldlineEdges([delegationEdge("run", "run.child", { validFrom: "2026-06-29T00:00:00.123Z", turnKey: "t1" })], opts);
    expect(JSON.parse((calls[0]!.ndjson ?? "").trim()).valid_from).toBe("2026-06-29T00:00:00Z");

    calls.length = 0;
    closeWorldlineEdges([handbackClose("run", "run.child", "2026-06-29T02:00:00.456Z")], opts);
    expect(JSON.parse((calls[0]!.ndjson ?? "").trim()).ended).toBe("2026-06-29T02:00:00Z");

    calls.length = 0;
    kapaeTurn("t1", { ...opts, ended: "2026-06-29T03:00:00.789Z" });
    expect(calls[0]!.args).toContain("2026-06-29T03:00:00Z");
    expect(calls[0]!.args.join(" ")).not.toContain(".789");
  });

  test("empty edge lists are no-ops (no exec)", () => {
    calls.length = 0;
    expect(persistWorldlineEdges([], opts).added).toBe(0);
    expect(closeWorldlineEdges([], opts).invalidated).toBe(0);
    expect(calls.length).toBe(0);
  });

  test("kapaeThenFork → durable kapae per rewound turn + the pure re-project→fork composes", () => {
    calls.length = 0;
    const root = "run";
    const opens = [
      delegationEdge(root, "run.a", { validFrom: "2026-06-29T00:00:00Z", turnKey: "t-a" }),
      delegationEdge(root, "run.b", { validFrom: "2026-06-29T00:00:01Z", turnKey: "t-b" }), // rewound
    ];
    const r = kapaeThenFork(root, opens, [], ["t-b"], { parent: root, child: "run.c" }, opts);
    // DURABLE leg: one kapae fired for the rewound turn (fake exec returns closed:3).
    expect(calls.length).toBe(1);
    expect(calls[0]!.args).toEqual([resolveKgIo(), "--palace", "/tmp/palaceX", "kapae", "--turn-key", "t-b"]);
    expect(r.closed).toBe(3);
    // PURE leg: run.b dropped from the valid view; run.c forked off the rewound frontier.
    expect(r.dropped).toBe(1);
    expect(worldlineHandles(r.view).sort()).toEqual(["run", "run.a"]);
    expect(worldlineHandles(r.causal).sort()).toEqual(["run", "run.a", "run.c"]);
    expect(worldlineCompare(r.causal, root, "run.c")).toBe("equal"); // a bare fork shares history
    // The append-only edges are untouched — kapae is a valid-view filter (bi-temporal).
    expect(opens.length).toBe(2);
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

  test("a MILLISECOND ISO rides the membrane into the KG — the row LANDS whole-second, zero traceback", () => {
    if (!kgImportable) return; // mempalace not importable in this env — treat as skip
    const dir = mkdtempSync(join(tmpdir(), "lar-wl-kg-ms-"));
    const palace = join(dir, "palace");
    mkdirSync(palace, { recursive: true });
    const opts = { palacePath: palace };
    try {
      // SPAWN with a transcript-grade ms timestamp — pre-membrane this raised a sanitize traceback.
      const added = persistWorldlineEdges(
        [delegationEdge("run", "run.child", { validFrom: "2026-06-29T00:00:56.789Z", turnKey: "spawn-turn" })],
        opts,
      );
      expect(added.added).toBe(1);
      // CLOSE with a ms `ended` — the handback leg crosses the same membrane law.
      const closed = closeWorldlineEdges([handbackClose("run", "run.child", "2026-06-29T02:00:01.234Z")], opts);
      expect(closed.invalidated).toBe(1);
      const rows = dump(palace);
      expect(rows.length).toBe(1);
      expect(rows[0]![1]).toBe("2026-06-29T00:00:56Z"); // valid_from landed, whole-second
      expect(rows[0]![2]).toBe("2026-06-29T02:00:01Z"); // valid_to landed, whole-second
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
