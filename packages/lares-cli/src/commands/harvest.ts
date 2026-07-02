/**
 * `lares harvest` — idempotent, re-runnable session-history harvest.
 *
 * The save-hook firehose that mempalace shipped hardcoded one `--wing sessions`
 * mega-wing and re-chewed the whole transcript dir on every Stop. This replaces
 * it: ONE idempotent command the operator (or a thin hook) re-runs safely.
 *
 *   - Reads a session transcript (.jsonl) — or every transcript under a dir —
 *     turn by turn, full message structure (text blocks; tool blocks noted, not
 *     dropped — mempalace #590).
 *   - Runs the graceful-gradient harvester (@lararium/mesh harvestTurnGradient):
 *     the grammar manifests provisionally, so clean turns harvest with
 *     confidence and degraded/novel/missing forms record on the 0..20 gradient,
 *     down to the floor; below it a turn keeps its raw source and abstains.
 *   - IDEMPOTENT: a per-key content-hash watermark (~/.lares/harvest/state.json)
 *     skips turns already harvested; re-runs and resumes are no-ops. The harvest
 *     index is append-only NDJSON keyed by turn uuid.
 *
 * No sidecar, no LLM in the parse path — pure local read + the isomorphic parser.
 * The mempalace DRAWER leg (verbatim semantic search) stays the convos mine; this
 * is the BEARING leg (the navigational structure the stream already authored).
 *
 * One surface, two actors: prose on a TTY, deterministic JSON off-TTY / under
 * --json (../render.ts #actor-parity).
 */

import { createHash } from "node:crypto";
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, readdirSync, appendFileSync, writeFileSync, statSync, linkSync, copyFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { harvestTurnGradient, branchContextForTurn, detectGoneTurns, liveKeysForRewind, type TurnNode, type KeyedBranchNode } from "@lararium/mesh";
import { writebackWing, resolveDrawerIo, mineWithRetry, resolvePalacePath, repairHnswIfDiverged, kapaeTurn, KgUnavailable, listSpiritFiles, type HnswRepairResult, type WritebackResult } from "@lararium/mempalace";
import { cmdSubagents } from "./subagents.js";
import { resolvePython } from "../integration-check.js";
import { larRoot, larDataDir, larHarvestDir, larHarvestStageDir, operatorDid } from "../env.js";
import { makeHarvestPacer, type PacerStep } from "../harvest-pacer.js";
import { atomicWriteFileSync, palaceOrgans, setupPalaceOrgans, organHealthy, type PalaceSetupStep } from "@lararium/node";
import { runVerb } from "../verb-call.js";
import { emit, type LaresError } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const HARVEST_DIR = larHarvestDir();   // ~/.lares/harvest (LAR_ROOT-isolated for staged instances)

/** One harvested turn — the gradient summary, keyed for idempotent dedup. */
interface HarvestRecord {
  readonly ts: string;
  readonly wing: string;
  readonly session: string; // for a subagent, the PARENT session — the link
  readonly turn: string; // message uuid (stable dedup key)
  readonly role: string;
  /** Subagent id (`agent-<id>.jsonl`), or null for a main-session turn. */
  readonly agentId: string | null;
  /** True for a sidechain (worker-swarm) turn — kept SEPARATE, linked via session. */
  readonly sidechain: boolean;
  /** In-transcript parent message uuid (the turn DAG), or null at a root. */
  readonly parentUuid: string | null;
  readonly confidence: number;
  readonly band: string;
  readonly recordRaw: boolean;
  readonly aim: string | null;
  readonly yieldUri: string | null;
  readonly voices: readonly string[];
  readonly confidences: ReadonlyArray<{ register: string | null; value: number | null }>;
  readonly sigilCount: number;
  readonly waterCount: number;
  readonly driftFlags: readonly string[];
  readonly hash: string;
}

interface RunSummary {
  wing: string;
  files: number;
  turns: number;
  harvested: number;
  skipped: number;
  framed: number;
  raw: number;
  /** Subagent (sidechain) turns harvested — separate records, linked by session. */
  sidechain: number;
  bands: Record<string, number>;
  indexPath: string;
}

/** Derive a per-project wing slug from a directory/cwd name. */
function wingFromDir(dir: string): string {
  const slug = basename(dir).toLowerCase().replace(/[ -]/g, "_").replace(/[^a-z0-9_]/g, "");
  return `wing_${slug || "unsorted"}`;
}

/** Pull the readable text from a Claude Code message's content (array or string). */
function messageText(message: unknown): { text: string; hasTools: boolean } {
  if (typeof message === "string") return { text: message, hasTools: false };
  const content = (message as { content?: unknown })?.content;
  if (typeof content === "string") return { text: content, hasTools: false };
  if (!Array.isArray(content)) return { text: "", hasTools: false };
  let text = "";
  let hasTools = false;
  for (const block of content) {
    const b = block as { type?: string; text?: string };
    if (b?.type === "text" && typeof b.text === "string") text += (text ? "\n" : "") + b.text;
    else if (b?.type === "tool_use" || b?.type === "tool_result") hasTools = true;
  }
  return { text, hasTools };
}

interface RawTurn {
  uuid: string; role: string; text: string; ts: string; session: string;
  agentId: string | null; sidechain: boolean; parentUuid: string | null;
}

/** Pull a subagent id from an `agent-<id>.jsonl` filename, else null. */
function agentIdFromFile(file: string): string | null {
  const m = /^agent-(.+)\.jsonl$/.exec(basename(file));
  return m ? (m[1] ?? null) : null;
}

/** Parse one transcript .jsonl into turns (one per user/assistant message). */
function readTurns(file: string): RawTurn[] {
  const turns: RawTurn[] = [];
  const fileAgent = agentIdFromFile(file);
  let lines: string[];
  try { lines = readFileSync(file, "utf8").split("\n"); } catch { return turns; }
  for (const line of lines) {
    if (!line.trim()) continue;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    const role = String(row["type"] ?? "");
    if (role !== "user" && role !== "assistant") continue;
    const { text } = messageText(row["message"]);
    if (!text.trim()) continue;
    const agentId = (row["agentId"] as string | undefined) ?? fileAgent;
    turns.push({
      uuid: String(row["uuid"] ?? ""),
      role,
      text,
      ts: String(row["timestamp"] ?? ""),
      // For a subagent, sessionId is the PARENT session — keep it as the link.
      session: String(row["sessionId"] ?? basename(file).replace(/\.jsonl$/, "")),
      agentId: agentId ?? null,
      sidechain: row["isSidechain"] === true || fileAgent !== null,
      parentUuid: (row["parentUuid"] as string | null | undefined) ?? null,
    });
  }
  return turns;
}

