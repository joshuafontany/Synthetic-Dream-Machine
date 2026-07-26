/**
 * carriage-board — the DOC face of the operator CARRIAGE-registry: extract `CarriageEntry`s out of the
 * always-carried carriage BOARD (a `LarDoc` under `carriageDocUrl`, deterministic-doc). The pure fold/verify
 * (carriage-registry `foldCarriageSet`) reads the entries this extractor surfaces; the
 * DeterministicFederationGate federates the board so every honest carrier holds the same entries — the
 * ALLOW-twin of the antigen board, sibling to it under the same nexus-pubkey (members{} ⊥ blocked{}).
 *
 * STORAGE CONVENTION (mirrors antigen-board): each membership entry rides ONE tiddler whose `text` carries the
 * entry's JSON (`CarriageEntry`). The extractor walks every tiddler, parses its text, and keeps only the
 * ones that structurally coerce to an entry — a foreign / torn / non-membership tiddler is SKIPPED, never
 * guessed. Extraction is permissive on purpose: it never adjudicates trust (an entry it surfaces still faces
 * the kahu quorum + contract-in verify in `foldCarriageSet`, which IGNORES anything that does not count). So
 * a malformed or forged entry that slips through extraction costs nothing — it dies at the fold. FAIL CLOSED
 * end-to-end: an absent / empty board surfaces NO entries, the fold yields the empty member set, and NOBODY
 * reads member (the conservative floor: no registry → the seated-kahu union is all that remains).
 *
 * TRACK CONTRACTS, NEVER IDENTITIES: the tiddler carries the entry's operator-pubkey nym + charter epoch +
 * signatures ONLY. No human-identity field is read or written — the coercer would drop any it found, because
 * it copies the FLOOR fields alone.
 *
 * Platform-blind: rides ./base-doc (LarDoc) + ./membership-registry types only. NO node: imports — the DISK /
 * repo resolution of the board handle lives in the node holder (nexus-membership), which hands a read `LarDoc`.
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-operator-contract
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import {
  CARRIAGE_ENTRY_DOMAIN,
  type CarriageEntry,
  type CarriageAction,
} from "./carriage-registry.js";
import type { QuorumSignature } from "./kapae-antigen.js";

/**
 * The tiddler-key prefix every membership entry rides under — namespaced apart from the board's other content.
 * On the DreamNet plane (the always-carried members registry), not one lararium's `lares` API. Sibling to the
 * antigen's `ANTIGEN_ENTRY_PREFIX` — allow-twin to the deny-twin.
 */
export const MEMBERS_ENTRY_PREFIX = "lar:///ha.ka.ba/dreamnet/members-registry/" as const;

/**
 * The tiddler key one membership entry rides under — keyed by nym, ACTION, and version, so every distinct
 * signed entry ACCRETES (the additive CRDT the fold reads) and NOTHING overwrites a standing entry: an admit@v1
 * and a revoke@v1 land under DISTINCT keys and BOTH survive, so `foldCarriageSet`'s equivocation guard (a
 * same-version revoke drops membership) still runs — keying by nym alone would let a concurrent admit win the
 * Automerge LWW merge in place and silently resurrect a revoked member. The fold, never the write, adjudicates.
 */
export function membershipEntryKey(nym: string, action: CarriageAction, version: number): string {
  return `${MEMBERS_ENTRY_PREFIX}${nym}/${action}/${version}`;
}

/**
 * Land a signed membership entry onto a board draft — write it as a namespaced tiddler whose `text` carries the
 * entry JSON (the EXACT shape `carriageEntriesFromBoard` reads back). Call INSIDE a `handle.change()` callback.
 * The signatures + contract-sig ride inside the JSON, so re-carrying the tiddler never re-signs it; the fold's
 * quorum + contract-in verify decide trust, never this write. The stamp carries the entry's charter epoch —
 * provenance only, never the quorum authority.
 */
export function writeCarriageEntry(draft: LarDoc, entry: CarriageEntry): void {
  const key = membershipEntryKey(entry.nym, entry.action, entry.version);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(entry) }, entry.charterEpochCid);
}

/** Coerce one signature-record, or null when a required field is missing / mis-typed (the whole sig drops). */
function coerceSignature(raw: unknown): QuorumSignature | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s["signer"] !== "string" || typeof s["sig"] !== "string") return null;
  return { signer: s["signer"], sig: s["sig"] };
}

/** A parsed board payload reads a membership entry only at the exact `CarriageEntry` FLOOR shape — else null. */
function coerceCarriageEntry(parsed: unknown): CarriageEntry | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== CARRIAGE_ENTRY_DOMAIN) return null;                    // not a membership tiddler → skip
  if (typeof p["nym"] !== "string" || p["nym"].length === 0) return null;   // no member nym → skip
  const action = p["action"];
  if (action !== "admit" && action !== "revoke") return null;               // unknown action → skip
  if (!Number.isFinite(p["version"])) return null;                          // no monotone version → skip
  if (typeof p["charterEpochCid"] !== "string" || p["charterEpochCid"].length === 0) return null; // no epoch root → skip
  if (!Array.isArray(p["signatures"])) return null;                         // no quorum shape → skip
  const signatures: QuorumSignature[] = [];
  for (const raw of p["signatures"]) {
    const sig = coerceSignature(raw);
    if (sig === null) return null;   // a torn signature reads the whole entry closed (never a partial quorum)
    signatures.push(sig);
  }
  // The contract-in is OPTIONAL at the shape level (a revoke carries none); a torn contractSig reads the whole
  // entry closed rather than half-applied (an admit then simply fails the contract-in verify at the fold).
  let contractSig: QuorumSignature | undefined;
  if (p["contractSig"] !== undefined && p["contractSig"] !== null) {
    const cs = coerceSignature(p["contractSig"]);
    if (cs === null) return null;
    contractSig = cs;
  }
  // Copy the FLOOR fields ALONE — any extra field a forged tiddler smuggled in is dropped here, never carried
  // into the folded record (track contracts, never identities).
  const entry: CarriageEntry = {
    kind:            CARRIAGE_ENTRY_DOMAIN,
    nym:             p["nym"],
    action:          action as CarriageAction,
    version:         p["version"] as number,
    charterEpochCid: p["charterEpochCid"],
    signatures,
  };
  return contractSig ? { ...entry, contractSig } : entry;
}

/**
 * Extract every well-formed membership entry the board `LarDoc` carries. A torn / foreign / non-membership
 * tiddler is skipped. An absent doc surfaces the empty list (fail-closed: no entries → no members). The caller
 * folds the result through `foldCarriageSet` (the kahu quorum + contract-in decide trust, not this reader).
 */
export function carriageEntriesFromBoard(doc: LarDoc | undefined | null): CarriageEntry[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const entries: CarriageEntry[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }   // a non-JSON tiddler is not a membership entry
    const entry = coerceCarriageEntry(parsed);
    if (entry !== null) entries.push(entry);
  }
  return entries;
}
