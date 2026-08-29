/**
 * posture-plan — which posture `lares vessel stand` takes, and what that posture cannot carry.
 *
 * ── ONE VERB, FOUR HANDLERS ─────────────────────────────────────────────────────────────────────
 * Standing a vessel runs one motion, but the postures reach it through four different programs, and
 * each program reads a different slice of the command line. A flag typed beside the wrong one lands
 * nowhere: no warning, exit 0, and the person who ran it has every reason to believe it took.
 *
 * This table is the only place that knows the difference. It reads NAMES, touches nothing, and
 * returns a plan a caller can print — so the drop becomes a sentence instead of a silence.
 *
 * ── THE ONE REFUSAL ─────────────────────────────────────────────────────────────────────────────
 * `--observe` vows the run has no effects, and harnesses, hooks and the wake report lean on that
 * vow. Dropped, it does not degrade — it INVERTS, booting the daemon the caller asked about. So it
 * refuses beside an acting posture. Every other drop warns and stands, because a person who typed
 * one extra flag wants their vessel up more than they want a wall.
 *
 * Meme: lar:///ha.ka.ba/lares/cli/vessel-door
 */

/** The postures, in the order `standVessel` tests them — first match wins, the rest shadow. */
export const POSTURES = ["with-app", "restart", "foreground", "report"] as const;
export type Posture = (typeof POSTURES)[number];

/**
 * What each posture's handler actually reads.
 *
 * Measured from the handlers, not from their documentation: `cmdStandWithApp` takes `_args` and
 * defers to `pnpm dev`, so it reads NOTHING — its own port and root included.
 */
const READS: Record<Posture, readonly string[]> = {
  "report":     ["observe", "init", "install", "admit", "claude", "codex", "copilot", "vscode", "port", "root", "json"],
  "foreground": ["wiki", "port", "root", "debug", "json"],
  "restart":    ["port", "clear", "fresh", "wiki", "root", "debug", "json"],
  "with-app":   [],
};

/** Flags this door defines. A name outside the union belongs to arg parsing, never to a posture. */
const KNOWN: readonly string[] = [
  ...new Set([...POSTURES, ...Object.values(READS).flat()]),
];

export interface PosturePlan {
  /** The posture that wins. */
  readonly posture: Posture;
  /** Named postures the winner shadows — a person who typed two gets told which took. */
  readonly shadowed: readonly string[];
  /** Known flags this posture's handler never reads. */
  readonly dropped: readonly string[];
  /** A refusal sentence, or `null` to stand. */
  readonly refuse: string | null;
}

/**
 * Read a plan from the flag names present on the command line.
 *
 * Names only: the values never reach here, because which posture carries which flag never depends
 * on what the flag holds.
 */
export function posturePlan(named: readonly string[]): PosturePlan {
  const present = new Set(named);
  const posture = POSTURES.find((p) => p !== "report" && present.has(p)) ?? "report";
  const shadowed = POSTURES.filter((p) => p !== posture && p !== "report" && present.has(p));

  const reads = new Set(READS[posture]);
  const dropped = named.filter((n) => KNOWN.includes(n) && !reads.has(n) && !POSTURES.includes(n as Posture));

  // THE VOW, CHECKED BEFORE THE WARNING. An acting posture that swallowed `--observe` would perform
  // the very act the caller asked it to withhold, and report success for it.
  const refuse = posture !== "report" && present.has("observe")
    ? `--observe withholds every act, and \`--${posture}\` performs one — the two cannot ride together. `
      + "Drop one: `lares vessel stand --observe` reports what stands and touches nothing."
    : null;

  return { posture, shadowed, dropped, refuse };
}

/** The warning a caller prints for a plan that stands. Empty when nothing was dropped. */
export function posturePlanNotice(plan: PosturePlan): string[] {
  const out: string[] = [];
  if (plan.shadowed.length > 0) {
    out.push(`standing --${plan.posture}; --${plan.shadowed.join(" --")} ${plan.shadowed.length > 1 ? "sit" : "sits"} beneath it`);
  }
  if (plan.dropped.length > 0) {
    out.push(`--${plan.dropped.join(" --")} ${plan.dropped.length > 1 ? "reach" : "reaches"} nothing under --${plan.posture}`
      + " — the bare `lares vessel stand` carries them");
  }
  return out;
}
