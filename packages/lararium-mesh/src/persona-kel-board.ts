/**
 * persona-kel-board — the DOC face of the persona-KEL: extract `PersonaKelEvent`s out of the per-Nexus,
 * always-carried KEL BOARD (a `LarDoc` under `personaKelBoardDocUrl`, deterministic-doc). The board holds
 * EVERY persona's key-event-log keyed by `{prefix}/{seq}`, so one board per Nexus federates once and every
 * island member walks the same identifier→head mapping "as of my last sync" (no-global-now; a not-yet-synced
 * reader surfaces a shorter chain or none, and the pin-move fails closed on it — never a global lookup).
 *
 * STORAGE CONVENTION (mirrors antigen-board): each KEL event rides ONE tiddler whose `text` carries the
 * event's JSON (`PersonaKelEvent`). Keying by `{prefix}/{seq}` makes the board an ADDITIVE CRDT — a rotation
 * ACCRETES a new seq under a distinct key, so a concurrent write never overwrites a standing event in place;
 * the fold (`verifyPersonaKel` / `headOpKey`), never the write, decides the authoritative head. The extractor
 * is PERMISSIVE (a torn / foreign / non-KEL tiddler is SKIPPED, never guessed) because trust rides the
 * downstream structural + quorum verify: a malformed event that slips extraction dies at `verifyPersonaKel`.
 * FAIL CLOSED end-to-end: an absent/empty board surfaces NO chains, so a prefix resolves to a null head and
 * the Binding-Gate walk denies.
 *
 * Platform-blind: rides ./base-doc (LarDoc) + ./persona-kel types only. NO node: imports — the disk/repo
 * resolution of the board handle lives in the node holder (persona-kel-ring), which hands a read `LarDoc` here.
 * Meme: lar:///ha.ka.ba/lararium/mesh/persona-kel
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import type { QuorumSignature } from "./kapae-antigen.js";
import { PERSONA_KEL_DOMAIN, type PersonaKelEvent } from "./persona-kel.js";

/**
 * The tiddler-key prefix every persona-KEL event rides under — so the log events namespace apart from a
 * board's other content. On the DreamNet plane (the per-Nexus KEL board), not one lararium's `lares` API.
 */
export const PERSONA_KEL_ENTRY_PREFIX = "lar:///ha.ka.ba/dreamnet/persona-kel/" as const;

/**
 * The tiddler key one KEL event rides under — keyed by the persona PREFIX and the event SEQ, so every event
 * ACCRETES (the additive CRDT the reader walks) and a rotation never overwrites its predecessor: inception
 * (seq 0) and a rotation (seq 1) land under DISTINCT keys and BOTH survive. Keying by prefix alone would let
 * a later event win the Automerge LWW merge in place and silently drop the lineage the fold must walk.
 */
export function personaKelEntryKey(prefix: string, seq: number): string {
  return `${PERSONA_KEL_ENTRY_PREFIX}${prefix}/${seq}`;
}

/**
 * Land a KEL event onto a board draft — write it as a namespaced tiddler whose `text` carries the event JSON
 * (the EXACT shape `personaKelEventsFromBoard` reads back). Call INSIDE a `handle.change()` callback. The
 * event's authority (its cid + any rotation sigs) rides inside the JSON, so re-carrying the tiddler never
 * re-signs it; the fold's structural + quorum verify decides trust, never this write. The authority stamp
 * carries the event's own cid — provenance only, never authority.
 */
export function writePersonaKelEvent(draft: LarDoc, event: PersonaKelEvent): void {
  const key = personaKelEntryKey(event.prefix, event.seq);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(event) }, event.eventCid);
}

/** Coerce one signature-record, or null when a required field is missing / mis-typed (the whole sig drops). */
function coerceSignature(raw: unknown): QuorumSignature | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s["signer"] !== "string" || typeof s["sig"] !== "string") return null;
  return { signer: s["signer"], sig: s["sig"] };
}

/** Coerce a string[] field, or null when any element is not a string (the whole event drops — never a partial). */
function coerceStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") return null;
    out.push(v);
  }
  return out;
}

