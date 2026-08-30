/**
 * `lares sense pour` — idempotent, re-runnable session-history harvest.
 *
 * TWO REACHES, ONE VERB. A bare `pour` harvests ONE pointer's bearing gradient — the navigational
 * structure the stream already authored, which `lares sense worldline` joins each node against.
 * `pour --all` walks the whole tending movement: quiesce · baseline · drawers · bearing · projection ·
 * verify · resume, in that order, because each landing step reads what the one before it wrote.
 *
 * ONE idempotent command the operator (or a thin hook) re-runs safely.
 *
 *   - Reads a session transcript (.jsonl) — or every transcript under a dir —
 *     turn by turn, full message structure (text blocks; tool blocks noted, not
 *     dropped — mempalace #590).
 *   - Runs the graceful-gradient harvester (@lararium/mesh harvestTurnGradient):
 *     the grammar manifests provisionally, so clean turns harvest with
 *     confidence and degraded/novel/missing forms record on the 0..20 gradient,
 *     down to the floor; below it a turn keeps its raw source and abstains.
 *   - IDEMPOTENT: a per-key content-hash watermark (<state>/harvest/state.json — a watermark
 *     re-derives, so it rides the state home rather than either house)
 *     skips turns already harvested; re-runs and resumes are no-ops. The harvest
 *     index is append-only NDJSON keyed by turn uuid.
 *
 * No holder, no LLM in the parse path — pure local read + the isomorphic parser.
 * The mempalace DRAWER leg (verbatim semantic search) stays the convos mine; this
 * is the BEARING leg (the navigational structure the stream already authored).
 *
 * One surface, two actors: prose on a TTY, deterministic JSON off-TTY / under
 * --json (../render.ts #actor-parity).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { harvestTurnGradient, detectGoneTurns, liveKeysForRewind, type KeyedBranchNode } from "@lararium/mesh";
import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { writebackWing, resolveLociIo, kapaeTurn, KgUnavailable, isoWholeSeconds } from "@lararium/sensorium";
import { larRoot, larHarvestDir, vesselDid } from "../env.js";
import { wingFromDir } from "../wing-law.js";
import { partitionEphemeral } from "../ephemeral.js";
import { atomicWriteFileSync } from "@lararium/node";
import { runVerb } from "../verb-call.js";
import { readVerbOutcome } from "../verb-result.js";
import { emit, exitFor, type LaresError } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const HARVEST_DIR = larHarvestDir();   // <state>/harvest — XDG; LAR_ROOT-isolated for staged instances

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
  readonly standing: number;
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

// --- tensegrity writeback (the daemon memory-shore) -----------------------
// Read mempalace drawer content, harvest it with the sovereign parser, and write
// our domain metadata (the tension) back ONTO the drawer (the compression strut).

// The writeback core (buildPatch + writebackWing + lar_hv) lives ONCE in
// @lararium/mempalace/telemetry-writeback (the lar-telemetry shared core) — both
// this CLI leg and the daemon `lar-telemetry` verb call it. No local copy here.

function runWriteback(args: ParsedArgs, wing: string): number {
  const lociIo = resolveLociIo();
  if (!existsSync(lociIo)) {
    const error: LaresError = { code: "not-found", message: `loci_io.py missing at ${lociIo}` };
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

// The bulk `--all` backfill + guest-comparator discovery/staging/mine now live in PYTHON
// (session_discovery.py + guest_harvest.py; the sovereign sweep in capture_session.py). The python
// guest lane owns discovery/stage/lock; `lares mempalace harvest` shells it, and `lares sense sweep`
// routes the sovereign lane through the daemon.

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

/**
 * The sovereign re-pave — the three legs of filling a sensorium, in dependency order.
 *
 * DRAWERS land the verbatim content. The BEARING writeback reads those drawers and stamps the
 * navigational gradient onto them. The PROJECTION re-derives the lexical and entity view over the
 * content plane. The second reads what the first wrote, so the sequence is a dependency: a writeback
 * across drawers that have not landed reports zero harvested and exits clean.
 */
