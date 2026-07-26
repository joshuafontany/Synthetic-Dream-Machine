/**
 * edge-kapae — the kāpae raised over a RELATIONSHIP rather than over a thing.
 *
 * Kāpae (Hawaiian): to set aside, to hold aside. Deliberate placement, never loss — the record beneath
 * survives whole, and another hand may take the marker back down (`lar:///ha.ka.ba/lares/api/pono/kapae`).
 *
 * ── WHY THE EDGE, AND WHAT THAT DISSOLVES ────────────────────────────────────────────────────────────────
 * Every comparable system raises its marker on a THING — Matrix on a user, the fediverse on an instance, a
 * CRL on a certificate, KERI on an identifier. A thing holds ONE global standing, so a tombstone over it must
 * be globally agreed: hence delivery, hence consensus, hence the write-race that produced Matrix's state
 * resets and the CRL family's undelivered negatives.
 *
 * A marker raised over one EDGE needs none of that. The shadow scopes to a single relationship, no third
 * party needs the news, the blast radius equals that relation, and two edges tombstone CONCURRENTLY without
 * racing — because they name different objects.
 *
 * It also settles the case the literature leaves open. Mutual revocation, at this grain: A shadows the edge
 * (B → group) while B shadows (A → group). BOTH shadows hold, so BOTH stand aside, and remove-wins needs no
 * winner. The group lands in a LEGIBLE state — no authority stands — which surfaces a fork rather than
 * diverging in silence. Surfacing the split reads as this module's job; deciding it belongs to the humans.
 *
 * ── THE LAW THIS ENACTS (kapae#law) ──────────────────────────────────────────────────────────────────────
 * A raised kāpae SHADOWS every layer beneath and WINS remove-wins under contention or partition. Lowering it
 * takes a deliberate gesture and writes its own record; nothing un-shadows silently. Entries only ACCRETE —
 * a raise and a lower at one version both survive on the board, and the FOLD adjudicates, never the write.
 *
 * ── KĀPAE ⊥ ABSENT, and the cut MUST stay sharp ─────────────────────────────────────────────────────────
 * A kāpae shadows; an absent edge falls through. An edge that never existed, or one that expired, reads
 * ABSENT — the relationship simply does not stand, and a fresh edge may establish it. A SHADOWED edge reads
 * differently: it stood, a hand set it aside, and a re-add cannot resurrect it while the marker holds.
 * Collapsing the two re-introduces the resurrection bug the residency model names as anti-pattern #3.
 *
 * Platform-blind: rides ./crypto + ./base-doc only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/kapae
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import { canonicalJsonBytes } from "./crypto.js";

export const EDGE_KAPAE_DOMAIN = "lar-edge-kapae/v1" as const;

/** The tiddler-key prefix every kāpae act rides under. */
export const EDGE_KAPAE_PREFIX = "lar:///ha.ka.ba/dreamnet/edge-kapae/" as const;

/**
 * One act on one relationship — a hand raising the marker, or a hand taking it back down.
 *
 * `raised` carries the gesture rather than a state, because the board holds ACTS and the fold holds state.
 * Two hands acting at one version both land, and the fold decides between them.
 */
export interface EdgeKapae {
  readonly kind:    typeof EDGE_KAPAE_DOMAIN;
  /** The relationship this act concerns — a dyad id, a vouch id, any content-addressed edge. */
  readonly edgeId:  string;
  /** true → raise the shadow (set aside); false → lower it (a deliberate re-admission). */
  readonly raised:  boolean;
  /** Monotone per edge. A later act supersedes an earlier one; a stale act cannot roll it back. */
  readonly version: number;
  /** The epoch this act roots on. An ORDER, never an instant — a causal island holds no global now. */
  readonly epoch:   string;
  /** ed25519 by the authority that holds this edge, over `edgeKapaeBytes`. */
  readonly sig:     string;
}

/** The bytes an act signs — the edge, the gesture, the version and the epoch, bound together. */
export function edgeKapaeBytes(a: Omit<EdgeKapae, "sig">): Uint8Array {
  return canonicalJsonBytes({
    kind: a.kind, edgeId: a.edgeId, raised: a.raised, version: a.version, epoch: a.epoch,
  });
}

/** Mint an act. The caller supplies the signer holding authority over this edge; this module holds no key. */
export async function signEdgeKapae(
  parts: Omit<EdgeKapae, "kind" | "sig">,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<EdgeKapae> {
  const unsigned = { ...parts, kind: EDGE_KAPAE_DOMAIN } as Omit<EdgeKapae, "sig">;
  return { ...unsigned, sig: await sign(edgeKapaeBytes(unsigned)) };
}

/**
 * The key one act rides under — edge, GESTURE and version together.
 *
 * Keying by edge alone would let a concurrent lower win an in-place merge and silently resurrect a shadowed
 * relationship. Keyed this way a raise@v and a lower@v land on DISTINCT keys and BOTH survive, so the fold's
 * remove-wins guard still runs. The fold adjudicates; the write never does.
 */
export function edgeKapaeKey(edgeId: string, raised: boolean, version: number): string {
  return `${EDGE_KAPAE_PREFIX}${edgeId}/${raised ? "raised" : "lowered"}/${version}`;
}

/** Land an act on a board draft. Call INSIDE a `handle.change()` callback. */
export function writeEdgeKapae(draft: LarDoc, act: EdgeKapae): void {
  const key = edgeKapaeKey(act.edgeId, act.raised, act.version);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(act) }, act.epoch);
}

