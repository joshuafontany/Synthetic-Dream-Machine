/**
 * `lares sense pour` — idempotent, re-runnable session-history harvest.
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
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, writeFileSync, statSync, linkSync, copyFileSync, rmSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { harvestTurnGradient, branchContextForTurn, detectGoneTurns, liveKeysForRewind, type TurnNode, type KeyedBranchNode } from "@lararium/mesh";
import { listSpiritFiles, TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { writebackWing, resolveDrawerIo, kapaeTurn, KgUnavailable, isoWholeSeconds, runFfzEnrich, type FfzEnrichReport } from "@lararium/sensorium";
import { cmdSubagents } from "./subagents.js";
import { resolvePython } from "../integration-check.js";
import { larRoot, larHarvestDir, larHarvestStageDir, operatorDid } from "../env.js";
import { wingFromDir, readCwdFromTranscript } from "../wing-law.js";
import { partitionEphemeral } from "../ephemeral.js";
import { atomicWriteFileSync, palaceOrgans, setupPalaceOrgans, organHealthy, type PalaceSetupStep } from "@lararium/node";
import { runVerb } from "../verb-call.js";
import { emit, exitFor, type LaresError } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const HARVEST_DIR = larHarvestDir();   // <state>/harvest — XDG (strangler retired); LAR_ROOT-isolated for staged instances

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

// wingFromDir / readCwdFromTranscript — the wing law, extracted to ../wing-law.ts so
// `lares wing-of` and the ingest hook read the SAME derivation (imported above).

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
 * The SAME formula MUST drive both legs: the CAPTURE leg (readExchanges → the .structurepalace provenance
 * turn_key) and the BEARING/rewind leg (readTurns → the gone-turn detection → the worldline KG +
 * structurepalace-kapae). Sharing this one helper keeps them in lockstep by construction — a gone uuid
 * closes the KG edge, the structurepalace tally, AND the Measure salience as ONE key (the grain note).
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
  return `${session || "?"}\u0000${agentId ?? ""}`;
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

// ONE VENV — `~/.venv`, verified to import mempalace (resolveMempalacePython). A second interpreter
// carries its own chromadb and its own accelerators, so the machina embeds on the GPU while a script
// beside it falls to CPU and neither says a word. The `?? "python3"` tail only reaches a caller that
// already refuses loudly upstream; it never silently stands in for the venv.
const PY = resolvePython() ?? "python3";
// The writeback core (buildPatch + writebackWing + lar_hv) lives ONCE in
// @lararium/mempalace/telemetry-writeback (the lar-telemetry shared core) — both
// this CLI leg and the @daemon `lar-telemetry` verb call it. No local copy here.

function runWriteback(args: ParsedArgs, wing: string): number {
  const drawerIo = resolveDrawerIo();
  if (!existsSync(drawerIo)) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${drawerIo}` };
    emit(args, { ok: false, error, human: () => console.error(`lares sense pour: ${error.message}`) });
    return 3;
  }
  const limit = args.options["limit"] ? Number(args.options["limit"]) : 0;
  const r = writebackWing(wing, limit ? { limit } : {});
  emit(args, {
    ok: true,
    data: { wing, ...r, mode: "writeback" },
    human: () => {
      console.log(`lares sense pour --writeback → ${wing}`);
      console.log(`  drawers harvested: ${r.drawers}  (${r.framed} framed)`);
      console.log(`  metadata written:  ${r.applied}`);
      console.log(`  bands:             canon ${r.bands["canon"]} · synthesis ${r.bands["synthesis"]} · provisional ${r.bands["provisional"]} · raw ${r.bands["raw"]}`);
    },
  });
  return 0;
}

// --- `lares sense pour --all` — the backfill feeder over EVERY project ---------
// Discover every ~/.claude/projects/<proj>, derive its per-project wing (from a
// transcript's own cwd, matching the live hook), then run BOTH legs idempotently:
// drawer mine (mempalace convos) + lar_* declared writeback. Staged into a STABLE
// per-wing dir so mempalace's source_file dedup holds across runs.

const MP_EXE = process.platform === "win32" ? "mempalace.exe" : "mempalace";
const MP = existsSync(join(homedir(), ".local", "bin", MP_EXE))
  ? join(homedir(), ".local", "bin", MP_EXE)
  : "mempalace";

// --- the HNSW repair tail (idempotent, divergence-gated, fail-soft) ---------
// After mining, the vector index can drift from sqlite (mempalace #1222). This tail reads the
// (pure-sqlite, ~100ms) `repair-status`, and ONLY when the drawers index is DIVERGED does it quiesce
// the palace holders + rebuild from sqlite. Aligned → SKIP (idempotent). A repair failure NEVER fails
// the harvest. The orchestration core lives in @lararium/mempalace (unit-tested); here we wire the
// real commands. The MCP's stale handle re-opens out-of-band (harness respawn + mempalace_reconnect).

// The guest HNSW-repair tail is CUT (it had zero callers and sat armed): it ran
//   `mempalace --palace <guest> repair --mode from-sqlite --archive-existing --yes`
// — a WRITE to ~/.mempalace — plus `fuser ~/.mempalace | xargs kill -TERM`, a SIGTERM against
// whatever held the comparator's mount. The RUN never writes the comparator. All telemetry now
// flows through the @daemon to the SOVEREIGN sensorium, so there is nothing of ours in the guest
// to repair. (The sovereign store's index health rides content_io's own chroma upsert.)


const COPILOT_SQLITE_NORM = join(larRoot(), "packages", "lararium-sensorium", "scripts", "copilot_sqlite_normalize.py");

/** One discovered source stream and its explicit routing identity. */
export interface HarvestEntry {
  readonly file: string;
  readonly wing: string;
  readonly stageName: string;  // display/export name; staging preserves the native basename
  readonly source: string;     // claude | codex | copilot-vscode | copilot-cli
  /** Native Copilot SQLite session selector; absent for file-backed surfaces. */
  readonly sessionId?: string;
  /** Spirit files ride the dedicated `cmdSubagents` route in the sovereign lane. */
  readonly subagent: boolean;
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

export function discoverClaude(): HarvestEntry[] {
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
    for (const j of jsonls) out.push({ file: j, wing, stageName: basename(j), source: "claude", subagent: false });

    // The tasked spirits. Each session keeps its sub-agent transcripts one level DOWN, at
    // `<session-id>/subagents/agent-<id>.jsonl`, so a flat read of the project dir sees none of them.
    // They land in the session's SPIRITS wing — distinct from the parent's, so a spirit's work never
    // blurs into the operator's, and the two populations stay countable apart.
    for (const j of jsonls) {
      const spiritDir = join(j.replace(/\.jsonl$/, ""), "subagents");
      if (!existsSync(spiritDir)) continue;
      for (const f of readdirSync(spiritDir).filter((f) => /^agent-.*\.jsonl$/.test(f))) {
        out.push({
          file: join(spiritDir, f),
          wing: `${wing}__spirits`,
          stageName: `${basename(j, ".jsonl")}__${f}`,   // the parent session keys the spirit's provenance
          source: "claude",
          subagent: true,
        });
      }
    }
  }
  return out;
}

