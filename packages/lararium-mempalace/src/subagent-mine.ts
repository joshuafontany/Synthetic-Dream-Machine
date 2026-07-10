/**
 * subagent-mine — capture tasked-spirit (sub-agent) transcripts DISTINCT from the
 * main agent's verbatim memory, identified by their agent UUID, both sides.
 *
 * A spirit's transcript lives at `<session>/subagents/agent-<id>.jsonl` and holds
 * BOTH sides of the exchange — the handoff the main Lares authored (user) and the
 * spirit's work (assistant). mempalace's recursive miner would blur it into the
 * parent wing under the parent's actor (upstream issue #111); our Stop hook stages
 * only the top-level file, dropping it. This router does it right:
 *
 *   - DISTINCT: each spirit mines into `wing_<project>__spirits`, never the parent's.
 *   - IDENTIFIED BY UUID: identity rides the worldline handle
 *     `<run>.<agentId>` (`lar_agent_handle`); the stage-name `spirit-<uuid8>` only
 *     labels. No handoff-parsed name ladder (Mask/Spirit markers, role pet-names)
 *     is used.
 *   - BOTH SIDES: mines the whole agent file (the injected exchange assembler pairs
 *     the handoff with the spirit's turns — the SAME reader the capture leg submits).
 *
 * mempalace stays vendored: we mine THROUGH its CLI (`mine --source ndjson --daemon`,
 * the SAME road the @daemon capture flush takes — one spool per spirit), never edit it.
 * This is the daemon-down FALLBACK leg only; the primary path stays the @daemon capture
 * verb (lares subagents). Each record carries the daemon leg's exact `source_file`
 * (spiritCaptureSourceFile — `<wing>__spirits/<surface>__<name>__agent-<id>__run-<run>.jsonl`),
 * so BOTH legs share ONE dedup key and the stage layout never leaks into provenance.
 * The child→parent LINK rides `lar_parent_handle` (buildPatch, off the staged basename)
 * + the KG observer (observeSubagentWorldlines, D6) — no post-mine tunnel step exists
 * or is needed.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { resolvePalacePath } from "./palace-path.js";
import { mineWithServo } from "./mine-retry.js";
import { TIMEOUT_KILL_SIGNAL } from "./mine-timeout.js";

const MP_EXE = process.platform === "win32" ? "mempalace.exe" : "mempalace";

/**
 * The spirit-staging root — SWEPT territory: it lives under the harvest stage
 * (`$XDG_STATE_HOME/lares/harvest-stage/.spirit-stage`, LAR_ROOT-aware), which
 * `lares palace-teardown` enumerates as a target, so staged spirit copies never
 * accumulate as unswept tmpdir() residue. Mirrors vessel-paths' `larStateHome`
 * resolution (that fn sits ABOVE this package in the dep graph — the XDG standard
 * resolves here dependency-free, no value invented).
 */
function spiritStageRoot(): string {
  const root = process.env["LAR_ROOT"];
  const stateHome = root
    ? join(root, "state")
    : join(process.env["XDG_STATE_HOME"]?.trim() || join(homedir(), ".local", "state"), "lares");
  return join(stateHome, "harvest-stage", ".spirit-stage");
}

/** Resolve the mempalace executable (prefer ~/.local/bin, then PATH). */
export function resolveMempalaceExe(): string {
  const local = join(homedir(), ".local", "bin", MP_EXE);
  return existsSync(local) ? local : "mempalace";
}

/** The agent id from an `agent-<id>.jsonl` filename. */
export function agentIdOf(agentFile: string): string {
  return /^agent-(.+)\.jsonl$/.exec(basename(agentFile))?.[1] ?? "unknown";
}

/** The worldline run-root for a session transcript — its basename minus `.jsonl`. */
export function runIdOf(transcriptPath: string): string {
  return basename(transcriptPath).replace(/\.jsonl$/, "");
}

/** The `<session>/subagents` directory that holds a session's tasked-spirit transcripts. */
export function spiritSubagentDir(transcriptPath: string): string {
  return transcriptPath.replace(/\.jsonl$/, "") + "/subagents";
}