export type RepaveStageName =
  | "quiesce" | "baseline" | "drawers" | "bearing" | "projection" | "verify" | "resume";

export interface RepaveStage {
  readonly name: RepaveStageName;
  /** What this stage does — the line a person reads while a long pass runs. */
  readonly why: string;
}

/**
 * The tending rite's movement, as a sequence a door can run.
 *
 * The rite states this order and names each spelling a CLAIM to check; running it here turns the
 * claims into a pass or a friction at the step that stalls. Three of the seven stages exist because
 * a re-pave that skips them cannot be trusted afterwards rather than because they land anything:
 *
 *   QUIESCE  a bulk pass racing the live capture hook produces a corpus no re-run reproduces.
 *   BASELINE one clean before/after boundary exists per re-pave, and it opens exactly once. A
 *            reading taken after the fact needs a second whole pass and still has nothing to compare.
 *   VERIFY   counts against source counts, before any instrument reads the result.
 *
 * RESUME closes what QUIESCE opened, on every path out — a re-pave that halted holding the hooks
 * down leaves live capture silently off, which reads as a quiet machine rather than a fault.
 */
export function repaveStages(): readonly RepaveStage[] {
  return [
    { name: "quiesce",    why: "live capture paused — a bulk pass racing the hook is not reproducible" },
    { name: "baseline",   why: "the before-reading, taken while it can still be taken" },
    { name: "drawers",    why: "every transcript on every surface, landed verbatim into the content plane" },
    { name: "bearing",    why: "the navigational gradient, stamped onto the drawers that just landed" },
    { name: "projection", why: "the lexical and entity view, re-derived over the content plane" },
    { name: "verify",     why: "the landed counts read against the sources they came from" },
    { name: "resume",     why: "live capture handed back" },
  ];
}

/** How a finished re-pave reads: what it did, whether it may be trusted, and what to do about it. */
export interface RepaveVerdict {
  readonly ok:    boolean;
  readonly state: "landed" | "empty" | "barren" | "shrank";
  readonly why:   string;
}

/**
 * Read the verdict off the counts, never off the exit codes.
 *
 * EVERY LEG CAN RETURN 0 OVER AN EMPTY SENSORIUM. A sweep that discovered no sources exits clean, a
 * bearing pass over zero drawers stamps nothing and succeeds, and a projection re-derived from an
 * empty plane is honestly empty. So a green run proves the legs ran, not that anything landed — and
 * an instrument answering over an unfed plane reads exactly like one answering over a broken door.
 *
 * The distinction that matters is SOURCES: with none, an empty palace is the honest state of a fresh
 * machine; with a thousand, it is work that silently did not happen.
 */
export function repaveVerdict(counts: {
  readonly sources: number; readonly before: number; readonly after: number;
}): RepaveVerdict {
  const { sources, before, after } = counts;
  const n = (x: number): string => x.toLocaleString("en-US");
  if (after < before) {
    return { ok: false, state: "shrank",
             why: `the palace holds ${n(after)} drawers where it held ${n(before)} — a re-pave that shrinks the corpus `
                + `has lost what the ${n(sources)} source(s) still carry; the archive is where to compare` };
  }
  if (sources === 0) {
    return { ok: true, state: "empty",
             why: "no transcript sources stand on this machine — an empty sensorium is the honest reading, not a fault" };
  }
  if (after === 0) {
    return { ok: false, state: "barren",
             why: `${n(sources)} source(s) stand and no drawer landed — every leg exited clean over an empty palace; `
                + "check the holder (`lares sense recall <word>`) before trusting any instrument here" };
  }
  return { ok: true, state: "landed",
           why: `${n(after)} drawers over ${n(sources)} source(s)`
              + (after === before ? " — nothing new landed, which is the idempotent re-run working" : ` (up from ${n(before)})`) };
}

