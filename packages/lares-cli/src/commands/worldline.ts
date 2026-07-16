/**
 * `lares sense worldline <handle|session>` — walk a session's SPIRIT TREE from the durable
 * worldline edge-DAG.
 *
 * Reads the mempalace knowledge graph READ-ONLY (`<palace>/knowledge_graph.sqlite3`,
 * `mode=ro` — never a write, never through the python membrane): the `lares-worldline`
 * adapter rows worldline-kg.ts projects — `prov:Delegation` (spawn → handback interval,
 * `source_drawer_id` = the spawn turn key) and `prov:Communication` (mid-flight inject).
 * Joins each node with the BEARING INDEX (`<state>/harvest/<wing>.ndjson`, the
 * per-turn HarvestRecord log) for turn counts + the aim/yield each agent carried.
 *
 * Sub-forms:
 *   lares sense worldline <run|handle>        the braid (tree, default) — spawn=fork ·
 *                                       handback=join · concurrent siblings marked ∥
 *   lares sense worldline tree <run>          the same, spelled
 *   lares sense worldline <run> --as-of <ts>  the braid AS-OF a valid-time frontier — a
 *                                       pure READ refinement (rows spawned after <ts>
 *                                       drop; an interval still open at <ts> reads OPEN).
 *                                       Mirrors the MCP `worldline(as_of)` arg.
 *   lares sense worldline enrich              fill the absent BEAT cell across every braid's
 *                                       lar_ffz membership stamps (same-turn drawers then
 *                                       share a beat cell — ultrametrically adjacent).
 *                                       Idempotent; reversible × trusted on the verb-grid.
 *                                       Runs the ONE shared core (@lararium/mempalace
 *                                       runFfzEnrich) the post-harvest pass also calls.
 *   lares sense worldline kapae <branch>      mute a worldline branch (move-not-delete). The
 *   lares sense worldline un-kapae <branch>   restore it. Both refuse honestly: the branch-mute is a
 *                                       WRITE with no home in this read-only KG handle, and must not
 *                                       ride harvest's kapaeTurn path.
 *   lares sense worldline diff <A> <B>        NOT AVAILABLE — an honest gap (below)
 *
 * The ∥ mark rides the edge-DAG's OWN replay law (the same valid-time replay the mesh
 * projection `worldlineCausalFromEdges` enacts: events ordered by valid-time, spawn
 * ranking BEFORE handback at the same instant): a sibling reads SEQUENTIAL only when the
 * previous sibling's handback replays before its spawn — otherwise the DAG holds no path
 * between them and they read ∥. Never a wall-clock guess beyond the ordering the durable
 * projection itself is defined by. (Comparing two PAST frontiers by their ITC stamps is
 * exactly the persisted-stamp gap `diff` refuses on — see below.)
 *
 * THE DIFF GAP (reported, not faked): ITC STAMPS ARE NOT QUERYABLY PERSISTED — the stamp
 * values live only in the in-memory registry (mesh/worldline-clock; the daemon's
 * worldline-compare re-derives them per call from a transcript). The KG persists the
 * EDGE-DAG the stamps re-project from, so `tree` stands on durable ground, but a
 * frontier-vs-frontier `diff <A> <B>` over two PAST stamps needs a persisted ITC
 * read-path (stamp serialization at capture). Until that lands, `diff` refuses honestly
 * rather than inventing causality from timestamps.
 *
 * One surface, two actors: prose on a TTY, deterministic JSON under --json (../render.ts).
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#attribution
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PRED_DELEGATION, PRED_COMMUNICATION } from "@lararium/mesh";
import { resolvePalacePath } from "@lararium/mempalace";
import { runFfzEnrich, FfzEnrichUnavailable } from "@lararium/sensorium";
import { larHarvestDir } from "../env.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

// ── the pure core (exported for tests) ────────────────────────────────────────────────────────────

/** One `lares-worldline` KG row (triples table, adapter_name='lares-worldline'). */
export interface WorldlineKgRow {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly valid_from: string | null;
  readonly valid_to: string | null;
  /** source_drawer_id — the spawn turn key (kg_io.py's provenance slot). */
  readonly turn_key: string | null;
}

/** The bearing-index fields the join reads (a HarvestRecord subset; unknown-tolerant). */
export interface BearingTurnRecord {
  readonly session?: unknown;
  readonly agentId?: unknown;
  readonly wing?: unknown;
  readonly aim?: unknown;
  readonly yieldUri?: unknown;
}

