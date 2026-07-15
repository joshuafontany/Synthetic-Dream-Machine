/**
 * `lares mempalace <verb>` (alias `lares palace <verb>`) — make the mempalace
 * daemon/hook/capture topology OBSERVABLE and GRACEFULLY-DRAINABLE.
 *
 * The daemon-spawn whack-a-mole: warm write-daemons spawn ON-DEMAND (a client mine
 * hands off to a per-palace daemon, auto-starting it), and the `lares` capture +
 * ingest hooks mint one on every dispatch. Killing the children never stops the
 * spawner. These verbs surface the whole topology (`status`), then drain it
 * gracefully — PAUSE the hooks first (stop the minting), THEN SIGTERM-drain the
 * warm daemons (`quiesce`), and un-pause when the storm passes (`resume`).
 *
 * THE GUEST LANE. `~/.mempalace` is a GUEST — a standalone sidecar the operator raises deliberately,
 * never a runtime binding the vessel boots into. `lares wake --init` stands only the sovereign
 * sensorium; standing the guest from the boot wrote the very store the S5 comparator ruling reserves
 * as an untouched baseline (`RUN-ARC.md:14` — "the RUN never writes it"). So every guest verb lives
 * HERE, behind an explicit operator act. Its uses: a sanity-check sidecar to compare the sovereign
 * sensorium against, and the source of the one-way import Act (`guest-import.ts`).
 *
 * Verbs:
 *   setup                raise the guest standalone: `mempalace init` + pin hooks.auto_save=false
 *   status               live table: every daemon/sidecar/mine/hook-leg + its SPAWNER
 *   quiesce [--hold]     graceful stop-the-world: pause hooks → drain daemons → confirm zero
 *   resume               un-pause the hooks (the warm daemon re-spawns lazily on next use)
 *
 * Golden principles: observability-first · graceful-lifecycle (flush-then-force via
 * SIGTERM→poll→bounded-SIGKILL, the `port-control` idiom) · kill-spawner-not-children
 * (encoded in the status output) · idempotent-quiesce (a second run on a quiet
 * system is a clean no-op) · pidfile-less (the live process table is the authority).
 */

import { initGuestMempalace, guestMempalaceOrgan, organHealthy } from "@lararium/node";
import { livePalaceProcs, fmtUptime, type PalaceProc, type ProcKind } from "../palace-procs.js";
import { hookPauseState, pauseHooks, resumeHooks } from "../hook-pause.js";
import { portHolderPids } from "../port-control.js";
import { larPort } from "../env.js";
import { cmdMempalaceHarvest } from "./mempalace-harvest.js";
import { cmdMempalaceRepave } from "./mempalace-repave.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Snapshot the live topology, marking the WS-port holder(s) as the node vessel. */
function snapshot(): PalaceProc[] {
  const port = larPort();
  let vesselPids: number[] = [];
  try { vesselPids = portHolderPids(port); } catch { /* advisory */ }
  return livePalaceProcs({ vesselPids, vesselPort: port });
}

const KIND_TAG: Readonly<Record<ProcKind, string>> = {
  "write-daemon":  "DAEMON ",
  "read-sidecar":  "SIDECAR",
  "one-shot-mine": "MINE   ",
  "chroma":        "CHROMA ",
  "node-vessel":   "VESSEL ",
  "ingest-hook":   "HOOK   ",
  "capture-job":   "CAPTURE",
  "subagents-job": "SPIRITS",
  "telemetry-job": "TELEM  ",
};

function serialize(p: PalaceProc): Record<string, unknown> {
  return {
    pid: p.pid, ppid: p.ppid, kind: p.kind, serves: p.serves,
    uptimeSec: p.uptimeSec, spawner: p.spawnerCmd,
    holdsStore: p.holdsStore, mintsDaemons: p.mintsDaemons, cmd: p.cmd,
  };
}

// ── status ──────────────────────────────────────────────────────────────────

