/**
 * flow — the FlowTiddler schema + the curated flow-set.
 *
 * A Flow is a PET-NAMED, composed cap-stack + targeting: the human/AI-facing unit a single
 * verb calls against one or more sensoria. Flows exist to KILL verb sprawl — the low-level
 * instruments (phase · crystallize · ki · li · whiten · couple · gate · mismatch · …) stop
 * being the SURFACE and become the building blocks a Flow composes. The surface becomes a
 * small, learnable flow-set: one verb (`lares flow <petname>`), one MCP command, each flow
 * pet-named by its own `lar:` URI tiddler-title.
 *
 * A Flow tiddler lives in the sovereign `@daemon` bag; the daemon dispatcher (the verb-tiddler
 * protocol) reads it, runs its `capStack` against the target(s), and lands the outcome in
 * `@daemon/outcomes/`. Composition rides the EXISTING Verb protocol — no new plumbing: a flow
 * invocation is a Verb with `action="flow"`, `args.petname`, and `targets = [sensorium URIs]`.
 * The daemon is the one seat that reaches both hulls, so it routes each cap-step by its `hull`.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { flowUri, DAEMON_BAG_ID } from "./lar-uris.js";

export { flowUri };

/** Which hull runs a cap-step — the daemon routes TS-hull reads vs py/R compute (it reaches both). */
export type CapHull = "ts" | "py" | "daemon";

/** One step in a flow's cap-stack — an instrument reference, routed by its hull. */
export interface CapStep {
  /** the instrument the step invokes (phase · crystallize · whiten · couple · gate · mismatch · …). */
  readonly instrument: string;
  /** which hull computes it — the daemon routes TS-hull vs py/R compute. */
  readonly hull: CapHull;
  /** an optional one-line note on what the step carries. */
  readonly note?: string;
}

/** How many sensoria a flow reads — `one` (read this) vs `many` (compare these; the two-stream flows). */
export type TargetArity = "one" | "many";

/** The stored Flow tiddler — a callable, composed cap-stack addressed by its pet-name lar: URI. */
export interface FlowTiddler {
  /** stable lar: URI pet-name of this flow — its own address AND its handle. */
  readonly title: string;
  /** the human/AI-facing handle (the verb argument): crystal · rhythm · couple · … */
  readonly petname: string;
  /** the composed pipeline — ordered instrument refs the daemon runs in sequence. */
  readonly capStack: readonly CapStep[];
  /** targeting arity — one sensorium, or many (the comparison flows). */
  readonly arity: TargetArity;
  /** the one-line what-this-reads shown in `lares flow` (no arg) — the anti-sprawl doc-line. */
  readonly summary: string;
  /** ISO 8601 last-update timestamp. */
  readonly updatedAt: string;
  /** the authority that wrote this flow tiddler. */
  readonly authority: string;
  /** owning bag — the sovereign `@daemon` bag. */
  readonly bag: string;
}

/** A flow's essential definition, before a writer stamps its title/authority/bag/timestamp. */
export type FlowSeed = Pick<FlowTiddler, "petname" | "capStack" | "arity" | "summary">;

// ── the curated flow-set — the SEED flows that ship, the small learnable surface ────────────

/**
 * The seed flow-set. Each entry composes existing instruments into ONE callable read. New
 * capability arrives as a new FLOW (a composed cap-stack), never as another raw verb — that is
 * the discipline that stops the surface exploding into a verb-zoo no one learns.
 */
export const FLOW_SEEDS: readonly FlowSeed[] = [
  {
    petname: "rhythm",
    arity: "one",
    summary: "the rhythm decomposition — where each position sits in the recovered beat, per lens stratum.",
    capStack: [
      { instrument: "phase", hull: "py", note: "per-position multi-scale phase+amplitude over the poured stream, decomposed by the lens coordinate" },
    ],
  },
  {
    petname: "crystal",
    arity: "many",
    summary: "what fixes into shared grammar across streams/speakers — born-across-strata ⊕ rigid.",
    capStack: [
      { instrument: "crystallize", hull: "ts", note: "nucleate over the lens strata (a lone stratum never crystallizes) + temporalRigidity re-lock" },
    ],
  },
  {
    petname: "couple",
    arity: "many",
    summary: "the directed coupling between streams + its honesty check (whitened → coupled → gated, TS ⋈ R).",
    capStack: [
      { instrument: "whiten", hull: "ts", note: "signed-innovation prewhitening — the correct TE pre-step (Behrendt)" },
      { instrument: "couple", hull: "ts", note: "the multivariate conditional-TE coupling over the whitened children" },
      { instrument: "gate", hull: "ts", note: "cmi-significance — the chi-squared gate over the coupling" },
      { instrument: "mismatch", hull: "daemon", note: "the honesty check — the TS-hull coupling ⋈ the R effective-TE reference" },
    ],
  },
];

// ── construction + parse (isomorphic with the tiddler storage) ──────────────────────────────

/** Stamp a FlowSeed into a stored FlowTiddler — title from the pet-name, bag = the @daemon bag. */
export function buildFlowTiddler(seed: FlowSeed, authority: string, updatedAt: string): FlowTiddler {
  return {
    title: flowUri(seed.petname),
    petname: seed.petname,
    capStack: seed.capStack,
    arity: seed.arity,
    summary: seed.summary,
    updatedAt,
    authority,
    bag: DAEMON_BAG_ID,
  };
}

/**
 * Parse a capStack value from a tiddler field into CapStep[]. Handles the JS/JSON array shape
 * (Automerge-stored) and a compact TW5 list string `"instrument:hull instrument:hull …"`
 * (space-separated, `instrument:hull` per step; no spaces appear inside either token).
 * Returns [] for null / undefined / unrecognised types (a flow with no steps reads as vacuous).
 */
export function parseCapStack(raw: unknown): CapStep[] {
  if (Array.isArray(raw)) {
    const steps: CapStep[] = [];
    for (const e of raw) {
      if (e && typeof e === "object" && typeof (e as CapStep).instrument === "string" && typeof (e as CapStep).hull === "string") {
        const step = e as CapStep;
        steps.push(step.note !== undefined ? { instrument: step.instrument, hull: step.hull, note: step.note } : { instrument: step.instrument, hull: step.hull });
      }
    }
    return steps;
  }
  if (typeof raw === "string") {
    const steps: CapStep[] = [];
    for (const tok of raw.split(/\s+/).filter(Boolean)) {
      const [instrument, hull] = tok.split(":");
      if (instrument && (hull === "ts" || hull === "py" || hull === "daemon")) {
        steps.push({ instrument, hull });
      }
    }
    return steps;
  }
  return [];
}

/** Look a seed flow up by its pet-name (the verb argument). */
export function flowSeedByPetname(petname: string): FlowSeed | undefined {
  return FLOW_SEEDS.find((f) => f.petname === petname);
}