/** One node of the braid — a worldline (the run-root or a spirit). */
export interface WorldlineNode {
  readonly handle: string;
  /** The spirit's agent id (`handle.split(".")[1]`), or null at the run-root. */
  readonly agentId: string | null;
  readonly parent: string | null;
  readonly spawn: string | null;
  /** The handback close (valid_to), or null while the interval stands OPEN. */
  readonly handback: string | null;
  readonly turnKey: string | null;
  readonly open: boolean;
  /** Edge-DAG replay verdict vs the sibling before it — the ∥ mark (see module doc). */
  readonly concurrentWithPreviousSibling: boolean;
  /** prov:Communication edges landing on this worldline (mid-flight injects). */
  readonly injects: number;
  /** Bearing-index join: harvested turn count for this worldline (0 when un-harvested). */
  readonly turns: number;
  /** First harvested aim / last harvested yield this worldline carried, or null. */
  readonly aim: string | null;
  readonly yield: string | null;
  readonly children: WorldlineNode[];
}

export interface WorldlineTree {
  readonly run: string;
  readonly root: WorldlineNode;
  readonly spirits: number;
  readonly openSpirits: number;
  /** Bearing-index turns joined across the whole braid (0 = the index holds none for this run). */
  readonly bearingTurns: number;
}

/** Normalize a stored predicate to the mesh constant (kg_io lowercases on write). */
function normPredicate(p: string): string {
  const low = p.toLowerCase();
  if (low === PRED_DELEGATION.toLowerCase()) return PRED_DELEGATION;
  if (low === PRED_COMMUNICATION.toLowerCase()) return PRED_COMMUNICATION;
  return p;
}

/**
 * Build the braid from the KG rows + the bearing records — PURE (no I/O).
 * `run` = the run-root handle (a session id, possibly `run~frontier`).
 */
export function buildWorldlineTree(
  run: string,
  rows: readonly WorldlineKgRow[],
  bearings: readonly BearingTurnRecord[] = [],
): WorldlineTree {
  const bareRun = run.split("~")[0] ?? run;

  // The ∥ verdict — the edge-DAG's replay law (worldlineCausalFromEdges' event order:
  // valid-time ascending, spawn(0) < inject(1) < handback(2) at the same instant). The
  // previous sibling's handback happens-before the next spawn ONLY when it replays
  // strictly earlier; an open interval or a same-instant close leaves the pair ∥.
  const sequentialAfter = (prev: WorldlineKgRow, cur: WorldlineKgRow): boolean =>
    prev.valid_to !== null && cur.valid_from !== null && prev.valid_to < cur.valid_from;

  // Bearing join — per-worldline turn tallies + the first aim / last yield carried.
  const tally = new Map<string, { turns: number; aim: string | null; yield: string | null }>();
  const keyOf = (agentId: string | null): string => agentId ?? "\u0000root";
  for (const b of bearings) {
    if (typeof b.session !== "string" || b.session !== bareRun) continue;
    const k = keyOf(typeof b.agentId === "string" && b.agentId !== "" ? b.agentId : null);
    const t = tally.get(k) ?? { turns: 0, aim: null, yield: null };
    t.turns += 1;
    if (t.aim === null && typeof b.aim === "string" && b.aim !== "") t.aim = b.aim;
    if (typeof b.yieldUri === "string" && b.yieldUri !== "") t.yield = b.yieldUri;
    tally.set(k, t);
  }
  const bearingTurns = [...tally.values()].reduce((n, t) => n + t.turns, 0);

  // Delegation rows → child nodes, grouped under their spawning subject.
  const injectCounts = new Map<string, number>();
  for (const r of rows) {
    if (normPredicate(r.predicate) !== PRED_COMMUNICATION) continue;
    injectCounts.set(r.object, (injectCounts.get(r.object) ?? 0) + 1);
  }
  const byParent = new Map<string, WorldlineKgRow[]>();
  for (const r of rows) {
    if (normPredicate(r.predicate) !== PRED_DELEGATION) continue;
    const kids = byParent.get(r.subject) ?? [];
    kids.push(r);
    byParent.set(r.subject, kids);
  }

  let spirits = 0;
  let openSpirits = 0;
  const build = (handle: string, parent: string | null, row: WorldlineKgRow | null): WorldlineNode => {
    const agentId = handle.includes(".") ? (handle.split(".")[1] ?? null) : null;
    const t = tally.get(keyOf(agentId)) ?? { turns: 0, aim: null, yield: null };
    const kidRows = [...(byParent.get(handle) ?? [])].sort(
      (a, b) => ((a.valid_from ?? "") < (b.valid_from ?? "") ? -1 : (a.valid_from ?? "") > (b.valid_from ?? "") ? 1 : a.object < b.object ? -1 : 1),
    );
    const children: WorldlineNode[] = [];
    let prev: WorldlineKgRow | null = null;
    for (const kr of kidRows) {
      spirits += 1;
      if (kr.valid_to === null) openSpirits += 1;
      const child = build(kr.object, handle, kr);
      children.push({
        ...child,
        concurrentWithPreviousSibling: prev !== null && !sequentialAfter(prev, kr),
      });
      prev = kr;
    }
    return {
      handle,
      agentId,
      parent,
      spawn: row?.valid_from ?? null,
      handback: row?.valid_to ?? null,
      turnKey: row?.turn_key ?? null,
      open: row !== null && row.valid_to === null,
      concurrentWithPreviousSibling: false,
      injects: injectCounts.get(handle) ?? 0,
      turns: t.turns,
      aim: t.aim,
      yield: t.yield,
      children,
    };
  };

  const root = build(run, null, null);
  return { run, root, spirits, openSpirits, bearingTurns };
}

