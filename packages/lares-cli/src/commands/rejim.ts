/**
 * `lares sense rejim` — read the sensorium's landed rejim (rhythm/geology) plane, the nameless regimes the
 * stream's own recurrence holds, made ASKABLE by a human. A READ (the plane is already vessel-wired): the
 * daemon `rejim` verb reads the holder-owned `rejim/geology.json`, or reports an honest absence when the
 * plane has never been repoured.
 *
 *   lares sense rejim                    read the landed regimes + cepat⊥lambat couples (honest absence if none)
 *   lares sense rejim --repour           RE-DERIVE from content first (rides the reversible `refresh`), then read
 *   lares sense rejim --channel content  name the stream channel a repour reads (default content)
 *
 * `--repour` never builds a new trigger — it rides the EXISTING `refresh` op narrowed to the rejim
 * enrichment (`which=rejim`), which re-derives on the holder's serialized pipe (queues between capture
 * passes, never races the writer). READ-only otherwise.
 *
 * Meme: lar:///ha.ka.ba/lararium/sensorium/rejim-io
 */

import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { vesselDid } from "../env.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export async function cmdRejim(args: ParsedArgs): Promise<number> {
  const repour = args.flags["repour"] === true;
  const channel = typeof args.options["channel"] === "string" ? (args.options["channel"] as string) : "content";
  const sensoriumRoot = typeof args.options["sensorium-root"] === "string" ? (args.options["sensorium-root"] as string) : undefined;

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense rejim: ${msg}`) });
    return exitFor("not-found");
  }

  try {
    // `--repour` rides the EXISTING refresh op (never a new trigger): re-derive the rejim enrichment on the
    // holder's serialized pipe, then read the freshly-landed plane below.
    if (repour) {
      const refreshArgs: Record<string, unknown> = { which: "rejim" };
      if (sensoriumRoot) refreshArgs["sensoriumRoot"] = sensoriumRoot;
      const rr = await runVerb("refresh", refreshArgs, did, { timeoutMs: TIMEOUT_CEIL_MS });
      if (rr.status === "error") {
        const msg = rr.errorMessage ?? "unknown";
        emit(args, { ok: false, requestId: rr.requestId, error: { code: "verb-error", message: `repour failed: ${msg}` },
                     human: () => console.error(`lares sense rejim --repour: ${msg}`) });
        return exitFor("verb-error");
      }
    }

    const rejimArgs: Record<string, unknown> = {};
    if (sensoriumRoot) rejimArgs["sensoriumRoot"] = sensoriumRoot;
    const result = await runVerb("rejim", rejimArgs, did, { timeoutMs: TIMEOUT_CEIL_MS });

    if (result.status === "error") {
      const msg = result.errorMessage ?? "unknown";
      const code = /^cap-denied/.test(msg) ? "cap-denied" : "verb-error";
      emit(args, { ok: false, requestId: result.requestId, error: { code, message: msg },
                   human: () => console.error(`lares sense rejim failed: ${msg}`) });
      return exitFor(code);
    }

    const out = summaryOutput(result) ?? {};
    const geology = (out["geology"] ?? null) as Record<string, unknown> | null;
    emit(args, {
      ok: true,
      requestId: result.requestId,
      data: { repoured: out["repoured"] ?? false, channel, geology },
      human: () => {
        if (!geology) {
          console.log("lares sense rejim — no landed geology (never repoured)");
          console.log("  → derive it:  lares sense rejim --repour");
          return;
        }
        const regimes = Array.isArray(geology["rejim"]) ? (geology["rejim"] as Array<Record<string, unknown>>) : [];
        const couples = Array.isArray(geology["couples"]) ? (geology["couples"] as Array<Record<string, unknown>>) : [];
        console.log(`lares sense rejim — ${regimes.length} regime(s) · channel ${geology["channel"] ?? channel} · ${geology["stream_chars"] ?? "?"} chars`);
        for (const r of regimes) {
          console.log(`  scale ${String(r["scale"] ?? "?").padStart(4)} · lock ${r["lock"] ?? "?"} · zoning ${r["reference_zoning"] ?? "?"}${r["name"] ? ` · ${r["name"]}` : ""}`);
        }
        if (couples.length) {
          console.log(`\n  cepat⊥lambat couples (${couples.length}):`);
          for (const c of couples) console.log(`    ratio ${c["ratio"] ?? "?"} · modulation ${c["modulation"] ?? "?"}`);
        }
        const refused = geology["refused"], untestable = geology["untestable"];
        if (refused || untestable) console.log(`\n  refused: ${JSON.stringify(refused ?? null)} · untestable: ${JSON.stringify(untestable ?? null)}`);
      },
    });
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false,
      error: { code: "daemon-unreachable", message: msg, hint: "Start the daemon with `lares vessel stand --foreground` and try again." },
      human: () => {
        console.error(`lares sense rejim: ${msg}`);
        console.error("  Start the daemon with `lares vessel stand --foreground` and try again.");
      },
    });
    return exitFor("daemon-unreachable");
  }
}