/** Every `agent-*.jsonl` tasked-spirit transcript for a session (absolute paths), else []. */
export function listSpiritFiles(transcriptPath: string): string[] {
  const dir = spiritSubagentDir(transcriptPath);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f)).map((f) => join(dir, f));
  } catch {
    return [];
  }
}

/**
 * The staged spirit BASENAME — ONE build site for BOTH legs (capture + direct mine):
 * `<surface>__<name>__agent-<id>__run-<run>.jsonl`. The leading `<surface>__` token
 * follows the main-transcript law (`${surface}__…`, runHarvestAll) so `lar_surface`
 * stamps by token instead of defaulting; buildPatch skips it before deriving
 * `lar_agent`, and `lar_agent_handle` reads off the end-anchored `__agent-…__run-…`
 * segment — the handle law holds unshifted.
 */
export function spiritStageBasename(name: string, agentId: string, runId: string, surface = "claude"): string {
  return `${surface}__${name}__agent-${agentId}__run-${runId}.jsonl`;
}

/**
 * The `source_file` a spirit turn rides through the @daemon `capture` verb under. Two channels
 * fuse in one string: a `<wing>/` PREFIX (the routing — `spiritsWing(wing)`, decoded to
 * `metadata.wing` at the node flush) and the `spiritStageBasename` (the provenance —
 * buildPatch reads `lar_surface` / `lar_agent` / `lar_sidechain` / `lar_agent_handle` off it,
 * exactly the convention the direct-mine leg stages). The capture path takes the basename, the
 * wing-stamp takes the prefix, so one record lands BOTH the `__spirits` wing AND the AST keyed
 * to the spirit.
 */
export function spiritCaptureSourceFile(wing: string, name: string, agentId: string, runId: string, surface = "claude"): string {
  return `${spiritsWing(wing)}/${spiritStageBasename(name, agentId, runId, surface)}`;
}

/**
 * The spirit's stage-name — `spirit-<uuid8>`, derived from the agent UUID alone:
 * subagent IDENTITY rides the worldline handle (`<run>.<agentId>` →
 * `lar_agent_handle`), never a mask or pet name — no handoff-parsed name ladder
 * (Mask/Spirit markers, role pet-names) is used. The stage-name
 * only labels; nothing keys on it but the drawer's `lar_agent` display label.
 */
export function spiritName(agentFile: string): string {
  return `spirit-${agentIdOf(agentFile).slice(0, 8)}`;
}

/** The spirits wing derived from a project wing (distinct, never the parent's). */
export function spiritsWing(wing: string): string {
  return `${wing}__spirits`;
}

export interface SubagentMineResult {
  readonly spirits: number;
  readonly wing: string;
  readonly mined: Array<{ name: string; agentId: string; drawers: number | string }>;
}

export interface SubagentMineOptions {
  /**
   * The exchange assembler — pairs each user turn with its assistant response(s) into
   * ONE recall unit (the caller threads lares-cli's `readExchanges`; the SAME reader the
   * @daemon capture leg submits through, so both legs file identical turn content).
   */
  readonly turns: (file: string) => ReadonlyArray<{ readonly text: string }>;
  readonly mpExe?: string;
}

/**
 * Mine every tasked-spirit transcript for a session into the project's spirits
 * wing, each labeled `spirit-<uuid8>` (identity = the worldline handle), capturing
 * both sides. The daemon-down FALLBACK leg (verbatim-always): it rides the SAME
 * `mine --source ndjson --daemon` road the @daemon capture flush takes, each record
 * carrying the daemon leg's exact relative `source_file` (spiritCaptureSourceFile) —
 * one dedup key across both legs, deterministic drawer ids
 * (`sha256(source_file)_chunk_index`), so a re-mine upserts in place. Returns
 * per-spirit counts.
 */