function cmdStatus(args: ParsedArgs): number {
  const procs   = snapshot();
  const hooks   = hookPauseState();
  const holders = procs.filter((p) => p.holdsStore);
  const spawners = procs.filter((p) => p.mintsDaemons);

  emit(args, {
    ok: true,
    data: {
      hooksPaused: hooks.paused,
      hooksMarker: hooks.marker,
      ...(hooks.reason ? { hooksReason: hooks.reason } : {}),
      counts: { total: procs.length, holders: holders.length, spawners: spawners.length },
      processes: procs.map(serialize),
    },
    human: () => {
      console.log("lares mempalace status — palace daemon/hook/capture topology\n");
      console.log(`  hooks: ${hooks.paused ? `PAUSED (${hooks.reason ?? "manual"}${hooks.since ? ` since ${hooks.since}` : ""})` : "LIVE (minting on dispatch)"}`);
      console.log(`  marker: ${hooks.marker}\n`);
      if (procs.length === 0) {
        console.log("  (no palace processes — quiescent)\n");
        console.log("  the warm daemon re-spawns lazily on the next mine / recall.");
        return;
      }
      const row = (p: PalaceProc): string => {
        const tag = KIND_TAG[p.kind];
        const up  = fmtUptime(p.uptimeSec).padStart(6);
        return `  ${tag}  pid ${String(p.pid).padStart(7)}  up ${up}  ${p.serves}\n` +
               `           spawner: pid ${p.ppid} — ${p.spawnerCmd}`;
      };
      if (holders.length) {
        console.log("  HOLDERS (pin the store open — a teardown waits on these):");
        for (const p of holders) console.log(row(p));
        console.log("");
      }
      if (spawners.length) {
        console.log("  SPAWNERS (re-mint a daemon on the next dispatch — PAUSE these first):");
        for (const p of spawners) console.log(row(p));
        console.log("");
      }
      const others = procs.filter((p) => !p.holdsStore && !p.mintsDaemons);
      if (others.length) {
        console.log("  OTHER:");
        for (const p of others) console.log(row(p));
        console.log("");
      }
      console.log("  ↪ kill the SPAWNER, not the children: `lares hooks pause` stops the minting,");
      console.log("    then `lares mempalace quiesce` drains the warm daemons to zero.");
    },
  });
  return 0;
}

// ── quiesce ─────────────────────────────────────────────────────────────────

/**
 * A proc the drain TERMs: the store-HOLDERS *and* the daemon-MINTING spawner jobs
 * (`lares capture/subagents/telemetry` legs + the ingest hook). Holders alone left
 * a wedged spawner surviving every drain, dead-ending the teardown into --force.
 * The spawner jobs run watermark-idempotent by design, so a TERM stays re-runnable.
 * (The node vessel — holdsStore:false, mintsDaemons:false — stays untouched.)
 */
const drainable = (p: PalaceProc): boolean => p.holdsStore || p.mintsDaemons;

/**
 * Drain every store-HOLDER and daemon-MINTING job to zero: SIGTERM each (its own
 * graceful flush-then-force handler, `main.ts` for the vessel, mempalace's daemon
 * for the rest), poll the topology until no drainable proc remains, then SIGKILL
 * as a bounded fallback. The live process table is the authority — never a stale
 * PID file.
 */
async function drainHolders(opts: { graceMs?: number; pollMs?: number; killMs?: number } = {}): Promise<{
  drained: number[]; forced: number[]; remaining: PalaceProc[];
}> {
  const graceMs = opts.graceMs ?? 8_000;
  const pollMs  = opts.pollMs  ?? 200;
  const killMs  = opts.killMs  ?? 3_000;
  const drained = new Set<number>();

  const holdersNow = (): PalaceProc[] => snapshot().filter(drainable);
  const initial = holdersNow();
  if (initial.length === 0) return { drained: [], forced: [], remaining: [] };

  for (const p of initial) { drained.add(p.pid); try { process.kill(p.pid, "SIGTERM"); } catch { /* gone */ } }

  const graceDeadline = Date.now() + graceMs;
  while (Date.now() < graceDeadline) {
    if (holdersNow().length === 0) return { drained: [...drained], forced: [], remaining: [] };
    await sleep(pollMs);
  }

  const stubborn = holdersNow();
  const forced: number[] = [];
  for (const p of stubborn) { forced.push(p.pid); try { process.kill(p.pid, "SIGKILL"); } catch { /* gone */ } }
  const killDeadline = Date.now() + killMs;
  while (Date.now() < killDeadline) {
    if (holdersNow().length === 0) return { drained: [...drained], forced, remaining: [] };
    await sleep(pollMs);
  }
  return { drained: [...drained], forced, remaining: holdersNow() };
}