/** A parsed board payload reads a KEL event only at the exact `PersonaKelEvent` shape — else null (skipped). */
function coercePersonaKelEvent(parsed: unknown): PersonaKelEvent | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (!Number.isInteger(p["seq"]) || (p["seq"] as number) < 0)                 return null; // no monotone seq → skip
  if (typeof p["eventCid"] !== "string" || p["eventCid"].length === 0)         return null;
  if (typeof p["prefix"] !== "string" || p["prefix"].length === 0)            return null;
  if (typeof p["opKeyDid"] !== "string" || p["opKeyDid"].length === 0)         return null;
  if (typeof p["recoverySetHash"] !== "string")                               return null; // "" allowed (unarmed)
  const recoveryRoster = coerceStringArray(p["recoveryRoster"]);
  if (recoveryRoster === null)                                                return null;
  if (!Number.isFinite(p["recoveryThreshold"]))                              return null;
  const prevRaw = p["prevEventCid"];
  if (prevRaw !== null && typeof prevRaw !== "string")                        return null; // null (inception) or a hash-link
  if (!Array.isArray(p["rotationSigs"]))                                     return null;
  const rotationSigs: QuorumSignature[] = [];
  for (const raw of p["rotationSigs"]) {
    const sig = coerceSignature(raw);
    if (sig === null) return null;   // a torn signature reads the whole event closed (never a partial quorum)
    rotationSigs.push(sig);
  }
  // The event carries no explicit `kind` field (persona-kel events are structural); the domain lives in the
  // event bytes the cid commits, so a structural coercion + the downstream cid recompute is the real gate.
  void PERSONA_KEL_DOMAIN;
  return {
    seq:               p["seq"] as number,
    eventCid:          p["eventCid"],
    prefix:            p["prefix"],
    opKeyDid:          p["opKeyDid"],
    recoverySetHash:   p["recoverySetHash"],
    recoveryRoster,
    recoveryThreshold: p["recoveryThreshold"] as number,
    prevEventCid:      prevRaw,
    rotationSigs,
  };
}

/**
 * Extract every well-formed KEL event the board `LarDoc` carries (across ALL personas). A torn / foreign /
 * non-KEL tiddler is skipped. An absent doc surfaces the empty list (fail-closed: no events → no heads → the
 * pin-move denies). The caller groups by prefix and folds through `verifyPersonaKel` / `headOpKey`.
 */
export function personaKelEventsFromBoard(doc: LarDoc | undefined | null): PersonaKelEvent[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const events: PersonaKelEvent[] = [];
  for (const record of Object.values(tiddlers)) {
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }   // a non-JSON tiddler is not a KEL event
    const event = coercePersonaKelEvent(parsed);
    if (event !== null) events.push(event);
  }
  return events;
}

/**
 * Group the board's events into per-prefix chains, each SORTED by seq ascending — the lineage `verifyPersonaKel`
 * walks. A duplicate seq under one prefix cannot arise from the `{prefix}/{seq}` keying (Automerge LWW keeps
 * one per key); a structural break (a gap, a mis-linked cid) survives extraction and is caught at the fold, so
 * this grouping stays PERMISSIVE — it orders the events, it never adjudicates the chain.
 */
export function personaKelChainsFromBoard(doc: LarDoc | undefined | null): Map<string, PersonaKelEvent[]> {
  const chains = new Map<string, PersonaKelEvent[]>();
  for (const e of personaKelEventsFromBoard(doc)) {
    const chain = chains.get(e.prefix) ?? [];
    chain.push(e);
    chains.set(e.prefix, chain);
  }
  for (const chain of chains.values()) chain.sort((a, b) => a.seq - b.seq);
  return chains;
}

/**
 * The seq-sorted chain for ONE persona prefix, or null when the board carries no event under it (fail-closed:
 * a prefix the local replica has not yet synced surfaces null → the pin-move denies). The returned chain is
 * UNVERIFIED — the caller runs `verifyPersonaKel` / `headOpKey` to gate structure + quorums before trusting.
 */
export function personaKelChainForPrefix(doc: LarDoc | undefined | null, prefix: string): PersonaKelEvent[] | null {
  const chain = personaKelChainsFromBoard(doc).get(prefix);
  return chain && chain.length > 0 ? chain : null;
}
