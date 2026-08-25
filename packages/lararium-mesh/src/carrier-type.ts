/**
 * carrier-type — the media type a `.mem` carries, declared once.
 *
 * ── WHY THIS COLLAPSES AND THE PATTERNS AROUND IT DO NOT ────────────────────────────────────────
 * Four mechanisms dispatch on this string, each a different one: the TW5 parser module exports under
 * it, the deserializer module exports under it, `registerFileType` binds an extension to it, and a
 * record's stored `type` field is compared against it. A fifth reads it back off disk from a carrier's
 * own meta block.
 *
 * They agree only by hand. Spelled five ways, a change lands in four of them and the fifth refuses
 * quietly — a record whose type does not match simply stops projecting, with no throw and no
 * diagnostic. So the STRINGS collapse here; each mechanism keeps its own binding.
 *
 * ── ONE SPELLING, EVERYWHERE ────────────────────────────────────────────────────────────────────
 * `+tiddlywiki` is an RFC 6839 structured syntax suffix: it states that this syntax is BUILT ON TW5
 * wikitext, in the form a media-type registry already understands. The registration-track name —
 * no `x-`, RFC 6838 deprecates that prefix — is the one spelling read and written.
 *
 * A `type` outside CARRIER_TYPES surfaces as an unadmitted type, loudly, and the record does not
 * project — the correct fate for a spelling this grammar does not mint. Admitting near-misses would
 * trade that loud surface for a silent guess about what the author meant.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext#media-type
 */

/** What every carrier declares and every reader dispatches on — the one spelling. */
export const CARRIER_TYPE = "text/memetic-wikitext+tiddlywiki";

/** The admitted spellings — exactly one; the registration order dispatch follows. */
export const CARRIER_TYPES: readonly string[] = [CARRIER_TYPE] as const;

/** Whether a stored `type` names a memetic carrier. */
export function isCarrierType(type: unknown): boolean {
  return typeof type === "string" && CARRIER_TYPES.includes(type);
}

/**
 * The declaration every carrier opens with, spelled once.
 *
 * It carries the grammar's NAME before the address that defines it, so a reader learns what reads the
 * bytes before it learns where the law lives. Three carriers once opened with the address alone, minted
 * by two writers that each spelled the line by hand — and they parsed, and round-tripped to something
 * else, because a hand-spelled constant drifts the moment the real one moves.
 */
export const DECLARATION =
  `<<!DOCTYPE ${CARRIER_TYPE.replace("text/", "")} lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>`;
