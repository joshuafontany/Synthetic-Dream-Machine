/**
 * flow-run — the daemon-side FLOW RUNNER: given a flow pet-name + an explicit signal, look the seed up
 * (flowSeedByPetname), walk its cap-stack, and RUN each step's instrument routed by hull, threading each
 * step's outcome to the next. The engine behind the anti-verb-sprawl surface — ONE runner drives every
 * composed flow, so new capability arrives as a new FLOW (a composed cap-stack), never another raw verb.
 *
 * ROUTING. The runner never reaches a hull itself; it calls the injected deps, each a thin handle the
 * @daemon (the one seat that reaches both hulls) wires:
 *   - crystallize (ts)        → the mesh crystallize() over the signal-as-occurrences
 *   - phase (py)              → the capture holder's `phase` serve-op (rhythm_phase.phase_encode)
 *   - whiten/couple/gate (ts) → the coupleMesh capstone (it FOLDS whiten→couple→gate in one call), so the
 *     three cap-steps name the capstone's internal floors — the runner runs it ONCE and threads it, never
 *     three re-derivations
 *   - mismatch (daemon)       → the existing ki↔R comparator (the TS-hull coupleMesh ⋈ the R reference)
 *
 * SIGNAL. Explicit for now — the runner reads the passed `rows` matrix (mirrors the mismatch verb's
 * `--signal`). The auto-extraction of a signal FROM a live poured sensorium (the `targets`) stays OWED: a
 * flow that STREAMS fills coupling.children itself; here `targets` ride as provenance only (reserved-empty).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { FLOW_SEEDS, flowSeedByPetname, type CapStep } from "@lararium/mesh";

/** The instrument handles the daemon wires — each routes one cap-step to the hull that computes it. */
export interface FlowRunDeps {
  /** crystallize (ts) — read whether the signal FIXES into shared grammar (born-across-strata ⊕ rigid). */
  crystallize: (rows: number[][], names: string[]) => Record<string, unknown>;
  /** the coupleMesh capstone (ts) — whiten→couple→gate in one, the directed significance-clean coupling. */
  couple:      (rows: number[][], names: string[]) => Record<string, unknown>;
  /** phase (py) — the rhythm decomposition over the poured signal, through the capture holder's serve-op. */
  phase:       (rows: number[][], names: string[], root?: string) => Promise<Record<string, unknown>>;
  /** mismatch (daemon) — the ki↔R honesty check, the one op that reaches both hulls. */
  mismatch:    (rows: number[][], names: string[], root?: string) => Promise<Record<string, unknown>>;
}

/** A flow invocation — a pet-name, an explicit signal, and the targets it reads (provenance for now). */
export interface FlowRunInput {
  petname?: string;
  rows?: number[][];
  names?: string[];
  targets?: string[];
  sensoriumRoot?: string;
}

const stepLabel = (s: CapStep): string => `${s.instrument}:${s.hull}`;

/** List the flow-set — the anti-sprawl doc surface (`lares flow` with no pet-name). */
export function listFlows(): Record<string, unknown> {
  return {
    flows: FLOW_SEEDS.map((f) => ({
      petname:  f.petname,
      arity:    f.arity,
      summary:  f.summary,
      capStack: f.capStack.map(stepLabel),
    })),
  };
}

/**
 * Run a pet-named flow against an explicit signal, routing each cap-step by hull. Bare (no pet-name) lists
 * the set; an unknown pet-name reads an honest error beside the set; a missing signal names the owed
 * auto-extraction rather than fabricating one. The returned outcome threads to the LAST step's result.
 */
export async function runFlow(deps: FlowRunDeps, input: FlowRunInput): Promise<Record<string, unknown>> {
  if (!input.petname) return listFlows();
  const seed = flowSeedByPetname(input.petname);
  if (!seed) return { error: `unknown flow '${input.petname}'`, ...listFlows() };

  const rows = Array.isArray(input.rows) ? input.rows : [];
  const width = rows[0]?.length ?? 0;
  const names = Array.isArray(input.names) && input.names.length === width
    ? input.names
    : Array.from({ length: width }, (_, i) => `s${i}`);
  const capStack = seed.capStack.map(stepLabel);
  const targetsField = input.targets && input.targets.length ? { targets: input.targets } : {};

  // A flow needs an explicit signal for now — auto-extraction from a poured `target` is OWED. Name the
  // wall (reserved-empty coupling.children) rather than run an instrument over an empty matrix.
  if (rows.length === 0) {
    return {
      flow: seed.petname, arity: seed.arity, capStack, ...targetsField,
      note: "no signal — pass --signal <ndjson>; auto-extraction from a poured target is owed (reserved-empty)",
      steps: [], outcome: null,
    };
  }

  const steps: Array<Record<string, unknown>> = [];
  let outcome: Record<string, unknown> | null = null;
  // The coupleMesh capstone folds whiten→couple→gate — run it ONCE and thread across those three cap-steps.
  let coupleMemo: Record<string, unknown> | null = null;

  for (const step of seed.capStack) {
    switch (step.instrument) {
      case "crystallize": {
        outcome = deps.crystallize(rows, names);
        steps.push({ step: stepLabel(step), crystallized: outcome["crystallized"] ?? null });
        break;
      }
      case "phase": {
        outcome = await deps.phase(rows, names, input.sensoriumRoot);
        const sigs = Array.isArray(outcome["signals"]) ? (outcome["signals"] as unknown[]).length : 0;
        steps.push({ step: stepLabel(step), signals: sigs });
        break;
      }
      case "whiten":
      case "couple":
      case "gate": {
        coupleMemo ??= deps.couple(rows, names);
        outcome = coupleMemo;
        steps.push({ step: stepLabel(step), note: "coupleMesh capstone (whiten→couple→gate, run once)" });
        break;
      }
      case "mismatch": {
        outcome = await deps.mismatch(rows, names, input.sensoriumRoot);
        steps.push({ step: stepLabel(step), agree: outcome["agree"] ?? null });
        break;
      }
      default: {
        steps.push({ step: stepLabel(step), skipped: true, note: "no runner bound for this instrument yet" });
      }
    }
  }

  return {
    flow: seed.petname, arity: seed.arity, capStack, ...targetsField,
    signals: width, samples: rows.length,
    steps, outcome,
  };
}
