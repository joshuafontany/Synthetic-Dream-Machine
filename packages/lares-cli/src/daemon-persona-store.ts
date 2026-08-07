/**
 * daemon-persona-store — the @persona-backed adapters for a human's OWN-persona names, and the local-first
 * floor beneath them.
 *
 * The pet-name and the declared Handle ride the sovereign @persona doc, which the self-slot FLEET-syncs to the
 * operator's own device fleet and never volunteers to a stranger — so a rename lands on every device of the
 * one human. The `seat` claim does NOT ride: a Kahu chair names a seat on a PARTICULAR node, so each node
 * keeps its own.
 *
 * LOCAL-FIRST, NOT DAEMON-REQUIRED. A vessel FOUNDS before it breathes — `lares persona new` runs while no
 * daemon listens — so every write lands on the local fs store FIRST and mirrors to @persona when the daemon
 * answers. A read prefers the fleet (a fleet-mate's rename outranks this device's stale copy) and falls back
 * to local when the sock is quiet. That posture reads straight off the causal-islands law: a node acts on its
 * own log and reconciles when a peer appears, never blocking on one.
 *
 * WHAT AN UNREACHABLE DAEMON MEANS. Silence here reports NODE-LOCAL, never failure — `lares persona sync`
 * carries the local names up once the hearth breathes. The adapter never swallows a daemon error into a silent
 * local fallback for the SHAPE of the call; it distinguishes "no daemon listening" (expected, pre-boot) from
 * "the daemon refused this verb" (surfaced), so a caller can tell a quiet sock from a real refusal.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-policy
 */

import type {
  OwnPersonaPetnameStore, PersonaDeclaration, PersonaDeclarationStore,
} from "@lararium/mesh";
import { runVerb, type RunVerbOptions } from "./verb-call.js";
import { summaryOutput } from "./verb-result.js";
import { vesselDid } from "./env.js";

/**
 * The DID every fleet verb rides as `requested-by`, or NULL when this install stands no vessel key yet.
 *
 * A vessel with no key names no place, so it reaches no fleet — the founding sequence runs exactly there, and
 * a throw would turn "not founded yet" into a failure. Absent a key the caller keeps the pure local floor and
 * `lares persona sync` carries the names up once the vessel stands.
 */
export async function fleetPeerDid(): Promise<string | null> {
  return vesselDid().then((d) => d).catch(() => null);
}

/** One own persona as the fleet reads it — the two names that ride, keyed by handle-index. */
export interface FleetSelf {
  readonly handleIndex: number;
  readonly petname?: string;
  readonly handle?: string;
}

/**
 * A daemon that never answered reads as NODE-LOCAL rather than as a failure — the founding sequence runs
 * before any hearth breathes. A verb the daemon RAN and refused surfaces as itself.
 */
function quietSock(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNREFUSED|ENOENT|not running|no daemon|socket|connect/i.test(msg);
}

/** Drive one persona verb, or report the sock as quiet. Returns null when no daemon listens. */
async function callOrQuiet(
  verb: string, args: Record<string, unknown>, requestedBy: string, opts: RunVerbOptions,
): Promise<Record<string, unknown> | null> {
  try {
    const r = await runVerb(verb, args, requestedBy, opts);
    if (r.status === "error") throw new Error(r.errorMessage ?? `${verb} failed`);
    return summaryOutput(r) ?? {};
  } catch (err) {
    if (quietSock(err)) return null;
    throw err;
  }
}

/** Read the whole fleet multitude off @persona, or null when no daemon listens. */
export async function readFleetSelves(
  requestedBy: string, opts: RunVerbOptions = {},
): Promise<readonly FleetSelf[] | null> {
  const out = await callOrQuiet("persona-selves", {}, requestedBy, opts);
  if (out === null) return null;
  return Array.isArray(out["selves"]) ? (out["selves"] as FleetSelf[]) : [];
}

/**
 * Build the FLEET-mirroring pet-name store — every write lands locally FIRST (the floor a pre-boot founding
 * needs) and mirrors to @persona when the daemon answers; every read prefers the fleet's copy. `local` supplies
 * the node fs store the mirror wraps.
 */
export function makeFleetPetnameStore(
  local: OwnPersonaPetnameStore, requestedBy: string, opts: RunVerbOptions = {},
): OwnPersonaPetnameStore {
  return {
    async get(handleIndex) {
      const selves = await readFleetSelves(requestedBy, opts);
      const fleet = selves?.find((s) => s.handleIndex === handleIndex)?.petname;
      return fleet ?? await local.get(handleIndex);
    },
    async set(handleIndex, petname) {
      await local.set(handleIndex, petname);
      await callOrQuiet("persona-label", { handleIndex, petname }, requestedBy, opts);
    },
    async clear(handleIndex) {
      await local.clear(handleIndex);
      await callOrQuiet("persona-label", { handleIndex, petname: "" }, requestedBy, opts);
    },
    async entries() {
      const selves = await readFleetSelves(requestedBy, opts);
      if (selves === null) return local.entries();
      // The fleet's view WINS where it names a persona, and the local floor fills the rest — a persona this
      // device named while the sock lay quiet still reads, and `persona sync` carries it up.
      const merged = new Map<number, string>(await local.entries());
      for (const s of selves) if (s.petname) merged.set(s.handleIndex, s.petname);
      return [...merged.entries()].map(([k, v]) => [k, v] as const).sort((a, b) => a[0] - b[0]);
    },
  };
}

/**
 * Build the FLEET-mirroring declaration store — a SPLIT store, and the split is the point. The declared
 * `handle` rides @persona (a persona answers to the same name on every device of the human); the `seat` claim
 * stays LOCAL (a Kahu chair belongs to the node that holds it). Reads compose the two.
 */
export function makeFleetDeclarationStore(
  local: PersonaDeclarationStore, requestedBy: string, opts: RunVerbOptions = {},
): PersonaDeclarationStore {
  const compose = (localDecl: PersonaDeclaration | undefined, fleetHandle: string | undefined): PersonaDeclaration | undefined => {
    const handle = fleetHandle ?? localDecl?.handle;
    const seat   = localDecl?.seat;
    if (handle === undefined && seat === undefined) return undefined;
    return { ...(handle !== undefined ? { handle } : {}), ...(seat !== undefined ? { seat } : {}) };
  };
  return {
    async get(handleIndex) {
      const selves = await readFleetSelves(requestedBy, opts);
      return compose(await local.get(handleIndex), selves?.find((s) => s.handleIndex === handleIndex)?.handle);
    },
    async set(handleIndex, declaration) {
      await local.set(handleIndex, declaration);
      if (declaration.handle !== undefined) {
        await callOrQuiet("persona-handle", { handleIndex, handle: declaration.handle }, requestedBy, opts);
      }
    },
    async clear(handleIndex) {
      await local.clear(handleIndex);
      await callOrQuiet("persona-handle", { handleIndex, handle: "" }, requestedBy, opts);
    },
    async entries() {
      const selves = await readFleetSelves(requestedBy, opts);
      const byIndex = new Map<number, PersonaDeclaration>(await local.entries());
      if (selves !== null) {
        for (const s of selves) {
          const composed = compose(byIndex.get(s.handleIndex), s.handle);
          if (composed) byIndex.set(s.handleIndex, composed);
        }
      }
      return [...byIndex.entries()].map(([k, v]) => [k, v] as const).sort((a, b) => a[0] - b[0]);
    },
  };
}