export function mineSubagentsForSession(transcriptPath: string, wing: string, opts: SubagentMineOptions): SubagentMineResult {
  const mpExe = opts.mpExe ?? resolveMempalaceExe();
  const sw = spiritsWing(wing);
  // The session IS the worldline run-root; each spirit's lineage-path handle reads
  // `<run>.<agentId>` (agent-worldline#name). Threaded through the source_file basename
  // so lar-telemetry's buildPatch can derive lar_agent_handle off it.
  const runId = basename(transcriptPath).replace(/\.jsonl$/, "");
  const mined: Array<{ name: string; agentId: string; drawers: number | string }> = [];
  const dir = transcriptPath.replace(/\.jsonl$/, "") + "/subagents";
  if (!existsSync(dir)) return { spirits: 0, wing: sw, mined };
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f)).map((f) => join(dir, f));
  } catch { return { spirits: 0, wing: sw, mined }; }

  for (const af of files) {
    const name = spiritName(af);
    const agentId = agentIdOf(af);
    // ONE source_file convention across both legs: the RELATIVE
    // `<wing>__spirits/<surface>__<name>__agent-<id>__run-<run>.jsonl` the @daemon
    // capture leg submits. The ndjson spool (a transient batch file under the swept
    // spirit stage) never enters provenance — the prior convos-mine leg recorded the
    // ABSOLUTE `.spirit-stage/...` staging path, leaking the stage layout into the
    // palace and forking the dedup key from the daemon leg's.
    const src = spiritCaptureSourceFile(wing, name, agentId, runId);
    // metadata.wing rides EACH record: the direct leg bypasses the node wing-stamp
    // flush, so the routing must live on the record itself (RFC 002 §2.5 — the
    // record's own wing wins; the ndjson adapter files it verbatim).
    const records = opts.turns(af).map((t, i) =>
      JSON.stringify({ content: t.text, source_file: src, chunk_index: i, metadata: { wing: sw, agent: name } }),
    );
    if (records.length === 0) { mined.push({ name, agentId, drawers: 0 }); continue; }
    const stage = join(spiritStageRoot(), `lar-spirit-${agentId}`);
    mkdirSync(stage, { recursive: true });
    const spool = join(stage, `spirit-${agentId}.ndjson`);
    try { writeFileSync(spool, records.join("\n") + "\n", "utf8"); } catch { mined.push({ name, agentId, drawers: "spool-failed" }); continue; }
    let drawers: number | string = 0;
    try {
      // --daemon HANDS OFF to the write-daemon's single palace handle (the seam) — the subagents
      // leg was the confirmed racer that grabbed the lock and blocked the telemetry-nalu flush.
      // Every writer through the seam = nothing races. (`mine --source ndjson --daemon` is the
      // exact invocation the @daemon capture flush spawns — capture-flush.ts.)
      // --palace passes the CANONICAL spelling (realpath/normalize) so this leg addresses the SAME
      // write-daemon singleton as the capture flush — without it, mempalace's own default resolution
      // can key a SECOND daemon for the same physical palace (the pile-up root).
      // A palace-lock BUSY signal (the daemon flush or a concurrent backfill holds it) WAITS+retries
      // via the shared backoff — it must not collapse to "mine-failed". A REAL error (after the
      // retries run out, or any non-busy fault) still falls to the honest "mine-failed" below.
      // execFileSync had NO timeout — a wedged mine blocked indefinitely (the 9 h-stuck class).
      // The servo gives each attempt an adaptive `timeout` + SIGKILL: a hang dies ≤ CEIL and
      // surfaces (caught below as "mine-failed"), while a BUSY lock still WAITS+retries.
      const out = mineWithServo("subagent-mine", (timeoutMs) =>
        execFileSync(
          mpExe,
          ["--palace", resolvePalacePath(), "mine", "--source", "ndjson", "--daemon", spool],
          { maxBuffer: 1 << 30, encoding: "utf8", timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL },
        ),
      );
      drawers = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    } catch { drawers = "mine-failed"; }
    mined.push({ name, agentId, drawers });
  }
  return { spirits: mined.length, wing: sw, mined };
}
