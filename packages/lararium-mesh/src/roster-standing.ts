/**
 * roster-standing — what a seated quorum survives, read at seating rather than at failure.
 *
 * ── A VALID QUORUM CAN STILL BE A TRAP ──────────────────────────────────────────────────────────
 * The threshold derives MAJORITY over what stood, so two chairs derive a threshold of two: every
 * kahu must sign, every time. That roster passes every gate it will ever meet, and the day one seat
 * goes dark the Nexus can never reach quorum again — including for the rotation that would repair it.
 *
 * So the number worth reading is not the threshold but what remains beneath it. `seated - threshold`
 * counts the chairs that may go dark before the quorum locks: three over two survive one, two over
 * two survive none, and a lone chair is a single point of failure wearing a quorum's name.
 *
 * ── IT NAMES, AND DOES NOT REFUSE ───────────────────────────────────────────────────────────────
 * A two-chair civic nexus may be exactly what a house of two intends, and a reading that blocked it
 * would be wrong about somebody's life. The cure is only available BEFORE the loss, so the reading
 * carries it and leaves the choice where it belongs.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/founding-runbook
 */

export interface RosterStanding {
  /** Whether any chair stands at all. */
  readonly seated:    boolean;
  /** Chairs that may go dark before the quorum can no longer be reached. */
  readonly tolerance: number;
  /** A quorum that survives no loss at all. */
  readonly fragile:   boolean;
  /** The line an operator reads — what it is, what it costs, and the cure while there is one. */
  readonly reading:   string;
}

export function rosterStanding(r: { seated: number; threshold: number }): RosterStanding {
  // AN UNSEATED ROSTER IS NOT A FRAGILE ONE. It fails closed at MAX_SAFE_INTEGER, which would compute
  // a wildly negative tolerance and read as the most brittle quorum imaginable — while holding no
  // chairs to be brittle about.
  if (r.seated <= 0) {
    return { seated: false, tolerance: 0, fragile: false,
             reading: "no kahu are seated — this Nexus carries records it cannot govern. A private "
                    + "hearth may want exactly that; a civic one seats its founding kahu." };
  }
  const tolerance = r.seated - r.threshold;
  if (tolerance > 0) {
    return { seated: true, tolerance, fragile: false,
             reading: `${r.threshold} of ${r.seated} seated kahu — the quorum survives `
                    + `${tolerance} seat${tolerance === 1 ? "" : "s"} going dark.` };
  }
  return { seated: true, tolerance: 0, fragile: true,
           reading: `${r.threshold} of ${r.seated} seated kahu — EVERY chair must sign, so the quorum `
                  + "survives no loss at all. One seat gone and nothing can be signed again, including "
                  + "the rotation that would repair it. One more seat buys the first loss back — "
                  + "`lares persona new <n> --name '<label>' --handle '<Handle>' --seat`, then "
                  + "`lares nexus seal seat`." };
}