export function discoverCodex(): HarvestEntry[] {
  // ~/.codex/sessions covers BOTH the Codex CLI and the VS Code ChatGPT extension
  // (originator:codex_vscode) — same store. mempalace parses rollouts natively.
  const out: HarvestEntry[] = [];
  for (const f of walkJsonl(join(homedir(), ".codex", "sessions"), (n) => n.startsWith("rollout-"))) {
    const cwd = readCodexCwd(f);
    out.push({ file: f, wing: cwd ? wingFromDir(cwd) : "wing_codex_unsorted", stageName: basename(f), source: "codex", subagent: false });
  }
  return out;
}

export function discoverCopilotVscode(): HarvestEntry[] {
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
        out.push({ file: f, wing: scrapeWing(f) ?? "wing_copilot_unsorted", stageName: n, source: "copilot-vscode", subagent: false });
      }
    }
  }
  return out;
}

export function discoverCopilotCli(): HarvestEntry[] {
  const out: HarvestEntry[] = [];
  // The Copilot CLI keeps its conversations in ONE global SQLite store. List its native session rows;
  // the Python capture cap reads this same database directly, narrowed by `sessionId` when supplied.
  const db = join(homedir(), ".copilot", "session-store.db");
  if (existsSync(db)) {
    try {
      const manifest = execFileSync(PY, [COPILOT_SQLITE_NORM, "--list", db], { maxBuffer: 1 << 30, encoding: "utf8" });
      for (const line of manifest.split("\n").filter(Boolean)) {
        let m: { id: string; cwd?: string };
        try { m = JSON.parse(line) as { id: string; cwd?: string }; } catch { continue; }
        if (!m.id) continue;
        out.push({ file: db, wing: m.cwd ? wingFromDir(m.cwd) : "wing_copilot_unsorted", stageName: m.id, source: "copilot-cli", sessionId: m.id, subagent: false });
      }
    } catch { /* the export failed — report nothing rather than a partial wing */ }
  }
  return out;
}