/**
 * Reconstruct the AS-OF frontier — PURE, read-only. Drops rows whose spawn (`valid_from`) lands
 * strictly after `asOf`; for a surviving row whose close (`valid_to`) also lands after `asOf`, clamps
 * the close to null so the interval reads OPEN as-of that frontier. A null `valid_from` (untimed edge)
 * survives untouched — the filter hides no edge it cannot place in time. `asOf` undefined → identity.
 */
export function filterRowsAsOf(rows: readonly WorldlineKgRow[], asOf: string | undefined): WorldlineKgRow[] {
  if (asOf === undefined || asOf === "") return [...rows];
  const out: WorldlineKgRow[] = [];
  for (const r of rows) {
    if (r.valid_from !== null && r.valid_from > asOf) continue;               // spawned after the frontier — unborn as-of
    out.push(r.valid_to !== null && r.valid_to > asOf ? { ...r, valid_to: null } : r);  // closed after — reads OPEN as-of
  }
  return out;
}

// ── the IO legs (read-only, honest on absence) ────────────────────────────────────────────────────

/** Read the run's `lares-worldline` rows from the KG sqlite, READ-ONLY (`mode=ro` semantics).
 *  Prefix-tolerant: `runArg` may be a session-id prefix; returns the DISTINCT runs it matched so
 *  the caller can disambiguate honestly. */
export function readWorldlineRows(
  kgPath: string,
  runArg: string,
): { rows: WorldlineKgRow[]; runs: string[] } {
  const db = new DatabaseSync(kgPath, { readOnly: true });
  try {
    const prefix = runArg.toLowerCase();
    const stmt = db.prepare(
      `SELECT subject, predicate, object, valid_from, valid_to, source_drawer_id AS turn_key
         FROM triples
        WHERE adapter_name = 'lares-worldline'
          AND (subject LIKE ? || '%' OR object LIKE ? || '%')
        ORDER BY valid_from, subject, object`,
    );
    const rows = stmt.all(prefix, prefix) as unknown as WorldlineKgRow[];
    // The distinct run-roots among the matched delegation subjects (a subject with no `.` = a root).
    const runs = [...new Set(rows.filter((r) => !r.subject.includes(".")).map((r) => r.subject))].sort();
    return { rows, runs };
  } finally {
    db.close();
  }
}

/** Read every bearing-index NDJSON under the harvest dir (graceful: absent dir → []). */
export function readBearingIndex(harvestDir: string): BearingTurnRecord[] {
  if (!existsSync(harvestDir)) return [];
  const out: BearingTurnRecord[] = [];
  for (const f of readdirSync(harvestDir)) {
    if (!f.endsWith(".ndjson")) continue;
    let body: string;
    try { body = readFileSync(join(harvestDir, f), "utf8"); } catch { continue; }
    for (const line of body.split("\n")) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line) as BearingTurnRecord); } catch { /* a torn tail line — skip */ }
    }
  }
  return out;
}

// ── render ────────────────────────────────────────────────────────────────────────────────────────

function shortTs(ts: string | null): string {
  if (!ts) return "…";
  const m = /T(\d{2}:\d{2}:\d{2})/.exec(ts);
  return m ? (m[1] as string) : ts;
}

