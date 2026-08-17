/**
 * face-join — the keyhive half of joining an operator's own face, run INSIDE the @daemon island.
 *
 * THE SPLIT THIS FILE SERVES. A device-admit confers STANDING: the founder's persona root signs an edge naming
 * the joinee's vessel key, the joinee pins the KEL prefix, and its Binding Gate walks to the head. That edge
 * answers *what this vessel counts as*. It confers no CAPABILITY — a joinee holding only an edge reaches the
 * PersonaGroup's plaintext planes (the self-slot fleet-syncs them same-operator) and decrypts nothing sealed,
 * because keyhive knows no such member. This file closes that second half, and keeps the two apart: a human
 * confers standing once, by hand; the machine completes the capability over the wire.
 *
 * WHY THE @daemon ISLAND OWNS IT. The island already holds the booted provider (`operator-daemon-behavior`
 * delegates every freshly minted bag through it), and the event store admits ONE writer. A second process
 * opening its own provider over the same store would stand a second holder against a single-owner store. So
 * the join rides the verb surface every other act rides: a joinee writes `@daemon/summons/<id>`, the dispatcher
 * relays it into the island, the outcome lands at `@daemon/outcomes/<id>` and syncs back by CRDT.
 *
 * WHAT CROSSES, AND WHY IT MAY. The grant carries `eventsForPeer` output — PUBLIC membership + CGKA ops,
 * encrypted to the joinee's own prekey. No prekey secret, no archive and no application key rides here (the
 * `eventsForPeer` contract), so the grant may sit in a synced doc without leaking a read-cap. The founding path
 * already stores cap-events in @daemon for boot hydration; this puts them where that precedent put them.
 *
 * THE GATE IS A SIGNATURE, NEVER A LIST. A vessel keeps no register of the devices it admitted — a roster IS a
 * global now, and this house holds contracts instead. The joinee therefore PRESENTS its edge, and the gate
 * VERIFIES it: signed by this vessel's own persona root, bound to this hearth, unexpired, and naming the very
 * key the presented ContactCard carries. Nothing is looked up, so nothing can drift or be forged by writing to
 * a list. Three of the four checks read the edge alone and run BEFORE the card enters local state.
 *
 * FRESHNESS READS TWO INSTRUMENTS, AND ONLY ONE OF THEM DECIDES. The LEASE — a per-resource max-register epoch,
 * monotone and read locally — carries the authority: a grant bound below the current epoch reads stale. The
 * wall clock only backstops replay, because every device narrates its own "now" unreliably and no island holds
 * the other's. A gate that read the clock alone would rest a capability decision on that narration.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/face-join
 */
import { verifyDeviceDelegation, type DeviceDelegationTiddler } from "@lararium/mesh";
import { bytesToBase64 } from "./bytes-base64.js";

/** The summons a joinee writes: what it holds (the card) and what licenses it (the edge). */
export interface FaceJoinSummons {
  readonly kind: "face-join/v1";
  /** The joinee's OWN self-certifying ContactCard (`ContactCard.toJson()`) — it carries the prekey the group
   *  path encrypts to, which a raw verifying key cannot supply. */
  readonly contactCard: string;
  /** The signed root→joinee edge the founder issued. The joinee presents it; the gate verifies it. */
  readonly deviceEdge: DeviceDelegationTiddler;
  /** Force a re-key even when the agent already holds a seat — the answer to a suspected-but-unrevoked
   *  device, where the operator wants a fresh CGKA epoch rather than the existing membership handed back. */
  readonly force?: boolean;
}

/** The grant the island returns — everything the joinee needs to reach the group key, nothing secret. */
export interface FaceJoinGrant {
  readonly kind: "face-join-grant/v1";
  readonly joineeAgentIdHex: string;
  /** The founder's own ContactCard — the joinee receives it so its provider can name this vessel as an
   *  audience. Without it a joinee holds membership yet cannot delegate anything back. */
  readonly founderCard: string;
  /** base64 `eventsForPeer` output — public membership + CGKA ops. */
  readonly capEvents: readonly string[];
  /** True when this call actually added the member (and so re-keyed the group); false when it handed back an
   *  existing seat. A joinee reads it as "the group moved" vs "you were already here". */
  readonly reKeyed: boolean;
  /**
   * How many of the group's standing bags this seat re-pointed at the re-keyed group.
   *
   * A seat with `reKeyed: true` and `regranted: 0` reads as membership WITHOUT REACH — the member holds a
   * seat and opens nothing the group already carried. That shape looks identical to a healthy join from
   * every other angle, so the count rides out where a caller and a test can both see it rather than being
   * inferred from an event tally.
   */
  readonly regranted: number;
}

