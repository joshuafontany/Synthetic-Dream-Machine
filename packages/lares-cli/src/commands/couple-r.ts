/**
 * `lares sense couple-r` — the R effective-transfer-entropy coupling reference: `coupling.R`
 * (RTransferEntropy::calc_ete) over an N-signal matrix → the directional who-leads-whom edges. The py/R
 * TWIN of the TS-hull `ki`: `ki`/`jing` run the Gaussian-CMI cohomology in the browser-carried hull; this
 * runs the R reference behind the causal-island boundary (the machine-code-runs-py ruling — the coupling
 * PLANE is the py/R plane). Compare the two to catch a ki↔R mismatch: the day the vessel's Gaussian-CMI and
 * the R effective-TE disagree on whether two streams couple, that is a real bug this pair surfaces.
 *
 * The signal rides `--signal <path>` — an NDJSON matrix, one JSON array per line (rows=time, cols=signals);
 * `--names a,b,c` labels the columns. Graceful `coupling-skipped` when R / RTransferEntropy is absent.
 *
 *   lares sense couple-r --signal flow.ndjson --names who,authority,flow
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/mesh-palace · lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import { readFileSync } from "node:fs";
import { loadVesselVerifyingKey } from "@lararium/node";
import { TIMEOUT_CEIL_MS } from "@lararium/mempalace";
import { larDataDir } from "../env.js";
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

export async function cmdCoupleR(args: ParsedArgs): Promise<number> {
  const signal = args.options["signal"];
  if (typeof signal !== "string" || signal.length === 0) {
    emit(args, { ok: false, error: { code: "usage", message: "couple-r needs --signal <ndjson> (rows=time, cols=signals)" },
                 human: () => console.error("lares sense couple-r: needs --signal <ndjson> (rows=time, cols=signals)") });
    return exitFor("usage");
  }
  const rows = readSignalMatrix(signal);
  const namesOpt = args.options["names"];
  const names = typeof namesOpt === "string" && namesOpt.length > 0 ? namesOpt.split(",") : undefined;

  let did: string;
  try {
    did = "0x" + (await loadVesselVerifyingKey(larDataDir()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense couple-r: ${msg}`) });
    return exitFor("not-found");
  }

  const verbArgs: Record<string, unknown> = { rows, ...(names ? { names } : {}) };
  const submit = await runVerb("couple-r", verbArgs, did, { timeoutMs: TIMEOUT_CEIL_MS }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg,
                   hint: "Start the daemon with `lares serve`, or run `lares_mcp --standalone --sensorium <root>` (tool `couple_r`)." },
                 human: () => console.error(`lares sense couple-r: ${msg}`) });
    return null;
  });
  if (submit === null) return exitFor("daemon-unreachable");
  if (submit.status === "error") {
    const msg = submit.errorMessage ?? "unknown";
    emit(args, { ok: false, requestId: submit.requestId, error: { code: "verb-error", message: msg },
                 human: () => console.error(`lares sense couple-r failed: ${msg}`) });
    return exitFor("verb-error");
  }
  const result = summaryOutput(submit) ?? {};

  emit(args, {
    ok: true,
    data: result,
    human: () => {
      console.log(`lares sense couple-r — the R effective-TE coupling reference`);
      console.log(`  signals:      ${rows[0]?.length ?? 0} · samples: ${rows.length}`);
      console.log(`  R available:  ${result["r_available"] === false ? "no — coupling-skipped" : "yes"}`);
      if (result["note"]) console.log(`  note:         ${String(result["note"])}`);
      const edges = result["edges"];
      if (Array.isArray(edges)) {
        console.log(`  edges:        ${edges.length} significant`);
        for (const e of edges as Array<Record<string, unknown>>) {
          console.log(`    ${String(e["from"] ?? e["source"])} → ${String(e["to"] ?? e["target"])}  net ${Number(e["net"] ?? e["ete"] ?? 0).toFixed(4)}`);
        }
      }
    },
  });
  return 0;
}
