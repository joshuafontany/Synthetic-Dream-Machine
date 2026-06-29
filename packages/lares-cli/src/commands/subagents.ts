/**
 * `lares subagents` — capture tasked-spirit (sub-agent) transcripts into the project's spirits wing,
 * DISTINCT from the main agent's verbatim memory, with BOTH verbatim AND AST.
 *
 * ROUTED THROUGH the @daemon `capture` verb (the same path the main agent uses): each spirit at
 * `<session>/subagents/agent-*.jsonl` reads exchange-grain (readExchanges) and submits each turn via
 * the capture verb → capture cap → in-VM annotate (lar_* + the parse tree) → flush → mempalace
 * verbatim drawer + `.astpalace` AST (the deterministic hash-bindings). The spirit identity rides the
 * `source_file`: a `<wing>__spirits/` PREFIX routes the verbatim drawer into the spirits wing (decoded
 * to `metadata.wing` by the node wing-stamp flush), and the `<name>__agent-<id>__run-<run>.jsonl`
 * BASENAME gives buildPatch `lar_agent` / `lar_sidechain` / `lar_agent_handle` + the parent link. So a
 * spirit turn lands the `__spirits` wing AND an AST keyed to the spirit transcript — closing the
 * subagent-AST gap (the prior leg was a direct verbatim-only mine, zero AST).
 *
 * IDEMPOTENT: a per-wing capture watermark skips turns already submitted (Stop fires per response).
 * GRACEFUL FALLBACK (verbatim-always): the @daemon down/unreachable → the proven DIRECT mine
 * (mineSubagentsForSession, correct wing + agent), so the spirit's verbatim drawer is never lost; the
 * AST leg is simply skipped that run (the documented graceful skip — verbatim-always / AST-eventual).
 *
 *   lares subagents <session-transcript.jsonl> --wing <wing>
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/lar-telemetry
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  spiritName, agentIdOf, runIdOf, listSpiritFiles, spiritCaptureSourceFile, spiritsWing,
  mineSubagentsForSession,
} from "@lararium/mempalace";
import { atomicWriteFileSync } from "@lararium/node";

import { larHarvestDir, operatorDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { readExchanges, sha } from "./harvest.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

function loadState(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>; } catch { return {}; }
}

export async function cmdSubagents(args: ParsedArgs): Promise<number> {
  const transcript = args.positional[0];
  const wing = args.options["wing"];
  if (!transcript || !wing) {
    console.error("usage: lares subagents <session-transcript.jsonl> --wing <wing>");
    return 2;
  }

  const sw = spiritsWing(wing);
  const files = listSpiritFiles(transcript);
  if (files.length === 0) {
    emit(args, { ok: true, data: { spirits: 0, wing: sw, mined: [] }, human: () => console.log(`lares subagents → ${sw}  (0 spirits)`) });
    return 0;
  }

  let did = "";
  try { did = await operatorDid(); } catch { /* capture verb is un-gated; runVerb still reaches the daemon */ }

  const runId = runIdOf(transcript);
  mkdirSync(larHarvestDir(), { recursive: true });
  const statePath = join(larHarvestDir(), `${sw}.capture-state.json`);
  const state = loadState(statePath);
  const next: Record<string, string> = { ...state };
  const mined: Array<{ name: string; agentId: string; turns: number | string }> = [];
  let daemonDown = false;

  outer:
  for (const af of files) {
    const name = spiritName(af);
    const agentId = agentIdOf(af);
    const src = spiritCaptureSourceFile(wing, name, agentId, runId); // <wing>__spirits/<name>__agent-<id>__run-<run>.jsonl
    let turns = 0;
    for (const turn of readExchanges(af)) {
      const key = turn.uuid || sha(af + turn.ts + turn.text.slice(0, 64));
      const hash = sha(turn.text);
      if (state[key] === hash) continue;            // already captured (idempotent)
      try {
        const r = await runVerb("capture", { turnText: turn.text, sourceFile: src }, did, { timeoutMs: 5000 });
        if (r.status !== "done") throw new Error(`capture status=${r.status}`);
        next[key] = hash;
        turns += 1;
      } catch {
        daemonDown = true;                          // unreachable → fall back, verbatim-always
        break outer;
      }
    }
    mined.push({ name, agentId, turns });
  }

  if (daemonDown) {
    // The @daemon is down: the AST leg cannot run, but the verbatim drawer MUST land. Fall back to
    // the proven DIRECT mine (correct __spirits wing + per-spirit agent), then mark every spirit turn
    // captured so the nalu won't re-submit (and double) on the next run.
    let r: ReturnType<typeof mineSubagentsForSession> | null = null;
    try { r = mineSubagentsForSession(transcript, wing); } catch { /* direct mine failed too — leave state unmarked so the next run retries */ }
    if (r) {
      for (const af of files) for (const turn of readExchanges(af)) {
        const key = turn.uuid || sha(af + turn.ts + turn.text.slice(0, 64));
        next[key] = sha(turn.text);
      }
    }
    try { atomicWriteFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
    emit(args, {
      ok: true,
      data: { spirits: r?.spirits ?? mined.length, wing: sw, fallback: r ? "direct-mine" : "none (mine failed)", mined: r?.mined ?? mined },
      human: () => console.log(`lares subagents → ${sw}  daemon down → ${r ? "direct mine fallback (verbatim-always, AST skipped)" : "FAILED (mine errored)"}`),
    });
    return 0;
  }

  try { writeFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
  emit(args, {
    ok: true,
    data: { spirits: mined.length, wing: sw, routedThrough: "@daemon", mined },
    human: () => {
      const total = mined.reduce((n, m) => n + (typeof m.turns === "number" ? m.turns : 0), 0);
      console.log(`lares subagents → ${sw}  (${mined.length} spirit${mined.length === 1 ? "" : "s"}, ${total} turn(s) → @daemon nalu — verbatim + AST)`);
      for (const s of mined) console.log(`  ${s.name.padEnd(20)} ${String(s.turns).padStart(4)} turns  (agent-${s.agentId.slice(0, 8)})`);
    },
  });
  return 0;
}