/**
 * The EXCHANGE-ASSEMBLER (the ingest canon's drawer grain): pair each user turn with the assistant
 * response(s) that follow into ONE unit — the self-contained recall drawer (a bare "yes do it" or an
 * answer shorn of its question retrieves poorly). The user side carries a `>` quote prefix (the convo
 * grain mempalace already uses); the assistant side carries the authored sigil instruments the
 * gradient reads. Orphan turns (user with no answer, answer with no question) flush as-is.
 */
export function readExchanges(file: string): RawTurn[] {
  const out: RawTurn[] = [];
  let q: RawTurn | null = null;
  for (const t of readTurns(file)) {
    if (t.role === "user") {
      if (q) out.push(q); // a prior question never got an answer — flush it alone
      q = { ...t, text: "> " + t.text.replace(/\n/g, "\n> ") };
    } else {
      if (q) { q.text += "\n\n" + t.text; out.push(q); q = null; }
      else out.push(t); // an answer with no preceding question
    }
  }
  if (q) out.push(q);
  return out;
}

export function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/**
 * The TURN KEY — the USER turn's stable identity (its uuid), the join the kapae convergence keys on.
 * The SAME formula MUST drive both legs: the CAPTURE leg (readExchanges → the .astpalace provenance
 * turn_key) and the BEARING/rewind leg (readTurns → the gone-turn detection → the worldline KG +
 * astpalace-kapae). Sharing this one helper keeps them in lockstep by construction — a gone uuid
 * closes the KG edge, the astpalace tally, AND the Measure salience as ONE key (the grain note).
 */
export function turnKeyOf(file: string, turn: { uuid: string; ts: string; text: string }): string {
  return turn.uuid || sha(file + turn.ts + turn.text.slice(0, 64));
}

/** Load the idempotency watermark: turn-key → content hash already harvested. */
function loadState(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>; } catch { return {}; }
}

/**
 * Read the existing append-only index into turn-key → content hash — the DURABLE de-dup floor
 * BENEATH the state watermark. The watermark is committed once at the end of a run; a crash
 * mid-loop (after an append, before the state write) would otherwise re-harvest those turns and
 * append a DUPLICATE record for one uuid. The index itself is the ground truth: a key already
 * present in it is never re-appended, no matter what the watermark lost.
 */
function loadIndexHashes(path: string): Map<string, string> {
  const seen = new Map<string, string>();
  if (!existsSync(path)) return seen;
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line) as { turn?: unknown; hash?: unknown };
        if (typeof r.turn === "string" && typeof r.hash === "string") seen.set(r.turn, r.hash);
      } catch { /* skip torn line */ }
    }
  } catch { /* fall through */ }
  return seen;
}

/**
 * The rewind-detection SCOPE key — `session \0 agentId`. A subagent's turns carry the PARENT
 * session id (the link), so a `session`-only diff would read every subagent turn as gone when a lone
 * main transcript is harvested (its subagents live in a subdir not in that run). Keying by agentId too
 * keeps each scope independent: a scope is reconciled ONLY when its own source rode this run.
 */
function rewindScope(session: string, agentId: string | null): string {
  return `${session || "?"} ${agentId ?? ""}`;
}

/**
 * Read the append-only index into scope → the set of turn-keys it holds — the prior-run snapshot the
 * rewind detector diffs against the live transcript. Scoped by (session + agentId) so a partial
 * harvest never reads a turn from an un-harvested scope (a different session OR a subagent absent from
 * this run) as gone.
 */
function loadIndexByScope(path: string): Map<string, Set<string>> {
  const byScope = new Map<string, Set<string>>();
  if (!existsSync(path)) return byScope;
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line) as { turn?: unknown; session?: unknown; agentId?: unknown };
        if (typeof r.turn !== "string" || !r.turn) continue;
        const session = typeof r.session === "string" ? r.session : "";
        const agentId = typeof r.agentId === "string" ? r.agentId : null;
        const scope = rewindScope(session, agentId);
        let s = byScope.get(scope);
        if (!s) { s = new Set<string>(); byScope.set(scope, s); }
        s.add(r.turn);
      } catch { /* skip torn line */ }
    }
  } catch { /* fall through */ }
  return byScope;
}

/** All `.jsonl` under a dir (recursive — subagent `agent-*.jsonl` live in subdirs). */
function listTranscripts(target: string, depth = 0): string[] {
  try {
    const st = statSync(target);
    if (st.isFile()) return target.endsWith(".jsonl") ? [target] : [];
    if (st.isDirectory() && depth < 6) {
      const out: string[] = [];
      for (const e of readdirSync(target, { withFileTypes: true })) {
        const full = join(target, e.name);
        if (e.isDirectory()) out.push(...listTranscripts(full, depth + 1));
        else if (e.name.endsWith(".jsonl")) out.push(full);
      }
      return out;
    }
  } catch { /* fall through */ }
  return [];
}

// --- tensegrity writeback (the @daemon memory-shore) -----------------------
// Read mempalace drawer content, harvest it with the sovereign parser, and write
// our domain metadata (the tension) back ONTO the drawer (the compression strut).

// Venv-aware + cross-platform: prefers $VIRTUAL_ENV / ~/.venv (where mempalace +
// chromadb live), else python3/python/py. NEVER a machine-specific hardcode.
const PY = resolvePython() ?? "python3";
// The writeback core (buildPatch + writebackWing + lar_hv) lives ONCE in
// @lararium/mempalace/telemetry-writeback (the lar-telemetry shared core) — both
// this CLI leg and the @daemon `lar-telemetry` verb call it. No local copy here.

function runWriteback(args: ParsedArgs, wing: string): number {
  const drawerIo = resolveDrawerIo();
  if (!existsSync(drawerIo)) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${drawerIo}` };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest: ${error.message}`) });
    return 3;
  }
  const limit = args.options["limit"] ? Number(args.options["limit"]) : 0;
  const r = writebackWing(wing, limit ? { limit } : {});
  emit(args, {
    ok: true,
    data: { wing, ...r, mode: "writeback" },
    human: () => {
      console.log(`lares harvest --writeback → ${wing}`);
      console.log(`  drawers harvested: ${r.drawers}  (${r.framed} framed)`);
      console.log(`  metadata written:  ${r.applied}`);
      console.log(`  bands:             canon ${r.bands["canon"]} · synthesis ${r.bands["synthesis"]} · provisional ${r.bands["provisional"]} · raw ${r.bands["raw"]}`);
    },
  });
  return 0;
}

