/**
 * `lares vessel` — THE VESSEL DOOR. One namespace for the vessel's own causal island.
 *
 * ── THE LAW THIS ENACTS ─────────────────────────────────────────────────────────────────────────
 * ONE NAMESPACE PER CAUSAL ISLAND; THE PLANE IS A PARAMETER, NEVER A NEW VERB. That law already
 * governs every other plane in this CLI — `nexus`, `persona`, `vault`, `library`, `circle`, `cabal`,
 * `sense`, `sensorium` each hold one door over one island. The vessel — its store, its genesis
 * artifact, its daemon, its corpus — forms an island by every test this house applies, and it holds
 * this door. A door absorbs new capability; a plane with no door has nowhere to put it but the top,
 * and that is how a top-level verb count grows back.
 *
 * ── SEVEN PRIMITIVES + ONE READ ─────────────────────────────────────────────────────────────────
 * A primitive names ONE motion and cannot be expressed as a sequence of the others. Everything else
 * composes, and a composition earns a pet-name rather than a top-level name:
 *
 *   stop   ends a running daemon by port, graceful then forced — never a restart in disguise
 *   clear  pares the vessel store + the projection watermark — identity, seal, library and registry
 *          stand outside it
 *   bake   re-derives the genesis island from the engine + the packed plugin — moves NO identity
 *   found  mints the vessel identity, the persona root, the social planes and the bootstrap —
 *          idempotent, skips what stands
 *   stand  brings the daemon up, foreground or detached, and reports what it found
 *   seed   plants every bags holding back into its doc, kind-routed, diff-gated — idempotent
 *   read   the pure inspection that starts nothing
 *
 * `build` — compile the workspace and stamp the source digest — rides inside `flow refresh` rather
 * than standing alone: it moves the TREE, not the vessel, and a door over one island should not hold
 * a motion that belongs to the workspace.
 *
 * ── WHAT THIS DOOR DOES NOT DO ──────────────────────────────────────────────────────────────────
 * It adds and removes NOTHING. Every sub-door hands the operator's own args straight to the handler
 * beneath and changes nothing on the way: behaviour lives in the handlers, dispatch lives here. A door
 * that also moved behaviour could not be verified — a green suite would prove neither half.
 *
 * Meme: lar:///ha.ka.ba/lares/cli/vessel-door
 */

import type { ParsedArgs } from "../parse-args.js";
import { cmdInit }     from "./init.js";
import { cmdWake }     from "./wake.js";
import { cmdSeed }     from "./seed.js";
import { cmdStatus, cmdNodeStop } from "./status.js";
import { cmdRegenesis } from "./regenesis.js";
import {
  cmdBuildGenesis, cmdServe, cmdDev, cmdReset, cmdReconcile, cmdRebuild, cmdRefresh,
} from "./scripted.js";

type Sub = (args: ParsedArgs) => Promise<number>;

/**
 * Hand the sub-door's own args down, with the sub-door NAME consumed.
 *
 * The handlers beneath read `positional[0]` as their first real argument, so leaving "seed" or "read"
 * sitting there would silently feed each handler its own name — the kind of defect that reads as a
 * mysterious argument rather than as a dispatch bug.
 */
const under = (args: ParsedArgs): ParsedArgs => ({ ...args, positional: args.positional.slice(1) });

/** Raise a flag on the way down — how one door's spelling reaches a handler that named it otherwise. */
const withFlag = (args: ParsedArgs, key: string, value = true): ParsedArgs =>
  ({ ...args, flags: { ...args.flags, [key]: value } });

/**
 * `vessel stand` — the ENTRY POINT, and the one sub-door that carries modes.
 *
 * Standing a vessel runs ONE motion with several postures, and each posture rides a flag:
 * `--foreground` chooses who owns the terminal, `--with-app` adds the Vite face beside it, `--restart`
 * clears the port first. None of them names a different motion.
 */
