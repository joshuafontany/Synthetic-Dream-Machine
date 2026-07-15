/**
 * `lares subagents` — send each tasked-spirit transcript to the Python source-stream
 * capture service.  The daemon coordinates the request, but never receives a turn body:
 * it carries only `{ surface, pointer, wing, room }` across the boundary.
 */

import {
  listSpiritFiles, spiritsWing, observeSubagentWorldlines,
} from "@lararium/mempalace";

import { operatorDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { sessionEphemeral } from "../ephemeral.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const SPIRITS_ROOM = "conversations";

export async function cmdSubagents(args: ParsedArgs): Promise<number> {
  const transcript = args.positional[0];
  const wing = args.options["wing"];
  if (!transcript || !wing) {
    console.error("usage: lares subagents <session-transcript.jsonl> --wing <wing>");
    return 2;
  }

  const spiritWing = spiritsWing(wing);
  const eph = sessionEphemeral(transcript);
  if (eph.ephemeral) {
    emit(args, {
      ok: true,
      data: { spirits: 0, wing: spiritWing, ephemeralSkipped: [{ file: transcript, reason: eph.reason }] },
      human: () => console.log(`lares subagents → ${spiritWing}  EPHEMERAL session — transcripts untouched`),
    });
    return 0;
  }

  const files = listSpiritFiles(transcript);
  if (files.length === 0) {
    emit(args, { ok: true, data: { spirits: 0, wing: spiritWing, passes: [] }, human: () => console.log(`lares subagents → ${spiritWing}  (0 spirits)`) });
    return 0;
  }

  let did = "";
  try { did = await operatorDid(); } catch { /* the daemon owns the route, not the payload */ }
  const passes: Array<Record<string, unknown>> = [];
  const failures: Array<{ pointer: string; error: string }> = [];
  for (const pointer of files) {
    try {
      const result = await runVerb("capture", {
        surface: "claude", pointer, wing: spiritWing, room: SPIRITS_ROOM,
      }, did, { timeoutMs: 120_000 });
      const output = ((result.results as { summary?: { output?: Record<string, unknown> } } | undefined)?.summary?.output) ?? {};
      passes.push({ pointer, ...output });
    } catch (error) {
      failures.push({ pointer, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Worldline edges derive independently from the durable source transcripts.  This projection
  // carries no session text through the daemon and remains safe to re-run.
  try { observeSubagentWorldlines(transcript); } catch { /* derived projection: never block capture */ }

  const landed = passes.reduce((n, pass) => n + (typeof pass.landed === "number" ? pass.landed : 0), 0);
  const skipped = passes.reduce((n, pass) => n + (typeof pass.skipped === "number" ? pass.skipped : 0), 0);
  emit(args, {
    ok: failures.length === 0,
    ...(failures.length ? { error: { code: "capture-failed", message: `${failures.length} spirit source stream(s) failed`, hint: "The transcripts remain durable; re-run after the daemon is healthy." } } : {}),
    data: { spirits: files.length, wing: spiritWing, landed, skipped, passes, failures },
    human: () => console.log(`lares subagents → ${spiritWing}  ${files.length} Python source stream(s) · ${landed} landed · ${skipped} re-derived${failures.length ? ` · ${failures.length} failed` : ""}`),
  });
  return failures.length ? 1 : 0;
}
