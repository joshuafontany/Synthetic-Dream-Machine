import { describe, it, expect } from "vitest";
import {
  parseEtime, parseProcTable, classifyKind, classifyPalaceProcs, fmtUptime, KIND_META,
  isUnderPath, procInPalaceScope, type PalaceProc,
} from "../src/palace-procs.js";

// A fixture `ps -eo pid=,ppid=,etime=,args=` dump modeling the whack-a-mole:
// a Claude session (pid 100) fires the ingest hook (200), which spawns a `lares
// capture` leg (300) + a `lares subagents` leg (310); the capture mine hands off to
// a warm write-daemon (400, reparented to init after the client exits), and a recall
// MCP sidecar (500) + a chroma backend (510) + the node vessel (600) run alongside.
const PS_FIXTURE = `
  100     1    02:14:03 claude
  200   100       00:03 bash /home/joshu/Synthetic-Dream-Machine/packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh
  300   200       00:02 node /home/joshu/.local/bin/lares.mjs capture /tmp/stage.x --wing wing_synthetic_dream_machine
  310   200       00:02 node /home/joshu/.local/bin/lares.mjs subagents /home/joshu/.claude/sess.jsonl --wing wing_synthetic_dream_machine
  400     1       00:41 /home/joshu/.venv/bin/python3 -m mempalace.daemon serve --palace /home/joshu/.mempalace/palace
  500   999    01:00:12 /home/joshu/.venv/bin/python3 -m mempalace.mcp_server --palace /home/joshu/.mempalace/palace
  510   400       00:39 /home/joshu/.venv/bin/python3 -m chromadb run
  600     1    03:20:00 node /home/joshu/Synthetic-Dream-Machine/packages/lararium-node/dist/src/main.js
  700   100       00:10 grep -r foo
`;

describe("parseEtime", () => {
  it("parses ss / mm:ss / hh:mm:ss / DD-hh:mm:ss", () => {
    expect(parseEtime("41")).toBe(41);
    expect(parseEtime("00:41")).toBe(41);
    expect(parseEtime("02:14:03")).toBe(2 * 3600 + 14 * 60 + 3);
    expect(parseEtime("2-12:01:05")).toBe(2 * 86400 + 12 * 3600 + 60 + 5);
  });
  it("returns null on junk / dash", () => {
    expect(parseEtime("-")).toBeNull();
    expect(parseEtime("")).toBeNull();
    expect(parseEtime("nope")).toBeNull();
  });
});

describe("parseProcTable", () => {
  it("parses pid/ppid/etime/args tolerant of variable whitespace", () => {
    const rows = parseProcTable(PS_FIXTURE);
    const daemon = rows.find((r) => r.pid === 400);
    expect(daemon).toBeDefined();
    expect(daemon?.ppid).toBe(1);
    expect(daemon?.etimeSec).toBe(41);
    expect(daemon?.args).toContain("mempalace.daemon serve --palace");
  });
});

describe("classifyKind", () => {
  it("catches daemon serve BEFORE the generic mempalace/mine matcher", () => {
    expect(classifyKind("python -m mempalace.daemon serve --palace /p")).toBe("write-daemon");
  });
  it("catches the recall MCP sidecar", () => {
    expect(classifyKind("python -m mempalace.mcp_server --palace /p")).toBe("read-sidecar");
    expect(classifyKind("/home/j/.local/bin/mempalace-mcp")).toBe("read-sidecar");
  });
  it("catches a one-shot mine", () => {
    expect(classifyKind("mempalace --palace /p mine --source ndjson /tmp/b")).toBe("one-shot-mine");
  });
  it("catches the ingest hook wrapper by script name", () => {
    expect(classifyKind("bash /x/lares-mempalace-ingest-hook.sh")).toBe("ingest-hook");
  });
  it("catches the lares hook legs", () => {
    expect(classifyKind("node lares.mjs capture /s --wing w")).toBe("capture-job");
    expect(classifyKind("node lares.mjs subagents /s --wing w")).toBe("subagents-job");
    expect(classifyKind("node lares.mjs telemetry --wing w")).toBe("telemetry-job");
  });
  it("returns null for unrelated processes", () => {
    expect(classifyKind("grep -r foo")).toBeNull();
    expect(classifyKind("claude")).toBeNull();
  });
});