/** The stages that land nothing and whose absence a later reading cannot recover. */
export const REPAVE_GUARDS: readonly RepaveStageName[] = ["quiesce", "baseline", "verify", "resume"];

/**
 * The wing a re-pave fills, from the ONE law.
 *
 * `wingFromDir` is that law, and the hook already reaches it through `lares wing-of`. A second
 * derivation sends a bulk pass to a wing the per-transcript pass never writes, so a recall over
 * either name reads half a corpus while both verbs report success.
 */
export function repaveWing(args: ParsedArgs): string {
  const named = args.options["wing"];
  return typeof named === "string" && named.length > 0 ? named : wingFromDir(larRoot());
}

/** One leg's outcome. */
export interface RepaveLeg { readonly name: string; readonly code: number }

/**
 * Run every leg in order, halting at the first refusal.
 *
 * The runner is a parameter so the ORDER can be witnessed without walking the operator's corpus —
 * the contract worth holding is the sequence and the halt, not the landing.
 */
export async function runRepave(
  args: ParsedArgs,
  run: (stage: RepaveStage["name"], args: ParsedArgs) => Promise<number> = runRepaveLeg,
): Promise<{ stages: RepaveLeg[]; code: number }> {
  const wing = repaveWing(args);
  // ONE WING REACHES EVERY LEG. Threaded here rather than defaulted per-leg, which is how the two
  // fill-verbs came to disagree.
  const threaded: ParsedArgs = { ...args, options: { ...args.options, wing } };
  const stages: RepaveLeg[] = [];
  let halted = 0;
  for (const stage of repaveStages()) {
    // RESUME RUNS ON EVERY PATH OUT. Skipping it after a halt would leave the operator's live capture
    // paused with nothing on screen saying so — a machine that has quietly stopped remembering.
    if (halted !== 0 && stage.name !== "resume") continue;
    const code = await run(stage.name, threaded);
    stages.push({ name: stage.name, code });
    if (code !== 0 && halted === 0) halted = code;
  }
  return { stages, code: halted };
}

/** The legs as the door actually runs them — each at the verb that owns it. */
async function runRepaveLeg(stage: RepaveStageName, args: ParsedArgs): Promise<number> {
  switch (stage) {
    case "quiesce": return await runHooks("pause");
    case "baseline": return await readBaseline(args, "before");
    case "drawers":
      return await cmdSweep({ ...args, options: { ...args.options, surface: args.options["surface"] ?? "all" } });
    case "bearing": return runWriteback(args, repaveWing(args));
    case "projection": {
      const { cmdRefresh } = await import("./refresh.js");
      return await cmdRefresh({ ...args, positional: [] });
    }
    case "verify": return await runVerify(args);
    case "resume": return await runHooks("resume");
  }
}

/**
 * The rite's verify step — the landed counts read against the sources they came from.
 *
 * It reads the CONTENT plane rather than the bearing index, because drawers are what every instrument
 * downstream answers over. The before-count comes from the baseline this pass already took, so the
 * comparison is against this run rather than against a remembered number.
 */
async function runVerify(args: ParsedArgs): Promise<number> {
  const wing = repaveWing(args);
  const before = readBaselineRow(wing, "before");
  const after = await countDrawers();
  const sources = countSources();

  const v = repaveVerdict({ sources, before, after });
  appendBaseline(wing, { when: "after", drawers: after, sources, state: v.state });
  console.log(`  verify     ${v.state}: ${v.why}`);
  return v.ok ? 0 : 6;
}

/** Every AI transcript this machine holds — the denominator the verdict reads against. */
function countSources(): number {
  const roots = [join(homedir(), ".claude", "projects"), join(homedir(), ".codex"), join(homedir(), ".copilot")];
  let n = 0;
  for (const root of roots) { try { n += walkJsonl(root, () => true).length; } catch { /* absent is zero */ } }
  return n;
}

/** Hold or hand back the capture hooks, through the lever that owns the marker. */
async function runHooks(verb: "pause" | "resume"): Promise<number> {
  const { cmdHooks } = await import("./hooks.js");
  return await cmdHooks({ positional: [verb], flags: {}, options: {} } as unknown as ParsedArgs);
}

