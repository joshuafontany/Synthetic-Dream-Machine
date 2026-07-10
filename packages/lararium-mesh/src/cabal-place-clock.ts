/**
 * cabal-place-clock — the CAPTURE-CLOCK: make a place's maintenance VISIBLE, so the
 * majority can SEE a minority out-feeding it WHILE it happens (while exit is still
 * cheap). A pure, verdict-free read over the place's lease slots.
 *
 * The persistence ≠
 * legitimacy gap is a HARD-BOUND — legitimacy cannot live in the join-gate without the
 * gate becoming the captured object, so the gate STAYS INERT. The buildable answer is
 * not prevention but ESCAPE (fork-as-exit) + SIGHT. This module is the SIGHT half: it
 * instruments who feeds the place and how hard (free — it reads the liveness signal the
 * epoch-lease already keeps), turning Hirschman's failure case (silent capture under
 * apathy) into a readable surface (canon: api/pono/cabal-place#the-unswept-corner).
 *
 * THE BOUNDARY — this clock SURFACES, it never JUDGES. It reports per-maintainer
 * standing + the spread + the leading-set concentration as raw numbers; it emits NO
 * "captured" verdict and holds NO threshold. WHAT spread or concentration counts as
 * capture is the operator's calibration — the legitimacy call cannot be mechanized
 * without recreating a root. The lens is here; the reading stays
 * the operator's seat (OPEN).
 *
 * What it can and cannot see: the lease is a coordinator-free MAX-REGISTER (current
 * epoch per writer, no history), so this reads a STANDING at a point in time — who
 * maintains + how deep each has rolled — not a time-series. Capture shows as a small
 * leading set far ahead of a trailing majority; repeated reads let the operator watch
 * the trend. A richer fed-since-when history is a later cut.
 *
 * Platform-blind: rides ./epoch-lease + ./cabal-place only. NO node: imports.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-place
 */

import { leaseEpochPrefix, effectiveLeaseEpoch } from "./epoch-lease.js";
import type { CabalPlace } from "./cabal-place.js";

/** One maintainer's standing — the writer and how deep it has rolled the place's lease. */
export interface MaintainerStanding {
  readonly writerId: string;
  readonly epoch:    number;
}

/**
 * A place's maintenance provenance — a verdict-FREE snapshot of who feeds it and how
 * hard, for the operator (or a UI) to read. Carries the raw spread + leading-set
 * concentration; it draws NO capture conclusion (that threshold is the operator's).
 */
export interface CabalPlaceMaintenanceProvenance {
  /** Every maintainer with a lease slot for this place, sorted DESC by epoch (leaders first). */
  readonly maintainers:     readonly MaintainerStanding[];
  /** The number of distinct maintainers feeding the place. */
  readonly maintainerCount: number;
  /** The effective lease epoch = the deepest-rolled slot (max-register). 0 if unfed. */
  readonly effectiveEpoch:  number;
  /** The shallowest maintainer's epoch (0 when none) — the trailing edge. */
  readonly trailingEpoch:   number;
  /** effectiveEpoch − trailingEpoch — how far the leaders run ahead of the laggards.
   *  A large spread with a small leadingCount is the VISIBLE capture signal (read, not judged). */
  readonly spread:          number;
  /** How many maintainers sit AT the effective epoch — the size of the leading set.
   *  Few leaders far ahead of many trailers = a minority out-feeding the place. */
  readonly leadingCount:    number;
}

/**
 * Read a place's maintenance provenance from its lease slots — the capture-CLOCK.
 *
 * `leaseSlots` is the per-writer slot map (slotUri → epoch string) the place's writers
 * maintain (the same map the founding ceremony + lease rolls use). This filters to THIS
 * place's slots (by the place's lease prefix), recovers each writer from its slot URI,
 * and reports the standing. Pure + total: an empty or all-foreign map reads as an unfed
 * place (no maintainers, effective 0).
 *
 * Verdict-free by design — see the module header. It hands back numbers; the operator
 * calibrates what they mean.
 */
export function cabalPlaceMaintenanceProvenance(
  place:      CabalPlace,
  leaseSlots: ReadonlyMap<string, string>,
): CabalPlaceMaintenanceProvenance {
  const prefix = leaseEpochPrefix(place.placeDocIdHex);
  const maintainers: MaintainerStanding[] = [];
  for (const [slotUri, value] of leaseSlots) {
    if (!slotUri.startsWith(prefix)) continue;            // a foreign place's slot
    const epoch = Number(value);
    if (!Number.isInteger(epoch)) continue;               // a malformed slot value
    const writerId = decodeURIComponent(slotUri.slice(prefix.length));
    maintainers.push({ writerId, epoch });
  }
  maintainers.sort((a, b) => b.epoch - a.epoch || a.writerId.localeCompare(b.writerId));

  const effectiveEpoch = effectiveLeaseEpoch(maintainers.map((m) => String(m.epoch)));
  const trailer        = maintainers[maintainers.length - 1];
  const trailingEpoch  = trailer ? trailer.epoch : 0;
  const leadingCount   = maintainers.filter((m) => m.epoch === effectiveEpoch && effectiveEpoch > 0).length;

  return {
    maintainers,
    maintainerCount: maintainers.length,
    effectiveEpoch,
    trailingEpoch,
    spread: effectiveEpoch - trailingEpoch,
    leadingCount,
  };
}
