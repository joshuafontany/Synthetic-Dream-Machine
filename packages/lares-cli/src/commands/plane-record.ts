/**
 * `lares sense plane-record <cid> [--sensorium-root <path>]` — the CROSS-PLANE WITNESS on one cid.
 *
 * One content id, read against all three planes — content · structure · form — with an honest null
 * wherever a plane holds no record of it. READ-ONLY: it witnesses co-presence and scores nothing.
 *
 * ── WHY THIS DOOR EXISTED ONLY FOR AGENTS ───────────────────────────────────────────────────────
 * The daemon verb has stood since the plane-query lift, and the MCP seat has called it all along, so an
 * AGENT could ask this question and an OPERATOR could not. A surface only one of them can reach is a
 * surface the other cannot audit by hand — which is the whole invariant `surface-parity-witness` holds.
 * This is the last tool that failed it, and the door is what was missing rather than the machinery.
 *
 * It carries no compute of its own: the witness lives py-side in `plane_query`, one implementation the
 * holder that OWNS the store runs, and both surfaces route to that same holder. So the CLI and the MCP
 * tool cannot drift apart — there is only one reader.
 */

import { runVerb } from "../verb-call.js";
import { vesselDid } from "../env.js";
import { emit, exitFor } from "../render.js";
import { summaryOutput } from "../verb-result.js";
import type { ParsedArgs } from "../parse-args.js";

/** A cross-plane read is cheap, but the holder may cold-start; give it the room a first call needs. */
const TIMEOUT_MS = 60_000;

export async function cmdPlaneRecord(args: ParsedArgs): Promise<number> {
  const cid = (args.positional[0] ?? "").trim();
  if (!cid) {
    console.error("usage: lares sense plane-record <cid> [--sensorium-root <path>]");
    console.error("  one cid → its presence across content · structure · form, honest nulls where a plane lacks it.");
    return 2;
  }

  const verbArgs: Record<string, unknown> = { cid };
  const root = args.options["sensorium-root"];
  if (typeof root === "string") verbArgs["sensoriumRoot"] = root;

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg },
      human: () => console.error(`lares sense plane-record: ${msg}`) });
    return exitFor("not-found");
  }

  let result;
  try {
    result = await runVerb("plane-record", verbArgs, did, { timeoutMs: TIMEOUT_MS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false,
      error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares sense plane-record: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }

  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    emit(args, { ok: false, error: { code: "verb-error", message: msg },
      human: () => console.error(`lares sense plane-record: ${msg}`) });
    return exitFor("verb-error");
  }

  // The verb plane wraps a reactor's output under its own result key — read it through the shared
  // accessor rather than reaching into the shape, so a wire change moves in one place.
  const data = (summaryOutput(result) ?? {}) as Record<string, unknown>;
  emit(args, {
    ok: true,
    data,
    human: () => {
      console.log(`plane-record ${cid}`);
      // A PLANE THAT HOLDS NOTHING PRINTS SO. The witness's whole value is the honest null: a silent
      // omission would read as "not asked" where the answer is "asked, and absent".
      for (const plane of ["content", "structure", "form"]) {
        const v = data[plane];
        if (v === null || v === undefined) { console.log(`  ${plane.padEnd(10)} —  (no record on this plane)`); continue; }
        const summary = typeof v === "object" ? JSON.stringify(v) : String(v);
        console.log(`  ${plane.padEnd(10)} ${summary.length > 140 ? summary.slice(0, 140) + "…" : summary}`);
      }
      for (const [k, v] of Object.entries(data)) {
        if (["content", "structure", "form"].includes(k)) continue;
        console.log(`  ${k.padEnd(10)} ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      }
    },
  });
  return 0;
}
