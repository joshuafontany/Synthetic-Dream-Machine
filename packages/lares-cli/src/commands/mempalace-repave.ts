/**
 * `lares mempalace repave` — the guest RITE: tear the comparator down and stand it clean.
 *
 * The comparator holds the baseline the memory sensorium measures itself against, so its value rests
 * on carrying nothing the RUN put there. A store that accumulated through months of dev-time — mixed
 * provenance, a quarantined drift segment, our own `lar_*` stamps from an era when the writeback
 * pointed here — measures nothing. It gets torn and re-mined, vanilla.
 *
 * FIVE STEPS, each idempotent, so a rite that dies halfway RE-RUNS FROM THE TOP:
 *
 *   1. quiesce  — pause the hooks, drain every holder. Nothing may hold the store we tear.
 *   2. verify   — REFUSE while anything still holds it, and refuse while the worldline KG still sits
 *                 inside it (a pave must never take memory with it).
 *   3. tear     — remove the guest tree.
 *   4. stand    — `mempalace init` + pin `hooks.auto_save = false`.
 *   5. harvest  — the vanilla mine over every transcript surface (`lares mempalace harvest`).
 *
 * Preview by default. `--confirm` enacts. `--keep-hooks` leaves the hooks paused afterward (the
 * default resumes them, since the rite paused them).
 *
 * This tears the GUEST only. The sovereign sensorium keeps its own cadence (`lares palace-teardown`),
 * and the two rites share no path — the RUN never writes the comparator, and the comparator's rite
 * never reaches the RUN's planes.
 */

import { execFileSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { initGuestMempalace, guestMempalaceOrgan, organHealthy, memorySensoriumDir } from "@lararium/node";
import { livePalaceProcs } from "../palace-procs.js";
import { pauseHooks, resumeHooks } from "../hook-pause.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";
import { cmdMempalaceHarvest } from "./mempalace-harvest.js";

/** The guest tree, spelled literally — an env lever that can redirect the comparator can redirect
 *  this rite onto the sensorium, and this rite REMOVES things. */
function guestRoot(): string {
  return join(homedir(), ".mempalace");
}

interface Step {
  readonly step: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** Bytes under a dir (a cheap `du`), or 0 when absent. */
function treeBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  try {
    const out = execFileSync("du", ["-sb", dir], { encoding: "utf8" });
    return Number(out.split("\t")[0] ?? 0);
  } catch { return 0; }
}

function human(n: number): string {
  const u = ["B", "KiB", "MiB", "GiB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(1)} ${u[i]}`;
}

/**
 * The REFUSALS — the two ways a pave destroys something it must not.
 *
 * A holder still on the store means a live writer, and tearing under one leaves a half-written tree
 * plus a process writing into a path that no longer exists. The worldline KG living INSIDE the guest
 * means the pave takes 500-odd entities of spirit lineage with it — memory, not baseline.
 */
function refusals(guest: string): string[] {
  const out: string[] = [];

  const holders = livePalaceProcs({ vesselPids: [], vesselPort: 0 })
    .filter((p) => p.cmd.includes(".mempalace"));
  if (holders.length > 0) {
    out.push(`${holders.length} process(es) still hold the guest — run \`lares mempalace quiesce\` first: ` +
             holders.map((p) => `${p.pid}`).join(", "));
  }

  const kgInGuest = join(guest, "palace", "knowledge_graph.sqlite3");
  const kgSovereign = join(memorySensoriumDir(), "knowledge_graph.sqlite3");
  if (existsSync(kgInGuest) && !existsSync(kgSovereign)) {
    out.push(
      `the worldline KG still lives INSIDE the guest (${kgInGuest}) and has no sovereign copy. ` +
      `A pave would take it — that is memory, not baseline. Copy it to ${kgSovereign} first.`,
    );
  }
  return out;
}

/** `lares mempalace repave` — preview by default; `--confirm` enacts. */
export async function cmdMempalaceRepave(args: ParsedArgs): Promise<number> {
  const guest = guestRoot();
  const confirm = args.flags["confirm"] === true;
  const keepHooks = args.flags["keep-hooks"] === true;
  const bytes = treeBytes(guest);

  const blocked = refusals(guest);
  if (blocked.length > 0 && confirm) {
    emit(args, {
      ok: false,
      error: { code: "verb-error", message: blocked.join(" · "), hint: "`lares mempalace quiesce` drains the holders." },
      human: () => {
        console.error("lares mempalace repave — REFUSED\n");
        for (const b of blocked) console.error(`  ✗ ${b}`);
      },
    });
    return exitFor("verb-error");
  }

  if (!confirm) {
    emit(args, {
      ok: blocked.length === 0,
      data: { guest, bytes, present: existsSync(guest), refusals: blocked, dryRun: true },
      human: () => {
        console.log(`lares mempalace repave — PREVIEW (pass --confirm to enact)\n`);
        console.log(`  guest: ${guest}${existsSync(guest) ? `  (${human(bytes)})` : "  (absent)"}\n`);
        console.log("  1. quiesce   pause hooks + drain every holder");
        console.log("  2. verify    refuse while anything holds it, or while the worldline KG sits inside it");
        console.log(`  3. tear      remove ${guest}`);
        console.log("  4. stand     mempalace init + pin hooks.auto_save=false");
        console.log("  5. harvest   the VANILLA mine over every transcript surface (no lar_*)\n");
        if (blocked.length) {
          console.log("  REFUSALS standing:");
          for (const b of blocked) console.log(`    ✗ ${b}`);
        } else {
          console.log("  Every gate clears. The comparator keeps its own cadence — the sovereign sensorium is untouched.");
        }
      },
    });
    return blocked.length === 0 ? 0 : exitFor("verb-error");
  }

  const steps: Step[] = [];

  // 1. quiesce — the rite pauses the hooks itself; nothing may mint a holder mid-tear.
  pauseHooks("repave");
  steps.push({ step: "quiesce", ok: true, detail: "hooks paused; holders drained" });

  // 3. tear. (2 already ran as `refusals` above.)
  try {
    if (existsSync(guest)) {
      rmSync(guest, { recursive: true, force: true });
      steps.push({ step: "tear", ok: !existsSync(guest), detail: `removed ${guest} (${human(bytes)})` });
    } else {
      steps.push({ step: "tear", ok: true, detail: "guest already absent (idempotent)" });
    }
  } catch (e) {
    steps.push({ step: "tear", ok: false, detail: e instanceof Error ? e.message : String(e) });
  }

  // 4. stand.
  if (steps.every((s) => s.ok)) {
    for (const s of initGuestMempalace()) steps.push({ step: `stand:${s.step}`, ok: s.ok, detail: s.detail });
    const organ = guestMempalaceOrgan();
    steps.push({ step: "stand:health", ok: organHealthy(organ), detail: organ.dir });
  }

  // 5. harvest — the vanilla mine. It renders its own surface, so we let it speak.
  let harvested = 0;
  if (steps.every((s) => s.ok)) {
    console.log("");
    harvested = await cmdMempalaceHarvest({ ...args, flags: { ...args.flags, confirm: false } });
    steps.push({ step: "harvest", ok: harvested === 0, detail: harvested === 0 ? "vanilla mine complete" : "mine reported a failure" });
  }

  if (!keepHooks) {
    resumeHooks();
    steps.push({ step: "hooks", ok: true, detail: "resumed" });
  } else {
    steps.push({ step: "hooks", ok: true, detail: "left paused (--keep-hooks)" });
  }

  const ok = steps.every((s) => s.ok);
  emit(args, {
    ok,
    data: { guest, torn: human(bytes), steps },
    human: () => {
      console.log(`\nlares mempalace repave → ${guest}\n`);
      for (const s of steps) console.log(`  ${s.ok ? "✓" : "✗"} ${s.step.padEnd(24)} ${s.detail}`);
      console.log(`\n  ${ok ? "The comparator stands clean." : "The rite did NOT complete — it re-runs from the top."}`);
    },
  });
  return ok ? 0 : 1;
}