/**
 * A reading of the sensorium as it stands, kept beside the pass that changed it.
 *
 * The comparison is the whole point: a count means little alone and a great deal against the count
 * before it. Both readings land in the harvest state home under the wing, so the series survives the
 * pass that produced it.
 */
async function readBaseline(args: ParsedArgs, when: "before" | "after"): Promise<number> {
  const wing = repaveWing(args);
  try {
    const index = join(HARVEST_DIR, `${wing}.ndjson`);
    const bearing = existsSync(index) ? readFileSync(index, "utf8").split("\n").filter(Boolean).length : 0;
    const drawers = await countDrawers();
    appendBaseline(wing, { when, bearing, drawers, sources: countSources() });
    console.log(`  baseline   ${when}: ${drawers} drawer(s) · ${bearing} bearing row(s)`);
    return 0;
  } catch (e) {
    // A BASELINE THAT CANNOT BE WRITTEN MUST NOT PASS QUIETLY. It is the one reading no later pass
    // can recover, so its absence is the failure rather than a missing convenience.
    console.error(`  baseline   ${when}: could not be taken — ${e instanceof Error ? e.message : String(e)}`);
    return 5;
  }
}

/** The kept comparison series — both readings of a pass, in the state home beside the harvest index. */
function appendBaseline(wing: string, row: Record<string, unknown>): void {
  mkdirSync(HARVEST_DIR, { recursive: true });
  appendFileSync(join(HARVEST_DIR, `${wing}.baseline.ndjson`),
                 JSON.stringify({ wing, ...row, at: isoWholeSeconds(new Date().toISOString()) }) + "\n", "utf8");
}

/** This pass's own before-reading — the comparison is against this run, never a remembered number. */
function readBaselineRow(wing: string, when: "before" | "after"): number {
  try {
    const rows = readFileSync(join(HARVEST_DIR, `${wing}.baseline.ndjson`), "utf8")
      .split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.["when"] === when) { const d = rows[i]?.["drawers"]; return typeof d === "number" ? d : 0; }
    }
  } catch { /* no series yet reads as a fresh start */ }
  return 0;
}

/**
 * The drawers the content plane holds, asked of the daemon that owns it.
 *
 * Zero on an unreachable daemon, which the verdict reads as an honest absence rather than a claim —
 * a count nobody could take is not a count of nothing.
 */
async function countDrawers(): Promise<number> {
  try {
    let did = ""; try { did = await vesselDid(); } catch { /* the read still routes */ }
    const out = readVerbOutcome(await runVerb("status", {}, did, { timeoutMs: 120_000 })).output;
    const total = out["total"] ?? (out["result"] as Record<string, unknown> | undefined)?.["total"];
    return typeof total === "number" ? total : 0;
  } catch { return 0; }
}