// --- `lares harvest --all` — the backfill feeder over EVERY project ---------
// Discover every ~/.claude/projects/<proj>, derive its per-project wing (from a
// transcript's own cwd, matching the live hook), then run BOTH legs idempotently:
// drawer mine (mempalace convos) + lar_* declared writeback. Staged into a STABLE
// per-wing dir so mempalace's source_file dedup holds across runs.

const MP_EXE = process.platform === "win32" ? "mempalace.exe" : "mempalace";
const MP = existsSync(join(homedir(), ".local", "bin", MP_EXE))
  ? join(homedir(), ".local", "bin", MP_EXE)
  : "mempalace";

/** Run a DIRECT mempalace `mine` (fresh process — clean chroma/HNSW/embedder state), RETRYING on
 *  the palace-lock busy signal via the SHARED helper (exponential backoff + full jitter). */
function mineDirect(args: readonly string[]): string {
  return mineWithRetry(() => execFileSync(MP, [...args], { maxBuffer: 1 << 30, encoding: "utf8" }));
}

// --- the HNSW repair tail (idempotent, divergence-gated, fail-soft) ---------
// After mining, the vector index can drift from sqlite (mempalace #1222). This tail reads the
// (pure-sqlite, ~100ms) `repair-status`, and ONLY when the drawers index is DIVERGED does it quiesce
// the palace holders + rebuild from sqlite. Aligned → SKIP (idempotent). A repair failure NEVER fails
// the harvest. The orchestration core lives in @lararium/mempalace (unit-tested); here we wire the
// real commands. The MCP's stale handle re-opens out-of-band (harness respawn + mempalace_reconnect).

/** Wire the real mempalace commands into the divergence-gated rebuild core. */
function runHnswRepairTail(): Promise<HnswRepairResult> {
  const palace = resolvePalacePath();
  // The resource (FD-based) quiesce — NEVER `pkill -f <pattern>` (it self-matches the caller's own
  // command line). `fuser` lists the PIDs holding the palace; `xargs -r` no-ops when none do.
  const palaceMount = dirname(palace); // ~/.mempalace (honors MEMPALACE_PALACE_PATH overrides too)
  return repairHnswIfDiverged({
    checkStatus: async () =>
      execFileSync(MP, ["--palace", palace, "repair-status"], { maxBuffer: 1 << 28, encoding: "utf8" }),
    quiesce: async () => {
      try {
        execSync(`fuser ${JSON.stringify(palaceMount)} 2>/dev/null | xargs -r kill -TERM`, { stdio: "ignore" });
      } catch { /* no holders (or fuser absent) — nothing to drop */ }
    },
    repair: async () => {
      execFileSync(MP, ["--palace", palace, "repair", "--mode", "from-sqlite", "--archive-existing", "--yes"], {
        maxBuffer: 1 << 28,
        encoding: "utf8",
      });
    },
  });
}

/** Render the repair-tail outcome as one TTY line (the JSON rides in the command's `data`). */
function hnswRepairLine(r: HnswRepairResult): string {
  switch (r.action) {
    case "skip":         return `  hnsw index:   in sync${r.divergence !== null ? ` (divergence ${r.divergence})` : ""}`;
    case "repaired":     return `  hnsw index:   REBUILT (was diverged ${r.divergence ?? "?"} → now ${r.afterDivergence ?? "?"})`;
    case "repair-failed":return `  hnsw index:   repair FAILED (diverged ${r.divergence ?? "?"}) — harvest ok · ${r.note ?? ""}`;
    case "check-failed": return `  hnsw index:   status unreadable — skipped · ${r.note ?? ""}`;
  }
}

/** Recover the real cwd a transcript ran in (rows carry it), to derive a stable wing. */
function readCwdFromTranscript(jsonl: string): string | null {
  try {
    const lines = readFileSync(jsonl, "utf8").split("\n");
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const l = lines[i];
      if (!l || !l.trim()) continue;
      try {
        const r = JSON.parse(l) as Record<string, unknown>;
        if (typeof r["cwd"] === "string" && r["cwd"]) return r["cwd"];
      } catch { /* skip torn line */ }
    }
  } catch { /* fall through */ }
  return null;
}

const COPILOT_NORM = join(larRoot(), "packages", "lararium-mempalace", "scripts", "copilot_normalize.py");
// New copilot format: the conversation moved from per-session events.jsonl (gone in
// CLI 1.0.6x) to a global SQLite store ~/.copilot/session-store.db. This exporter
// reads it → per-session Claude-shaped jsonl (Scrivener, 2026-06-25).
const COPILOT_SQLITE_NORM = join(larRoot(), "packages", "lararium-mempalace", "scripts", "copilot_sqlite_normalize.py");

/** One discovered transcript: where it is, which wing it routes to, and whether it needs normalizing. */
interface HarvestEntry {
  readonly file: string;
  readonly wing: string;
  readonly normalize: boolean; // true → copilot events.jsonl → run copilot_normalize.py
  readonly stageName: string;  // stable filename in the per-wing stage dir
  readonly source: string;     // claude | codex | copilot-vscode | copilot-cli
}

/** Recursively collect `.jsonl` files under a root whose basename passes `match`. */
function walkJsonl(root: string, match: (name: string) => boolean, depth = 0, out: string[] = []): string[] {
  if (depth > 8 || !existsSync(root)) return out;
  let ents;
  try { ents = readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const full = join(root, e.name);
    if (e.isDirectory()) walkJsonl(full, match, depth + 1, out);
    else if (e.name.endsWith(".jsonl") && match(e.name)) out.push(full);
  }
  return out;
}

/** Codex rollout cwd lives in the first `session_meta` line's payload. */
function readCodexCwd(file: string): string | null {
  try {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const l = lines[i];
      if (!l || !l.trim()) continue;
      try {
        const r = JSON.parse(l) as { type?: string; payload?: { cwd?: string } };
        if (r.type === "session_meta" && r.payload?.cwd) return r.payload.cwd;
      } catch { /* skip */ }
    }
  } catch { /* fall through */ }
  return null;
}

/** Copilot transcripts carry no cwd — scrape the most-frequent `<home>/<project>` from tool-call paths. */
function scrapeWing(file: string): string | null {
  let content: string;
  try { content = readFileSync(file, "utf8"); } catch { return null; }
  const home = homedir().replace(/\\/g, "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${home}/([A-Za-z0-9][A-Za-z0-9._-]*)`, "g");
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const seg = m[1];
    if (!seg || seg.startsWith(".")) continue; // skip ~/.config, ~/.vscode-server, dotfiles
    counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }
  let best: string | null = null, bestN = 0;
  for (const [seg, n] of counts) if (n > bestN) { best = seg; bestN = n; }
  return best ? `wing_${best.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}` : null;
}

