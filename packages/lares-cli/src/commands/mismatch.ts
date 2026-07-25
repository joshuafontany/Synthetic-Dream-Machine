/**
 * `lares sense mismatch` — the one command that checks whether a node's coupling reads HONEST across both
 * estimators. It runs the TS-hull Gaussian-CMI coupling (the `ki` engine, browser-carried) BESIDE the R
 * effective-transfer-entropy reference (`coupling.R`, the RUN's plane) over the SAME signals, and diffs the
 * directed edges. They should agree; the day they part ways on whether two streams couple, that is a real
 * bug — a drift between what the vessel feels locally and what the reference computes. This is the parity
 * check the machine-code-runs-py debt owed, made into a single human word.
 *
 * The signal rides `--signal <path>` — an NDJSON matrix, one JSON array per line (rows=time, cols=signals);
 * `--names a,b,c` labels the columns (else s0,s1,…). Needs R for the reference side; without it, it says so.
 *
 *   lares sense mismatch --signal flow.ndjson --names who,authority,flow
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/mesh-palace · lar:///ha.ka.ba/lares/api/pono/cohomological-gate
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

export async function cmdMismatch(args: ParsedArgs): Promise<number> {
  const signal = args.options["signal"];
  if (typeof signal !== "string" || signal.length === 0) {
    emit(args, { ok: false, error: { code: "usage", message: "mismatch needs --signal <ndjson> (rows=time, cols=signals)" },
                 human: () => {
                   console.error("lares sense mismatch: needs --signal <ndjson> (rows=time, cols=signals)");
                   console.error("  compares the TS-hull ki coupling against the R effective-TE reference on the same signals.");
                   console.error("  example: lares sense mismatch --signal flow.ndjson --names who,authority,flow");
                 } });
    return exitFor("usage");
  }
  const rows = readSignalMatrix(signal);
  const namesOpt = args.options["names"];
  const names = typeof namesOpt === "string" && namesOpt.length > 0 ? namesOpt.split(",") : undefined;

  let did: string;
  try {
    did = await vesselDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares sense mismatch: ${msg}`) });
    return exitFor("not-found");
  }

  const submit = await runVerb("mismatch", { rows, ...(names ? { names } : {}) }, did, { timeoutMs: TIMEOUT_CEIL_MS }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg,
                   hint: "Start the daemon with `lares serve` (the comparator reaches both the TS hull and the R plane through it)." },
                 human: () => console.error(`lares sense mismatch: ${msg}`) });
    return null;
  });
  if (submit === null) return exitFor("daemon-unreachable");
  if (submit.status === "error") {
    const msg = submit.errorMessage ?? "unknown";
    emit(args, { ok: false, requestId: submit.requestId, error: { code: "verb-error", message: msg },
                 human: () => console.error(`lares sense mismatch failed: ${msg}`) });
    return exitFor("verb-error");
  }
  const result = summaryOutput(submit) ?? {};

  emit(args, {
    ok: true,
    data: result,
    human: () => {
      const agree = result["agree"];
      const edges = Array.isArray(result["edges"]) ? (result["edges"] as Array<Record<string, unknown>>) : [];
      console.log(`lares sense mismatch — ki (Gaussian-CMI) ⋈ R (effective-TE)`);
      console.log(`  signals:      ${rows[0]?.length ?? 0} · samples: ${rows.length}`);
      if (agree === null) {
        console.log(`  verdict:      cannot compare — ${String(result["note"] ?? "R unavailable")}`);
        return;
      }
      console.log(`  verdict:      ${agree ? "✓ AGREE — the coupling reads honest" : "✗ MISMATCH — the vessel and the R reference disagree"}`);
      for (const e of edges) {
        const mark = e["agree"] === false ? "✗" : "·";
        const both = `ki:${e["ki"] ? "yes" : "no "} R:${e["r"] ? "yes" : "no "}`;
        console.log(`    ${mark} ${String(e["from"])} → ${String(e["to"])}   ${both}`);
      }
      if (result["note"]) console.log(`  ${String(result["note"])}`);
    },
  });
  return 0;
}