function renderNode(n: WorldlineNode, indent: string, isLast: boolean, lines: string[]): void {
  const tee = isLast ? "└─" : "├─";
  const par = n.concurrentWithPreviousSibling ? "∥ " : "";
  const span = `${shortTs(n.spawn)} → ${n.open ? "OPEN" : shortTs(n.handback)}`;
  const turns = n.turns > 0 ? ` · turns ${n.turns}` : "";
  const inj = n.injects > 0 ? ` · injects ${n.injects}` : "";
  const key = n.turnKey ? ` · turnKey ${n.turnKey.slice(0, 8)}` : "";
  lines.push(`${indent}${tee} ${par}${n.agentId ?? n.handle}  ${span}${turns}${inj}${key}`);
  const yieldLine = n.yield ? `${indent}${isLast ? "   " : "│  "}     yield ${n.yield}` : null;
  if (yieldLine) lines.push(yieldLine);
  n.children.forEach((c, i) => renderNode(c, indent + (isLast ? "   " : "│  "), i === n.children.length - 1, lines));
}

export function renderWorldlineTree(t: WorldlineTree): string {
  const lines: string[] = [];
  const r = t.root;
  lines.push(`worldline ${t.run} — ${t.spirits} spirit${t.spirits === 1 ? "" : "s"} (${t.openSpirits} open) · ${t.bearingTurns} bearing turn${t.bearingTurns === 1 ? "" : "s"} joined`);
  const rootTurns = r.turns > 0 ? ` · turns ${r.turns}` : "";
  lines.push(`● ${r.handle}${rootTurns}${r.aim ? ` · aim ${r.aim}` : ""}${r.yield ? ` · yield ${r.yield}` : ""}`);
  r.children.forEach((c, i) => renderNode(c, "", i === r.children.length - 1, lines));
  if (t.bearingTurns === 0) lines.push("(no bearing-index turns for this run — `lares sense pour` fills the join)");
  return lines.join("\n");
}

// ── the command ───────────────────────────────────────────────────────────────────────────────────

const DIFF_GAP =
  "worldline diff is not available: ITC stamps are not queryably persisted — the stamp values live " +
  "only in the in-memory registry (mesh/worldline-clock), re-derived per call. The KG persists the " +
  "edge-DAG (which `tree` re-projects), but a stamp-vs-stamp diff over two PAST frontiers needs a " +
  "persisted ITC read-path (stamp serialization at capture). Refusing honestly rather than inventing " +
  "causality from timestamps.";

// kapae / un-kapae refuse honestly. The verb mirrors the MCP `kapae`/`un_kapae` tools, but the mute
// is a WRITE (move-not-delete) and this command reads the KG mode=ro — the write MUST NOT ride this
// read-only handle, nor harvest's TS `kapaeTurn` path (which would couple kapae to a capture leg).
// The landing target — py `cascade_kapae` via worldline_io, or a writable TS KG handle — stays an
// open fork, surfaced not resolved.
const KAPAE_REFUSAL =
  "worldline kapae refuses honestly. The verb reads mode=ro, so the branch-mute (a write) cannot land " +
  "here, and it must not ride harvest's kapaeTurn path. Write-home fork (open): py cascade_kapae via " +
  "worldline_io, OR a writable TS KG handle.";

/** Refuse a kapae / un-kapae call honestly: a read-only KG handle cannot land the branch-mute write. */
function kapaeStub(args: ParsedArgs, verb: "kapae" | "un-kapae", branch: string): number {
  if (!branch) {
    console.error(`usage: lares sense worldline ${verb} <branch> [--tick <n>]  (refuses honestly — see below)`);
    return 2;
  }
  emit(args, {
    ok: false,
    error: { code: "verb-error", message: `worldline ${verb}: ${KAPAE_REFUSAL}`, hint: "the mute needs a writable KG handle; this read-only path cannot land it." },
    human: () => { console.error(`lares sense worldline ${verb} ${branch}: ${KAPAE_REFUSAL}`); },
  });
  return exitFor("verb-error");
}

