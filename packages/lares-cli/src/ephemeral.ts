/**
 * ephemeral — the EPHEMERAL mark (the capture flow's skip verdict).
 *
 * Witness-spirits, LAR_ROOT sandbox runs, and scratch sessions pollute the rhizome when the
 * palace ingests them as memory. This module reads ONE verdict per session transcript, honored
 * at the three ingest gates (the hook · `lares sense capture`/`lares sense pour` · `lares sense subagents`),
 * in two grains:
 *
 *   (a) DERIVED — the session's own recorded cwd (its first-line `cwd`, the same row the wing
 *       law reads) sits under a recognized scratch root: the OS tmpdir / `/tmp` (Claude
 *       scratchpads + tmp sandboxes), a `LAR_ROOT` sandbox (the harness/staged-instance root),
 *       or the corpus-sensorium scratch (`<larHome>/.corpus`). Derive, don't declare — the
 *       designation rides the transcript's own content, never this process's ambience alone
 *       (`LAR_ROOT` names the one sandbox root the deriving process can vouch for).
 *   (b) DECLARED — an explicit marker the operator (or a spawning harness) sets: a
 *       `<transcript-dir>/<session>.ephemeral` sibling file, or a `.lar-ephemeral` marker file
 *       in the session's recorded cwd.
 *
 * The verdict reads off the transcript's CONTENT (grain a + the cwd half of b), so it survives
 * staging/hardlink copies; the sibling-marker half of (b) reads beside the ORIGINAL transcript
 * only (a staged copy carries no sibling — the hook gate, which sees the original, honors it).
 *
 * EPHEMERAL ≠ DELETED: the transcript survives on disk untouched; only the palace ingest
 * declines. Every gate MUST log one loud line per skipped session — silence never hides a skip.
 *
 * The bash twin of grain (a)+(b) lives in `.claude-plugin/hooks/lares-mempalace-ingest-hook.sh`
 * (gate 1 — skip staging entirely); keep the two in lockstep.
 */

import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { larHome } from "@lararium/node";

export interface EphemeralVerdict {
  readonly ephemeral: boolean;
  /** The one-line ground for the verdict — `declared: …` | `derived: …`, or null when live. */
  readonly reason: string | null;
}

const LIVE: EphemeralVerdict = { ephemeral: false, reason: null };

/** The session's own recorded cwd — the first `cwd` field in the transcript's early rows. */
export function transcriptCwd(jsonl: string): string | null {
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

/** The recognized scratch roots — a session whose recorded cwd sits under one reads ephemeral. */
export function scratchRoots(): readonly string[] {
  const roots = [tmpdir(), "/tmp", join(larHome(), ".corpus")];
  const larRootEnv = process.env["LAR_ROOT"];
  if (larRootEnv) roots.push(larRootEnv); // a LAR_ROOT sandbox — the isolated-instance tree
  return [...new Set(roots.map((r) => resolve(r)))];
}

/** True when `dir` sits at or under `root` (path-boundary-safe prefix). */
function underRoot(dir: string, root: string): boolean {
  const d = resolve(dir);
  return d === root || d.startsWith(root + sep);
}

/**
 * The ONE verdict the three gates read. A non-.jsonl target (the copilot sqlite store) carries
 * no per-session cwd — it reads live (its exported per-session jsonl gets its own verdict).
 */
export function sessionEphemeral(transcript: string): EphemeralVerdict {
  // (b) declared — the sibling marker beside the original transcript.
  if (transcript.endsWith(".jsonl")) {
    const marker = transcript.slice(0, -".jsonl".length) + ".ephemeral";
    if (existsSync(marker)) return { ephemeral: true, reason: `declared: ${basename(marker)}` };
  } else {
    return LIVE;
  }
  const cwd = transcriptCwd(transcript);
  if (!cwd) return LIVE;
  // (b) declared — the marker in the session's own recorded cwd.
  if (existsSync(join(cwd, ".lar-ephemeral"))) {
    return { ephemeral: true, reason: `declared: .lar-ephemeral in ${cwd}` };
  }
  // (a) derived — the recorded cwd under a recognized scratch root.
  for (const root of scratchRoots()) {
    if (underRoot(cwd, root)) return { ephemeral: true, reason: `derived: cwd ${cwd} under scratch root ${root}` };
  }
  return LIVE;
}

/**
 * The LOUD gate helper — partition transcripts into live vs skipped, logging one line per skip
 * (stderr, so it rides through `--json` runs untangled from the data stream).
 */
export function partitionEphemeral(files: readonly string[], gate: string): { live: string[]; skipped: Array<{ file: string; reason: string }> } {
  const live: string[] = [];
  const skipped: Array<{ file: string; reason: string }> = [];
  for (const file of files) {
    const v = sessionEphemeral(file);
    if (v.ephemeral) {
      skipped.push({ file, reason: v.reason ?? "ephemeral" });
      console.error(`[${gate}] EPHEMERAL skip: ${basename(file)} — ${v.reason}`);
    } else {
      live.push(file);
    }
  }
  return { live, skipped };
}
