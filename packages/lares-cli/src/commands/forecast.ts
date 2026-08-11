/**
 * `lares sense forecast` — the R early-warning plane: `ews.R` (critical-slowing-down) over an N-signal
 * matrix → a fired / WATCH / QUIET forecast of an approaching regime-shift, read BEFORE `analyze`'s
 * change-point commits. Computed py-side behind the causal-island boundary (the predictive plane is the R
 * plane), the sibling of `couple-r` — both surface the R legs on the `lares` door.
 *
 * The signal rides `--signal <path>` — an NDJSON matrix, one JSON array per line (rows=time, cols=signals).
 * Graceful degrade when R / the leg is absent.
 *
 *   lares sense forecast --signal series.ndjson
 *
 * Meme: lar:///ha.ka.ba/lararium/sensorium/bands
 */

import { readFileSync } from "node:fs";
import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { vesselDid } from "../env.js";
import { runVerb } from "../verb-call.js";
import { summaryOutput } from "../verb-result.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** Read an NDJSON signal matrix — one JSON array per non-blank line (rows=time, cols=signals). */
function readSignalMatrix(path: string): number[][] {
  const rows: number[][] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (t.length === 0) continue;
    const row = JSON.parse(t);
    if (Array.isArray(row)) rows.push(row.map((x) => Number(x)));
  }
  return rows;
}

export async function cmdForecast(args: ParsedArgs): Promise<number> {
  const signal = args.options["signal"];
  if (typeof signal !== "string" || signal.length === 0) {
    emit(args, { ok: false, error: { code: "usage", message: "forecast needs --signal <ndjson> (rows=time, cols=signals)" },
                 human: () => console.error("lares sense forecast: needs --signal <ndjson> (rows=time, cols=signals)") });
    return exitFor("usage");
  }
  const rows = readSignalMatrix(signal);

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense forecast: ${msg}`) });
    return exitFor("not-found");
  }

  const submit = await runVerb("forecast", { rows }, did, { timeoutMs: TIMEOUT_CEIL_MS }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg,
                   hint: "Start the daemon with `lares vessel stand --foreground`, or run `lares_mcp --standalone` (tool `forecast`)." },
                 human: () => console.error(`lares sense forecast: ${msg}`) });
    return null;
  });
  if (submit === null) return exitFor("daemon-unreachable");
  if (submit.status === "error") {
    const msg = submit.errorMessage ?? "unknown";
    emit(args, { ok: false, requestId: submit.requestId, error: { code: "verb-error", message: msg },
                 human: () => console.error(`lares sense forecast failed: ${msg}`) });
    return exitFor("verb-error");
  }
  const result = summaryOutput(submit) ?? {};

  emit(args, {
    ok: true,
    data: result,
    human: () => {
      const verdict = String(result["verdict"] ?? result["state"] ?? "—");
      console.log(`lares sense forecast — the R early-warning plane (critical slowing down)`);
      console.log(`  signals:      ${rows[0]?.length ?? 0} · samples: ${rows.length}`);
      console.log(`  forecast:     ${verdict}`);
      if (result["note"]) console.log(`  note:         ${String(result["note"])}`);
    },
  });
  return 0;
}
