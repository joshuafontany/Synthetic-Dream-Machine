/**
 * `lares seed` — plant the holdings back into the docs (the regenesis re-feed entity).
 *
 * A nameless entity composed of #has caps: disk-grant (bags/) · synced-tree · the two
 * existing feed gestures, kind-routed per holding:
 *   - SYSTEM bags (@lares, @lararium — their docs mint at boot) → the diff-gated
 *     `ingest` gesture (disk-hash vs synced-hash vs island render-hash).
 *   - Every OTHER holding (@sdm, @elyncia, @lares-history, …) → the `act LOAD`
 *     gesture, whose island reactor mints the catalog-corpus entry on a virgin
 *     catalog (the ingest gate cannot).
 *
 * IDEMPOTENT (causal-island law): each run converges from whatever state it finds —
 * a virgin Synced tree reads everything NEW; a converged tree no-ops per holding.
 * No toggles: whether a zero-new wave counts as failure belongs to the CALLER's flow
 * (the regenesis conductor refuses it right after a reset; a daily seed accepts it
 * as convergence).
 *
 *   lares seed [--apply] [--yes]   — preview per holding by default (the ingest posture)
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ParsedArgs } from "../parse-args.js";
import { emit } from "../render.js";
import { larRoot } from "../env.js";
import { cmdIngest } from "./ingest.js";
import { cmdAct } from "./act.js";

/** The holdings whose docs the vessel mints at boot — fed by the diff-gated ingest gesture. */
const SYSTEM_HOLDINGS = new Set(["@lares", "@lararium"]);

export interface SeedHolding {
  readonly holding: string;               // "@lares"
  readonly source: string;                // "<root>/bags/@lares"
  readonly toBag: string;                 // "lar:///ha.ka.ba/@lares"
  readonly gesture: "ingest" | "load";    // the kind-route taken
  readonly exitCode: number;              // the gesture's verdict for this holding
}

/** The holdings map — every `@*` dir under `<larRoot>/bags/`, discovered, never hardcoded. */
export function discoverHoldings(root: string): Array<{ holding: string; source: string; toBag: string }> {
  const bagsDir = join(root, "bags");
  let names: string[] = [];
  try {
    names = readdirSync(bagsDir).filter((n) => n.startsWith("@") && statSync(join(bagsDir, n)).isDirectory());
  } catch { return []; }
  return names.sort().map((holding) => ({
    holding,
    source: join(bagsDir, holding),
    toBag: `lar:///ha.ka.ba/${holding}`,
  }));
}

/**
 * The core run — one existing gesture per holding, sequential (one island gate, no
 * write contention). Continues past a failing holding (converge what it can); the
 * caller reads per-holding exit codes.
 */
export async function seedRun(args: ParsedArgs): Promise<SeedHolding[]> {
  const holdings = discoverHoldings(larRoot());
  const ledger: SeedHolding[] = [];
  for (const h of holdings) {
    if (SYSTEM_HOLDINGS.has(h.holding)) {
      const exitCode = await cmdIngest({
        command: "ingest",
        positional: [],
        options: { ...args.options, source: h.source, to: h.toBag },
        flags: args.flags,
      });
      ledger.push({ ...h, gesture: "ingest", exitCode });
    } else {
      // LOAD carries no preview posture of its own — honor seed's preview default
      // by riding the act surface's --dry-run.
      const flags = args.flags["apply"]
        ? { ...args.flags, yes: true }
        : { ...args.flags, "dry-run": true };
      const exitCode = await cmdAct({
        command: "act",
        positional: ["LOAD"],
        options: { ...args.options, "source-uri": h.source, to: h.toBag },
        flags,
      });
      ledger.push({ ...h, gesture: "load", exitCode });
    }
  }
  return ledger;
}

export async function cmdSeed(args: ParsedArgs): Promise<number> {
  const holdings = discoverHoldings(larRoot());
  if (holdings.length === 0) {
    emit(args, {
      ok: false,
      error: { code: "not-found", message: `no @holdings under ${join(larRoot(), "bags")}` },
      human: () => console.error(`lares seed: no @holdings under ${join(larRoot(), "bags")}`),
    });
    return 3;
  }
  console.log(`[seed] ${holdings.length} holding(s): ${holdings.map((h) => h.holding).join(" · ")}${args.flags["apply"] ? "" : "  (preview — pass --apply)"}`);
  const ledger = await seedRun(args);
  const failed = ledger.filter((h) => h.exitCode !== 0);
  for (const h of failed) console.error(`[seed] ${h.holding} (${h.gesture}) → exit ${h.exitCode}`);
  console.log(`[seed] ${ledger.length - failed.length}/${ledger.length} holding(s) converged`);
  return failed.length === 0 ? 0 : 1;
}
