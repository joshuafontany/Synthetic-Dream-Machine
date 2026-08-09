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
 * sensorium; standing the guest from the boot wrote the very store the COMPARATOR ruling reserves
 * as an untouched baseline — a measurement never writes the thing it measures against. So every guest verb lives
 * HERE, behind an explicit operator act. Its uses: a sanity-check sidecar to compare the sovereign
 * sensorium against, and the source of the one-way import Act (`guest-import.ts`).
 *
 * Verbs:
 *   setup                raise the guest standalone: `mempalace init` + pin hooks.auto_save=false
 *   status               live table: every daemon/holder/mine/hook-leg + its SPAWNER
 *   quiesce [--hold]     graceful stop-the-world: pause hooks → drain daemons → confirm zero
 *   resume               un-pause the hooks (the warm daemon re-spawns lazily on next use)
 *
 * Golden principles: observability-first · graceful-lifecycle (flush-then-force via
 * SIGTERM→poll→bounded-SIGKILL, the `port-control` idiom) · kill-spawner-not-children
 * (encoded in the status output) · idempotent-quiesce (a second run on a quiet
 * system is a clean no-op) · pidfile-less (the live process table is the authority).
 */

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { initGuestMempalace, guestMempalaceOrgan, organHealthy, resolveMempalaceExe } from "@lararium/node";
import { livePalaceProcs, fmtUptime, procInPalaceScope, type PalaceProc, type ProcKind } from "../palace-procs.js";
import { hookPauseState, pauseHooks, resumeHooks } from "../hook-pause.js";
import { portHolderPids } from "../port-control.js";
import { larPort } from "../env.js";
import { installMempalaceIntegration } from "../integration-check.js";
import { cmdMempalaceHarvest } from "./mempalace-harvest.js";
import { cmdMempalaceRepave } from "./mempalace-repave.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** The guest palace dir — env-redirect-free, the same value the harvest lane names. */
function guestPalace(): string {
  return join(homedir(), ".mempalace", "palace");
}

/** Re-serialize a parsed tail back to argv for the nakama CLI (positional, then --key value, then --flag). */
function serializeTail(a: ParsedArgs): string[] {
  const out: string[] = [...a.positional];
  for (const [k, v] of Object.entries(a.options)) out.push(`--${k}`, v);
  for (const [k, v] of Object.entries(a.flags)) out.push(v ? `--${k}` : `--no-${k}`);
  return out;
}

/**
 * The SUPERSET passthrough — any nakama subverb we do not wrap runs against the GUEST palace, so
 * `lares mempalace <verb>` is a true superset of the vendored `mempalace <verb>` (search · compress ·
 * sweep · sync · repair · hallways · wake-up · … and their `--help`). Streams the nakama's own stdio
 * through (stdio: inherit); the exit code is the nakama's. This is why our surface can retire the
 * nakama's live MCP — nothing the vendored CLI does is unreachable through this door.
 */
function passthroughGuest(verb: string, inner: ParsedArgs): number {
  const mp = resolveMempalaceExe();
  const argv = ["--palace", guestPalace(), verb, ...serializeTail(inner)];
  try {
    execFileSync(mp, argv, { stdio: "inherit" });
    return 0;
  } catch (e) {
    const code = (e as { status?: number }).status;
    return typeof code === "number" ? code : 1;
  }
}

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
  "read-holder":   "HOLDER ",
  "one-shot-mine": "MINE   ",
  "chroma":        "CHROMA ",
  "node-vessel":   "VESSEL ",
  "capture-holder":"CAP-HOLD",
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

// ── topology (holder scan) ────────────────────────────────────────────────────

/**
 * The ONE topology renderer, parameterized by the door's island scope — `lares
 * mempalace status` (guest) and `lares sense holders` (sovereign) both ride it, so
 * the two doors can never drift a copy-paste twin. It lists ONLY the holders (and
 * spawner legs) the door OWNS: the guest scope keeps the sovereign capture holder
 * off the guest table, and vice-versa. `verb` heads the surface with the door's own
 * verb name (`status` under mempalace, `holders` under sense).
 */