interface WingHarvest {
  readonly wing: string;
  /** Transcripts that actually STAGED — never the count found. A staging failure is invisible on the
   *  next pass (the file simply is not there), so a count that folds in what it dropped reads as
   *  success over an empty stage. */
  readonly transcripts: number;
  /** Native non-file streams submitted directly to Python (currently Copilot SQLite sessions). */
  readonly nativeSources?: number;
  /** Transcripts that did NOT stage, and why. Surfaced, never swallowed. */
  readonly dropped?: number;
  readonly droppedFiles?: ReadonlyArray<{ file: string; why: string }>;
  readonly sources: string;
  readonly mined: number | string;
  /** Claude sessions whose tasked-spirit transcripts got swept (→ `<wing>__spirits`). */
  readonly spiritSessions?: number;
  /** The last spirit-sweep failure, when one surfaced (the sweep runs per-session, best-effort). */
  readonly spiritSweep?: string;
}

/** A stable source scope preserves the native filename while preventing basename collisions. */
export function stageSourceDir(root: string, entry: Pick<HarvestEntry, "file" | "source">): string {
  const key = createHash("sha256").update(entry.file).digest("hex").slice(0, 16);
  return join(root, entry.source, key);
}

/** One bulk harvest owns the mutable `bulk/` lane. A dead owner is reclaimed; a live one refuses. */
export function acquireHarvestAllLock(): () => void {
  const lockDir = join(dirname(larHarvestStageDir()), "locks");
  const lockPath = join(lockDir, "harvest-all.lock");
  mkdirSync(lockDir, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + "\n", { flag: "wx", mode: 0o600 });
      return () => { try { rmSync(lockPath, { force: true }); } catch { /* release is best-effort */ } };
    } catch (err) {
      if (!(err instanceof Error) || !(err as NodeJS.ErrnoException).code || (err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      let pid = 0;
      try { pid = Number((JSON.parse(readFileSync(lockPath, "utf8")) as { pid?: unknown }).pid) || 0; } catch { /* malformed lock is not proof of ownership */ }
      let alive = pid > 0;
      if (alive) {
        try { process.kill(pid, 0); } catch (probe) { alive = (probe as NodeJS.ErrnoException).code !== "ESRCH"; }
      }
      if (alive) throw new Error(`another \`lares sense pour --all\` owns ${lockPath} (pid ${pid}); wait for it to finish`);
      rmSync(lockPath, { force: true });
    }
  }
  throw new Error(`could not acquire harvest lock ${lockPath}`);
}

