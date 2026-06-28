/**
 * conformance-verb-breathing — the shared behavioral conformance spec for M.3.
 *
 * "A system is what it does." Isomorphism lives as a PROPERTY proven by doing,
 * not as an interface two classes implement: a verb-bearing wiki tiddler, once it
 * reaches an island, MUST surface as one `IslandMsg_Event { verb, listenable,
 * fromUri, uri }` at the vessel-pool boundary — identically on a Node real-TW5
 * island and a browser Worker island.
 *
 * Each platform supplies its own harness (which pool, how it mounts, how it
 * collects events); BOTH delegate the contract — the find-predicate and the field
 * battery — here, so the contract lives in ONE place and both runtimes conform to
 * the same observable. Homed in @lararium/mesh (the lowest shared layer, where
 * `IslandMsg_Event` itself lives) so both vitest configs resolve it with no
 * barrel pull. The runner's `expect` arrives injected, so this carries no
 * test-runner dependency.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/conformance-verb-breathing
 */

import type { IslandMsg_Event } from "./island-protocol.js";

export interface VerbBreathingContract {
  /** The island's wiki URI (mountWiki id). */
  wikiUri:    string;
  /** The verb-bearing tiddler's URI — the event's `fromUri`/`uri`. */
  buttonUri:  string;
  /** The verb field the tiddler carries. */
  verb:       string;
  /** The listenable the tiddler carries. */
  listenable: string;
}

/** Locate the verb event in a collected stream (use inside a poll/waitFor). */
export function findVerbBreathingEvent(
  events: readonly IslandMsg_Event[],
  c:      VerbBreathingContract,
): IslandMsg_Event | undefined {
  return events.find(
    (e) => e.payload["verb"] === c.verb && e.listenable === c.listenable,
  );
}

/**
 * Assert the verb event's full shape. `eq(actual, expected, label)` wraps the
 * runner's equality check (e.g. `(a, e, l) => expect(a, l).toBe(e)`), keeping
 * this spec free of any test-runner import.
 */
export function assertVerbBreathingEvent(
  hit: IslandMsg_Event,
  c:   VerbBreathingContract,
  eq:  (actual: unknown, expected: unknown, label: string) => void,
): void {
  eq(hit.type,               "event",      "type");
  eq(hit.wikiUri,            c.wikiUri,     "wikiUri");
  eq(hit.listenable,         c.listenable,  "listenable");
  eq(hit.payload["verb"],    c.verb,        "verb");
  eq(hit.payload["fromUri"], c.buttonUri,   "fromUri");
  eq(hit.payload["uri"],     c.buttonUri,   "uri");
}
