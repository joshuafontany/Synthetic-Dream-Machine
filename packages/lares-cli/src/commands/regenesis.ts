/**
 * `lares regenesis` — the whole-system rebirth conductor (alpha ritual).
 *
 * A thin composer over the standing entities, ordered (invents nothing structural):
 *
 *   1. hooks pause            — still the spawners (capture/ingest hooks no-op)
 *   2. mempalace quiesce      — SIGTERM-drain the warm palace holders
 *   3. stop the incumbent     — port-control, graceful → force
 *   4. palace-teardown        — the mempalace nuke (built verb, --confirm --drain)
 *   5. reset --force          — CRDT store + genesis + projection watermark wiped;
 *                               genesis re-baked; init re-founds (identity preserved)
 *   6. wake                   — boot detached, vessel-ready attested from the log
 *   7. seed --apply           — plant every bags/@* holding back into the fresh docs;
 *                               the conductor OWNS the zero-new refusal here: right
 *                               after a reset every holding MUST submit — an
 *                               all-unchanged wave names a poisoned watermark, fail loud
 *   8. harvest --all          — the palace self-founds from zero
 *   9. hooks resume           — the tideline reopens
 *
 * IDEMPOTENT from any prior state (running / stale / half-torn): every step is itself
 * idempotent, so a failed ceremony re-runs from the top and converges. Preview by
 * default; `--force` pulls the lever.
 */

import type { ParsedArgs } from "../parse-args.js";
import { larPort } from "../env.js";
import { cmdHooks } from "./hooks.js";
import { quiescePalace, cmdMempalace } from "./mempalace.js";
import { cmdPalaceTeardown } from "./palace-teardown.js";
import { cmdReset } from "./scripted.js";
import { cmdWake } from "./wake.js";
import { cmdHarvest } from "./harvest.js";
import { seedRun, discoverHoldings } from "./seed.js";
import { larRoot } from "../env.js";

const STEPS = [
  "hooks pause", "mempalace quiesce", "stop incumbent", "palace-teardown --confirm --drain",
  "reset --force (store + genesis + projection watermark)", "wake (vessel-ready attested)",
  "seed --apply (zero-new wave = FAIL, post-reset law)", "harvest --all", "hooks resume",
] as const;

function step(n: number): string { return `[regenesis ${n + 1}/${STEPS.length}] ${STEPS[n]}`; }

export async function cmdRegenesis(args: ParsedArgs): Promise<number> {
  if (!args.flags["force"]) {
    console.log("lares regenesis — whole-system rebirth from bags/ (preview; pass --force to enact)");
    for (let i = 0; i < STEPS.length; i++) console.log(`  ${step(i)}`);
    const holdings = discoverHoldings(larRoot());
    console.log(`  holdings to re-seed: ${holdings.map((h) => h.holding).join(" · ") || "(none found!)"}`);
    console.log("  preserved: ~/.lares/.lararium-identity (keys, out of every wipe zone) · bags/ (read-only source)");
    return 0;
  }

  const port = larPort();

  console.log(step(0));
  await cmdHooks({ ...args, positional: ["pause"] });

  console.log(step(1));
  await quiescePalace({ hold: false });

  console.log(step(2));
  const { stopIncumbent } = await import("../port-control.js");
  const r = await stopIncumbent(port);
  console.log(r.stopped ? `  stopped incumbent on :${port} (${r.forced ? "forced" : "graceful"})` : `  :${port} already free`);

  console.log(step(3));
  const tearCode = await cmdPalaceTeardown({ ...args, flags: { ...args.flags, confirm: true, drain: true } });
  if (tearCode !== 0) { console.error("[regenesis] palace-teardown refused — clear the named holders and re-run (idempotent)"); return tearCode; }

  console.log(step(4));
  const resetCode = await cmdReset({ ...args, flags: { ...args.flags, force: true } });
  if (resetCode !== 0) { console.error("[regenesis] reset failed — re-run after the fault clears"); return resetCode; }

  console.log(step(5));
  const wakeCode = await cmdWake({ ...args, positional: [], flags: { ...args.flags, force: false } });
  if (wakeCode !== 0) { console.error("[regenesis] wake did not attest vessel-ready — read the wake-serve.log, then re-run (the ceremony resumes idempotently)"); return wakeCode; }

  console.log(step(6));
  // The post-reset law, owned HERE (flow, not flag): the seeding must start from a
  // virgin Synced tree — reset wiped it; a tree with entries at this moment means a
  // stale watermark survived and would silently read every carrier "unchanged",
  // leaving the fresh docs empty. Fail loud before feeding.
  {
    const { existsSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { larProjectionDir } = await import("../env.js");
    const treePath = join(larProjectionDir(), "synced-tree.json");
    if (existsSync(treePath)) {
      let entries = 0;
      try { entries = Object.keys(JSON.parse(readFileSync(treePath, "utf8"))).length; } catch { /* corrupt = fresh-adoption, fine */ }
      if (entries > 0) {
        console.error(`[regenesis] REFUSED: ${treePath} holds ${entries} entries after reset — a stale projection watermark would poison the re-feed (every carrier reads "unchanged"). Remove it and re-run.`);
        return 1;
      }
    }
  }
  const ledger = await seedRun({ ...args, flags: { ...args.flags, apply: true, yes: true } });
  const failed = ledger.filter((h) => h.exitCode !== 0);
  for (const h of failed) console.error(`[regenesis] seed ${h.holding} (${h.gesture}) → exit ${h.exitCode}`);
  if (failed.length > 0) { console.error("[regenesis] seeding failed — the docs may sit part-fed; re-run seed/regenesis (idempotent)"); return 1; }

  console.log(step(7));
  const harvestCode = await cmdHarvest({ ...args, flags: { ...args.flags, all: true } });
  if (harvestCode !== 0) console.error("[regenesis] harvest --all reported a fault — the palace re-founds on the next harvest; continuing");

  console.log(step(8));
  await cmdHooks({ ...args, positional: ["resume"] });
  await cmdMempalace({ ...args, positional: ["resume"] });

  console.log("[regenesis] rebirth complete — witness: `lares status`, one meme through the wiki, chunk census on ~/.lares/.lararium");
  return 0;
}