function discoverClaude(): HarvestEntry[] {
  const root = join(homedir(), ".claude", "projects");
  const out: HarvestEntry[] = [];
  if (!existsSync(root)) return out;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = join(root, ent.name);
    const jsonls = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => join(dir, f));
    const first = jsonls[0];
    if (first === undefined) continue;
    const cwd = readCwdFromTranscript(first);
    const wing = cwd ? wingFromDir(cwd) : `wing_${ent.name.replace(/^-+/, "").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase() || "unsorted"}`;
    for (const j of jsonls) out.push({ file: j, wing, normalize: false, stageName: basename(j), source: "claude" });
  }
  return out;
}

function discoverCodex(): HarvestEntry[] {
  // ~/.codex/sessions covers BOTH the Codex CLI and the VS Code ChatGPT extension
  // (originator:codex_vscode) — same store. mempalace parses rollouts natively.
  const out: HarvestEntry[] = [];
  for (const f of walkJsonl(join(homedir(), ".codex", "sessions"), (n) => n.startsWith("rollout-"))) {
    const cwd = readCodexCwd(f);
    out.push({ file: f, wing: cwd ? wingFromDir(cwd) : "wing_codex_unsorted", normalize: false, stageName: basename(f), source: "codex" });
  }
  return out;
}

function discoverCopilotVscode(): HarvestEntry[] {
  const home = homedir();
  const wsRoots = [
    join(home, ".vscode-server", "data", "User", "workspaceStorage"),
    join(home, ".vscode-server-insiders", "data", "User", "workspaceStorage"),
    join(home, ".config", "Code", "User", "workspaceStorage"),
    join(home, ".config", "Code - Insiders", "User", "workspaceStorage"),
    ...(process.platform === "win32" && process.env["APPDATA"]
      ? [join(process.env["APPDATA"], "Code", "User", "workspaceStorage"), join(process.env["APPDATA"], "Code - Insiders", "User", "workspaceStorage")]
      : []),
  ];
  const out: HarvestEntry[] = [];
  for (const ws of wsRoots) {
    if (!existsSync(ws)) continue;
    for (const hash of readdirSync(ws, { withFileTypes: true })) {
      if (!hash.isDirectory()) continue;
      const tdir = join(ws, hash.name, "GitHub.copilot-chat", "transcripts");
      if (!existsSync(tdir)) continue;
      for (const n of readdirSync(tdir).filter((f) => f.endsWith(".jsonl"))) {
        const f = join(tdir, n);
        out.push({ file: f, wing: scrapeWing(f) ?? "wing_copilot_unsorted", normalize: true, stageName: n, source: "copilot-vscode" });
      }
    }
  }
  return out;
}

function discoverCopilotCli(): HarvestEntry[] {
  const out: HarvestEntry[] = [];
  // New format (CLI 1.0.6x): one global SQLite store. Export each session to a
  // Claude-shaped jsonl via the python helper (python owns the sqlite read);
  // wing routing comes from sessions.cwd — no path-scraping. The exported jsonl
  // is already Claude-shaped, so normalize:false (no second pass).
  const db = join(homedir(), ".copilot", "session-store.db");
  if (existsSync(db)) {
    const exportDir = join(larHarvestStageDir(), ".copilot-export");
    try {
      mkdirSync(exportDir, { recursive: true });
      const manifest = execFileSync(PY, [COPILOT_SQLITE_NORM, db, exportDir], { maxBuffer: 1 << 30, encoding: "utf8" });
      for (const line of manifest.split("\n").filter(Boolean)) {
        let m: { id: string; cwd?: string; path: string };
        try { m = JSON.parse(line) as { id: string; cwd?: string; path: string }; } catch { continue; }
        if (!m.path) continue;
        out.push({ file: m.path, wing: m.cwd ? wingFromDir(m.cwd) : "wing_copilot_unsorted", normalize: false, stageName: `${m.id}.jsonl`, source: "copilot-cli" });
      }
      return out; // db is canonical — skip the legacy walk
    } catch { /* fall through to legacy events.jsonl */ }
  }
  // Legacy fallback: older installs still write per-session events.jsonl.
  const root = join(homedir(), ".copilot", "session-state");
  if (!existsSync(root)) return out;
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = join(root, d.name, "events.jsonl");
    if (!existsSync(f)) continue;
    out.push({ file: f, wing: scrapeWing(f) ?? "wing_copilot_unsorted", normalize: true, stageName: `${d.name}.jsonl`, source: "copilot-cli" });
  }
  return out;
}

interface WingHarvest {
  readonly wing: string;
  readonly transcripts: number;
  readonly sources: string;
  readonly mined: number | string;
  /** Claude sessions whose tasked-spirit transcripts got swept (→ `<wing>__spirits`). */
  readonly spiritSessions?: number;
  /** The last spirit-sweep failure, when one surfaced (the sweep runs per-session, best-effort). */
  readonly spiritSweep?: string;
  /** The flow-control step this wing's completion cost fed the pacer (absent on the last wing). */
  readonly pacing?: PacerStep;
}

// --- FLOW CONTROL: the bulk feeder pacer (harvest-pacer.ts) -----------------
// The sink's own lived cost paces the source: each wing-batch's completion cost (inflated by
// the capture WAL's live depth — sink pressure) servos the inter-batch delay; the FFZ
// incommensurable floor keeps bulk from phase-locking with the live turn-Stop capture.

/**
 * READ-ONLY depth of the @daemon capture WAL (`<larDataDir>/capture-nalu/wal.ndjson`) — the
 * count of write-ahead-logged records since the engine's last fully-drained compact. HONEST
 * BOUND: the WAL is append-only until `compactIfDrained` truncates it, so this reads an UPPER
 * bound on the live hot-pool depth — over-reporting only widens the feeder window (the
 * conservative direction for a cost signal). No engine edit: the file IS the engine's own
 * durable depth surface.
 */
function readCaptureWalDepth(): number {
  try {
    const body = readFileSync(join(larDataDir(), "capture-nalu", "wal.ndjson"), "utf8");
    let n = 0;
    for (const line of body.split("\n")) if (line.trim()) n += 1;
    return n;
  } catch {
    return 0; // no WAL (daemon never captured / already compacted) — no pressure
  }
}