describe("classifyPalaceProcs", () => {
  const table = parseProcTable(PS_FIXTURE);
  const procs = classifyPalaceProcs(table, { vesselPids: [600], vesselPort: 8080 });

  it("finds every palace proc + the vessel, and NO noise (pids 100/700 dropped)", () => {
    const pids = procs.map((p) => p.pid).sort((a, b) => a - b);
    expect(pids).toEqual([200, 300, 310, 400, 500, 510, 600]);
    const kinds = procs.map((p) => p.kind).sort();
    expect(kinds).toEqual(
      ["capture-job", "chroma", "ingest-hook", "node-vessel", "read-sidecar", "subagents-job", "write-daemon"],
    );
  });

  it("resolves each proc's SPAWNER from the same table", () => {
    const capture = procs.find((p) => p.pid === 300)!;
    expect(capture.ppid).toBe(200);
    expect(capture.spawnerCmd).toContain("lares-mempalace-ingest-hook.sh");
    // A daemon reparented to init reads as orphaned.
    const daemon = procs.find((p) => p.pid === 400)!;
    expect(daemon.spawnerCmd).toBe("init (orphaned)");
  });

  it("extracts serves-what (palace path / wing / ws:port)", () => {
    expect(procs.find((p) => p.pid === 400)!.serves).toBe("/home/joshu/.mempalace/palace");
    expect(procs.find((p) => p.pid === 300)!.serves).toBe("wing_synthetic_dream_machine");
    expect(procs.find((p) => p.pid === 600)!.serves).toBe("ws:8080");
  });

  it("marks holders vs spawners per the kind metadata", () => {
    const daemon = procs.find((p) => p.pid === 400)!;
    expect(daemon.holdsStore).toBe(true);
    expect(daemon.mintsDaemons).toBe(false);
    const hook = procs.find((p) => p.pid === 200)!;
    expect(hook.mintsDaemons).toBe(true);
    expect(hook.holdsStore).toBe(false);
  });

  it("drops our own ps-launching pid via selfPid", () => {
    const withSelf = classifyPalaceProcs(table, { selfPid: 400 });
    expect(withSelf.find((p) => p.pid === 400)).toBeUndefined();
  });

  it("orders holders before spawners", () => {
    const firstSpawnerIdx = procs.findIndex((p) => p.mintsDaemons);
    const lastHolderIdx = [...procs].map((p, i) => (p.holdsStore ? i : -1)).filter((i) => i >= 0).pop()!;
    expect(lastHolderIdx).toBeLessThan(firstSpawnerIdx);
  });
});

describe("KIND_META coverage", () => {
  it("every ProcKind classifyKind can emit has metadata", () => {
    for (const k of ["write-daemon", "read-sidecar", "one-shot-mine", "chroma", "node-vessel", "ingest-hook", "capture-job", "subagents-job", "telemetry-job"] as const) {
      expect(KIND_META[k]).toBeDefined();
    }
  });
});

describe("isUnderPath", () => {
  it("matches at-or-beneath, path-segment safe (no bare prefix)", () => {
    expect(isUnderPath("/a/b", "/a/b")).toBe(true);
    expect(isUnderPath("/a/b/c", "/a/b")).toBe(true);
    expect(isUnderPath("/a/b/c", "/a/b/")).toBe(true);   // trailing slash normalized
    expect(isUnderPath("/a/bc", "/a/b")).toBe(false);     // segment boundary, not string prefix
    expect(isUnderPath("/a", "/a/b")).toBe(false);
  });
});

describe("procInPalaceScope — one island per door", () => {
  // The two islands the ruling separates: the guest comparator and the sovereign memory sensorium.
  const GUEST = "/home/joshu/.mempalace/palace";
  const MEMORY = "/home/joshu/.local/share/lares/sensoriums/memory";

  const holder = (serves: string): PalaceProc => ({
    pid: 1, ppid: 1, kind: "write-daemon", serves, uptimeSec: 1, spawnerCmd: "x",
    holdsStore: true, mintsDaemons: false, cmd: serves,
  });
  const captureHolder: PalaceProc = { // the sovereign serialized writer — serves <memory>/content
    pid: 2, ppid: 1, kind: "capture-holder", serves: `${MEMORY}/content`, uptimeSec: 1, spawnerCmd: "x",
    holdsStore: true, mintsDaemons: false, cmd: "capture_session.py --serve",
  };
  const spawner: PalaceProc = { // an ingest-hook leg — mints the sovereign capture, keyed by WING not path
    pid: 3, ppid: 1, kind: "capture-job", serves: "wing_x", uptimeSec: 1, spawnerCmd: "x",
    holdsStore: false, mintsDaemons: true, cmd: "lares capture --wing wing_x",
  };

  it("the GUEST scope selects ONLY the guest holder — never the sovereign capture holder", () => {
    expect(procInPalaceScope(holder(`${GUEST}`), GUEST)).toBe(true);
    expect(procInPalaceScope(captureHolder, GUEST)).toBe(false);     // the witnessed breach — now excluded
  });

  it("the SOVEREIGN memory scope selects the capture holder — never the guest holder", () => {
    expect(procInPalaceScope(captureHolder, MEMORY)).toBe(true);
    expect(procInPalaceScope(holder(`${GUEST}`), MEMORY)).toBe(false);
  });

  it("the minting legs join only when the door OWNS them (sovereign memory), never the guest", () => {
    expect(procInPalaceScope(spawner, GUEST, { spawners: false })).toBe(false);
    expect(procInPalaceScope(spawner, MEMORY, { spawners: true })).toBe(true);
    expect(procInPalaceScope(spawner, MEMORY, { spawners: false })).toBe(false); // a non-memory sovereign
  });
});

describe("fmtUptime", () => {
  it("compacts seconds to d/h/m/s and handles null", () => {
    expect(fmtUptime(null)).toBe("—");
    expect(fmtUptime(41)).toBe("41s");
    expect(fmtUptime(125)).toBe("2m");
    expect(fmtUptime(3 * 3600 + 20 * 60)).toBe("3h20m");
    expect(fmtUptime(2 * 86400 + 5 * 3600)).toBe("2d5h");
  });
});
