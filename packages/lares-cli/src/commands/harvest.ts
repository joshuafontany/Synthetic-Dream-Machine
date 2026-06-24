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
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { harvestTurnGradient, type TurnHarvest } from "@lararium/mesh";
import { resolvePython } from "../integration-check.js";
import { larRoot } from "../env.js";
import { emit, type LaresError } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const HARVEST_DIR = join(homedir(), ".lares", "harvest");

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

// --- tensegrity writeback (the @admin memory-shore) -----------------------
// Read mempalace drawer content, harvest it with the sovereign parser, and write
// our domain metadata (the tension) back ONTO the drawer (the compression strut).

// Venv-aware + cross-platform: prefers $VIRTUAL_ENV / ~/.venv (where mempalace +
// chromadb live), else python3/python/py. NEVER a machine-specific hardcode.
const PY = resolvePython() ?? "python3";
const DRAWER_IO = join(larRoot(), "packages", "lararium-mempalace", "scripts", "drawer_io.py");

/** Deterministic function-hall routing from the authored sigils (no LLM). */
function hallForHarvest(h: TurnHarvest): string {
  if (h.bearing && h.confidence >= 13) return "hall_facts"; // a decision landed, high-confidence
  if (h.huds.some((x) => (x.oodaHa ?? "").includes("↺"))) return "hall_events"; // an OODA loop closed
  if (h.sigilCount > 0 || h.voices.length > 0) return "hall_discoveries"; // structured exploration
  return ""; // leave the substrate's own hall untouched
}

/** Build the `lar_*` metadata patch (chroma metadata = str/int/float/bool only). */
function buildPatch(h: TurnHarvest): Record<string, string | number> {
  const patch: Record<string, string | number> = {
    // lar_hv = enrich-logic version (the Kappa upgrade gate). Bump in lockstep
    // with HARVEST_VERSION in drawer_io.py when the enrichment changes, so a
    // backfill re-processes every drawer; v2 added the declared adapter stamp.
    lar_hv: 2,
    lar_band: h.band,
    lar_bearing_conf: h.confidence,
    lar_sigils: h.sigilCount,
    lar_water: h.waterCount,
  };
  if (h.bearing?.aimUri) patch["lar_aim"] = h.bearing.aimUri.slice(0, 300);
  if (h.bearing?.yieldUri) patch["lar_yield"] = h.bearing.yieldUri.slice(0, 300);
  if (h.voices.length)
    patch["lar_voices"] = h.voices.map((v) => (v.role ? `${v.name} (${v.role})` : v.name)).join("|").slice(0, 400);
  if (h.confidences.length)
    patch["lar_confidence"] = h.confidences.map((c) => `${c.register ?? "?"}:${c.value ?? "?"}/${c.max}`).join("|").slice(0, 300);
  if (h.driftFlags.length) patch["lar_drift"] = h.driftFlags.join("|").slice(0, 200);
  const hall = hallForHarvest(h);
  if (hall) patch["lar_hall"] = hall;
  return patch;
}

interface WritebackResult {
  readonly drawers: number;
  readonly framed: number;
  readonly applied: number;
  readonly bands: Record<string, number>;
}

