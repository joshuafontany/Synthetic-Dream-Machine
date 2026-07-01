/**
 * worldline-kg — the NODE seam that projects worldline edges onto the mempalace
 * knowledge graph. The durable twin of the in-memory ITC registry (mesh/worldline-clock):
 * spawn/inject persist as prov triples, handback closes the spawn interval, kapae closes a
 * retracted turn's edges (rewind = set-aside, never erase).
 *
 * It CALLS the mempalace KG API through OUR `scripts/kg_io.py` (which calls the vendored
 * KnowledgeGraph.add_triple / .invalidate) via the SAME execFileSync idiom telemetry-writeback
 * uses for drawer_io.py — the established node→mempalace write membrane. We never spawn a write
 * MCP client (the node's MempalaceClient is read-only by contract) and never edit the submodule.
 *
 * The KG is a RE-DERIVABLE projection: the transcripts are the source of truth, so a wiped or
 * stale KG re-builds by nuke-and-pave + re-harvest (agent-worldline #time). These writes are
 * therefore best-effort durability, never the live causal authority (that stays the ITC read).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#attribution
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import type { WorldlineEdgeTriple, WorldlineEdgeClose } from "@lararium/mesh";
import { resolveMempalacePython } from "./spawn-resolve.js";
import { resolveComputeCapEnv } from "./compute-cap.js";
import { resolvePalacePath } from "./palace-path.js";

/** Raised when python / `kg_io.py` are absent — the caller renders a clean error. */
export class KgUnavailable extends Error {}

export interface WorldlineKgOptions {
  /** Palace dir; defaults to the canonical palace path. KG = <palace>/knowledge_graph.sqlite3. */
  readonly palacePath?: string;
  /** Override the python interpreter (testing). */
  readonly python?: string;
  /** Override the kg_io.py path (testing — e.g. a fake). */
  readonly script?: string;
  /** Override the spawn (testing) — receives (bin, args), returns stdout. */
  readonly exec?: (bin: string, args: readonly string[]) => string;
}

/** Locate `kg_io.py` — CODE, so it lives at the repo root (never LAR_ROOT). */
export function resolveKgIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "kg_io.py");
}

interface Resolved {
  readonly py: string;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly palace: string;
  readonly exec: (bin: string, args: readonly string[]) => string;
}

function resolve(opts: WorldlineKgOptions): Resolved {
  const exec =
    opts.exec ??
    ((bin: string, args: readonly string[]): string => {
      // drawer_io's PYTHONPATH discipline: kg_io does `from mempalace.knowledge_graph import …`;
      // mempalace isn't pip-installed, it lives at <submoduleRoot>/mempalace/, and `python script.py`
      // sets sys.path[0] to the SCRIPT dir, so PYTHONPATH=submoduleRoot makes `import mempalace` resolve.
      const submoduleRoot = join(repoRoot, "mempalace");
      // + the GPU compute cap (LD_LIBRARY_PATH + device hint): kg_io itself opens only the KG sqlite,
      // but it shares the mempalace interpreter with the chroma sidecars — carry the cap uniformly so a
      // cold @daemon restart never trips onnxruntime-gpu's `libcudart` import. Degrades to CPU when absent.
      const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveComputeCapEnv(bin) };
      return execFileSync(bin, [...args], { cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 28, encoding: "utf8" });
    });
  const py = opts.python ?? resolveMempalacePython() ?? "";
  if (!py) throw new KgUnavailable("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const script = opts.script ?? resolveKgIo();
  if (!existsSync(script)) throw new KgUnavailable(`kg_io.py missing at ${script}`);
  return { py, script, submoduleRoot: join(repoRoot, "mempalace"), palace: opts.palacePath ?? resolvePalacePath(), exec };
}

/** Write NDJSON records to a pid-unique temp file, run kg_io.py, ALWAYS remove the temp. */
function runWithNdjson(r: Resolved, sub: string, records: readonly unknown[]): unknown {
  const pf = join(tmpdir(), `lar-worldline-kg-${sub}-${process.pid}-${Date.now()}.ndjson`);
  writeFileSync(pf, records.map((x) => JSON.stringify(x)).join("\n") + "\n");
  try {
    const out = r.exec(r.py, [r.script, "--palace", r.palace, sub, pf]);
    try { return JSON.parse(out.trim()); } catch { return {}; }
  } finally {
    rmSync(pf, { force: true });
  }
}

/**
 * PERSIST spawn/inject edges → `kg_add` a prov:Delegation / prov:Communication triple each.
 * Idempotent at the KG (an identical still-open triple returns the existing id). No-op on [].
 */
export function persistWorldlineEdges(edges: readonly WorldlineEdgeTriple[], opts: WorldlineKgOptions = {}): { added: number } {
  if (edges.length === 0) return { added: 0 };
  const r = resolve(opts);
  const records = edges.map((e) => ({
    subject: e.subject,
    predicate: e.predicate,
    object: e.object,
    ...(e.valid_from !== undefined ? { valid_from: e.valid_from } : {}),
    ...(e.turnKey !== undefined ? { turn_key: e.turnKey } : {}),
  }));
  const res = runWithNdjson(r, "add", records) as { added?: number };
  return { added: typeof res.added === "number" ? res.added : edges.length };
}

/**
 * CLOSE edges' valid-interval by S/P/O → `kg_invalidate` each (the HANDBACK twin-reunion:
 * the spawn edge's valid_to closes at the merge). No-op on [].
 */
export function closeWorldlineEdges(closes: readonly WorldlineEdgeClose[], opts: WorldlineKgOptions = {}): { invalidated: number } {
  if (closes.length === 0) return { invalidated: 0 };
  const r = resolve(opts);
  const records = closes.map((c) => ({
    subject: c.subject,
    predicate: c.predicate,
    object: c.object,
    ...(c.ended !== undefined ? { ended: c.ended } : {}),
  }));
  const res = runWithNdjson(r, "invalidate", records) as { invalidated?: number };
  return { invalidated: typeof res.invalidated === "number" ? res.invalidated : closes.length };
}

/**
 * KAPAE (rewind = set-aside, never erase) — close `valid_to` on EVERY still-open edge keyed to
 * a retracted turn-DAG node. Append-only (history preserved); idempotent (a re-run closes nothing
 * new). Returns the count closed.
 *
 * NOTE — the gone-turn DETECTOR landed: mesh `detectGoneTurns` (gone-turns.ts) diffs the append-only
 * harvest index against the live transcript to surface rewound turn-uuids, and the astpalace twin
 * (`astpalace_io.kapae`) sets aside the AST tally. This is the worldline-KG half of the same mechanism.
 * What stays unwired is the AUTO-TRIGGER loop — a caller that runs `detectGoneTurns` over the harvest
 * index per session and fires `kapaeTurn` for each gone uuid; until that lands nothing yet CALLS this.
 */
export function kapaeTurn(turnKey: string, opts: WorldlineKgOptions & { ended?: string } = {}): { closed: number; ended: string } {
  if (!turnKey) throw new Error("kapaeTurn: turnKey required");
  const r = resolve(opts);
  const args = ["--palace", r.palace, "kapae", "--turn-key", turnKey, ...(opts.ended ? ["--ended", opts.ended] : [])];
  const out = r.exec(r.py, [r.script, ...args]);
  let res: { closed?: number; ended?: string } = {};
  try { res = JSON.parse(out.trim()) as typeof res; } catch { /* fall through */ }
  return { closed: typeof res.closed === "number" ? res.closed : 0, ended: res.ended ?? opts.ended ?? "" };
}