/** Async hold between wing-batches (the pacer's delay — never a wall-clock config). */
function holdMs(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, Math.max(0, Math.round(ms))));
}

async function runHarvestAll(args: ParsedArgs): Promise<number> {
  const dryRun = args.flags["dry-run"] === true;
  if (!existsSync(resolveDrawerIo())) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${resolveDrawerIo()}` };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest --all: ${error.message}`) });
    return 3;
  }
  // Front-run the palace organs — mining into an ABSENT/stray palace lands a config-less
  // store with hooks.auto_save unpinned (the mega-wing re-pollution gate). When any organ's
  // health probe fails, stand the WHOLE registry first (the SAME list `lares wake --init`
  // stands; idempotent — present organs skip). FAIL LOUD when the verbatim palace still
  // won't stand: mining into a config-less store re-poisons the palace.
  let organSteps: PalaceSetupStep[] | null = null;
  if (!dryRun && palaceOrgans().some((o) => !organHealthy(o))) {
    organSteps = setupPalaceOrgans();
    const verbatim = palaceOrgans().find((o) => o.name === "mempalace");
    if (verbatim && !organHealthy(verbatim)) {
      const tail = organSteps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.detail}`).join(" · ");
      const error: LaresError = {
        code: "error",
        message: `palace organs failed to stand — refusing to mine into a config-less store${tail ? ` (${tail})` : ""}`,
        hint: "run `lares wake --init` and inspect its ledger, then re-run `lares harvest --all`",
      };
      emit(args, { ok: false, error, human: () => console.error(`lares harvest --all: ${error.message}`) });
      return 1;
    }
  }
  // EVERY transcript surface — but transcripts ONLY (never curated MD / memory-tool notes).
  const entries = [...discoverClaude(), ...discoverCodex(), ...discoverCopilotVscode(), ...discoverCopilotCli()];
  if (entries.length === 0) {
    const error: LaresError = { code: "not-found", message: "no transcripts found (claude/codex/copilot)" };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest --all: ${error.message}`) });
    return 3;
  }

  const stageRoot = larHarvestStageDir();
  const byWing = new Map<string, HarvestEntry[]>();
  for (const e of entries) {
    const arr = byWing.get(e.wing);
    if (arr) arr.push(e); else byWing.set(e.wing, [e]);
  }

  // The FLOW-CONTROL pacer: per-run seed (the secret phase — pid+time, never shared), WAL-depth
  // pressure seam wired to the daemon's own durable log. Self-clocking — no wall-clock config.
  const pacer = makeHarvestPacer({
    seedHex: process.pid.toString(16) + Date.now().toString(16),
    readDepth: readCaptureWalDepth,
  });
  let wingIndex = 0;

  const results: WingHarvest[] = [];
  for (const [wing, es] of byWing) {
    const sources = [...new Set(es.map((e) => e.source))].sort().join("+");
    if (dryRun) {
      results.push({ wing, transcripts: es.length, sources, mined: "dry-run" });
      continue;
    }
    const batchT0 = Date.now();
    // stage into a stable per-wing dir (normalize copilot, hardlink the rest) so
    // mempalace's source_file dedup keeps the mine idempotent across runs.
    const stage = join(stageRoot, wing);
    mkdirSync(stage, { recursive: true });
    for (const e of es) {
      // surface-prefixed so the drawer's source_file → lar_surface in the writeback
      const dst = join(stage, `${e.source}__${e.stageName}`);
      if (existsSync(dst)) continue;
      if (e.normalize) {
        try { writeFileSync(dst, execFileSync(PY, [COPILOT_NORM, e.file], { maxBuffer: 1 << 30, encoding: "utf8" })); } catch { /* skip */ }
      } else {
        try { linkSync(e.file, dst); } catch { try { copyFileSync(e.file, dst); } catch { /* skip */ } }
      }
    }
    let mined: number | string;
    try {
      // CANON (the worker-routing now built): route the harvest THROUGH the @daemon — cmdCapture submits
      // each turn via the capture verb → the @daemon's capture cap → in-VM annotate (lar_* + AST) →
      // flush → mempalace verbatim + .astpalace AST + the deterministic hash-bindings (lar_ast_hash ·
      // lar_verbatim_sha). Born-annotated, single-write through the nalu gates. (cmdCapture self-falls-
      // back to a DIRECT verbatim mine if the @daemon is down — the verbatim drawer is never lost.)
      const rc = await cmdCapture({ command: "capture", positional: [stage], options: { wing }, flags: {} });
      mined = rc === 0 ? "routed→@daemon" : `capture-rc-${rc}`;
    } catch (e) {
      mined = "capture-failed: " + String((e as Error).message ?? "").trim().slice(0, 160);
    }
    // SPIRIT SWEEP (the --all spirits leg): every Claude session's tasked-spirit transcripts
    // ride the SAME road the Stop hook takes — cmdSubagents routes each spirit turn through
    // the @daemon capture verb (daemon-first; the direct ndjson mine only as the daemon-down
    // verbatim-always fallback), into `<wing>__spirits` beside the project wing (the project-
    // wing law flows through). Idempotent: the per-spirits-wing capture watermark skips turns
    // already submitted, so re-runs cost one listSpiritFiles stat per session. The sweep reads
    // the ORIGINAL transcript path (spirits live at `<session>/subagents/`, never staged).
    let spiritSessions = 0;
    let spiritSweep: string | undefined;
    for (const e of es) {
      if (e.source !== "claude" || listSpiritFiles(e.file).length === 0) continue;
      try {
        const rc = await cmdSubagents({ command: "subagents", positional: [e.file], options: { wing }, flags: {} });
        if (rc === 0) spiritSessions += 1;
        else spiritSweep = `subagents-rc-${rc}`;
      } catch (err) {
        spiritSweep = "subagents-failed: " + String((err as Error).message ?? "").trim().slice(0, 120);
      }
    }
    // FLOW CONTROL (cuts 1/3/4): this batch's completion cost — inflated by the sink's live
    // WAL depth — servos the delay held BEFORE the next wing; the FFZ incommensurable floor
    // keeps the cadence from phase-locking with live capture. The last wing holds no delay.
    wingIndex += 1;
    let pacing: PacerStep | undefined;
    if (wingIndex < byWing.size) {
      pacing = pacer.next(Date.now() - batchT0);
      await holdMs(pacing.delayMs);
    }
    results.push({
      wing, transcripts: es.length, sources, mined,
      ...(spiritSessions ? { spiritSessions } : {}),
      ...(spiritSweep ? { spiritSweep } : {}),
      ...(pacing ? { pacing } : {}),
    });
  }

  results.sort((a, b) => b.transcripts - a.transcripts);
  // The repair tail — divergence-gated + idempotent (skips on dry-run; a no-op when the index is in sync).
  const hnsw = dryRun ? null : await runHnswRepairTail();
  emit(args, {
    ok: true,
    data: { wings: results, dryRun, mode: "all", routedThrough: "@daemon", ...(pacer.trajectory().length ? { flowControl: pacer.trajectory() } : {}), ...(organSteps ? { organsFrontRun: organSteps } : {}), ...(hnsw ? { hnswRepair: hnsw } : {}) },
    human: () => {
      console.log(`lares harvest --all${dryRun ? "  (dry run)" : ""}  — ${results.length} wing(s), ${entries.length} transcripts → @daemon`);
      if (organSteps) {
        const ran = organSteps.filter((s) => s.ran).length;
        console.log(`  organs front-run: stood ${ran} step(s) before mining (registry probe found absent organs)`);
      }
      for (const r of results)
        console.log(`  ${r.wing.padEnd(34)} ${String(r.transcripts).padStart(4)} [${r.sources}] · ${r.mined}${r.spiritSessions ? ` · spirits: ${r.spiritSessions} session(s) → __spirits` : ""}${r.spiritSweep ? ` · spirit-sweep: ${r.spiritSweep}` : ""}`);
      console.log(`  routed through the @daemon nalu — verbatim → mempalace · AST → .astpalace · hash-bound`);
      const flow = pacer.trajectory();
      if (flow.length) {
        // The servo's window trajectory — the live-light witness line (cuts 1/3/4).
        const track = flow.map((s) => `${s.windowMs}→${s.delayMs}ms${s.depth ? `(wal ${s.depth})` : ""}`).join(" · ");
        console.log(`  flow control:  servo window→delay per batch: ${track}`);
      }
      if (hnsw) console.log(hnswRepairLine(hnsw));
    },
  });
  return 0;
}

