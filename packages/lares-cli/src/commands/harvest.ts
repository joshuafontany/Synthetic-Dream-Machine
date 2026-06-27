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
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, writeFileSync, statSync, linkSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { harvestTurnGradient } from "@lararium/mesh";
import { writebackWing, resolveDrawerIo, type WritebackResult } from "@lararium/mempalace";
import { resolvePython } from "../integration-check.js";
import { larRoot, larHarvestDir, larHarvestStageDir } from "../env.js";
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

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Load the idempotency watermark: turn-key → content hash already harvested. */
function loadState(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>; } catch { return {}; }
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
  readonly writeback: WritebackResult;
}

function runHarvestAll(args: ParsedArgs): number {
  const dryRun = args.flags["dry-run"] === true;
  if (!existsSync(resolveDrawerIo())) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${resolveDrawerIo()}` };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest --all: ${error.message}`) });
    return 3;
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

  const results: WingHarvest[] = [];
  for (const [wing, es] of byWing) {
    const sources = [...new Set(es.map((e) => e.source))].sort().join("+");
    if (dryRun) {
      results.push({ wing, transcripts: es.length, sources, mined: "dry-run", writeback: { drawers: 0, framed: 0, applied: 0, bands: {} } });
      continue;
    }
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
    let mined: number | string = 0;
    try {
      const out = execFileSync(MP, ["mine", stage, "--mode", "convos", "--extract", "exchange", "--wing", wing, "--agent", "lares"], { maxBuffer: 1 << 30, encoding: "utf8" });
      mined = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    } catch { mined = "mine-failed"; }
    results.push({ wing, transcripts: es.length, sources, mined, writeback: writebackWing(wing) });
  }

  results.sort((a, b) => b.transcripts - a.transcripts);
  const totalApplied = results.reduce((n, r) => n + r.writeback.applied, 0);
  emit(args, {
    ok: true,
    data: { wings: results, totalApplied, dryRun, mode: "all" },
    human: () => {
      console.log(`lares harvest --all${dryRun ? "  (dry run)" : ""}  — ${results.length} wing(s), ${entries.length} transcripts`);
      for (const r of results)
        console.log(`  ${r.wing.padEnd(34)} ${String(r.transcripts).padStart(4)} [${r.sources}] · mined ${r.mined} · lar_ ${r.writeback.applied}`);
      console.log(`  total lar_ metadata written: ${totalApplied}`);
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

  const summary: RunSummary = {
    wing, files: files.length, turns: 0, harvested: 0, skipped: 0,
    framed: 0, raw: 0, sidechain: 0,
    bands: { canon: 0, synthesis: 0, provisional: 0, raw: 0 }, indexPath,
  };

  for (const file of files) {
    for (const turn of readTurns(file)) {
      summary.turns += 1;
      const key = turn.uuid || sha(file + turn.ts + turn.text.slice(0, 64));
      const hash = sha(turn.text);
      if (state[key] === hash) { summary.skipped += 1; continue; } // idempotent no-op

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
      if (!dryRun) appendFileSync(indexPath, JSON.stringify(rec) + "\n");
      nextState[key] = hash;
    }
  }

  if (!dryRun) {
    try { writeFileSync(statePath, JSON.stringify(nextState)); } catch { /* best effort */ }
  }

  emit(args, {
    ok: true,
    data: { ...summary, dryRun },
    human: () => {
      console.log(`lares harvest → ${wing}${dryRun ? "  (dry run)" : ""}`);
      console.log(`  transcripts:  ${summary.files}`);
      console.log(`  turns seen:   ${summary.turns}  (${summary.skipped} already harvested, skipped)`);
      console.log(`  harvested:    ${summary.harvested}  (${summary.framed} framed · ${summary.raw} raw · ${summary.sidechain} sidechain)`);
      console.log(`  bands:        canon ${summary.bands["canon"]} · synthesis ${summary.bands["synthesis"]} · provisional ${summary.bands["provisional"]} · raw ${summary.bands["raw"]}`);
      if (!dryRun) console.log(`  index:        ${indexPath}`);
    },
  });
  return 0;
}