export function runTopology(args: ParsedArgs, door: DoorScope, verb: string): number {
  const procs   = snapshot().filter((p) => procInPalaceScope(p, door.scope, { spawners: door.spawners }));
  const hooks   = hookPauseState();
  const holders = procs.filter((p) => p.holdsStore);
  const spawners = procs.filter((p) => p.mintsDaemons);
  const head = `${door.label} ${verb}`;

  emit(args, {
    ok: true,
    data: {
      scope: door.scope,
      hooksPaused: hooks.paused,
      hooksMarker: hooks.marker,
      ...(hooks.reason ? { hooksReason: hooks.reason } : {}),
      counts: { total: procs.length, holders: holders.length, spawners: spawners.length },
      processes: procs.map(serialize),
    },
    human: () => {
      console.log(`${head} — palace daemon/hook/capture topology (scope: ${door.scope})\n`);
      console.log(`  hooks: ${hooks.paused ? `PAUSED (${hooks.reason ?? "manual"}${hooks.since ? ` since ${hooks.since}` : ""})` : "LIVE (minting on dispatch)"}`);
      console.log(`  marker: ${hooks.marker}\n`);
      if (procs.length === 0) {
        console.log("  (no palace processes for this island — quiescent)\n");
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
      console.log("  ↪ kill the SPAWNER, not the children: `lares hooks pause` stops the minting,");
      console.log(`    then \`${door.label} quiesce\` drains the warm daemons to zero.`);
    },
  });
  return 0;
}

/** The GUEST door onto the comparator island — `~/.mempalace`, no spawner legs, no hook management. */
function guestDoor(): DoorScope {
  return { scope: guestPalace(), spawners: false, manageHooks: false, label: "lares mempalace" };
}

function cmdStatus(args: ParsedArgs): number {
  return runTopology(args, guestDoor(), "status");
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
 * A drain SELECTOR scoped to ONE island — the per-door instrument the operator
 * ruling names: `lares mempalace` and `lares sense` each control ONLY their own
 * island's holders. Holders count only when their store path sits UNDER `scope`;
 * the daemon-MINTING legs join only when `spawners` (the sovereign memory door
 * owns them, the guest never does). The UNSCOPED `drainable` above stays the
 * teardown drain — it reaps every island in one cut.
 */
function scopedDrain(scope: string, spawners: boolean): (p: PalaceProc) => boolean {
  return (p) => procInPalaceScope(p, scope, { spawners });
}

/**
 * A door onto ONE island's lifecycle — the parameter that keeps the `mempalace`
 * (guest) and `sense` (sovereign) sides ONE implementation, never a copy-paste twin.
 * `scope` is the palace root holders must sit under; `spawners` owns the minting legs
 * (sovereign only); `manageHooks` lets `quiesce` auto-pause/auto-resume the shared hook
 * marker (sovereign only — the guest raises no hook-driven spawner, so it never touches
 * the sovereign minting lever); `label` heads the rendered surface.
 */
export interface DoorScope {
  readonly scope:       string;
  readonly spawners:    boolean;
  readonly manageHooks: boolean;
  readonly label:       string;
}

/**
 * Drain every store-HOLDER and daemon-MINTING job to zero: SIGTERM each (its own
 * graceful flush-then-force handler, `main.ts` for the vessel, mempalace's daemon
 * for the rest), poll the topology until no drainable proc remains, then SIGKILL
 * as a bounded fallback. The live process table is the authority — never a stale
 * PID file.
 */
async function drainHolders(opts: { select?: (p: PalaceProc) => boolean; graceMs?: number; pollMs?: number; killMs?: number } = {}): Promise<{
  drained: number[]; forced: number[]; remaining: PalaceProc[];
}> {
  const select  = opts.select ?? drainable;
  const graceMs = opts.graceMs ?? 8_000;
  const pollMs  = opts.pollMs  ?? 200;
  const killMs  = opts.killMs  ?? 3_000;
  const drained = new Set<number>();

  const holdersNow = (): PalaceProc[] => snapshot().filter(select);
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
  /** Did this call operate the shared hook marker? (false for the guest door — it owns no spawner.) */
  readonly hooksManaged: boolean;
  readonly marker:      string;
}

/**
 * The quiesce core (shared by `lares mempalace quiesce`, `lares sense quiesce` AND
 * `lares palace-teardown --drain`): when it manages the hooks, pause them FIRST (stop
 * the minting); drain every warm holder AND wedged spawner job the door OWNS (SIGTERM →
 * poll → bounded SIGKILL), then confirm zero. Un-pauses on a clean quiet unless `hold`
 * (a teardown keeps minting suppressed until it finishes). Idempotent.
 *
 * `palaceScope` narrows the drain to ONE island's holders (holders under that root,
 * plus the minting legs only when `includeSpawners`); absent → the UNSCOPED drain that
 * teardown needs (every island). `manageHooks` (default true) gates the auto-pause /
 * auto-resume of the SHARED hook marker — the guest door passes false, so it never
 * touches the sovereign minting lever nor clobbers a sovereign `--hold`.
 */
export async function quiescePalace(opts: {
  hold?: boolean;
  palaceScope?: string;
  includeSpawners?: boolean;
  manageHooks?: boolean;
} = {}): Promise<QuiesceResult> {
  const hold        = opts.hold === true;
  const manageHooks = opts.manageHooks !== false;
  const select = opts.palaceScope !== undefined
    ? scopedDrain(opts.palaceScope, opts.includeSpawners === true)
    : drainable;

  const marker = manageHooks ? pauseHooks("quiesce").marker : hookPauseState().marker;
  const { drained, forced, remaining } = await drainHolders({ select });
  const holdersLeft = snapshot().filter(select);
  const quiet = holdersLeft.length === 0;
  if (manageHooks && !hold && quiet) resumeHooks();
  return {
    quiet, drained, forced, holdersLeft, remaining,
    hooksHeld: manageHooks ? (hold || !quiet) : false,
    hooksManaged: manageHooks,
    marker,
  };
}

/**
 * The ONE quiesce runner, parameterized by the door's island scope — `lares mempalace
 * quiesce` (guest) and `lares sense quiesce` (sovereign) both ride it. It drains ONLY
 * the door's own holders (the scoped `quiescePalace`), so the guest door can never
 * SIGTERM the sovereign capture holder — the witnessed two-door breach — and vice-versa.
 * The guest door leaves the shared hook marker untouched (`manageHooks:false`).
 */
export async function runQuiesce(args: ParsedArgs, door: DoorScope, hold: boolean): Promise<number> {
  const { quiet, drained, forced, holdersLeft, remaining, marker, hooksManaged } = await quiescePalace({
    hold, palaceScope: door.scope, includeSpawners: door.spawners, manageHooks: door.manageHooks,
  });
  const head = `${door.label} quiesce`;

  emit(args, {
    ok: quiet,
    ...(quiet ? {} : { error: { code: "conflict", message: `${holdersLeft.length} holder(s) survived SIGTERM+SIGKILL`, hint: `re-run \`${door.label} status\` to inspect; a wedged proc may need manual intervention` } }),
    data: {
      scope: door.scope,
      hooksManaged,
      hooksPaused: hooksManaged && (hold || !quiet),
      hookMarker: marker,
      drained, forced,
      quiescent: quiet,
      remaining: remaining.map(serialize),
    },
    human: () => {
      console.log(`${head} — graceful stop-the-world (scope: ${door.scope})\n`);
      if (hooksManaged) console.log(`  hooks: PAUSED (${marker})`);
      else              console.log("  hooks: untouched (this island raises no hook-driven spawner)");
      if (drained.length === 0) {
        console.log("  drain: no warm holders for this island — already quiet (idempotent no-op).");
      } else {
        console.log(`  drain: SIGTERM'd ${drained.length} holder(s)${forced.length ? `, SIGKILL'd ${forced.length} stubborn` : ""}.`);
      }
      if (quiet) {
        console.log("  confirm: 0 holders remain — QUIESCENT. ✓");
        if (hooksManaged && hold) console.log(`  hooks HELD paused (--hold) — run \`${door.label} resume\` when done.`);
        else if (hooksManaged)    console.log("  hooks un-paused — the warm daemon re-spawns lazily on next use.");
      } else {
        console.log(`  confirm: ⚠ ${holdersLeft.length} holder(s) SURVIVED${hooksManaged ? " — hooks held paused" : ""}:`);
        for (const p of holdersLeft) console.log(`      pid ${p.pid}  ${p.serves}  (${p.cmd})`);
        console.log(`    inspect with \`${door.label} status\`.`);
      }
    },
  });
  return quiet ? 0 : 4;
}

function cmdQuiesce(args: ParsedArgs): Promise<number> {
  return runQuiesce(args, guestDoor(), args.flags["hold"] === true);
}

// ── resume ──────────────────────────────────────────────────────────────────

/**
 * The ONE resume runner — un-pause the SHARED hook marker (the same lever as `lares
 * hooks resume`). An explicit operator act on both doors; the marker is global, so a
 * resume re-arms minting for the whole node. Idempotent.
 */
export function runResume(args: ParsedArgs, door: DoorScope): number {
  const before = hookPauseState();
  const after = resumeHooks();
  emit(args, {
    ok: true,
    data: { scope: door.scope, wasPaused: before.paused, hooksPaused: after.paused, marker: after.marker },
    human: () => {
      console.log(`${door.label} resume\n`);
      console.log(before.paused
        ? "  hooks UN-PAUSED — capture/ingest mint the warm daemon lazily again."
        : "  hooks were already live — nothing to do (idempotent no-op).");
    },
  });
  return 0;
}

function cmdResume(args: ParsedArgs): number {
  return runResume(args, guestDoor());
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
  console.log("The SIDECAR lane. mempalace is a separate tool the vessel never assumes: founding stands the");
  console.log("VESSEL and nothing else, and both the library and the guest store arrive by a deliberate act.\n");
  console.log("Verbs:");
  console.log("  install             the LIBRARY deps (submodule + pip). Left `wake --install` 2026-08-08 —");
  console.log("                      it writes OUTSIDE the vessel root, so founding could never be isolated.");
  console.log("                      The sovereign organs stand separately: `lares sense setup`.");
  console.log("  setup               raise the guest: `mempalace init` + pin hooks.auto_save=false (idempotent)");
  console.log("  harvest [--wing w]  mine EVERY harness transcript into the guest through the vendored miner's");
  console.log("                      OWN vanilla path — no lar_* metadata, no sensorium planes. The clean");
  console.log("                      comparator. `--dry-run` enumerates without staging or mining.");
  console.log("  repave [--confirm]  the RITE: quiesce → verify → tear → stand → harvest. Idempotent; a rite");
  console.log("                      that dies halfway re-runs from the top. Preview by default. REFUSES while");
  console.log("                      anything holds the store, or while the worldline KG still sits inside it.");
  console.log("  status              live topology: every daemon/holder/mine/hook-leg + its SPAWNER");
  console.log("  quiesce [--hold]    graceful stop-the-world: pause hooks → drain daemons → confirm zero");
  console.log("  resume              un-pause the hooks (the warm daemon re-spawns lazily on next use)");
  console.log("\n  superset: ANY other subverb passes through to the vendored CLI against the guest palace —");
  console.log("            `lares mempalace search <q>` · `compress` · `sweep` · `hallways` · `<verb> --help` · …");
  console.log("            (run `lares mempalace --help-mempalace` for the vendored command list).");
  console.log("\n  lane law: `lares mempalace *` touches ONLY the guest ~/.mempalace comparator;");
  console.log("            `lares sense *` touches ONLY the sovereign sensorium.");
  console.log("\nThe status output teaches kill-the-spawner-not-the-children; quiesce is idempotent.");
}

export async function cmdMempalace(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  // `--help-mempalace` (or `help mempalace`) surfaces the vendored CLI's OWN top-level help through our door.
  if (args.flags["help-mempalace"] === true || (verb === "help" && args.positional[1] === "mempalace")) {
    const mp = resolveMempalaceExe();
    try { execFileSync(mp, ["--palace", guestPalace(), "--help"], { stdio: "inherit" }); return 0; }
    catch (e) { const c = (e as { status?: number }).status; return typeof c === "number" ? c : 1; }
  }
  if (!verb || verb === "help" || (args.flags["help"] && !verb)) {
    printHelp();
    return verb ? 0 : 2;
  }
  const inner: ParsedArgs = {
    command: args.command, positional: args.positional.slice(1), options: args.options, flags: args.flags,
  };
  switch (verb) {
    case "install": return cmdMempalaceInstall(inner);
    case "setup":   return cmdSetup(inner);
    case "harvest": return await cmdMempalaceHarvest(inner);
    case "repave":  return await cmdMempalaceRepave(inner);
    case "status":  return cmdStatus(inner);
    case "quiesce": return await cmdQuiesce(inner);
    case "resume":  return cmdResume(inner);
    default:
      // The superset: an unwrapped verb IS a nakama subverb — pass it through to the guest palace.
      return passthroughGuest(verb, inner);
  }
}

/**
 * `lares mempalace install` — the SIDECAR's library deps (submodule + pip).
 *
 * IT LEFT THE BOOT (operator ruling, 2026-08-08). `wake --install` used to run this as part of founding a
 * vessel, which made a separate tool read as part of the base install — and it writes OUTSIDE the vessel
 * root, into the operator's real Python environment, so a founding could never be isolated and a throwaway
 * rehearsal reached the machine it was rehearsing on.
 *
 * The mempalace is a READ-ONLY sidecar submodule. A vessel founds and serves without it; what it unlocks is
 * the memory tooling — the py organs the sovereign sensorium imports as code (`lares sense setup` stands
 * those). Idempotent: already-installed reads as a skip, never as work.
 */
export function cmdMempalaceInstall(args: ParsedArgs): number {
  const steps = installMempalaceIntegration();
  const failed = steps.filter((s) => s.ran && !s.ok);
  emit(args, {
    ok: failed.length === 0,
    ...(failed.length > 0 ? { error: { code: "error", message: `${failed.length} install step(s) failed` } } : {}),
    data: { steps },
    human: () => {
      console.log("mempalace sidecar — library deps");
      for (const s of steps) console.log(`  ${(s.ran ? (s.ok ? "ran" : "FAIL") : "skip").padEnd(6)} ${s.step}: ${s.detail}`);
      console.log(failed.length === 0
        ? "  the sidecar stands. Next, if you want the sovereign organs: lares sense setup"
        : "  incomplete — the vessel still founds and serves without it.");
    },
  });
  return failed.length === 0 ? 0 : 1;
}
