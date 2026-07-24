/**
 * `lares flow` — THE PET-NAMED COMPOSED-FLOW SURFACE (the anti-verb-sprawl door). One verb, N flows: the
 * low-level instruments (crystallize · phase · whiten · couple · gate · mismatch) stop being the surface and
 * become the building blocks a FLOW composes. New capability arrives as a new flow, never another raw verb.
 *
 *   lares flow                                            # list the flow-set (crystal · rhythm · couple)
 *   lares flow crystal --signal two-stratum.ndjson --names a,b   # run a flow against an explicit signal
 *
 * Bare `lares flow` lists the seeds IN-PROCESS (they ship in @lararium/mesh — no daemon needed). A named run
 * reads the NDJSON signal matrix and routes to the @daemon `flow` verb, which runs each cap-step by hull (the
 * daemon is the one seat that reaches both). The signal rides `--signal` for now (mirrors `mismatch`); the
 * auto-extraction from a poured `--target` sensorium stays owed — `targets` ride as provenance only.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { readFileSync } from "node:fs";
import { FLOW_SEEDS } from "@lararium/mesh";
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

/** The compact cap-stack render — `instrument:hull → …` — the flow's composed pipeline at a glance. */
const capLine = (f: (typeof FLOW_SEEDS)[number]): string =>
  f.capStack.map((s) => `${s.instrument}:${s.hull}`).join(" → ");

export async function cmdFlowRun(args: ParsedArgs): Promise<number> {
  const petname = args.positional[0];

  // Bare `lares flow` — list the flow-set in-process (the seeds ship in @lararium/mesh; no daemon needed).
  if (!petname) {
    emit(args, {
      ok: true,
      data: {
        flows: FLOW_SEEDS.map((f) => ({
          petname: f.petname, arity: f.arity, summary: f.summary,
          capStack: f.capStack.map((s) => `${s.instrument}:${s.hull}`),
        })),
      },
      human: () => {
        console.log("lares flow — the pet-named composed flow-set (one verb, N flows)\n");
        for (const f of FLOW_SEEDS) {
          console.log(`  ${f.petname.padEnd(9)} [${f.arity.padEnd(4)}] ${f.summary}`);
          console.log(`  ${" ".repeat(9)}        cap-stack: ${capLine(f)}`);
        }
        console.log("\n  run:  lares flow <petname> --signal <ndjson> [--names a,b,c] [--target <uri>]");
      },
    });
    return 0;
  }

  // Run mode — the signal rides `--signal` for now (the auto-extraction from a poured target is owed).
  const signal = args.options["signal"];
  const rows = typeof signal === "string" && signal.length > 0 ? readSignalMatrix(signal) : [];
  const namesOpt = args.options["names"];
  const names = typeof namesOpt === "string" && namesOpt.length > 0 ? namesOpt.split(",") : undefined;
  const targetOpt = args.options["target"];
  const targets = typeof targetOpt === "string" && targetOpt.length > 0 ? targetOpt.split(",") : undefined;

  let did: string;
  try {
    did = "0x" + (await loadVesselVerifyingKey(larDataDir()));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "not-found", message: msg }, human: () => console.error(`lares flow: ${msg}`) });
    return exitFor("not-found");
  }

  const verbArgs: Record<string, unknown> = {
    petname,
    ...(rows.length ? { rows } : {}),
    ...(names ? { names } : {}),
    ...(targets ? { targets } : {}),
  };
  const submit = await runVerb("flow", verbArgs, did, { timeoutMs: TIMEOUT_CEIL_MS }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: { code: "daemon-unreachable", message: msg,
                   hint: "Start the daemon with `lares serve` (the runner reaches both hulls through it)." },
                 human: () => console.error(`lares flow ${petname}: ${msg}`) });
    return null;
  });
  if (submit === null) return exitFor("daemon-unreachable");
  if (submit.status === "error") {
    const msg = submit.errorMessage ?? "unknown";
    emit(args, { ok: false, requestId: submit.requestId, error: { code: "verb-error", message: msg },
                 human: () => console.error(`lares flow ${petname} failed: ${msg}`) });
    return exitFor("verb-error");
  }
  const result = summaryOutput(submit) ?? {};

  emit(args, {
    ok: true,
    data: result,
    human: () => {
      console.log(`lares flow ${petname} — composed cap-stack run\n`);
      const capStack = Array.isArray(result["capStack"]) ? (result["capStack"] as string[]) : [];
      if (capStack.length) console.log(`  cap-stack:  ${capStack.join(" → ")}`);
      if (result["note"]) { console.log(`  note:       ${String(result["note"])}`); return; }
      console.log(`  signals:    ${result["signals"] ?? 0} · samples: ${result["samples"] ?? 0}`);
      const steps = Array.isArray(result["steps"]) ? (result["steps"] as Array<Record<string, unknown>>) : [];
      for (const s of steps) {
        const extras = Object.entries(s).filter(([k]) => k !== "step").map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
        console.log(`    · ${String(s["step"])}${extras ? "   " + extras : ""}`);
      }
    },
  });
  return 0;
}
