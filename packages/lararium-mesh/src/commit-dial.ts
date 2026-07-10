/**
 * commit-dial — the crucible-before-binding floor for a minted sink. A candidate stands PROPOSED until it
 * CROSSES a floor; only then the dial RULES it bound. Nothing binds by fiat — an unfloored mint reads as
 * the Council's rubber-stamp. The floor reads the gate's own outputs: birth (a nucleus crossed r*),
 * standing (the rhythm re-locks — required on a temporal feed, waived on an atemporal corpus feed), and
 * supersaturation (real feeding, not a cold spike). PROPOSED never seals; the caller may hold it open.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

export type CommitState = "PROPOSED" | "RULED";

export interface CommitFloor {
  /** Supersaturation the candidate must clear to bind (default 1 = equilibrium; a burst clears it). */
  readonly minSupersaturation?: number;
  /** Require the rhythm to re-lock (standing) — true on a temporal feed, false on an atemporal corpus. */
  readonly requireStanding?: boolean;
}

export interface CommitInput {
  readonly born: boolean;
  readonly rigid: boolean;
  readonly supersaturation: number;
}

export interface CommitVerdict {
  /** RULED crosses the floor (binds); PROPOSED stands held below it. */
  readonly state: CommitState;
  /** True when the candidate binds (state RULED). */
  readonly bound: boolean;
  /** Why the dial held or ruled — the crucible's reason. */
  readonly reason: string;
}

/**
 * Rule a candidate PROPOSED or RULED against the crucible floor. A sub-critical candidate holds; a born
 * candidate that does not re-lock (when standing gets required) holds; a born candidate below the
 * supersaturation floor holds; a born, standing, well-fed candidate binds.
 */
export function commitDial(input: CommitInput, floor: CommitFloor = {}): CommitVerdict {
  const minSupersaturation = floor.minSupersaturation ?? 1;
  const requireStanding = floor.requireStanding ?? true;

  if (!input.born) {
    return { state: "PROPOSED", bound: false, reason: "sub-critical — no nucleus crossed r*" };
  }
  if (requireStanding && !input.rigid) {
    return { state: "PROPOSED", bound: false, reason: "born but the rhythm does not re-lock (no standing)" };
  }
  if (!(input.supersaturation >= minSupersaturation)) {
    return {
      state: "PROPOSED",
      bound: false,
      reason: `supersaturation ${input.supersaturation.toFixed(2)} holds below the floor ${minSupersaturation}`,
    };
  }
  return { state: "RULED", bound: true, reason: "crosses the crucible floor — born, standing, fed" };
}