/** A parsed payload reads as an act only at the exact FLOOR shape — extra fields drop. */
function coerceAct(parsed: unknown): EdgeKapae | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== EDGE_KAPAE_DOMAIN) return null;
  if (typeof p["edgeId"] !== "string" || p["edgeId"].length === 0) return null;
  if (typeof p["raised"] !== "boolean") return null;
  if (!Number.isSafeInteger(p["version"]) || (p["version"] as number) < 1) return null;
  if (typeof p["epoch"] !== "string" || p["epoch"].length === 0) return null;
  if (typeof p["sig"] !== "string" || p["sig"].length === 0) return null;
  return {
    kind: EDGE_KAPAE_DOMAIN, edgeId: p["edgeId"], raised: p["raised"],
    version: p["version"] as number, epoch: p["epoch"], sig: p["sig"],
  };
}

/** Every well-formed act a board carries. A torn or foreign tiddler drops in silence. */
export function edgeKapaeActsFromBoard(doc: LarDoc | undefined | null): EdgeKapae[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const out: EdgeKapae[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }
    const act = coerceAct(parsed);
    if (act !== null) out.push(act);
  }
  return out;
}

/**
 * Fold the acts into the set of SHADOWED edges — the projection the whole pattern rests on.
 *
 * Highest version per edge wins, and a SAME-VERSION TIE LEAVES THE SHADOW UP. That asymmetry carries the
 * remove-wins guarantee the law demands: under partition two peers may disagree, and the raised marker holds
 * the merge, so an eviction never quietly reverses when the partition heals. The more-restrictive act wins,
 * exactly as a kapae beats an un_kapae on the antigen board.
 *
 * Every act arrives VERIFIED — the caller checks signatures before folding, because this fold decides
 * standing and an unverified act would let anyone lower anyone's shadow.
 */
export function foldEdgeKapae(acts: readonly EdgeKapae[]): Set<string> {
  const best = new Map<string, EdgeKapae>();
  for (const a of acts) {
    const prior = best.get(a.edgeId);
    if (!prior || a.version > prior.version) { best.set(a.edgeId, a); continue; }
    // SAME version, opposing gestures → the raise holds. A tie never re-admits.
    if (a.version === prior.version && a.raised) best.set(a.edgeId, a);
  }
  const shadowed = new Set<string>();
  for (const [edgeId, act] of best) if (act.raised) shadowed.add(edgeId);
  return shadowed;
}

/** Does a shadow stand over this relationship? */
export function edgeShadowed(edgeId: string, shadowed: ReadonlySet<string>): boolean {
  return shadowed.has(edgeId);
}

/**
 * Verify then fold, in one pass — the shape a caller wants, and the one that cannot skip the check.
 *
 * An act that fails its signature DROPS rather than throwing: a forged lower must never take a shadow down,
 * and a forged raise must never set aside a relationship its author holds no authority over. `authorityFor`
 * names which key holds an edge, so a hand cannot act on a relationship that was never theirs.
 */
export async function verifiedShadowSet(
  acts: readonly EdgeKapae[],
  authorityFor: (edgeId: string) => string | undefined,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
): Promise<Set<string>> {
  const verdicts = await Promise.all(acts.map(async (a) => {
    const signer = authorityFor(a.edgeId);
    if (!signer) return false;                       // no known authority → the act carries none
    const { sig: _s, ...unsigned } = a;
    return verify(edgeKapaeBytes(unsigned), a.sig, signer).catch(() => false);
  }));
  return foldEdgeKapae(acts.filter((_, i) => verdicts[i] === true));
}

/**
 * Read a board and hand back the shadows that STAND — extract, verify, fold, in the one call a caller wants.
 *
 * Exposing only this shape keeps the unverified fold out of reach: `foldEdgeKapae` decides standing, so a
 * caller who reached it with raw board acts would let anyone lower anyone's shadow. Designation carries
 * authority here too — `authorityFor` names which key may act on an edge, so a hand cannot set aside a
 * relationship that was never theirs.
 *
 * An absent board yields NO shadows, which reads as the honest floor rather than a permissive one: nothing
 * set aside means nothing set aside, and the readers that consult this still verify every edge they admit.
 */
export async function shadowSetFromBoard(
  doc: LarDoc | undefined | null,
  authorityFor: (edgeId: string) => string | undefined,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
): Promise<Set<string>> {
  return verifiedShadowSet(edgeKapaeActsFromBoard(doc), authorityFor, verify);
}
