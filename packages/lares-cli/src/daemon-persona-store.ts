/**
 * daemon-persona-store — the @persona-backed adapters for a human's OWN-persona names, and the local-first
 * floor beneath them.
 *
 * The pet-name and the declared Handle ride the sovereign persona doc, which the self-slot FLEET-syncs to the
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
 * A MIRROR NEVER FAILS THE ACT IT MIRRORS. The local write already landed, so an unreachable or refusing
 * fleet leaves the vessel correct and merely un-carried — and the reverse would be worse than useless: it
 * would fail `persona new` on exactly the vessels that reach no fleet. A Herm, or any vessel whose @oracle
 * registry names no @persona, never REGISTERS these verbs at all (capability-degradation by composition), so
 * "the daemon refused" and "no daemon listening" name the same outcome for the caller: NODE-LOCAL.
 *
 * THE REASON STILL TRAVELS. A read hands back a reached/why pair rather than a bare null, so the caller can
 * print WHY the names stayed home — a quiet sock and a refusing daemon read differently to a human even
 * though both leave the same state. `lares persona sync` carries the names up once the hearth breathes.
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

/** What a fleet call came back with — the names it read, or why they stayed home. */
export type FleetRead =
  | { readonly reached: true;  readonly selves: readonly FleetSelf[] }
  | { readonly reached: false; readonly why: string };

/** Why one fleet call did not land, or null when it did. A mirror reports; it never throws. */
async function mirror(
  verb: string, args: Record<string, unknown>, requestedBy: string, opts: RunVerbOptions,
): Promise<string | null> {
  try {
    const r = await runVerb(verb, args, requestedBy, opts);
    return r.status === "error" ? (r.errorMessage ?? `${verb} failed`) : null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Drive one persona verb; hand back its summary, or the reason it did not land. */
async function callFleet(
  verb: string, args: Record<string, unknown>, requestedBy: string, opts: RunVerbOptions,
): Promise<{ ok: true; out: Record<string, unknown> } | { ok: false; why: string }> {
  try {
    const r = await runVerb(verb, args, requestedBy, opts);
    if (r.status === "error") return { ok: false, why: r.errorMessage ?? `${verb} failed` };
    return { ok: true, out: summaryOutput(r) ?? {} };
  } catch (err) {
    return { ok: false, why: err instanceof Error ? err.message : String(err) };
  }
}

/** Read the whole fleet multitude off @persona, or the reason the read did not land. */
export async function readFleetSelves(
  requestedBy: string, opts: RunVerbOptions = {},
): Promise<FleetRead> {
  const r = await callFleet("persona-selves", {}, requestedBy, opts);
  if (!r.ok) return { reached: false, why: r.why };
  return { reached: true, selves: Array.isArray(r.out["selves"]) ? (r.out["selves"] as FleetSelf[]) : [] };
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
      const read = await readFleetSelves(requestedBy, opts);
      const fleet = read.reached ? read.selves.find((s) => s.handleIndex === handleIndex)?.petname : undefined;
      return fleet ?? await local.get(handleIndex);
    },
    async set(handleIndex, petname) {
      await local.set(handleIndex, petname);
      await mirror("persona-label", { handleIndex, petname }, requestedBy, opts);
    },
    async clear(handleIndex) {
      await local.clear(handleIndex);
      await mirror("persona-label", { handleIndex, petname: "" }, requestedBy, opts);
    },
    async entries() {
      const read = await readFleetSelves(requestedBy, opts);
      if (!read.reached) return local.entries();
      const selves = read.selves;
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
      const read = await readFleetSelves(requestedBy, opts);
      const fleetHandle = read.reached ? read.selves.find((s) => s.handleIndex === handleIndex)?.handle : undefined;
      return compose(await local.get(handleIndex), fleetHandle);
    },
    async set(handleIndex, declaration) {
      await local.set(handleIndex, declaration);
      if (declaration.handle !== undefined) {
        await mirror("persona-handle", { handleIndex, handle: declaration.handle }, requestedBy, opts);
      }
    },
    async clear(handleIndex) {
      await local.clear(handleIndex);
      await mirror("persona-handle", { handleIndex, handle: "" }, requestedBy, opts);
    },
    async entries() {
      const read = await readFleetSelves(requestedBy, opts);
      const byIndex = new Map<number, PersonaDeclaration>(await local.entries());
      if (read.reached) {
        for (const s of read.selves) {
          const composed = compose(byIndex.get(s.handleIndex), s.handle);
          if (composed) byIndex.set(s.handleIndex, composed);
        }
      }
      return [...byIndex.entries()].map(([k, v]) => [k, v] as const).sort((a, b) => a[0] - b[0]);
    },
  };
}