/** The per-wing writeback core: export drawers-needing-harvest → parse → upsert metadata. Idempotent (lar_hv). */
function writebackWing(wing: string, limit = 0): WritebackResult {
  // 1) export drawers needing harvest (idempotent — skips those at current hv)
  const exportArgs = ["export", "--wing", wing, ...(limit ? ["--limit", String(limit)] : [])];
  const exportOut = execFileSync(PY, [DRAWER_IO, ...exportArgs], { maxBuffer: 1 << 30, encoding: "utf8" });
  const drawers = exportOut.split("\n").filter(Boolean).map((l) => JSON.parse(l) as { id: string; content: string });

  // 2) harvest each drawer's verbatim content (the sovereign TS parser)
  const bands: Record<string, number> = { canon: 0, synthesis: 0, provisional: 0, raw: 0 };
  let framed = 0;
  const patches = drawers.map((d) => {
    const h = harvestTurnGradient(d.content);
    bands[h.band] = (bands[h.band] ?? 0) + 1;
    if (h.bearing) framed += 1;
    return { id: d.id, patch: buildPatch(h) };
  });

  // 3) write the patches back onto the drawers (merge), via the substrate helper
  let applied = 0;
  if (patches.length > 0) {
    const pf = join(tmpdir(), `lar-harvest-patch-${wing}.ndjson`);
    writeFileSync(pf, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
    const applyOut = execFileSync(PY, [DRAWER_IO, "apply", pf], { maxBuffer: 1 << 30, encoding: "utf8" });
    try { applied = (JSON.parse(applyOut.trim()) as { applied: number }).applied; } catch { applied = patches.length; }
  }
  return { drawers: drawers.length, framed, applied, bands };
}

function runWriteback(args: ParsedArgs, wing: string): number {
  if (!existsSync(DRAWER_IO)) {
    const error: LaresError = { code: "not-found", message: `drawer_io.py missing at ${DRAWER_IO}` };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest: ${error.message}`) });
    return 3;
  }
  const limit = args.options["limit"] ? Number(args.options["limit"]) : 0;
  const r = writebackWing(wing, limit);
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

interface ProjectHarvest {
  readonly wing: string;
  readonly transcripts: number;
  readonly mined: number | string;
  readonly writeback: WritebackResult;
}

function runHarvestAll(args: ParsedArgs): number {
  const dryRun = args.flags["dry-run"] === true;
  const projectsRoot = join(homedir(), ".claude", "projects");
  if (!existsSync(projectsRoot) || !existsSync(DRAWER_IO)) {
    const error: LaresError = { code: "not-found", message: `missing ${!existsSync(projectsRoot) ? projectsRoot : DRAWER_IO}` };
    emit(args, { ok: false, error, human: () => console.error(`lares harvest --all: ${error.message}`) });
    return 3;
  }
  const stageRoot = join(homedir(), ".lares", "harvest-stage");
  const projects: ProjectHarvest[] = [];

  for (const ent of readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = join(projectsRoot, ent.name);
    // top-level transcripts only = the user's main sessions (subagent files stay out of drawers)
    const jsonls = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => join(dir, f));
    const first = jsonls[0];
    if (first === undefined) continue;
    const cwd = readCwdFromTranscript(first);
    const wing = cwd
      ? wingFromDir(cwd)
      : `wing_${ent.name.replace(/^-+/, "").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase() || "unsorted"}`;

    // stable per-wing staging so mempalace's source_file dedup is idempotent across runs
    const stage = join(stageRoot, wing);
    mkdirSync(stage, { recursive: true });
    for (const j of jsonls) {
      const dst = join(stage, basename(j));
      if (!existsSync(dst)) { try { linkSync(j, dst); } catch { try { copyFileSync(j, dst); } catch { /* skip */ } } }
    }

    let mined: number | string = "dry-run";
    if (!dryRun) {
      // leg 1 — drawer mine (idempotent: mempalace file-level dedup skips already-mined)
      try {
        const out = execFileSync(MP, ["mine", stage, "--mode", "convos", "--extract", "exchange", "--wing", wing, "--agent", "claude"], { maxBuffer: 1 << 30, encoding: "utf8" });
        mined = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
      } catch { mined = "mine-failed"; }
    }
    // leg 2 — lar_* declared writeback (idempotent: lar_hv)
    const writeback = dryRun ? { drawers: 0, framed: 0, applied: 0, bands: {} } : writebackWing(wing);
    projects.push({ wing, transcripts: jsonls.length, mined, writeback });
  }

  const totalApplied = projects.reduce((n, p) => n + p.writeback.applied, 0);
  emit(args, {
    ok: true,
    data: { projects, totalApplied, dryRun, mode: "all" },
    human: () => {
      console.log(`lares harvest --all${dryRun ? "  (dry run)" : ""}  — ${projects.length} project(s)`);
      for (const p of projects)
        console.log(`  ${p.wing.padEnd(36)} ${String(p.transcripts).padStart(4)} transcripts · mined ${p.mined} · lar_ written ${p.writeback.applied}`);
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