export type FaceJoinRefusal = { readonly ok: false; readonly reason: string };
export type FaceJoinOutcome = { readonly ok: true; readonly grant: FaceJoinGrant } | FaceJoinRefusal;

/** What the island supplies. Structural, so a test stands it without a WASM provider. */
export interface FaceJoinProvider {
  receiveContactCard(bytes: Uint8Array): Promise<{ id: string }>;
  verifySentinelMembership(agentIdHex: string, sentinelDocIdHex: string): Promise<{ ok: boolean; reason?: string }>;
  addSentinelMember(memberIdentifierHex: string, sentinelDocIdHex: string): Promise<void>;
  delegate(args: { bagUrl: string; audience: string; access: "read" | "admin" }): Promise<unknown>;
  eventsForPeer(peerAgentIdHex: string): Promise<Uint8Array[]>;
  contactCard(): Promise<Uint8Array>;
}

/** A bag to re-grant after a seat lands, at the access the granter ALREADY holds toward this audience. */
export interface FaceJoinRegrant {
  readonly bagUrl: string;
  readonly access: "read" | "admin";
}

export interface FaceJoinContext {
  /** This vessel's persona-root DID — the ONLY signer whose edge this gate honours. */
  readonly personaRootDid: string;
  /** The hearth true-name an edge must bind to; an edge for another hearth reads as another place's business. */
  readonly hearthTrueName: string;
  /** The PersonaGroup sentinel the joinee joins. */
  readonly personaGroupDocIdHex: string;
  /** That group's AGENT id — the audience a bag delegates to (the doc id above names the sentinel itself). */
  readonly personaGroupAgentIdHex: string;
  /**
   * The bags to RE-GRANT once the seat lands, and the access each already carries toward this group.
   *
   * A seat does not reach backward on its own: a bag delegated to the group BEFORE this member joined keeps a
   * delegation made against the older group, and the transitive re-key never propagates onto it. A member
   * seated and left there reads nothing the group already held — membership without reach. Re-granting each
   * bag re-points it at the re-keyed group.
   *
   * This grants NO new authority: the caller names bags it has ALREADY delegated to this same audience, at the
   * access it already gave. A caller that names a bag it never granted would be widening the group's reach
   * under cover of a join, so the list belongs to the caller that knows its own grants, never to this function.
   */
  readonly regrant?: readonly FaceJoinRegrant[];
  /**
   * THE LEASE AUTHORITY — this resource's current max-register epoch (`effectiveLeaseEpoch` over its slots).
   * A grant whose `boundEpoch` sits below it reads STALE and the gate refuses. A max-register is monotone and
   * read locally, so two islands need no shared clock to agree which way it moved; an unfed resource reads 0
   * and admits the epoch-0 grants a founding issues.
   */
  readonly leaseEpoch: number;
  /**
   * THE REPLAY BACKSTOP — the caller's own clock in ms, never a truth. Each device narrates its own wall time
   * unreliably, so this bounds a replay window (drift-tolerant) and decides nothing the lease decides.
   */
  readonly now: number;
}

/**
 * The gate, over the EDGE alone. Runs before the card touches local state, so a refused summons leaves the
 * provider exactly as it found it.
 *
 * `cardIdentifierHex` binds the two halves: an edge licenses ONE key, and the card must carry that key, or a
 * holder of somebody else's edge would join under its own identity.
 */
