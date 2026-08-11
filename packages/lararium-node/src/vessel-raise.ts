/**
 * vessel-raise — the live door: what a vessel currently STANDS as, and how a recogniser moves it.
 *
 * ── WHY THIS HOLDS NOTHING ON DISK ──────────────────────────────────────────────────────────────
 * A raise is PRESENCE. It lives exactly as long as the process holding it, and a reboot drops the vessel
 * back to its floor with nothing to resume. That is what keeps `SEATED ⊥ RAISED` true at rest: the
 * vessel's at-rest state never changes, so a stolen disk yields nothing of anybody's person. Writing a
 * standing raise anywhere would re-open the bearer-credential hole the challenge nonce exists to close.
 *
 * So this module holds two things in memory and offers no persistence shore at all — not as an omission,
 * as the ruling.
 *
 * ── THE LIVE CHALLENGE DROPS AFTER ONE ANSWER, WHICHEVER WAY IT WENT ────────────────────────────
 * A challenge that survived a refusal would let an attacker grind against one nonce. A challenge that
 * survived a SUCCESS would let the same grant raise the vessel twice. Both readings end at the same rule:
 * one challenge, one answer, then gone — and asking again mints a fresh nonce.
 *
 * ── AND THE FENCE STAYS READ LIVE, NEVER CACHED ─────────────────────────────────────────────────
 * `standing()` re-reads the lease epoch every time rather than remembering what it read. A raise ends by
 * NON-RENEWAL, so a cached epoch would keep a vessel raised past the roll that should have dropped it —
 * the one failure mode this fence exists to prevent. Nobody performs a lowering act here; the reading
 * simply stops coming back raised.
 *
 * ── ONE CHALLENGE PER BOOT, UNTIL THE ASK VERB STANDS ──────────────────────────────────────────
 * The Herm emits a challenge in its boot output, which is the whole of the vessel's half today. So a
 * refused answer burns the only challenge that boot carried, and a second attempt waits for a restart.
 * That reads as INCONVENIENT rather than unsafe — the burn is the property, not the cost — and it lifts
 * the moment `raise ask` stands as a daemon verb and a recogniser can provoke a fresh nonce on demand.
 *
 * ── AND IT STANDS ON THE HERM BRANCH ALONE, WHICH IS A RULING ──────────────────────────────────
 * A hearth already carries its caps: its operator opened its archive, which is the ① act itself. A raise
 * adds nothing there — `standingClass` on a `hearth` floor answers `hearth` either way. The door belongs
 * where a vessel stands at the floor and someone else arrives: the crossroads.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor · lar:///ha.ka.ba/lararium/mesh/epoch-binding-surfaces
 */

import * as ed25519 from "@noble/ed25519";

import {
  mintRaiseChallenge, verifyRaiseGrant, raiseStands, standingClass,
  leaseEpochPrefix, effectiveLeaseEpoch, hexToBytes,
  type RaiseChallenge, type RaiseGrant, type RaiseRefusal, type RaisedCaps, type VesselClass,
  type LarDoc,
} from "@lararium/mesh";
import type { DocHandle } from "@automerge/automerge-repo";

import { runNexusMembersList } from "./commands/nexus-contract.js";
import { larSealHome } from "./vessel-paths.js";

export interface RaiseDoorOptions {
  /** This vessel's own verifying key — a grant for any other vessel answers nothing here. */
  readonly vesselId:   string;
  /** The Nexus this vessel carries. A raise crosses no Nexus boundary. */
  readonly nexus:      string;
  /** What this vessel stands as with no raise — from `standAs`, never guessed here. */
  readonly floor:      VesselClass;
  /** The Nexus's effective lease epoch, read FRESH on every call. The fence, live. */
  readonly leaseEpoch: () => number | Promise<number>;
  /** Whether this vessel's membership fold admits a nym — its own reading, as of last sync. */
  readonly recognises: (nym: string) => boolean | Promise<boolean>;
  /** Verify a signature by a nym over bytes. Supplied so this module binds to no one crypto surface. */
  readonly verify:     (nym: string, bytes: Uint8Array, sig: string) => boolean | Promise<boolean>;
  /** Fresh random hex. MUST be cryptographically random — the nonce IS the freshness. */
  readonly nonce:      () => string;
}

export interface RaiseDoor {
  /** Mint and hold a fresh challenge, replacing any outstanding one. What the vessel emits. */
  ask(): Promise<RaiseChallenge>;
  /** Read a grant against the live challenge. Drops that challenge either way. */
  answer(grant: RaiseGrant): Promise<{ ok: true; caps: RaisedCaps } | { ok: false; why: RaiseRefusal }>;
  /** What this vessel stands as RIGHT NOW — floor, plus any raise the fence still carries. */
  standing(): Promise<VesselClass>;
  /** The raise currently standing, or null. Read-only; nothing here lowers it. */
  raised(): Promise<RaisedCaps | null>;
}

