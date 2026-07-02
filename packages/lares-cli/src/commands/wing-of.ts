/**
 * `lares wing-of <transcript>` — resolve the per-project WING a transcript belongs to,
 * through the ONE TS wing law (../wing-law.ts: recorded-cwd → wingFromDir). The ingest hook
 * calls this FIRST so bash and TS can never fork one session's drawers across two wings;
 * its inline-python mirror survives only as the broken-dist fallback.
 *
 * Prints the bare wing slug on the prose path (`--no-json` — what the hook consumes);
 * `--json` / off-TTY emits the structured payload (actor parity, ../render.ts).
 * No cwd recorded in the transcript (or its first sibling) → `not-found` exit 3,
 * FAIL LOUD so the caller's own fallback ladder takes over — never a guessed wing.
 */

import { statSync } from "node:fs";
import { resolveTranscriptWing } from "../wing-law.js";
import { emit, exitFor, type LaresError } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdWingOf(args: ParsedArgs): Promise<number> {
  const transcript = args.positional[0] ?? "";
  if (!transcript) {
    const error: LaresError = { code: "usage", message: "usage: lares wing-of <transcript.jsonl>" };
    emit(args, { ok: false, error, human: () => console.error(error.message) });
    return exitFor(error.code);
  }
  try {
    if (!statSync(transcript).isFile()) throw new Error("not a file");
  } catch {
    const error: LaresError = { code: "not-found", message: `no transcript at ${transcript}` };
    emit(args, { ok: false, error, human: () => console.error(`lares wing-of: ${error.message}`) });
    return exitFor(error.code);
  }
  const wing = resolveTranscriptWing(transcript);
  if (!wing) {
    const error: LaresError = {
      code: "not-found",
      message: `no recorded cwd in ${transcript} (or its first sibling) — cannot derive a wing`,
      hint: "the caller's fallback ladder decides (payload cwd → PWD); never guess a wing here",
    };
    emit(args, { ok: false, error, human: () => console.error(`lares wing-of: ${error.message}`) });
    return exitFor(error.code);
  }
  emit(args, {
    ok: true,
    data: { wing, transcript },
    human: () => console.log(wing),   // the bare slug — what the hook consumes
  });
  return 0;
}