async function runHarvestAll(args: ParsedArgs): Promise<number> {
  const dryRun = args.flags["dry-run"] === true;
  // The addressed sensorium root (from `lares sense <sensorium> pour --all`), threaded to every capture leg.
  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : undefined;
  const rootOpt: Record<string, string> = sensoriumRoot ? { "sensorium-root": sensoriumRoot } : {};
  if (!existsSync(resolveDrawerIo())) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${resolveDrawerIo()}` };
    emit(args, { ok: false, error, human: () => console.error(`lares sense pour --all: ${error.message}`) });
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
        hint: "run `lares wake --init` and inspect its ledger, then re-run `lares sense pour --all`",
      };
      emit(args, { ok: false, error, human: () => console.error(`lares sense pour --all: ${error.message}`) });
      return 1;
    }
  }
  // EVERY transcript surface — but transcripts ONLY (never curated MD / memory-tool notes).
  const entries = [...discoverClaude(), ...discoverCodex(), ...discoverCopilotVscode(), ...discoverCopilotCli()];
  if (entries.length === 0) {
    const error: LaresError = { code: "not-found", message: "no transcripts found (claude/codex/copilot)" };
    emit(args, { ok: false, error, human: () => console.error(`lares sense pour --all: ${error.message}`) });
    return 3;
  }

  let releaseHarvestLock: (() => void) | undefined;
  try {
    releaseHarvestLock = acquireHarvestAllLock();
  } catch (err) {
    const error: LaresError = { code: "conflict", message: err instanceof Error ? err.message : String(err), hint: "Let the active bulk harvest finish, then re-run." };
    emit(args, { ok: false, error, human: () => console.error(`lares sense pour --all: ${error.message}`) });
    return 1;
  }
  try {
  // One canonical stage root, three isolated lanes: live hooks use `live/`, this bulk pass uses
  // `bulk/`, and guest Mempalace uses `mempalace/`. A lane boundary—not a filename or a
  // per-run directory—prevents one actor from consuming another actor's batch.
  const stageRoot = join(larHarvestStageDir(), "bulk");
  // Clear only a previous interrupted BULK snapshot. Live and comparator lanes sit beside it and
  // remain untouched; the command lease above prevents a concurrent bulk run from losing its stage.
  if (!dryRun) rmSync(stageRoot, { recursive: true, force: true });
  const byWing = new Map<string, HarvestEntry[]>();
  for (const e of entries.filter((entry) => !entry.subagent)) {
    const arr = byWing.get(e.wing);
    if (arr) arr.push(e); else byWing.set(e.wing, [e]);
  }

  const results: WingHarvest[] = [];
  for (const [wing, es] of byWing) {
    const sources = [...new Set(es.map((e) => e.source))].sort().join("+");
    if (dryRun) {
      const nativeSources = es.filter((entry) => entry.source === "copilot-cli").length;
      results.push({ wing, transcripts: es.length - nativeSources, ...(nativeSources ? { nativeSources } : {}), sources, mined: "dry-run" });
      continue;
    }
    // Stage file-backed sources in a stable per-wing directory. Copilot SQLite
    // sessions bypass staging and stay native until the Python source cap.
    const stage = join(stageRoot, wing);
    mkdirSync(stage, { recursive: true });
    // A transcript that fails to stage is REPORTED, never swallowed. A staging error is silent by
    // nature — the file simply is not there on the next pass — so a count that includes what it
    // dropped reads as success over an empty stage. `staged` counts what actually landed; `dropped`
    // names what did not, with the reason.
    const stagedEntries = es.filter((entry) => entry.source !== "copilot-cli");
    const sqliteEntries = es.filter((entry) => entry.source === "copilot-cli");
    const dropped: Array<{ file: string; why: string }> = [];
    let staged = 0;
    for (const e of stagedEntries) {
      // The filename stays native. The parent source scope carries isolation, never memory
      // identity; Python receives the original basename and derives the same CID as direct/live.
      const scope = stageSourceDir(stage, e);
      const dst = join(scope, basename(e.file));
      try {
        mkdirSync(scope, { recursive: true });
        if (existsSync(dst)) unlinkSync(dst);
        try { linkSync(e.file, dst); } catch { copyFileSync(e.file, dst); }
        staged += 1;
      } catch (err) {
        dropped.push({ file: e.file, why: err instanceof Error ? err.message.slice(0, 120) : String(err) });
      }
    }
    if (dropped.length > 0) {
      console.warn(`[harvest] ${wing}: ${dropped.length} transcript(s) did NOT stage — they are absent from this mine:`);
      for (const d of dropped.slice(0, 5)) console.warn(`  ✗ ${d.file}\n      ${d.why}`);
      if (dropped.length > 5) console.warn(`  … ${dropped.length - 5} more`);
    }
    let mined: number | string;
    try {
      // Submit source descriptors only. The serialized Python holder owns native parsing,
      // CID derivation, embedding, and durable landing; no TypeScript turn path exists here.
      const stagedRc = stagedEntries.length === 0 ? 0 : await cmdCapture({ command: "capture", positional: [stage], options: { wing, ...rootOpt }, flags: {} });
      let sqliteRc = 0;
      for (const entry of sqliteEntries) {
        const rc = await cmdCapture({ command: "capture", positional: [entry.file], options: { wing, ...(entry.sessionId ? { "session-id": entry.sessionId } : {}), ...rootOpt }, flags: {} });
        if (rc !== 0) sqliteRc = rc;
      }
      mined = stagedRc === 0 && sqliteRc === 0 ? "routed→python" : `capture-rc-${stagedRc || sqliteRc}`;
    } catch (e) {
      mined = "capture-failed: " + String((e as Error).message ?? "").trim().slice(0, 160);
    }
    // Spirit sweep: each Claude parent points its subagent files at the same Python
    // source holder, landing in `<wing>__spirits`. The original parent path names
    // the subagent directory; no staged copy invents source identity.
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
    results.push({
      wing, transcripts: staged, sources, mined,
      ...(sqliteEntries.length ? { nativeSources: sqliteEntries.length } : {}),
      ...(dropped.length ? { dropped: dropped.length, droppedFiles: dropped } : {}),
      ...(spiritSessions ? { spiritSessions } : {}),
      ...(spiritSweep ? { spiritSweep } : {}),
    });
  }

  results.sort((a, b) => (b.transcripts + (b.nativeSources ?? 0)) - (a.transcripts + (a.nativeSources ?? 0)));
  // Bulk owns only its lane. The raw transcript remains the durable producer log; remove this
  // replay-only snapshot after all Python passes return, including partial failures.
  try { rmSync(stageRoot, { recursive: true, force: true }); } catch { /* scratch never blocks a report */ }
  // POST-HARVEST ENRICHMENT — the worldline membership pass: the absent BEAT cell in each
  // drawer's lar_ffz takes its turn's identity label (same-turn drawers share a beat cell).
  // Idempotent (only `_` cells fill; re-runs no-op), so it rides EVERY --all close. Best-effort:
  // an absent fork-DAG or substrate refuses inside runFfzEnrich and the harvest still lands —
  // the miss is REPORTED, never silent.
  let ffzEnrich: FfzEnrichReport | { skipped: string } | null = null;
  if (!dryRun) {
    try {
      ffzEnrich = runFfzEnrich();
    } catch (err) {
      ffzEnrich = { skipped: err instanceof Error ? err.message : String(err) };
    }
  }
  // No guest HNSW-repair tail here: all telemetry flows through the @daemon to the SOVEREIGN sensorium
  // (verbatim → contentpalace via caller-vector, AST → .structurepalace, form → .formpalace); the guest
  // ~/.mempalace stays untouched, so there is nothing of ours to repair in it. (The sovereign content
  // store's index health rides content_io's own chroma upsert — a follow-up if divergence ever shows.)
  const complete = dryRun || results.every((r) => r.mined === "routed→python" && !r.dropped && !r.spiritSweep);
  emit(args, {
    ok: complete,
    ...(!complete ? { error: { code: "partial", message: "one or more source streams did not complete; inspect the per-wing results and re-run", hint: "The raw sources remain intact; re-running is safe after the named failure is fixed." } } : {}),
    data: { wings: results, dryRun, mode: "all", routedThrough: "python-source-holder", ...(ffzEnrich ? { ffzEnrich } : {}), ...(organSteps ? { organsFrontRun: organSteps } : {}) },
    human: () => {
      console.log(`lares sense pour --all${dryRun ? "  (dry run)" : ""}  — ${results.length} wing(s), ${entries.length} source stream(s) → Python`);
      if (organSteps) {
        const ran = organSteps.filter((s) => s.ran).length;
        console.log(`  organs front-run: stood ${ran} step(s) before mining (registry probe found absent organs)`);
      }
      for (const r of results)
        console.log(`  ${r.wing.padEnd(34)} ${String(r.transcripts).padStart(4)} staged${r.nativeSources ? ` + ${r.nativeSources} native SQLite` : ""} [${r.sources}] · ${r.mined}${r.spiritSessions ? ` · spirits: ${r.spiritSessions} session(s) → __spirits` : ""}${r.spiritSweep ? ` · spirit-sweep: ${r.spiritSweep}` : ""}`);
      console.log(`  routed as source pointers — Python reads native sources → contentpalace (sovereign) · hash-bound`);
      if (ffzEnrich) {
        if ("skipped" in ffzEnrich) console.log(`  ffz enrich:    skipped — ${ffzEnrich.skipped}`);
        else console.log(`  ffz enrich:    ${ffzEnrich.stamped} stamp(s) across ${ffzEnrich.braids} braid(s) — beat cells filled (idempotent)`);
      }
    },
  });
  return complete ? 0 : 1;
  } finally {
    releaseHarvestLock?.();
  }
}

// The default room every harvest/capture drawer lands in (the "convos mine"). `--room` joins the
// arg-surface for isomorphism with the MCP `harvest(..., room)` tool, but a NON-default value would
// change where a drawer lands — a byte-landing change this shape-pass never makes. So a non-default
// `--room` refuses honestly; the default lands drawers byte-for-byte in the default room. Absent →
// default; equal-to-default → proceed unchanged.
const DEFAULT_ROOM = "conversations";

/**
 * The one SOURCE identity for every capture ingress.
 *
 * A stage preserves the native filename. Its parent directory describes the
 * ingress actor and source scope; it never becomes memory identity. The Python
 * source-cap owns the final source key and CID derivation.
 */
const CAPTURE_SURFACES = ["claude", "codex", "copilot-cli", "copilot-vscode"] as const;
type CaptureSurface = typeof CAPTURE_SURFACES[number];

/** Derive the stable surface label from an existing staged name or its source path. */
function captureSurface(file: string): CaptureSurface {
  const staged = /(?:^|[/\\])(claude|codex|copilot-cli|copilot-vscode)(?:[/\\]|$)/.exec(file);
  if (staged?.[1]) return staged[1] as CaptureSurface;
  const normalized = file.replace(/\\/g, "/");
  if (normalized.includes("/.codex/sessions/")) return "codex";
  if (normalized.includes("/GitHub.copilot-chat/transcripts/")) return "copilot-vscode";
  if (normalized.includes("/.copilot/")) return "copilot-cli";
  return "claude";
}

/**
 * Stable capture provenance, shared by live hook staging and every backfill.
 * Exported for the ingress-law regression tests.
 */
export function captureSourceFile(wing: string, file: string): string {
  return `${wing}/${captureSurface(file)}__${basename(file)}`;
}

/** Guard `--room`: null when the room stays the default (proceed); an exit code when a non-default
 *  room refuses honestly (the override is not landed). */
function guardRoom(args: ParsedArgs, verb: string): number | null {
  const room = args.options["room"];
  if (room === undefined || room === DEFAULT_ROOM) return null;
  const msg = `--room override ("${room}") is not landed; ${verb} lands in the default room "${DEFAULT_ROOM}" only`;
  emit(args, {
    ok: false,
    error: { code: "verb-error", message: msg, hint: `Drop --room (or pass --room ${DEFAULT_ROOM}) to harvest into the default room.` },
    human: () => console.error(`lares ${verb}: ${msg}`),
  });
  return exitFor("verb-error");
}

export async function cmdHarvest(args: ParsedArgs): Promise<number> {
  const roomGuard = guardRoom(args, "harvest");
  if (roomGuard !== null) return roomGuard;

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

  const allFiles = listTranscripts(target);
  if (allFiles.length === 0) {
    const error: LaresError = {
      code: "not-found",
      message: `no .jsonl transcripts at ${target}`,
      hint: "pass a transcript file or dir: lares sense pour <path> --wing <wing>",
    };
    emit(args, { ok: false, error, human: () => console.error(`lares sense pour: ${error.message}\n  ${error.hint}`) });
    return 3;
  }
  // THE EPHEMERAL GATE (the readTurns leg): a session marked ephemeral — derived (its recorded
  // cwd under a scratch root) or declared (a `.ephemeral` sibling / `.lar-ephemeral` in its cwd) —
  // never enters the harvest index. Ephemeral ≠ deleted: the transcript survives; the ingest
  // declines, one loud line per skip. A skipped session's scope also never enters the rewind
  // diff below (skip ≠ gone — its indexed turns stay unreconciled, never kapae'd).
  const { live: files, skipped: ephemeralSkips } = partitionEphemeral(allFiles, "harvest");
  if (files.length === 0) {
    emit(args, {
      ok: true,
      data: { wing, files: 0, ephemeralSkipped: ephemeralSkips, dryRun },
      human: () => console.log(`lares sense pour → ${wing}: all ${ephemeralSkips.length} transcript(s) EPHEMERAL — nothing ingested (transcripts untouched on disk)`),
    });
    return 0;
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
  let kapae: { goneTurns: number; closed: number; structurepalace: number } | null = null;
  if (!dryRun) {
    const indexByScope = loadIndexByScope(indexPath);
    const gone: string[] = [];
    for (const [scope, live] of currentByScope) {
      const prev = indexByScope.get(scope);
      if (prev) gone.push(...detectGoneTurns(prev, live));
    }
    if (gone.length > 0) {
      // ONE gone turn-uuid → the THREE convergence effects. Leg 1 (KG valid-close) fires CLI-side
      // (the KG has no holder). Legs 2+3 (.structurepalace tally set-aside + the Measure salience
      // down-weight) fire through the @daemon's `structurepalace-kapae` verb — the daemon owns the warm
      // .structurepalace serve holder (a flock-singleton the CLI cannot re-open), and does BOTH in the
      // worker. Every leg is best-effort: a down KG / down daemon leaves the rewind unreconciled
      // this run (re-derivable on the next harvest), never fatal.
      // ONE detection timestamp (iso whole-seconds) rides ALL THREE legs — the KG valid-close,
      // the .structurepalace tombstone, AND the drawer `lar_kapae` liveness stamp (the rank signal the
      // recall side reads) — so a rewound turn's every trace carries the SAME moment.
      const ended = isoWholeSeconds(new Date().toISOString());
      let closed = 0;
      try {
        for (const turnKey of gone) closed += kapaeTurn(turnKey, { ended }).closed;
      } catch (err) {
        const why = err instanceof KgUnavailable ? "KG unavailable" : err instanceof Error ? err.message : String(err);
        if (process.env["LARES_DEBUG"]) console.warn(`[harvest] KG kapae best-effort skipped: ${why}`);
      }
      // Legs 2+3 — route each gone turn's rewind to the @daemon's warm holder (fire-and-forget).
      let did = "";
      try { did = await operatorDid(); } catch { /* un-gated verb; runVerb still reaches the daemon */ }
      let structurepalace = 0;
      const fired = await Promise.allSettled(
        gone.map((turnKey) => runVerb("structurepalace-kapae", { turnKey, ended }, did, { timeoutMs: 5000 })),
      );
      for (const r of fired) if (r.status === "fulfilled" && r.value.status === "done") structurepalace += 1;
      if (structurepalace === 0 && process.env["LARES_DEBUG"]) {
        console.warn(`[harvest] structurepalace-kapae best-effort skipped (daemon down?) — ${gone.length} gone turn(s) unreconciled this run`);
      }
      kapae = { goneTurns: gone.length, closed, structurepalace };
    }
  }

  // No repair tail. It ran `mempalace repair --archive-existing --yes` against the GUEST
  // ~/.mempalace — a WRITE to the comparator — plus `fuser ~/.mempalace | kill -TERM` on its holders.
  // Divergence-gated, so it usually skipped; but the gate READ the guest, and the moment it read
  // diverged it rewrote the baseline we measure the sensorium against. `runHarvestAll` already
  // declined this tail and left the reasoning inline; the single-transcript path never got the cut.
  // The RUN never writes the comparator.
  const hnsw = null;
  emit(args, {
    ok: true,
    data: { ...summary, dryRun, ...(ephemeralSkips.length ? { ephemeralSkipped: ephemeralSkips } : {}), ...(hnsw ? { hnswRepair: hnsw } : {}), ...(kapae ? { kapae } : {}) },
    human: () => {
      console.log(`lares sense pour → ${wing}${dryRun ? "  (dry run)" : ""}`);
      console.log(`  transcripts:  ${summary.files}${ephemeralSkips.length ? `  (+${ephemeralSkips.length} EPHEMERAL, skipped)` : ""}`);
      console.log(`  turns seen:   ${summary.turns}  (${summary.skipped} already harvested, skipped)`);
      console.log(`  harvested:    ${summary.harvested}  (${summary.framed} framed · ${summary.raw} raw · ${summary.sidechain} sidechain)`);
      console.log(`  bands:        canon ${summary.bands["canon"]} · synthesis ${summary.bands["synthesis"]} · provisional ${summary.bands["provisional"]} · raw ${summary.bands["raw"]}`);
      if (!dryRun) console.log(`  index:        ${indexPath}`);
      if (kapae) console.log(`  rewind:       ${kapae.goneTurns} gone turn(s) → ${kapae.closed} worldline edge(s) + ${kapae.structurepalace} structurepalace tally(ies) set aside (kapae)`);
    },
  });
  return 0;
}

/**
 * `lares sense capture <transcript|stageDir> --wing <wing>` — request Python source-stream capture.
 *
 * The CLI and daemon carry source identity only: `{ surface, pointer, wing, room, sessionId? }`.  Python reads
 * the native transcript, derives stable CIDs, and upserts the sovereign content plane.  Re-running
 * the same pointer re-derives its ledger and lands only the new tail; the TypeScript layer neither
 * reads exchanges for capture nor holds a capture WAL.
 */
export async function cmdCapture(args: ParsedArgs): Promise<number> {
  const roomGuard = guardRoom(args, "capture");
  if (roomGuard !== null) return roomGuard;

  const target = args.positional[0] ?? "";
  const wing   = typeof args.options["wing"] === "string" ? args.options["wing"] : "";
  // A `lares sense <sensorium> capture …` address threads the target sensorium root (absent → memory).
  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : undefined;
  if (!target || !wing) {
    emit(args, {
      ok: false,
      error: { code: "usage", message: "usage: lares sense capture <transcript|stageDir> --wing <wing>" },
      human: () => console.error("usage: lares sense capture <transcript|stageDir> --wing <wing>"),
    });
    return 2;
  }

  // Collect .jsonl (a dir → its jsonl children; a file → itself).
  let files: string[] = [];
  try {
    const st = statSync(target);
    files = st.isDirectory()
      ? walkJsonl(target, () => true)
      : [target];
  } catch { files = []; }
  if (!files.length) {
    emit(args, { ok: true, data: { wing, submitted: 0 }, human: () => console.log(`[capture] no .jsonl under ${target}`) });
    return 0;
  }
  // THE EPHEMERAL GATE (the capture leg): a marked session's turns never submit to the palace
  // nalu. Reads the transcript's own CONTENT (its recorded cwd), so a staged hardlink/copy carries
  // the same verdict as the original. One loud line per skip; the transcript stays on disk.
  const { live: liveFiles, skipped: ephemeralSkips } = partitionEphemeral(files, "capture");
  files = liveFiles;
  if (!files.length) {
    emit(args, {
      ok: true,
      data: { wing, submitted: 0, ephemeralSkipped: ephemeralSkips },
      human: () => console.log(`[capture] all ${ephemeralSkips.length} transcript(s) EPHEMERAL — nothing submitted (wing ${wing})`),
    });
    return 0;
  }

  let did = "";
  try { did = await operatorDid(); } catch { /* the daemon still owns the routing boundary */ }
  const sessionId = typeof args.options["session-id"] === "string" ? args.options["session-id"] : undefined;
  const passes: Array<Record<string, unknown>> = [];
  const failures: Array<{ pointer: string; error: string }> = [];
  for (const pointer of files) {
    const detected = captureSurface(pointer);
    const surface = detected === "copilot-cli" ? "copilot" : detected;
    try {
      // The CALLER'S patience = the servo CEIL, so the CLI never cliffs before the daemon's adaptive
      // (gradient) budget resolves — a big session lands honestly; a real hang still dies within CEIL.
      const r = await runVerb("capture", { surface, pointer, wing, room: DEFAULT_ROOM, ...(surface === "copilot" && sessionId ? { sessionId } : {}), ...(sensoriumRoot ? { sensoriumRoot } : {}) }, did, { timeoutMs: TIMEOUT_CEIL_MS });
      const output = ((r.results as { summary?: { output?: Record<string, unknown> } } | undefined)?.summary?.output) ?? {};
      passes.push({ pointer, ...output });
    } catch (err) {
      failures.push({ pointer, error: err instanceof Error ? err.message : String(err) });
    }
  }
  const landed = passes.reduce((n, p) => n + (typeof p["landed"] === "number" ? p["landed"] : 0), 0);
  const skipped = passes.reduce((n, p) => n + (typeof p["skipped"] === "number" ? p["skipped"] : 0), 0);
  emit(args, {
    ok: failures.length === 0,
    ...(failures.length ? { error: { code: "capture-failed", message: `${failures.length} source stream(s) failed`, hint: "The source remains durable; re-run after the daemon reports healthy." } } : {}),
    data: { wing, sources: passes.length, landed, skipped, passes, failures, ...(ephemeralSkips.length ? { ephemeralSkipped: ephemeralSkips } : {}) },
    human: () => console.log(`[capture] ${passes.length} Python source stream(s) → ${landed} landed · ${skipped} re-derived (wing ${wing})${failures.length ? ` · ${failures.length} failed` : ""}`),
  });
  return failures.length ? 1 : 0;
}
