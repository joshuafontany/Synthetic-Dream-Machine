/**
 * antigen-board — the DOC face of the Kapae-antigen: extract `KapaeAntigenEntry`s out of the
 * always-carried antigen BOARD (a `LarDoc` under `kapaeAntigenDocUrl`, deterministic-doc). The pure
 * fold/verify (kapae-antigen `foldAntigenSet`) reads the entries this extractor surfaces; the
 * DeterministicFederationGate federates the board so every honest carrier holds the same entries.
 *
 * STORAGE CONVENTION (the board's shape): each antigen entry rides ONE tiddler whose `text` carries the
 * entry's JSON (`KapaeAntigenEntry`). The extractor walks every tiddler, parses its text, and keeps only
 * the ones that structurally coerce to an entry — a foreign / torn / non-antigen tiddler is SKIPPED, never
 * guessed into an entry. The extractor is permissive in EXTRACTION on purpose: it never adjudicates trust
 * (an entry it surfaces still faces the quorum verifier in `foldAntigenSet`, which IGNORES any entry whose
 * ≥ k charter-signed quorum does not verify). So a malformed or forged entry that slips through extraction
 * costs nothing — it dies at the fold. FAIL CLOSED end-to-end: an absent/empty board surfaces NO entries,
 * the fold yields the empty Kapae'd set, and the antigen stays inert (no quorum, no bans).
 *
 * Platform-blind: rides ./base-doc (LarDoc) + ./kapae-antigen types only. NO node: imports — the DISK/repo
 * resolution of the board handle lives in the node holder (antigen-ring), which hands a read `LarDoc` here.
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#kapae-the-antigen
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import {
  KAPAE_ANTIGEN_DOMAIN,
  type KapaeAntigenEntry,
  type KapaeAction,
  type QuorumSignature,
} from "./kapae-antigen.js";

/**
 * The tiddler-key prefix every antigen entry rides under — so the ban/lift entries namespace apart from a
 * board's other content and the RAISE path keys them the READER already walks. On the DreamNet plane (the
 * always-carried immune antigen), not one lararium's `lares` API.
 */
export const ANTIGEN_ENTRY_PREFIX = "lar:///ha.ka.ba/dreamnet/kapae-antigen/" as const;

/**
 * The tiddler key one antigen entry rides under — keyed by nym, ACTION, and version, so every distinct signed
 * entry ACCRETES (the additive CRDT the fold reads) and NOTHING overwrites a standing entry: a ban@v1 and a
 * lift@v1 land under DISTINCT keys and BOTH survive, so `foldAntigenSet`'s equivocation guard (a same-version
 * kapae beats un_kapae) still runs — keying by nym alone (or nym+version) would let a concurrent lift win the
 * Automerge LWW merge in place and silently roll a ban back. The fold, never the write, adjudicates the winner.
 */
export function antigenEntryKey(nym: string, action: KapaeAction, version: number): string {
  return `${ANTIGEN_ENTRY_PREFIX}${nym}/${action}/${version}`;
}

/**
 * Land a signed antigen entry onto a board draft — write it as a namespaced tiddler whose `text` carries the
 * entry JSON (the EXACT shape `antigenEntriesFromBoard` reads back). Call INSIDE a `handle.change()` callback
 * (the draft mutates there, exactly as `writeHandleAnnounce` lands a card). The entry's signatures ride inside
 * the JSON, so re-carrying the tiddler never re-signs it; the fold's quorum verifier decides trust, never this
 * write. The authority stamp carries the entry's charter epoch — provenance only, never the quorum authority.
 */
export function writeAntigenEntry(draft: LarDoc, entry: KapaeAntigenEntry): void {
  const key = antigenEntryKey(entry.nym, entry.action, entry.version);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(entry) }, entry.sealEpochCid);
}

/** Coerce one signature-record, or null when a required field is missing / mis-typed (the whole sig drops). */
function coerceSignature(raw: unknown): QuorumSignature | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s["signer"] !== "string" || typeof s["sig"] !== "string") return null;
  return { signer: s["signer"], sig: s["sig"] };
}

/** A parsed board payload reads an antigen entry only at the exact `KapaeAntigenEntry` shape — else null. */
function coerceAntigenEntry(parsed: unknown): KapaeAntigenEntry | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== KAPAE_ANTIGEN_DOMAIN) return null;                    // not an antigen tiddler → skip
  if (typeof p["nym"] !== "string" || p["nym"].length === 0) return null; // no ban target → skip
  const action = p["action"];
  if (action !== "kapae" && action !== "un_kapae") return null;           // unknown action → skip
  if (!Number.isFinite(p["version"])) return null;                        // no monotone version → skip
  if (typeof p["sealEpochCid"] !== "string" || p["sealEpochCid"].length === 0) return null; // no epoch root → skip
  if (!Array.isArray(p["signatures"])) return null;                       // no quorum shape → skip
  const signatures: QuorumSignature[] = [];
  for (const raw of p["signatures"]) {
    const sig = coerceSignature(raw);
    if (sig === null) return null;   // a torn signature reads the whole entry closed (never a partial quorum)
  }
  for (const raw of p["signatures"]) signatures.push(coerceSignature(raw)!);
  return {
    kind:            KAPAE_ANTIGEN_DOMAIN,
    nym:             p["nym"],
    action:          action as KapaeAction,
    version:         p["version"] as number,
    sealEpochCid: p["sealEpochCid"],
    signatures,
  };
}

/**
 * Extract every well-formed antigen entry the board `LarDoc` carries. A torn / foreign / non-antigen
 * tiddler is skipped. An absent doc surfaces the empty list (fail-closed: no entries → no bans). The
 * caller folds the result through `foldAntigenSet` (the quorum verifier decides trust, not this reader).
 */
export function antigenEntriesFromBoard(doc: LarDoc | undefined | null): KapaeAntigenEntry[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const entries: KapaeAntigenEntry[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }   // a non-JSON tiddler is not an antigen entry
    const entry = coerceAntigenEntry(parsed);
    if (entry !== null) entries.push(entry);
  }
  return entries;
}