export interface QuiesceResult {
  readonly quiet:       boolean;
  readonly drained:     number[];
  readonly forced:      number[];
  readonly holdersLeft: PalaceProc[];
  readonly remaining:   PalaceProc[];
  readonly hooksHeld:   boolean;
  readonly marker:      string;
}

/**
 * The quiesce core (shared by `lares mempalace quiesce` AND `lares palace-teardown
 * --drain`): pause the hooks FIRST (stop the minting), drain every warm holder AND
 * wedged spawner job (SIGTERM → poll → bounded SIGKILL), then confirm zero. Un-pauses on a clean quiet
 * unless `hold` (a teardown keeps minting suppressed until it finishes). Idempotent.
 */
export async function quiescePalace(opts: { hold?: boolean } = {}): Promise<QuiesceResult> {
  const hold = opts.hold === true;
  const paused = pauseHooks("quiesce");
  const { drained, forced, remaining } = await drainHolders();
  const holdersLeft = snapshot().filter(drainable);
  const quiet = holdersLeft.length === 0;
  if (!hold && quiet) resumeHooks();
  return { quiet, drained, forced, holdersLeft, remaining, hooksHeld: hold || !quiet, marker: paused.marker };
}

async function cmdQuiesce(args: ParsedArgs): Promise<number> {
  const hold = args.flags["hold"] === true;
  const { quiet, drained, forced, holdersLeft, remaining, marker } = await quiescePalace({ hold });
  const paused = { marker };

  emit(args, {
    ok: quiet,
    ...(quiet ? {} : { error: { code: "conflict", message: `${holdersLeft.length} holder(s) survived SIGTERM+SIGKILL`, hint: "re-run `lares mempalace status` to inspect; a wedged proc may need manual intervention" } }),
    data: {
      hooksPaused: hold || !quiet,
      hookMarker: paused.marker,
      drained, forced,
      quiescent: quiet,
      remaining: remaining.map(serialize),
    },
    human: () => {
      console.log("lares mempalace quiesce — graceful stop-the-world\n");
      console.log(`  hooks: PAUSED (${paused.marker})`);
      if (drained.length === 0) {
        console.log("  drain: no warm holders — already quiet (idempotent no-op).");
      } else {
        console.log(`  drain: SIGTERM'd ${drained.length} holder(s)${forced.length ? `, SIGKILL'd ${forced.length} stubborn` : ""}.`);
      }
      if (quiet) {
        console.log("  confirm: 0 holders remain — QUIESCENT. ✓");
        if (hold) console.log("  hooks HELD paused (--hold) — run `lares mempalace resume` when done.");
        else      console.log("  hooks un-paused — the warm daemon re-spawns lazily on next use.");
      } else {
        console.log(`  confirm: ⚠ ${holdersLeft.length} holder(s) SURVIVED — hooks held paused:`);
        for (const p of holdersLeft) console.log(`      pid ${p.pid}  ${p.serves}  (${p.cmd})`);
        console.log("    inspect with `lares mempalace status`.");
      }
    },
  });
  return quiet ? 0 : 4;
}

// ── resume ──────────────────────────────────────────────────────────────────

function cmdResume(args: ParsedArgs): number {
  const before = hookPauseState();
  const after = resumeHooks();
  emit(args, {
    ok: true,
    data: { wasPaused: before.paused, hooksPaused: after.paused, marker: after.marker },
    human: () => {
      console.log("lares mempalace resume\n");
      console.log(before.paused
        ? "  hooks UN-PAUSED — capture/ingest mint the warm daemon lazily again."
        : "  hooks were already live — nothing to do (idempotent no-op).");
    },
  });
  return 0;
}

/**
 * `lares mempalace setup` — raise the GUEST standalone: `mempalace init <repo> --yes --no-llm` when
 * no config exists, then pin `hooks.auto_save = false` (the re-pollution gate). Idempotent.
 *
 * The boot does NOT do this, by law. An operator runs it to stand the guest as a sanity-check sidecar
 * beside the sovereign sensorium, or to have something for the one-way import Act to read FROM.
 */
function cmdSetup(args: ParsedArgs): number {
  const organ = guestMempalaceOrgan();
  const already = organHealthy(organ);
  const steps = initGuestMempalace();
  const ok = steps.every((s) => s.ok);
  emit(args, {
    ok,
    data: { guest: organ.dir, already, steps },
    human: () => {
      const lines = [
        `guest mempalace  ${organ.dir}${already ? "  (present)" : "  (raised)"}`,
        "",
        ...steps.map((s) => `  ${s.ok ? "✓" : "✗"} ${s.step.padEnd(26)} ${s.ran ? "ran" : "skip"}  ${s.detail}`),
        "",
        "A GUEST, not an organ: the vessel never boots into it. Compare against it, or import FROM it.",
      ];
      return lines.join("\n");
    },
  });
  return ok ? 0 : 1;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log("lares mempalace <verb>   (alias: lares palace <verb>)\n");
  console.log("The GUEST lane. `~/.mempalace` is a standalone sidecar you raise deliberately — the");
  console.log("vessel never boots into it (`lares wake --init` stands only the sovereign sensorium).\n");
  console.log("Verbs:");
  console.log("  setup               raise the guest: `mempalace init` + pin hooks.auto_save=false (idempotent)");
  console.log("  harvest [--wing w]  mine EVERY harness transcript into the guest through the vendored miner's");
  console.log("                      OWN vanilla path — no lar_* metadata, no sensorium planes. The clean");
  console.log("                      comparator. `--dry-run` enumerates without staging or mining.");
  console.log("  repave [--confirm]  the RITE: quiesce → verify → tear → stand → harvest. Idempotent; a rite");
  console.log("                      that dies halfway re-runs from the top. Preview by default. REFUSES while");
  console.log("                      anything holds the store, or while the worldline KG still sits inside it.");
  console.log("  status              live topology: every daemon/sidecar/mine/hook-leg + its SPAWNER");
  console.log("  quiesce [--hold]    graceful stop-the-world: pause hooks → drain daemons → confirm zero");
  console.log("  resume              un-pause the hooks (the warm daemon re-spawns lazily on next use)");
  console.log("\n  lane law: `mempalace harvest` writes ONLY the guest ~/.mempalace comparator;");
  console.log("            `lares harvest` / `capture` write ONLY the sovereign sensorium.");
  console.log("\nThe status output teaches kill-the-spawner-not-the-children; quiesce is idempotent.");
}

export async function cmdMempalace(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  if (!verb || verb === "help" || (args.flags["help"] && !verb)) {
    printHelp();
    return verb ? 0 : 2;
  }
  const inner: ParsedArgs = {
    command: args.command, positional: args.positional.slice(1), options: args.options, flags: args.flags,
  };
  switch (verb) {
    case "setup":   return cmdSetup(inner);
    case "harvest": return await cmdMempalaceHarvest(inner);
    case "repave":  return await cmdMempalaceRepave(inner);
    case "status":  return cmdStatus(inner);
    case "quiesce": return await cmdQuiesce(inner);
    case "resume":  return cmdResume(inner);
    default:
      console.error(`lares mempalace: unknown verb "${verb}". Run \`lares mempalace help\` for the list.`);
      return 2;
  }
}
