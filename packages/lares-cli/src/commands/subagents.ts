/**
 * `lares subagents` — capture tasked-spirit (sub-agent) transcripts into the project's spirits wing,
 * DISTINCT from the main agent's verbatim memory, with BOTH verbatim AND AST.
 *
 * ROUTED THROUGH the @daemon `capture` verb (the same path the main agent uses): each spirit at
 * `<session>/subagents/agent-*.jsonl` reads exchange-grain (readExchanges) and submits each turn via
 * the capture verb → capture cap → in-VM annotate (lar_* + the parse tree) → flush → mempalace
 * verbatim drawer + `.structurepalace` AST (the deterministic hash-bindings). The spirit identity rides the
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
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  spiritName, agentIdOf, runIdOf, listSpiritFiles, spiritCaptureSourceFile, spiritsWing,
  mineSubagentsForSession, observeSubagentWorldlines,
} from "@lararium/mempalace";
import { atomicWriteFileSync } from "@lararium/node";

import { larHarvestDir, operatorDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { sessionEphemeral } from "../ephemeral.js";
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

  // THE EPHEMERAL GATE (spirit discovery): the PARENT session's verdict covers every tasked
  // spirit it spawned — an ephemeral session's spirits never enter the __spirits wing. One loud
  // line; the transcripts (session + agent-*.jsonl) stay untouched on disk.
  const eph = sessionEphemeral(transcript);
  if (eph.ephemeral) {
    console.error(`[subagents] EPHEMERAL skip: ${transcript} — ${eph.reason}`);
    emit(args, {
      ok: true,
      data: { spirits: 0, wing: sw, ephemeralSkipped: [{ file: transcript, reason: eph.reason }] },
      human: () => console.log(`lares subagents → ${sw}  EPHEMERAL session — spirits not ingested (transcripts untouched)`),
    });
    return 0;
  }

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

  // OBSERVER (the FFZ worldline trigger): project each spirit's spawn→Delegation + handback→close
  // onto the mempalace KG, ONCE per spirit (a per-handle watermark), best-effort (KG absent ⇒ no-op,
  // never sinks the verbatim/AST capture). Runs regardless of the daemon path — the KG edges are
  // independent of the capture nalu. The transcript is the spirit's whole worldline, complete at Stop.
  const wlStatePath = join(larHarvestDir(), `${sw}.worldline-state.json`);
  const observeWorldlines = (): void => {
    try {
      const wl = loadState(wlStatePath);
      const fresh = files.map((af) => `${runId}.${agentIdOf(af)}`).filter((h) => !wl[h]);
      if (fresh.length === 0) return;
      const res = observeSubagentWorldlines(transcript, { only: fresh });
      for (const h of res.observed) wl[h] = "1";
      if (res.observed.length) { try { atomicWriteFileSync(wlStatePath, JSON.stringify(wl)); } catch { /* best effort */ } }
    } catch { /* best-effort durability — the KG is a re-derivable projection, never block capture */ }
  };
  const state = loadState(statePath);
  const next: Record<string, string> = { ...state };
  const mined: Array<{ name: string; agentId: string; turns: number | string }> = [];

  // Collect the CURRENT BATCH — every not-yet-captured spirit exchange, each with its stable
  // per-transcript ordinal (the ndjson chunk_index — the SAME `i` mineSubagentsForSession stamps,
  // so both legs converge on one deterministic drawer id per turn).
  interface PendingTurn { readonly key: string; readonly hash: string; readonly text: string; readonly src: string; readonly chunk: number; readonly spirit: number }
  const pending: PendingTurn[] = [];
  for (const af of files) {
    const name = spiritName(af);
    const agentId = agentIdOf(af);
    const src = spiritCaptureSourceFile(wing, name, agentId, runId); // <wing>__spirits/<name>__agent-<id>__run-<run>.jsonl
    const spirit = mined.length;
    mined.push({ name, agentId, turns: 0 });
    let chunk = -1;
    for (const turn of readExchanges(af)) {
      chunk += 1;                                    // the transcript ordinal — stable across runs
      const key = turn.uuid || sha(af + turn.ts + turn.text.slice(0, 64));
      const hash = sha(turn.text);
      if (state[key] === hash) continue;            // already captured (idempotent)
      pending.push({ key, hash, text: turn.text, src, chunk, spirit });
    }
  }

  // SUBMIT under the SUSPEND LAW (the dedup-first order): a verb failure after any success
  // SUSPENDS the remainder (unmarked — the next run retries; the sink dedups a resubmit).
  // The daemon reads unreachable ONLY on zero successes across the run → then the direct-mine
  // fallback fires for the current batch (verbatim-always), never on one timeout.
  const PROBE = 3;
  let submitted = 0;
  let failures = 0;
  let halted = false;
  for (const p of pending) {
    if (halted) break;
    try {
      const r = await runVerb(
        "capture",
        // turnKey = the .structurepalace provenance key (the kapae key); chunkIndex = the deterministic
        // drawer-id ordinal (the fallback's exact `i`).
        { turnText: p.text, sourceFile: p.src, turnKey: p.key, chunkIndex: p.chunk },
        did,
        { timeoutMs: 5000 },
      );
      if (r.status !== "done") throw new Error(`capture status=${r.status}`);
      next[p.key] = p.hash;
      submitted += 1;
      const m = mined[p.spirit];
      if (m && typeof m.turns === "number") m.turns += 1;
    } catch {
      failures += 1;
      if (submitted > 0 || failures >= PROBE) halted = true;
    }
  }
  const daemonUnreachable = failures > 0 && submitted === 0;
  const suspended = pending.length - submitted;

  if (daemonUnreachable && pending.length > 0) {
    // The @daemon stayed unreachable across the whole run: the AST leg cannot run, but the verbatim
    // drawer MUST land. Fall back to the proven DIRECT mine (correct __spirits wing + per-spirit
    // agent), then mark every spirit turn captured so the nalu won't re-submit (and double) next run.
    let r: ReturnType<typeof mineSubagentsForSession> | null = null;
    // The SAME exchange reader the daemon leg submits through — both legs file identical
    // turn content under ONE source_file key (spiritCaptureSourceFile) + one chunk ordinal,
    // so a daemon-down fallback converges with (upserts over) a later daemon capture.
    try { r = mineSubagentsForSession(transcript, wing, { turns: readExchanges }); } catch { /* direct mine failed too — leave state unmarked so the next run retries */ }
    if (r) {
      for (const p of pending) next[p.key] = p.hash;
    }
    try { atomicWriteFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
    observeWorldlines();
    emit(args, {
      ok: true,
      data: {
        spirits: r?.spirits ?? mined.length, wing: sw,
        fallback: r ? "direct-mine" : "none (mine failed — turns suspended, next run retries)",
        ...(r ? {} : { suspended }),
        mined: r?.mined ?? mined,
      },
      human: () => console.log(`lares subagents → ${sw}  daemon unreachable → ${r ? "direct mine fallback (verbatim-always, AST skipped)" : `FAILED (mine errored) — ${suspended} turn(s) suspended, next run retries`}`),
    });
    return 0;
  }

  try { atomicWriteFileSync(statePath, JSON.stringify(next)); } catch { /* best effort */ }
  observeWorldlines();
  emit(args, {
    ok: true,
    data: { spirits: mined.length, wing: sw, routedThrough: "@daemon", mined, ...(suspended > 0 ? { suspended, suspendedReason: "verb failure mid-run — turns left unmarked, next run retries (sink-side dedup guards)" } : {}) },
    human: () => {
      const total = mined.reduce((n, m) => n + (typeof m.turns === "number" ? m.turns : 0), 0);
      console.log(`lares subagents → ${sw}  (${mined.length} spirit${mined.length === 1 ? "" : "s"}, ${total} turn(s) → @daemon nalu — verbatim + AST)${suspended > 0 ? `  · ${suspended} turn(s) SUSPENDED (verb failure — next run retries)` : ""}`);
      for (const s of mined) console.log(`  ${s.name.padEnd(20)} ${String(s.turns).padStart(4)} turns  (agent-${s.agentId.slice(0, 8)})`);
    },
  });
  return 0;
}