export async function cmdHarvest(args: ParsedArgs): Promise<number> {
  // --all: the backfill feeder — discover EVERY project, mine + writeback each. Idempotent.
  if (args.flags["all"] === true) return runHarvestAll(args);

  // --writeback: operate on mempalace DRAWERS (the tensegrity shore), not JSONL.
  if (args.flags["writeback"] === true) {
    const wing = args.options["wing"] ?? wingFromDir(larRoot());
    return runWriteback(args, wing);
  }

  // Target: explicit positional path, else the project's Claude transcript dir.
  const target =
    args.positional[0] ??
    join(homedir(), ".claude", "projects", "-" + larRoot().replace(/[/_]/g, "-").replace(/^-/, ""));
  const wing = args.options["wing"] ?? wingFromDir(larRoot());
  const dryRun = args.flags["dry-run"] === true;

  const files = listTranscripts(target);
  if (files.length === 0) {
    const error: LaresError = {
      code: "not-found",
      message: `no .jsonl transcripts at ${target}`,
      hint: "pass a transcript file or dir: lares harvest <path> --wing <wing>",
    };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest: ${error.message}\n  ${error.hint}`) });
    return 3;
  }

  mkdirSync(HARVEST_DIR, { recursive: true });
  const indexPath = join(HARVEST_DIR, `${wing}.ndjson`);
  const statePath = join(HARVEST_DIR, `${wing}.state.json`);
  const state = loadState(statePath);
  const nextState: Record<string, string> = { ...state };
  // The durable de-dup floor: the index already on disk. A crash between the per-turn append and
  // the end-of-run state write would otherwise re-append a record for a turn the index already
  // holds; consulting the index closes that gap (the watermark is the fast path, the index the floor).
  const indexHashes = loadIndexHashes(indexPath);

  const summary: RunSummary = {
    wing, files: files.length, turns: 0, harvested: 0, skipped: 0,
    framed: 0, raw: 0, sidechain: 0,
    bands: { canon: 0, synthesis: 0, provisional: 0, raw: 0 }, indexPath,
  };

  // The records this run saw, per scope (session + agentId), keyed for the CURRENT-BRANCH rewind
  // reconstruction. A flat "every record" snapshot misses every rewind — the fork-family orphans the
  // rewound tail in-file, so it stays physically present. liveKeysForRewind (below) walks parentUuid to
  // the live leaf and drops the genuine rewind-orphans, so the tail reads gone. Collected here, folded
  // into currentByScope after the loop.
  const recordsByScope = new Map<string, KeyedBranchNode[]>();
  for (const file of files) {
    for (const turn of readTurns(file)) {
      summary.turns += 1;
      const key = turnKeyOf(file, turn);
      const hash = sha(turn.text);
      const scope = rewindScope(turn.session, turn.agentId);
      let recs = recordsByScope.get(scope);
      if (!recs) { recs = []; recordsByScope.set(scope, recs); }
      recs.push({ uuid: turn.uuid, parentUuid: turn.parentUuid, isSidechain: turn.sidechain, type: turn.role, key });
      // Skip if the watermark OR the durable index already carries this turn at this content hash.
      if (state[key] === hash || indexHashes.get(key) === hash) { summary.skipped += 1; continue; }

      const h = harvestTurnGradient(turn.text);
      summary.harvested += 1;
      if (h.bearing) summary.framed += 1;
      if (h.recordRaw) summary.raw += 1;
      if (turn.sidechain) summary.sidechain += 1;
      summary.bands[h.band] = (summary.bands[h.band] ?? 0) + 1;

      const rec: HarvestRecord = {
        ts: turn.ts, wing, session: turn.session, turn: key, role: turn.role,
        agentId: turn.agentId, sidechain: turn.sidechain, parentUuid: turn.parentUuid,
        confidence: h.confidence, band: h.band, recordRaw: h.recordRaw,
        aim: h.bearing?.aimUri ?? null, yieldUri: h.bearing?.yieldUri ?? null,
        voices: h.voices.map((v) => (v.role ? `${v.name} (${v.role})` : v.name)),
        confidences: h.confidences.map((c) => ({ register: c.register, value: c.value })),
        sigilCount: h.sigilCount, waterCount: h.waterCount, driftFlags: [...h.driftFlags], hash,
      };
      if (!dryRun) { appendFileSync(indexPath, JSON.stringify(rec) + "\n"); indexHashes.set(key, hash); }
      nextState[key] = hash;
    }
  }

  if (!dryRun) {
    try { atomicWriteFileSync(statePath, JSON.stringify(nextState)); } catch { /* best effort */ }
  }

  // Fold each scope's records to its CURRENT-BRANCH live keys (orphans + sidechains excluded), the
  // snapshot the rewind diff reads. The prior index minus these live keys = the rewound tail.
  const currentByScope = new Map<string, Set<string>>();
  for (const [scope, recs] of recordsByScope) currentByScope.set(scope, liveKeysForRewind(recs));

  // REWIND DETECTION (kapae) — the index is append-only with no gone-turn reconciliation. For each
  // session present in THIS run, a turn the index still holds but the live transcript no longer carries
  // is a rewind: set aside (close) its worldline edges keyed to that turn-uuid, never erase. Scoped
  // per-session (a turn from an un-harvested session never reads as gone). Best-effort: the KG is a
  // re-derivable projection, so an absent KG / fault never sinks the harvest.
  let kapae: { goneTurns: number; closed: number; astpalace: number } | null = null;
  if (!dryRun) {
    const indexByScope = loadIndexByScope(indexPath);
    const gone: string[] = [];
    for (const [scope, live] of currentByScope) {
      const prev = indexByScope.get(scope);
      if (prev) gone.push(...detectGoneTurns(prev, live));
    }
    if (gone.length > 0) {
      // ONE gone turn-uuid → the THREE convergence effects. Leg 1 (KG valid-close) fires CLI-side
      // (the KG has no holder). Legs 2+3 (.astpalace tally set-aside + the Measure salience
      // down-weight) fire through the @daemon's `astpalace-kapae` verb — the daemon owns the warm
      // .astpalace serve holder (a flock-singleton the CLI cannot re-open), and does BOTH in the
      // worker. Every leg is best-effort: a down KG / down daemon leaves the rewind unreconciled
      // this run (re-derivable on the next harvest), never fatal.
      let closed = 0;
      try {
        for (const turnKey of gone) closed += kapaeTurn(turnKey).closed;
      } catch (err) {
        const why = err instanceof KgUnavailable ? "KG unavailable" : err instanceof Error ? err.message : String(err);
        if (process.env["LARES_DEBUG"]) console.warn(`[harvest] KG kapae best-effort skipped: ${why}`);
      }
      // Legs 2+3 — route each gone turn's rewind to the @daemon's warm holder (fire-and-forget).
      let did = "";
      try { did = await operatorDid(); } catch { /* un-gated verb; runVerb still reaches the daemon */ }
      let astpalace = 0;
      const fired = await Promise.allSettled(
        gone.map((turnKey) => runVerb("astpalace-kapae", { turnKey }, did, { timeoutMs: 5000 })),
      );
      for (const r of fired) if (r.status === "fulfilled" && r.value.status === "done") astpalace += 1;
      if (astpalace === 0 && process.env["LARES_DEBUG"]) {
        console.warn(`[harvest] astpalace-kapae best-effort skipped (daemon down?) — ${gone.length} gone turn(s) unreconciled this run`);
      }
      kapae = { goneTurns: gone.length, closed, astpalace };
    }
  }

  // The repair tail — divergence-gated + idempotent (a no-op when the index is in sync).
  const hnsw = dryRun ? null : await runHnswRepairTail();
  emit(args, {
    ok: true,
    data: { ...summary, dryRun, ...(hnsw ? { hnswRepair: hnsw } : {}), ...(kapae ? { kapae } : {}) },
    human: () => {
      console.log(`lares harvest → ${wing}${dryRun ? "  (dry run)" : ""}`);
      console.log(`  transcripts:  ${summary.files}`);
      console.log(`  turns seen:   ${summary.turns}  (${summary.skipped} already harvested, skipped)`);
      console.log(`  harvested:    ${summary.harvested}  (${summary.framed} framed · ${summary.raw} raw · ${summary.sidechain} sidechain)`);
      console.log(`  bands:        canon ${summary.bands["canon"]} · synthesis ${summary.bands["synthesis"]} · provisional ${summary.bands["provisional"]} · raw ${summary.bands["raw"]}`);
      if (!dryRun) console.log(`  index:        ${indexPath}`);
      if (kapae) console.log(`  rewind:       ${kapae.goneTurns} gone turn(s) → ${kapae.closed} worldline edge(s) + ${kapae.astpalace} astpalace tally(ies) set aside (kapae)`);
      if (hnsw) console.log(hnswRepairLine(hnsw));
    },
  });
  return 0;
}

/**
 * `lares capture <transcript|stageDir> --wing <wing>` — the FEED producer for the telemetry nalu.
 *
 * The DRAWER leg of the ingest, routed THROUGH the @daemon (the operator's `{chat}→@daemon-nalu→
 * mempalace` arrow): read NEW turns (readTurns, the same extractor the gradient harvest uses — no
 * divergence), submit each via the `capture` verb → the @daemon's capture cap → WAL → flush
 * `mine --source ndjson` → mempalace. Idempotent via a per-wing capture watermark (Stop fires per
 * response; only unseen turns submit).
 *
 * GRACEFUL FALLBACK (verbatim-always): the daemon down/unreachable → mine the target DIRECT (the
 * proven `mine --extract exchange` path), so the verbatim drawer never gets lost; mark the turns
 * captured so the nalu won't double on the next run. Distinct from `lares telemetry` (the lar_*
 * writeback leg), which already routes through the daemon with its own fallback.
 */
export async function cmdCapture(args: ParsedArgs): Promise<number> {
  const target = args.positional[0] ?? "";
  const wing   = typeof args.options["wing"] === "string" ? args.options["wing"] : "";
  if (!target || !wing) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: "usage: lares capture <transcript|stageDir> --wing <wing>" },
      human: () => console.error("usage: lares capture <transcript|stageDir> --wing <wing>"),
    });
    return 2;
  }

  // Collect .jsonl (a dir → its jsonl children; a file → itself).
  let files: string[] = [];
  try {
    const st = statSync(target);
    files = st.isDirectory()
      ? readdirSync(target).filter((f) => f.endsWith(".jsonl")).map((f) => join(target, f))
      : [target];
  } catch { files = []; }
  if (!files.length) {
    emit(args, { ok: true, data: { wing, submitted: 0 }, human: () => console.log(`[capture] no .jsonl under ${target}`) });
    return 0;
  }

  let did = "";
  try { did = await operatorDid(); } catch { /* no key — the capture verb is un-gated; runVerb still reaches the daemon */ }

  mkdirSync(HARVEST_DIR, { recursive: true });
  const statePath = join(HARVEST_DIR, `${wing}.capture-state.json`);
  const state = loadState(statePath);
  const next: Record<string, string> = { ...state };

  // Collect the CURRENT BATCH — every not-yet-captured exchange, each carrying its stable
  // transcript ordinal (the ndjson chunk_index half of the deterministic drawer id,
  // `sha256(source_file)_chunk`). BOTH legs below submit these same records under the same
  // source_file + ordinal, so verb + fallback converge on ONE drawer per turn (the sink-side
  // dedup + deterministic id make resubmission idempotent).
  interface PendingTurn {
    readonly key: string; readonly hash: string; readonly text: string;
    readonly src: string; readonly chunk: number; readonly frontier?: readonly string[];
  }
  const pending: PendingTurn[] = [];
  for (const file of files) {
    // PREFIX the wing onto the source_file (`<wing>/<surface>__<run>.jsonl`): the @daemon capture path
    // carries no `--wing`, so the node wing-stamp flush decodes this prefix into `metadata.wing` —
    // otherwise every captured turn lands in the `?` wing. buildPatch reads the basename, so surface/
    // handle derivation is unaffected.
    const src = `${wing}/${basename(file)}`;
    // The full turn-DAG of THIS transcript (every user/assistant message), for the branch-frontier:
    // a same-session FORK (a turn with ≥2 children in the parentUuid DAG) makes both branches derive
    // the same handle → the worldline collision. branchContextForTurn derives the per-turn frontier so
    // the daemon's buildPatch keys distinct handles. A linear transcript carries no fork ⇒ no frontier.
    const dagNodes: TurnNode[] = readTurns(file).map((t) => ({ uuid: t.uuid, parentUuid: t.parentUuid }));
    let chunk = -1;
    for (const turn of readExchanges(file)) {       // exchange-grain drawer (the ingest canon)
      chunk += 1;                                    // the transcript ordinal — stable across runs
      const key  = turnKeyOf(file, turn);
      const hash = sha(turn.text);
      if (state[key] === hash) continue;            // already captured (idempotent)
      const branch = turn.uuid ? branchContextForTurn(dagNodes, turn.uuid) : undefined;
      const frontier = branch?.frontier;
      const frontierArr = frontier == null ? undefined : Array.isArray(frontier) ? frontier : [frontier];
      pending.push({ key, hash, text: turn.text, src, chunk, ...(frontierArr && frontierArr.length ? { frontier: frontierArr } : {}) });
    }
  }

  // SUBMIT under the SUSPEND LAW: a verb failure never infers "down" for the whole pipeline.
  //   - a failure AFTER any success → SUSPEND the remainder (leave state unmarked; the next run
  //     retries — safe, the sink dedups), never a bulk direct mine + mark-all.
  //   - the daemon reads UNREACHABLE only when the whole run yields zero successes (the first
  //     PROBE calls all fail, or every call fails) → the direct-mine fallback fires, for the
  //     CURRENT batch only (verbatim-always).
  const PROBE = 3;
  let submitted = 0;
  let failures = 0;
  let halted = false;
  for (const p of pending) {
    if (halted) break;
    try {
      const r = await runVerb(
        "capture",
        {
          turnText: p.text, sourceFile: p.src,
          // The USER turn's uuid — the .astpalace provenance key (the kapae key). The SAME formula
          // the rewind detector keys on (turn.uuid || sha(...)), so one gone uuid closes both stores.
          turnKey: p.key,
          // The stable transcript ordinal — the deterministic drawer-id chunk (converges both legs).
          chunkIndex: p.chunk,
          ...(p.frontier ? { frontier: [...p.frontier] } : {}),
        },
        did,
        { timeoutMs: 5000 },
      );
      if (r.status !== "done") throw new Error(`capture status=${r.status}`);
      next[p.key] = p.hash;
      submitted += 1;
    } catch {
      failures += 1;
      // One timeout amid successes = a wobble, not a down daemon: suspend, retry next run.
      // Zero successes across PROBE consecutive failures = unreachable: stop probing, fall back.
      if (submitted > 0 || failures >= PROBE) halted = true;
    }
  }
  const daemonUnreachable = failures > 0 && submitted === 0;
  const suspended = pending.length - submitted;

  if (daemonUnreachable && pending.length > 0) {
    // FALLBACK (verbatim-always): the daemon stayed unreachable across the whole run — direct-mine
    // the CURRENT batch over the SAME road the daemon flush takes (`mine --source ndjson --daemon`),
    // each record under the daemon leg's exact source_file + transcript ordinal, so a later daemon
    // capture upserts the SAME drawer instead of doubling. metadata.wing rides each record (this
    // leg bypasses the node wing-stamp flush; RFC 002 §2.5 — the record's own wing wins).
    let fellBack = false;
    const spoolDir = join(HARVEST_DIR, "capture-stage", wing);
    const spool = join(spoolDir, `fallback-${process.pid}-${Date.now()}.ndjson`);
    try {
      mkdirSync(spoolDir, { recursive: true });
      writeFileSync(
        spool,
        pending.map((p) => JSON.stringify({
          content: p.text, source_file: p.src, chunk_index: p.chunk, metadata: { wing },
        })).join("\n") + "\n",
      );
      // Still retry the palace-lock busy signal (a concurrent backfill or another session's
      // fallback may hold it) — graceful, no lost drawer.
      mineDirect(["--palace", resolvePalacePath(), "mine", "--source", "ndjson", "--daemon", spool]);
      fellBack = true;
      // The direct mine landed these exchanges — mark them so the nalu won't double next run.
      for (const p of pending) next[p.key] = p.hash;
    } catch { /* direct mine failed too — leave state unmarked so the next run retries */ }
    finally { try { rmSync(spool, { force: true }); } catch { /* best effort */ } }
    try { atomicWriteFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
    emit(args, {
      ok: true,
      data: { wing, submitted, suspended: fellBack ? 0 : suspended, fallback: fellBack ? "direct-mine" : "none (mine failed — turns suspended, next run retries)" },
      human: () => console.log(`[capture] daemon unreachable → ${fellBack ? `direct ndjson mine fallback (${pending.length} turn(s))` : `mine FAILED — ${suspended} turn(s) suspended, next run retries`} (wing ${wing})`),
    });
    return 0;
  }

  try { atomicWriteFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
  emit(args, {
    ok: true,
    data: { wing, submitted, ...(suspended > 0 ? { suspended, suspendedReason: "verb failure mid-run — turns left unmarked, next run retries (sink-side dedup guards)" } : {}) },
    human: () => console.log(`[capture] ${submitted} turn(s) → @daemon nalu (wing ${wing})${suspended > 0 ? ` · ${suspended} turn(s) SUSPENDED (verb failure — next run retries)` : ""}`),
  });
  return 0;
}