/**
 * Stand the door. Holds one live challenge and at most one standing raise, both in memory only.
 */
export function standRaiseDoor(opts: RaiseDoorOptions): RaiseDoor {
  let live:  RaiseChallenge | null = null;
  let raise: RaisedCaps | null     = null;

  /** The raise the fence still carries — re-read live, so a rolled epoch simply stops answering raised. */
  async function current(): Promise<RaisedCaps | null> {
    if (!raise) return null;
    const effective = await opts.leaseEpoch();
    return raiseStands(raise, { nexus: opts.nexus, effective }) ? raise : null;
  }

  return {
    async ask(): Promise<RaiseChallenge> {
      live = mintRaiseChallenge({
        vesselId: opts.vesselId, nexus: opts.nexus, epoch: await opts.leaseEpoch(), nonce: opts.nonce(),
      });
      return live;
    },

    async answer(grant) {
      const asked = live;
      live = null;                    // one challenge, one answer — before the verdict, so no path keeps it
      const r = await verifyRaiseGrant({
        grant, live: asked, recognises: opts.recognises, verify: opts.verify,
      });
      if (!r.ok) return r;

      // THE CONSENT VERIFIED — NOW ASK WHETHER IT STILL BUYS ANYTHING. `verifyRaiseGrant` answers one
      // question honestly: did this recogniser consent to this exact challenge. The fence is a SECOND
      // question, and the epoch may have rolled between the ask and the answer. Reporting `ok` for caps
      // that do not stand would hand the caller a verdict the system does not honour — the vessel would
      // read floor while its operator believed it raised, which is worse than a refusal because nothing
      // surfaces. So the door refuses, and the recogniser asks again under the fence that now stands.
      const effective = await opts.leaseEpoch();
      if (!raiseStands(r.caps, { nexus: opts.nexus, effective })) {
        return { ok: false, why: "stale-challenge" };
      }
      raise = r.caps;
      return r;
    },

    async standing(): Promise<VesselClass> {
      const effective = await opts.leaseEpoch();
      return standingClass(opts.floor, raise, { nexus: opts.nexus, effective });
    },

    async raised(): Promise<RaisedCaps | null> {
      return current();
    },
  };
}

// ── THE THREE READINGS THE DOOR NEEDS, each borrowed rather than invented ────────────────────────────

/**
 * The effective lease epoch for a resource, read off a LIVE board — the read-only sibling of
 * `rollLeaseEpochOnBoard`. Folds every per-writer slot by max, so a concurrent roll on another hearth
 * still counts. An unfed board answers 0, which is the floor's own reading rather than a fault.
 */
export function effectiveLeaseEpochOnBoard(handle: DocHandle<LarDoc>, resource: string): number {
  const prefix = leaseEpochPrefix(resource);
  const tids   = handle.doc()?.tiddlers ?? {};
  const slots: (string | null | undefined)[] = [];
  for (const key of Object.keys(tids)) {
    if (key.startsWith(prefix)) {
      const t = tids[key] as { text?: unknown } | undefined;
      slots.push(typeof t?.text === "string" ? t.text : null);
    }
  }
  return effectiveLeaseEpoch(slots);
}

/**
 * The nyms this vessel's membership fold admits — quorum-signed and contract-in verified, the same set
 * `nexus members --list` reports. Recognition borrows this authority and mints none of its own.
 *
 * A vessel with no seated charter, or none admitted, answers the EMPTY set: it recognises nobody, and the
 * raise door refuses everyone. That is the fail-closed reading, and it is the correct one for a vessel
 * standing alone at a crossroads.
 */
export async function nexusMemberNyms(storageDir: string): Promise<ReadonlySet<string>> {
  try {
    const r = await runNexusMembersList({ sealHome: larSealHome(), storageDir });
    return new Set(r.members.map((m) => m.toLowerCase()));
  } catch {
    // A read that cannot answer says NOBODY rather than guessing. An error here means the vessel cannot
    // establish who it recognises, and a raise on an unestablished reading is exactly the wrong default.
    return new Set();
  }
}

/** Verify an ed25519 signature by a nym over bytes. Never throws — untrusted input crosses this shore. */
export async function verifyNymSignature(nym: string, bytes: Uint8Array, sig: string): Promise<boolean> {
  try { return await ed25519.verifyAsync(hexToBytes(sig), bytes, hexToBytes(nym.replace(/^0x/, ""))); }
  catch { return false; }
}
