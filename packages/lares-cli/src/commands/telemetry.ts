/**
 * `lares sense telemetry` — run lar-telemetry over a wing THROUGH the @daemon seat.
 *
 * The turn's instrument readings (the gradient chat sigils) are read by the @daemon
 * engine and projected as `lar_*` onto the wing's mempalace drawers — mempalace
 * through the seat, web3-only (a capability-bearing verb-summons, never a direct
 * subprocess). The same-timing capture hook calls this beside the verbatim mine.
 *
 *   lares sense telemetry --wing <w>        project readings onto a wing's drawers
 *   lares sense telemetry --wing <w> --limit N   cap drawers processed this pass
 *
 * Idempotent (the lar_hv gate skips already-current drawers). If the daemon is
 * down, telemetry no-ops (verbatim capture already landed; the lar_hv sweep
 * backstops) — verbatim-always / telemetry-eventual.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
 */

import { vesselDid } from "../env.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";


export async function cmdTelemetry(args: ParsedArgs): Promise<number> {
  const wing = args.options["wing"];
  if (!wing) {
    console.error("usage: lares sense telemetry --wing <wing> [--limit <n>]");
    return 2;
  }

  const verbArgs: Record<string, unknown> = { wing };
  if (args.options["limit"] !== undefined) verbArgs["limit"] = Number(args.options["limit"]);


  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense telemetry: ${msg}`) });
    return exitFor("not-found");
  }

  // The projection spawns loci_io + reads each drawer — give it room beyond the
  // 10s default for a large wing; idempotent, so a generous budget costs nothing.
  // UDS fast path, WS fallback (the lares↔lararium binding).
  let result;
  try {
    result = await runVerb("lar-telemetry", verbArgs, did, { timeoutMs: 60_000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares sense telemetry: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }

  if (result.status === "error") {
    const msg = result.errorMessage ?? "unknown";
    const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
    emit(args, {
      ok: false, requestId: result.requestId, error: { code, message: msg },
      human: () => console.error(`lares sense telemetry failed: ${msg}`),
    });
    return exitFor(code);
  }

  const out = summaryOutput(result) ?? {};
  const bands = (out["bands"] ?? {}) as Record<string, number>;
  emit(args, {
    ok: true,
    requestId: result.requestId,
    data: out,
    human: () => {
      console.log(`lares sense telemetry → ${String(out["wing"] ?? wing)} (via @daemon seat)`);
      console.log(`  drawers read:   ${out["drawers"] ?? 0}  (${out["framed"] ?? 0} framed)`);
      console.log(`  lar_* written:  ${out["applied"] ?? 0}`);
      console.log(`  bands:          canon ${bands["canon"] ?? 0} · synthesis ${bands["synthesis"] ?? 0} · provisional ${bands["provisional"] ?? 0} · raw ${bands["raw"] ?? 0}`);
    },
  });
  return 0;
}