export async function cmdHarvest(args: ParsedArgs): Promise<number> {
  const roomGuard = guardRoom(args, "harvest");
  if (roomGuard !== null) return roomGuard;

  // `--all` IS THE WHOLE MOTION, not a wider target. A bare `pour` harvests one pointer's bearing
  // gradient; `--all` runs the three legs a sensorium needs filled — drawers, bearing, projection —
  // in the order the second's dependency on the first sets.
  if (args.flags["all"] === true) {
    const r = await runRepave(args);
    emit(args, {
      ok: r.code === 0,
      ...(r.code === 0 ? {} : { error: { code: "repave-halted", message: `the ${r.stages.at(-1)?.name} leg refused`,
                                         hint: "the legs stand alone: `lares sense sweep`, `lares sense pour --writeback`, `lares sense refresh`" } }),
      data: { mode: "repave", wing: repaveWing(args), stages: r.stages },
      human: () => {
        for (const s of r.stages) console.log(`  ${s.name.padEnd(11)} ${s.code === 0 ? "landed" : `refused (${s.code})`}`);
      },
    });
    return r.code;
  }

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
        standing: h.standing, band: h.band, recordRaw: h.recordRaw,
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
      // down-weight) fire through the daemon's `structurepalace-kapae` verb — the daemon owns the warm
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
      // Legs 2+3 — route each gone turn's rewind to the daemon's warm holder (fire-and-forget).
      let did = "";
      try { did = await vesselDid(); } catch { /* un-gated verb; runVerb still reaches the daemon */ }
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
/** `lares sense sweep` — the BULK backfill, routed to the ONE daemon `sweep` op: the holder discovers every
 *  transcript and captures each on its warm stream (no per-session round-trips, no second writer). The
 *  isomorphic twin of the MCP `sweep` tool — CLI + MCP land on the SAME spine. `--surface all|claude|codex|
 *  copilot` (default all) · `--wing` (default wing_<user>) · `--project` (narrows claude) · `--limit`.
 *  Idempotent — a re-run catches up, a fresh sensorium fills fully. */
export async function cmdSweep(args: ParsedArgs): Promise<number> {
  const surface = typeof args.options["surface"] === "string" ? (args.options["surface"] as string) : "all";
  // ONE WING LAW. `wingFromDir` decides it everywhere — the hook reaches it through `lares wing-of`,
  // the bearing leg calls it directly. A second derivation here sent this leg to a name the
  // per-transcript leg never wrote, so an unflagged fill split one corpus across two wings.
  const wing = repaveWing(args);
  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? (args.options["sensorium-root"] as string) : undefined;
  const project = typeof args.options["project"] === "string" ? (args.options["project"] as string) : undefined;
  const limitRaw = typeof args.options["limit"] === "string" ? Number(args.options["limit"]) : undefined;
  const limit = limitRaw !== undefined && !Number.isNaN(limitRaw) ? limitRaw : undefined;
  let did = "";
  try { did = await vesselDid(); } catch { /* un-gated verb; runVerb still reaches the daemon */ }
  const r = await runVerb("sweep", {
    surface, wing,
    ...(project ? { project } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(sensoriumRoot ? { sensoriumRoot } : {}),
  }, did, { timeoutMs: TIMEOUT_CEIL_MS });
  // THE OUTCOME CARRIES ITS OWN VERDICT. The bulk spine returns a tally — sessions, landed, skipped,
  // by_surface — and a refusal returns none of it. Reading the envelope alone rendered `{}` over both,
  // so a pass the daemon cut short printed exactly like one that found nothing left to land.
  const outcome = readVerbOutcome(r);
  const tally = (k: string): number => (typeof outcome.output[k] === "number" ? outcome.output[k] as number : 0);
  const landed = tally("landed"), skipped = tally("skipped"), sessions = tally("sessions");
  emit(args, {
    ok: outcome.ok,
    ...(outcome.ok ? {} : { error: { code: "verb-error", message: outcome.error ?? "the sweep refused",
                                     hint: "a long backfill outruns the daemon's adaptive budget — narrow it with `--limit` or `--surface`, and re-run: the sweep is idempotent." } }),
    data: { surface, wing, landed, skipped, sessions, output: outcome.output },
    human: () => {
      if (!outcome.ok) { console.error(`lares sense sweep: ${outcome.error}`); return; }
      console.log(`[sweep] ${sessions} session(s) → ${landed} landed · ${skipped} re-derived (${surface}, wing ${wing})`);
    },
  });
  return outcome.ok ? 0 : exitFor("verb-error");
}

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
  try { did = await vesselDid(); } catch { /* the daemon still owns the routing boundary */ }
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
      // A capture that the daemon refused belongs with the failures, never among the passes with an
      // empty tally — the per-pointer loop is exactly where a swallowed refusal hides in a count.
      const outcome = readVerbOutcome(r);
      if (!outcome.ok) { failures.push({ pointer, error: outcome.error ?? "the capture refused" }); continue; }
      passes.push({ pointer, ...outcome.output });
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
