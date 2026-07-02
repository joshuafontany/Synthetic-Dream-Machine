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
import { rewindThenFork, type WorldlineEdgeTriple, type WorldlineEdgeClose, type RewindThenForkResult } from "@lararium/mesh";
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

/**
 * Truncate an ISO timestamp to WHOLE SECONDS before it crosses into the mempalace KG — the KG's
 * `sanitize_iso_temporal` accepts only `YYYY-MM-DD` / `YYYY-MM-DDTHH:MM:SSZ` (canonical UTC,
 * no fractional part), while Claude transcripts stamp millisecond ISO (`…:56.789Z`). Un-truncated,
 * a ms value raises one traceback per record and the edge never lands. Pure string cut — a non-ISO
 * or already-whole value passes through untouched. THE MEMBRANE OWNS THIS LAW: every temporal
 * value below (valid_from / ended) rides through it, so no caller can forward a ms ISO past here.
 */
export function isoWholeSeconds(ts: string): string {
  return ts.replace(/(\d{2}:\d{2}:\d{2})\.\d+(?=Z|[+-]\d{2}:?\d{2}$|$)/, "$1");
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
    ...(e.valid_from !== undefined ? { valid_from: isoWholeSeconds(e.valid_from) } : {}),
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
    ...(c.ended !== undefined ? { ended: isoWholeSeconds(c.ended) } : {}),
  }));
  const res = runWithNdjson(r, "invalidate", records) as { invalidated?: number };
  return { invalidated: typeof res.invalidated === "number" ? res.invalidated : closes.length };
}

/**
 * KAPAE (rewind = set-aside, never erase) — close `valid_to` on EVERY still-open edge keyed to
 * a retracted turn-DAG node. Append-only (history preserved); idempotent (a re-run closes nothing
 * new). Returns the count closed.
 *
 * NOTE — the AUTO-TRIGGER landed (FFZ live-triggers): `lares harvest` runs mesh `detectGoneTurns`
 * (gone-turns.ts) per session-scope over the append-only index vs the live current-branch, and fires
 * THIS `kapaeTurn` for every gone uuid (Leg 1, the KG valid-close), while the astpalace twin
 * (`astpalace_io.kapae`) sets aside the AST tally (Legs 2+3 via the @daemon). The REWIND-THEN-FORK
 * composition rides {@link kapaeThenFork} — kapae's valid-close → re-project → the new sibling.
 */
export function kapaeTurn(turnKey: string, opts: WorldlineKgOptions & { ended?: string } = {}): { closed: number; ended: string } {
  if (!turnKey) throw new Error("kapaeTurn: turnKey required");
  const r = resolve(opts);
  const args = ["--palace", r.palace, "kapae", "--turn-key", turnKey, ...(opts.ended ? ["--ended", isoWholeSeconds(opts.ended)] : [])];
  const out = r.exec(r.py, [r.script, ...args]);
  let res: { closed?: number; ended?: string } = {};
  try { res = JSON.parse(out.trim()) as typeof res; } catch { /* fall through */ }
  return { closed: typeof res.closed === "number" ? res.closed : 0, ended: res.ended ?? opts.ended ?? "" };
}

export interface KapaeThenForkResult extends RewindThenForkResult {
  /** KG edge-rows valid-closed by the durable kapae leg (summed over every rewound turn). */
  readonly closed: number;
}

/**
 * REWIND-THEN-FORK (edit-and-resubmit), the DURABLE path — the ONE composition kapae → re-project →
 * fork. Fires the real {@link kapaeTurn} for each rewound turn (Leg 1: close `valid_to` in the KG,
 * append-only — the tx-row survives), then hands the caller's edge set to the mesh-pure
 * {@link rewindThenFork} (re-project the ITC over the surviving VALID view → the rewound frontier →
 * itcFork the new sibling).
 *
 * The caller supplies `opens`/`closes` (the session's edge-DAG, e.g. from `deriveSubagentEdges`) — the
 * KG has no edge-QUERY path yet (design-only follow-up), so the durable close and the in-memory
 * re-project ride the SAME edge set: kapae persists the valid-close, the pure core drops those turnKeys
 * from the projected view. Best-effort on the KG (a {@link KgUnavailable} leaves `closed = 0`; the
 * re-project + fork still yield the sibling — the KG is a re-derivable projection, never the authority).
 */
export function kapaeThenFork(
  root: string,
  opens: readonly WorldlineEdgeTriple[],
  closes: readonly WorldlineEdgeClose[],
  rewoundTurnKeys: readonly string[],
  fork: { readonly parent: string; readonly child: string },
  opts: WorldlineKgOptions & { ended?: string } = {},
): KapaeThenForkResult {
  let closed = 0;
  for (const turnKey of rewoundTurnKeys) {
    if (!turnKey) continue;
    try { closed += kapaeTurn(turnKey, opts).closed; } catch (err) {
      if (!(err instanceof KgUnavailable)) throw err; // KG absent → best-effort; other faults surface
    }
  }
  const forked = rewindThenFork(root, opens, closes, rewoundTurnKeys, fork);
  return { ...forked, closed };
}