export async function gateFaceJoin(args: {
  readonly edge: DeviceDelegationTiddler;
  readonly ctx: FaceJoinContext;
  /** Absent on the pre-card pass; supplied for the binding check once the card is parsed. */
  readonly cardIdentifierHex?: string;
}): Promise<{ ok: true } | FaceJoinRefusal> {
  const { edge, ctx } = args;

  if (edge?.kind !== "device-delegation") {
    return { ok: false, reason: "the summons carries no device-delegation edge" };
  }
  // The signature check plus BOTH freshness readings: the lease decides, the clock only backstops replay.
  // Reading the clock alone would seat the whole gate on each device's own unreliable narration of "now".
  const verdict = await verifyDeviceDelegation(edge, ctx.personaRootDid, {
    now: ctx.now,
    expectedEpoch: ctx.leaseEpoch,
  });
  if (!verdict.ok) {
    return { ok: false, reason: `edge refused: ${verdict.reason ?? "signature or window"}` };
  }
  // The binding IS (vessel × hearth) — an edge minted for another place carries no seat at this one.
  if (edge.hearthTrueName !== ctx.hearthTrueName) {
    return { ok: false, reason: "edge binds a different hearth" };
  }
  if (args.cardIdentifierHex !== undefined) {
    // The identifier a card derives ends in the raw verifying key (the relationship the Binding Gate also
    // leans on), so a card presented against somebody else's edge fails here rather than joining.
    if (!args.cardIdentifierHex.toLowerCase().endsWith(edge.deviceVerifyingKey.toLowerCase())) {
      return { ok: false, reason: "the presented card names a different key than the edge licenses" };
    }
  }
  return { ok: true };
}

/**
 * Run the join. Refuses by RETURNING a reason — a summons from an unlicensed vessel names an absent contract,
 * never an attack, and the island keeps serving.
 *
 * Order follows `packPersonaCrossing`: ADD, then CAPTURE. Events captured before the add would carry an epoch
 * the joinee stands outside of.
 */
export async function runFaceJoin(
  provider: FaceJoinProvider,
  summons: FaceJoinSummons,
  ctx: FaceJoinContext,
): Promise<FaceJoinOutcome> {
  // Pass one — the edge alone. Nothing has entered local state yet.
  const edgeVerdict = await gateFaceJoin({ edge: summons.deviceEdge, ctx });
  if (!edgeVerdict.ok) return edgeVerdict;

  if (typeof summons.contactCard !== "string" || summons.contactCard.length === 0) {
    return { ok: false, reason: "the summons carries no contact card" };
  }

  let joineeAgentIdHex: string;
  try {
    const received = await provider.receiveContactCard(new TextEncoder().encode(summons.contactCard));
    joineeAgentIdHex = received.id;
  } catch (err) {
    return { ok: false, reason: `contact card unreadable: ${(err as Error)?.message ?? String(err)}` };
  }

  // Pass two — the card now names a key, so bind it to the edge that licensed the summons.
  const boundVerdict = await gateFaceJoin({ edge: summons.deviceEdge, ctx, cardIdentifierHex: joineeAgentIdHex });
  if (!boundVerdict.ok) return boundVerdict;

  // Membership lives FOUNDER-side: a joinee that lost its own store is still a member here, and hands back the
  // events it needs to rebuild — self-healing with no epoch churn. A joinee whose group was re-founded holds no
  // seat in the NEW sentinel, so the add genuinely runs.
  const seated = await provider.verifySentinelMembership(joineeAgentIdHex, ctx.personaGroupDocIdHex);
  const mustAdd = summons.force === true || !seated.ok;
  let regranted = 0;
  if (mustAdd) {
    await provider.addSentinelMember(joineeAgentIdHex, ctx.personaGroupDocIdHex);
    // Re-point the group's existing bags at the re-keyed group, so the new seat reaches what the group already
    // held. Only after the add — a re-grant made first would key to the group this member stands outside of.
    for (const bag of ctx.regrant ?? []) {
      await provider.delegate({ bagUrl: bag.bagUrl, audience: ctx.personaGroupAgentIdHex, access: bag.access });
      regranted++;
    }
  }

  // CAPTURE LAST — the events must carry the add AND every re-grant above, or the joinee ingests a membership
  // that reaches nothing (the add→re-grant→capture order `packPersonaCrossing` also keeps).
  const events = await provider.eventsForPeer(joineeAgentIdHex);
  const founderCard = new TextDecoder().decode(await provider.contactCard());

  return {
    ok: true,
    grant: {
      kind: "face-join-grant/v1",
      joineeAgentIdHex,
      founderCard,
      capEvents: events.map(bytesToBase64),
      reKeyed: mustAdd,
      regranted,
    },
  };
}
