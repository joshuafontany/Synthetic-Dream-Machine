/**
 * subagent-mine — capture tasked-spirit (sub-agent) transcripts DISTINCT from the
 * main agent's verbatim memory, named from their own handoff, both sides.
 *
 * A spirit's transcript lives at `<session>/subagents/agent-<id>.jsonl` and holds
 * BOTH sides of the exchange — the handoff the main Lares authored (user) and the
 * spirit's work (assistant). mempalace's recursive miner would blur it into the
 * parent wing under the parent's actor (upstream issue #111); our Stop hook stages
 * only the top-level file, dropping it. This router does it right:
 *
 *   - DISTINCT: each spirit mines into `wing_<project>__spirits`, never the parent's.
 *   - NAMED: the actor is the spirit's name, EXTRACTED FROM ITS HANDOFF — the
 *     `Spirit: <Name>` / `Mask: <Name>` opener the main Lares writes. A named
 *     spirit is RE-CALLABLE: its drawers accrete under one actor across spawns.
 *     Absent the marker, falls back to `spirit-<id>` (captured, not re-callable).
 *   - BOTH SIDES: mines the whole agent file (`--extract exchange` pairs handoff
 *     with the spirit's turns).
 *
 * mempalace stays vendored: we mine THROUGH its CLI (one `--agent` per invocation,
 * so each spirit mines in its own pass), never edit it. The child→parent tunnel
 * (the LINK) rides a separate post-mine step (create_tunnel needs the room to exist).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync, linkSync, copyFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, basename } from "node:path";

const MP_EXE = process.platform === "win32" ? "mempalace.exe" : "mempalace";

/** Resolve the mempalace executable (prefer ~/.local/bin, then PATH). */
export function resolveMempalaceExe(): string {
  const local = join(homedir(), ".local", "bin", MP_EXE);
  return existsSync(local) ? local : "mempalace";
}

/** The naming convention: a `Mask: <Name>` / `Spirit: <Name>` opener the main Lares writes. */
const NAME_RE = /(?:^|\n)\s*(?:Mask|Spirit)\s*:\s*([A-Za-z][\w-]{0,40})/;

/** First user-message text from an agent transcript — the handoff prompt. */
function firstHandoff(file: string): string {
  let lines: string[];
  try { lines = readFileSync(file, "utf8").split("\n"); } catch { return ""; }
  for (const l of lines) {
    if (!l.trim()) continue;
    let r: Record<string, unknown>;
    try { r = JSON.parse(l) as Record<string, unknown>; } catch { continue; }
    if (r["type"] !== "user") continue;
    const m = r["message"] as { content?: unknown } | undefined;
    const c = m?.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      for (const b of c) {
        const bb = b as { type?: string; text?: string };
        if (bb?.type === "text" && typeof bb.text === "string") return bb.text;
      }
    }
  }
  return "";
}

/** The agent id from an `agent-<id>.jsonl` filename. */
function agentIdOf(agentFile: string): string {
  return /^agent-(.+)\.jsonl$/.exec(basename(agentFile))?.[1] ?? "unknown";
}

/**
 * A Pet Name from the spirit's ROLE, read off the handoff opener ("You are <role>…").
 * Deterministic; the boot-assigned Mask (NAME_RE) always supersedes it. Gerund →
 * agent-noun: researching→Researcher, mapping→Mapper, mining→Miner.
 */
function petNameFromRole(handoff: string): string | null {
  const m = /\byou are\b\s+(?:an?\s+|the\s+)?([a-z]+(?:[ -][a-z]+)?)/i.exec(handoff);
  if (!m || !m[1]) return null;
  const titled = m[1].trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return titled.replace(/ing\b/i, "er").replace(/\s+/g, "-");
}

/**
 * The spirit's re-callable name, in priority:
 *   1. the boot-assigned Mask/Spirit marker the main Lares wrote in the handoff,
 *   2. else a Pet Name by role (read off the handoff),
 *   3. else a last-resort `spirit-<id>` (captured, but not re-callable by name).
 */
export function spiritName(agentFile: string): string {
  const handoff = firstHandoff(agentFile);
  const mark = NAME_RE.exec(handoff);
  if (mark && mark[1]) return mark[1];
  return petNameFromRole(handoff) ?? `spirit-${agentIdOf(agentFile).slice(0, 8)}`;
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

/**
 * Mine every tasked-spirit transcript for a session into the project's spirits
 * wing, each named by its handoff, capturing both sides. Idempotent at the
 * mempalace layer (source_file dedup). Returns per-spirit counts.
 */
export function mineSubagentsForSession(transcriptPath: string, wing: string, mpExe = resolveMempalaceExe()): SubagentMineResult {
  const sw = spiritsWing(wing);
  // The session IS the worldline run-root; each spirit's lineage-path handle reads
  // `<run>.<agentId>` (agent-worldline#name). Threaded through the staged filename
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
    // Stage this ONE spirit alone — `mine` takes a directory, and isolating each
    // spirit (a) keeps the parent pass from ever re-collecting it and (b) makes
    // the staged source_file carry the lineage (`<name>__agent-<id>__run-<run>.jsonl`)
    // so lar-telemetry's buildPatch reads BOTH lar_agent (the pet-name label) and
    // lar_agent_handle (the `<run>.<id>` worldline path) off it.
    const stage = join(tmpdir(), `lar-spirit-${agentId}`);
    mkdirSync(stage, { recursive: true });
    const dst = join(stage, `${name}__agent-${agentId}__run-${runId}.jsonl`);
    try { linkSync(af, dst); } catch { try { copyFileSync(af, dst); } catch { continue; } }
    let drawers: number | string = 0;
    try {
      const out = execFileSync(
        mpExe,
        ["mine", stage, "--mode", "convos", "--extract", "exchange", "--wing", sw, "--agent", name],
        { maxBuffer: 1 << 30, encoding: "utf8" },
      );
      drawers = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    } catch { drawers = "mine-failed"; }
    mined.push({ name, agentId, drawers });
  }
  return { spirits: mined.length, wing: sw, mined };
}
