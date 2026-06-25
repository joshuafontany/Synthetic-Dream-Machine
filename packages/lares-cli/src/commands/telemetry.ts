/**
 * `lares telemetry` — run lar-telemetry over a wing THROUGH the @admin seat.
 *
 * The turn's instrument readings (the gradient chat sigils) are read by the @admin
 * engine and projected as `lar_*` onto the wing's mempalace drawers — mempalace
 * through the seat, web3-only (a capability-bearing verb-summons, never a direct
 * subprocess). The same-timing capture hook calls this beside the verbatim mine.
 *
 *   lares telemetry --wing <w>        project readings onto a wing's drawers
 *   lares telemetry --wing <w> --limit N   cap drawers processed this pass
 *   lares telemetry --wing <w> --port <n>  admin daemon port
 *
 * Idempotent (the lar_hv gate skips already-current drawers). If the daemon is
 * down, telemetry no-ops (verbatim capture already landed; the lar_hv sweep
 * backstops) — verbatim-always / telemetry-eventual.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry
 */

import { loadVesselVerifyingKey } from "@lararium/node";
import { larDataDir } from "../env.js";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  return "0x" + (await loadVesselVerifyingKey(larDataDir()));
}

export async function cmdTelemetry(args: ParsedArgs): Promise<number> {
  const wing = args.options["wing"];
  if (!wing) {
    console.error("usage: lares telemetry --wing <wing> [--limit <n>] [--port <n>]");
    return 2;
  }

  const verbArgs: Record<string, unknown> = { wing };
  if (args.options["limit"] !== undefined) verbArgs["limit"] = Number(args.options["limit"]);

  const portOpt = args.options["port"];
  const connectOpts: Parameters<typeof connectAdminVessel>[0] = portOpt ? { port: Number(portOpt) } : {};

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares telemetry: ${msg}`) });
    return exitFor("not-found");
  }

  let vessel;
  try {
    vessel = await connectAdminVessel(connectOpts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares serve` and try again." },
      human: () => {
        console.error(`lares telemetry: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }

  try {
    // The projection spawns drawer_io + reads each drawer — give it room beyond the
    // 10s default for a large wing; idempotent, so a generous budget costs nothing.
    const result = await submitVerb(vessel, "lar-telemetry", verbArgs, did, { timeoutMs: 60_000 });
    if (result.status === "error") {
      const msg = result.errorMessage ?? "unknown";
      const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
      emit(args, {
        ok: false, requestId: result.requestId, error: { code, message: msg },
        human: () => console.error(`lares telemetry failed: ${msg}`),
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
        console.log(`lares telemetry → ${String(out["wing"] ?? wing)} (via @admin seat)`);
        console.log(`  drawers read:   ${out["drawers"] ?? 0}  (${out["framed"] ?? 0} framed)`);
        console.log(`  lar_* written:  ${out["applied"] ?? 0}`);
        console.log(`  bands:          canon ${bands["canon"] ?? 0} · synthesis ${bands["synthesis"] ?? 0} · provisional ${bands["provisional"] ?? 0} · raw ${bands["raw"] ?? 0}`);
      },
    });
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