async function standVessel(args: ParsedArgs): Promise<number> {
  const a = under(args);
  if (a.flags["with-app"])    return cmdDev(a);
  if (a.flags["restart"])     {
    // `--clear` reads as the operator's word for the wipe; the handler beneath spells it `fresh`.
    return cmdReconcile(a.flags["clear"] ? withFlag(a, "fresh") : a);
  }
  if (a.flags["foreground"])  return cmdServe(a);
  return cmdWake(a);                 // the default posture: attach-or-start, detached, and REPORT
}

/**
 * `vessel flow <petname>` — the pet-named cap-stacks over the primitives.
 *
 * Each of these composes a SEQUENCE, and naming a sequence at the top level is exactly how a surface
 * grows back. They live behind one sub-door so a new composition arrives as a new flow rather than a new
 * verb. Distinct from `lares flow`, which composes signal instruments over the sensorium planes —
 * same shape of surface, different island.
 */
const FLOWS: Readonly<Record<string, { readonly composes: string; readonly run: Sub }>> = {
  refresh: { composes: "build · stop · clear · stand", run: cmdRefresh },
  rebuild: { composes: "bake · stand",                 run: cmdRebuild },
  // Rebirth of a STANDING vessel names a real motion, and stop-wipe-bake carries it. A fresh founding
  // never runs it — nothing stands there to tear down.
  rebirth: { composes: "stop · clear · bake · stand · seed", run: cmdRegenesis },
};

async function runFlow(args: ParsedArgs): Promise<number> {
  const petname = args.positional[1];
  const flow = petname ? FLOWS[petname] : undefined;
  if (!flow) {
    if (petname) console.error(`lares vessel flow: unknown flow "${petname}"\n`);
    console.error("lares vessel flow <petname> — the pet-named cap-stacks over the vessel primitives\n");
    for (const [name, f] of Object.entries(FLOWS)) {
      console.error(`  ${name.padEnd(9)} ${f.composes}`);
    }
    return petname ? 2 : 0;
  }
  // Two names come off: "flow" and the petname.
  return flow.run({ ...args, positional: args.positional.slice(2) });
}

/** The door's map. Every entry names a primitive, a read, or the one composed sub-door. */
const SUBS: Readonly<Record<string, { readonly summary: string; readonly run: Sub }>> = {
  found: { summary: "mint the vessel identity, persona root, social planes and bootstrap (idempotent)", run: (a) => cmdInit(under(a)) },
  stand: { summary: "bring the daemon up and report — [--foreground] [--with-app] [--restart [--clear]]", run: standVessel },
  stop:  { summary: "halt the daemon on the port (graceful → forced); a free port reads as stopped",     run: (a) => cmdNodeStop(under(a)) },
  clear: { summary: "wipe the store + projection watermark, re-bake and re-found (identity survives)",   run: (a) => cmdReset(under(a)) },
  bake:  { summary: "re-derive the genesis island from the engine + packed plugin (moves no identity)",  run: (a) => cmdBuildGenesis(under(a)) },
  seed:  { summary: "plant every bags/@* holding back into its doc, kind-routed and diff-gated",         run: (a) => cmdSeed(under(a)) },
  read:  { summary: "inspect and start nothing — bootstrap, storage, port, seal, personas, quorum",      run: (a) => cmdStatus(under(a)) },
  flow:  { summary: "the pet-named cap-stacks: refresh · rebuild · rebirth",                             run: runFlow },
};

function printVesselHelp(): void {
  console.log("lares vessel — the vessel's own door (one namespace, one causal island)\n");
  for (const [name, s] of Object.entries(SUBS)) {
    console.log(`  ${name.padEnd(7)} ${s.summary}`);
  }
  console.log("\n  A fresh founding composes: vessel found · vessel stand · vessel seed");
}

export async function cmdVessel(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub || sub === "help") { printVesselHelp(); return 0; }
  const entry = SUBS[sub];
  if (!entry) {
    console.error(`lares vessel: unknown sub-door "${sub}"\n`);
    printVesselHelp();
    return 2;
  }
  return entry.run(args);
}

/** The sub-door names, for the surfaces that mirror this table rather than keeping their own. */
export const VESSEL_SUBS: readonly string[] = Object.keys(SUBS);
