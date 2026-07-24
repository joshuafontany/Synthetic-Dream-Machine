/**
 * `lares sense` lifecycle sub-verbs — the DURABLE sensorium lifecycle door, run DIRECT (CLI → the node
 * lifecycle-verb functions over manifest.json; no store holder, no daemon needed). One capability, one
 * seat (the reversibility×trust grid mirrored TS-side): an HITL verb (promote · retire · purge) refuses
 * without the operator's `--approve` hand at the door, exactly as the MCP surface refuses without an
 * approval cap (E5). The reads (roster · inspect) and the reversible re-settle (reconcile · un-retire)
 * run free (HOTL).
 *
 *   lares sense roster                         list every sensorium + its lifecycle
 *   lares sense inspect  <name>                one sensorium's manifest facets
 *   lares sense reconcile <name> | --all       re-settle against evidence (on-demand; idempotent)
 *   lares sense build    <name> --ephemeral    mint a fresh pioneer (refuses a name-collision)
 *   lares sense promote  <name> --approve      climb a rung (in-place field-flip)   [+ --store-swap <t>, gated]
 *   lares sense retire   <name> --grounds <g> --approve   judged tombstone (NO byte-delete)
 *   lares sense un-retire <name>               move-not-delete restore of the prior state
 *   lares sense purge    <name> --approve      the irreversible byte GC (tombstone-only)
 *
 * The MCP three-way mirror for these sub-verbs is DEFERRED (a named ahead-of-surface allowance) — its
 * house-consistent routed executor lands in open-node-vessel.ts; the CLI-direct door carries no such tie.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#sensorium-lifecycle
 */

import {
  rosterSensoria, inspectSensorium, reconcileSensorium, reconcileAllSensoria,
  buildEphemeralSensorium, promoteSensorium, retireSensorium, unRetireSensorium, purgeSensorium,
  sensoriumDir,
} from "@lararium/node";
import { guardHitl, MUSTIE_GROUNDS } from "@lararium/mesh";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

/** Emit one lifecycle outcome uniformly (legible-intent: the verb + its result ride the payload). */
function landed(args: ParsedArgs, verb: string, data: unknown): number {
  emit(args, {
    ok: true,
    data: { verb, result: data },
    human: () => { console.log(`lares sense ${verb}\n`); console.log(JSON.stringify(data, null, 2)); },
  });
  return 0;
}

/** Emit one lifecycle error uniformly. */
function refused(args: ParsedArgs, verb: string, message: string, hint?: string): number {
  emit(args, {
    ok: false,
    error: { code: "verb-error", message, ...(hint ? { hint } : {}) },
    human: () => console.error(`lares sense ${verb} — ${message}${hint ? `\n  ${hint}` : ""}`),
  });
  return exitFor("verb-error");
}

/** The operator's hand at the door — an HITL verb refuses without `--approve` (the TS mirror of the cap). */
function requireApprove(args: ParsedArgs, verb: string): void {
  guardHitl(verb, args.flags["approve"] === true ? "operator-hand" : undefined);
}

export function cmdSenseRoster(args: ParsedArgs): number {
  return landed(args, "roster", { sensoria: rosterSensoria() });
}

export function cmdSenseInspect(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "inspect", "inspect wants a sensorium name", "lares sense inspect <name>");
  const insp = inspectSensorium(name);
  if (!insp) return refused(args, "inspect", `no sensorium named '${name}'`, "lares sense roster");
  return landed(args, "inspect", insp);
}

export function cmdSenseReconcile(args: ParsedArgs): number {
  try {
    if (args.flags["all"] === true) return landed(args, "reconcile", { all: reconcileAllSensoria() });
    const name = args.positional[0];
    if (!name) return refused(args, "reconcile", "reconcile wants a sensorium name (or --all)", "lares sense reconcile <name>");
    return landed(args, "reconcile", reconcileSensorium(sensoriumDir(name)));
  } catch (e) {
    return refused(args, "reconcile", e instanceof Error ? e.message : String(e));
  }
}

export function cmdSenseBuild(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "build", "build wants a sensorium name", "lares sense build <name> --ephemeral");
  if (args.flags["ephemeral"] !== true) {
    return refused(args, "build", "build mints an EPHEMERAL sensorium — pass --ephemeral", "lares sense build <name> --ephemeral");
  }
  try {
    return landed(args, "build", buildEphemeralSensorium(name));
  } catch (e) {
    return refused(args, "build", e instanceof Error ? e.message : String(e));
  }
}

export function cmdSensePromote(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "promote", "promote wants a sensorium name", "lares sense promote <name> --approve");
  try {
    requireApprove(args, "promote");
    const storeSwapTarget = args.options["store-swap"];
    return landed(args, "promote", promoteSensorium(name, storeSwapTarget ? { storeSwapTarget } : {}));
  } catch (e) {
    return refused(args, "promote", e instanceof Error ? e.message : String(e));
  }
}

export function cmdSenseRetire(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "retire", "retire wants a sensorium name", `lares sense retire <name> --grounds <${MUSTIE_GROUNDS.join("|")}> --approve`);
  try {
    requireApprove(args, "retire");
    return landed(args, "retire", retireSensorium(name, args.options["grounds"]));
  } catch (e) {
    return refused(args, "retire", e instanceof Error ? e.message : String(e), `grounds: ${MUSTIE_GROUNDS.join(" · ")}`);
  }
}

export function cmdSenseUnRetire(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "un-retire", "un-retire wants a sensorium name", "lares sense un-retire <name>");
  try {
    return landed(args, "un-retire", unRetireSensorium(name));
  } catch (e) {
    return refused(args, "un-retire", e instanceof Error ? e.message : String(e));
  }
}

export function cmdSensePurge(args: ParsedArgs): number {
  const name = args.positional[0];
  if (!name) return refused(args, "purge", "purge wants a sensorium name", "lares sense purge <name> --approve");
  try {
    requireApprove(args, "purge");
    return landed(args, "purge", purgeSensorium(name, "operator-hand"));
  } catch (e) {
    return refused(args, "purge", e instanceof Error ? e.message : String(e));
  }
}