export async function cmdWorldline(args: ParsedArgs): Promise<number> {
  const pos = [...args.positional];
  const SUBVERBS = new Set(["tree", "diff", "kapae", "un-kapae", "enrich"]);
  const sub = pos[0] !== undefined && SUBVERBS.has(pos[0]) ? (pos.shift() as string) : "tree";

  // kapae / un-kapae refuse honestly — a read-only KG handle cannot land the branch-mute write.
  if (sub === "kapae" || sub === "un-kapae") {
    return kapaeStub(args, sub, (pos[0] ?? "").trim());
  }

  // enrich — fill the absent BEAT cell across every braid's lar_ffz membership stamps
  // (same-turn drawers then share a beat cell, ultrametrically adjacent). Idempotent:
  // reversible × trusted on the verb-grid — only `_` cells fill, a re-run no-ops.
  if (sub === "enrich") {
    try {
      const report = runFfzEnrich(args.options["palace"]);
      emit(args, {
        ok: true,
        data: { mode: "enrich", ...report },
        human: () => {
          console.log("lares sense worldline enrich");
          console.log(`  braids: ${report.braids}  turns: ${report.turns}  stamps: ${report.stamped}`);
          console.log(`  rhythm testimony: locked ${report.locked} · holdover ${report.holdover} · phase-spread ${report.phase_spread.toFixed(4)}`);
        },
      });
      return 0;
    } catch (err) {
      const message = err instanceof FfzEnrichUnavailable ? err.message
        : `enrich failed: ${err instanceof Error ? err.message : String(err)}`;
      emit(args, {
        ok: false,
        error: { code: "verb-error", message, hint: "capture builds the fork-DAG the enrichment walks — feed transcripts first." },
        human: () => console.error(`lares sense worldline enrich: ${message}`),
      });
      return exitFor("verb-error");
    }
  }

  if (sub === "diff") {
    emit(args, {
      ok: false,
      error: { code: "verb-error", message: DIFF_GAP, hint: "Use `lares sense worldline <run>` — the tree re-projects the causal braid from the persisted edge-DAG." },
      human: () => { console.error(`lares sense worldline diff: ${DIFF_GAP}`); },
    });
    return exitFor("verb-error");
  }

  const target = (pos[0] ?? "").trim();
  if (!target) {
    console.error("usage: lares sense worldline <handle|session-id[-prefix]> [--palace <dir>] [--as-of <ts>] | lares sense worldline enrich [--palace <content-dir>] | lares sense worldline kapae <branch> | lares sense worldline diff <A> <B>");
    return 2;
  }
  // A worldline handle (`<run>.<agentId>`) walks its whole run; a run/session id walks itself.
  const runArg = (target.split(".")[0] ?? target).toLowerCase();

  const palace = args.options["palace"] ?? resolvePalacePath();
  const kgPath = join(palace, "knowledge_graph.sqlite3");
  if (!existsSync(kgPath)) {
    const msg = `no knowledge graph at ${kgPath}`;
    emit(args, {
      ok: false,
      error: { code: "not-found", message: msg, hint: "Worldline edges project at harvest — run `lares sense pour` (or `lares sense subagents <transcript>`) first." },
      human: () => { console.error(`lares sense worldline: ${msg}`); console.error("  Worldline edges project at harvest — run `lares sense pour` first."); },
    });
    return exitFor("not-found");
  }

  let rows: WorldlineKgRow[];
  let runs: string[];
  try {
    ({ rows, runs } = readWorldlineRows(kgPath, runArg));
  } catch (err) {
    const msg = `knowledge graph read failed: ${err instanceof Error ? err.message : String(err)}`;
    emit(args, {
      ok: false,
      error: { code: "conflict", message: msg, hint: "The palace may be mid-repave — retry when the harvest settles." },
      human: () => console.error(`lares sense worldline: ${msg}`),
    });
    return exitFor("conflict");
  }

  if (rows.length === 0) {
    const msg = `no worldline edges match "${runArg}" (adapter lares-worldline)`;
    emit(args, {
      ok: false,
      error: { code: "not-found", message: msg, hint: "Edges land when a session's spirits are observed — `lares sense pour` / `lares sense subagents`." },
      human: () => console.error(`lares sense worldline: ${msg}`),
    });
    return exitFor("not-found");
  }
  if (runs.length > 1) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: `prefix "${runArg}" matches ${runs.length} runs`, hint: `Disambiguate: ${runs.slice(0, 6).join(" · ")}` },
      human: () => {
        console.error(`lares sense worldline: prefix "${runArg}" matches ${runs.length} runs:`);
        for (const r of runs.slice(0, 12)) console.error(`  ${r}`);
      },
    });
    return exitFor("usage");
  }

  const run = runs[0] ?? runArg;
  // --as-of: a pure read-only frontier reconstruction (default undefined = the whole braid, unchanged).
  const asOf = args.options["as-of"];
  const framedRows = filterRowsAsOf(rows, asOf);
  const tree = buildWorldlineTree(run, framedRows, readBearingIndex(larHarvestDir()));

  emit(args, {
    ok: true,
    data: {
      run: tree.run,
      spirits: tree.spirits,
      openSpirits: tree.openSpirits,
      bearingTurns: tree.bearingTurns,
      ...(asOf !== undefined ? { asOf } : {}),
      tree: tree.root as unknown as Record<string, unknown>,
      diff: { available: false, reason: DIFF_GAP },
    },
    human: () => console.log(renderWorldlineTree(tree)),
  });
  return 0;
}
