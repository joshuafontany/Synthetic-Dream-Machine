/**
 * cabal-realm-clock — the CAPTURE-CLOCK: make a realm's maintenance VISIBLE, so the
 * majority can SEE a minority out-feeding it WHILE it happens (while exit is still
 * cheap). A pure, verdict-free read over the realm's lease slots.
 *
 * The persistence ≠
 * legitimacy gap is a HARD-BOUND — legitimacy cannot live in the join-gate without the
 * gate becoming the captured object, so the gate STAYS INERT. The buildable answer is
 * not prevention but ESCAPE (fork-as-exit) + SIGHT. This module is the SIGHT half: it
 * instruments who feeds the realm and how hard (free — it reads the liveness signal the
 * epoch-lease already keeps), turning Hirschman's failure case (silent capture under
 * apathy) into a readable surface (canon: api/pono/cabal-realm#the-unswept-corner).
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
 * the trend. A richer fed-since-when history stands unbuilt.
 *
 * Platform-blind: rides ./epoch-lease + ./cabal-realm only. NO node: imports.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { leaseEpochPrefix, effectiveLeaseEpoch } from "./epoch-lease.js";
import { tiddlerText, type LarDoc } from "./base-doc.js";
import type { CabalRealm } from "./cabal-realm.js";

/** One maintainer's standing — the writer and how deep it has rolled the realm's lease. */
export interface MaintainerStanding {
  readonly writerId: string;
  readonly epoch:    number;
}

/**
 * A realm's maintenance provenance — a verdict-FREE snapshot of who feeds it and how
 * hard, for the operator (or a UI) to read. Carries the raw spread + leading-set
 * concentration; it draws NO capture conclusion (that threshold is the operator's).
 */
export interface CabalRealmMaintenanceProvenance {
  /** Every maintainer with a lease slot for this realm, sorted DESC by epoch (leaders first). */
  readonly maintainers:     readonly MaintainerStanding[];
  /** The number of distinct maintainers feeding the realm. */
  readonly maintainerCount: number;
  /** The effective lease epoch = the deepest-rolled slot (max-register). 0 if unfed. */
  readonly effectiveEpoch:  number;
  /** The shallowest maintainer's epoch (0 when none) — the trailing edge. */
  readonly trailingEpoch:   number;
  /** effectiveEpoch − trailingEpoch — how far the leaders run ahead of the laggards.
   *  A large spread with a small leadingCount is the VISIBLE capture signal (read, not judged). */
  readonly spread:          number;
  /** How many maintainers sit AT the effective epoch — the size of the leading set.
   *  Few leaders far ahead of many trailers = a minority out-feeding the realm. */
  readonly leadingCount:    number;
}

/**
 * Read a realm's maintenance provenance from its lease slots — the capture-CLOCK.
 *
 * `leaseSlots` is the per-writer slot map (slotUri → epoch string) the realm's writers
 * maintain (the same map the founding ceremony + lease rolls use). This filters to THIS
 * realm's slots (by the realm's lease prefix), recovers each writer from its slot URI,
 * and reports the standing. Pure + total: an empty or all-foreign map reads as an unfed
 * realm (no maintainers, effective 0).
 *
 * Verdict-free by design — see the module header. It hands back numbers; the operator
 * calibrates what they mean.
 */
export function cabalRealmMaintenanceProvenance(
  realm:      CabalRealm | string,
  leaseSlots: ReadonlyMap<string, string>,
): CabalRealmMaintenanceProvenance {
  // The read wants ONE thing from the realm — its doc id. A reader that holds only the id (a vessel asked
  // about a realm it does not itself dwell in) may pass the hex, and a caller holding the whole realm may
  // pass that. Narrowing the demand rather than demanding the whole shape for one field.
  const realmDocIdHex = typeof realm === "string" ? realm : realm.realmDocIdHex;
  const prefix = leaseEpochPrefix(realmDocIdHex);
  const maintainers: MaintainerStanding[] = [];
  for (const [slotUri, value] of leaseSlots) {
    if (!slotUri.startsWith(prefix)) continue;            // a foreign realm's slot
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

/**
 * Gather a realm's per-writer lease slots OFF A BOARD — the doc→map bridge the clock's pure read wants.
 *
 * The slots ride as tiddlers under the realm's lease prefix, each holding one writer's epoch as text. This
 * scans a board replica for them and hands back the map. It reads whatever the supplied doc HOLDS and never
 * asks where the doc came from: the caller chooses the board, because which board carries a realm's feeding
 * decides who can SEE it, and that choice belongs above this line.
 */
export function realmLeaseSlotsFromBoard(doc: LarDoc, realmDocIdHex: string): Map<string, string> {
  const prefix = leaseEpochPrefix(realmDocIdHex);
  const slots  = new Map<string, string>();
  for (const [key, record] of Object.entries(doc.tiddlers ?? {})) {
    if (!key.startsWith(prefix)) continue;
    const value = tiddlerText(record);
    if (typeof value === "string") slots.set(key, value);
  }
  return slots;
}

/**
 * Read a realm's maintenance provenance straight off a board replica — the composed capture-clock read.
 *
 * WHAT A READER MAY CONCLUDE, and it stays narrow. This reports the feeding THIS REPLICA has synced. A
 * maintainer whose roll has not arrived reads as absent, and a realm nobody here has synced reads as unfed
 * — indistinguishable from a realm nobody feeds. Under no-global-now those two generate identically, so the
 * numbers name a local sighting and never a total (the same no-completeness invariant `vouch-board` holds).
 *
 * It still reports NO liveness verdict. Deriving //alive// or //dissolved// from these epochs would need a
 * rate at which unfed standing erodes, and no rate stands seated — a verdict here would install the
 * operator's calibration inside this layer and hand it back as a reading.
 */
export function realmMaintenanceFromBoard(doc: LarDoc, realmDocIdHex: string): CabalRealmMaintenanceProvenance {
  return cabalRealmMaintenanceProvenance(realmDocIdHex, realmLeaseSlotsFromBoard(doc, realmDocIdHex));
}
