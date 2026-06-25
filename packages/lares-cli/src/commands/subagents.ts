/**
 * `lares subagents` — capture tasked-spirit (sub-agent) transcripts into the
 * project's spirits wing, DISTINCT from the main agent's verbatim memory.
 *
 * A direct mempalace mine (like the verbatim drawer leg — VM-free, no daemon):
 * each spirit at `<session>/subagents/agent-*.jsonl` mines into `wing_<w>__spirits`,
 * named from its handoff (Mask → Pet-Name-by-role → spirit-<id>), both sides of
 * the exchange. The hook calls this beside the parent mine; `lares telemetry
 * --wing <w>__spirits` later projects the gradient readings onto the spirit drawers.
 *
 *   lares subagents <session-transcript.jsonl> --wing <wing>
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry
 */

import { mineSubagentsForSession } from "@lararium/mempalace";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdSubagents(args: ParsedArgs): Promise<number> {
  const transcript = args.positional[0];
  const wing = args.options["wing"];
  if (!transcript || !wing) {
    console.error("usage: lares subagents <session-transcript.jsonl> --wing <wing>");
    return 2;
  }

  const r = mineSubagentsForSession(transcript, wing);
  emit(args, {
    ok: true,
    data: { spirits: r.spirits, wing: r.wing, mined: r.mined },
    human: () => {
      console.log(`lares subagents → ${r.wing}  (${r.spirits} spirit${r.spirits === 1 ? "" : "s"})`);
      for (const s of r.mined) {
        console.log(`  ${s.name.padEnd(20)} ${String(s.drawers).padStart(4)} drawers  (agent-${s.agentId.slice(0, 8)})`);
      }
    },
  });
  return 0;
}
