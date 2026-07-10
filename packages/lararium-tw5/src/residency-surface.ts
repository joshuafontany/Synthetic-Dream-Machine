/**
 * residency-surface — TW5-side helpers that surface the Residency Model
 * coordinate space for operator-visible inspection.
 *
 * Anti-pattern #4 defense (shadow-override confusion at CRDT scale): every
 * read MUST surface origin-bag the way SPARQL exposes `GRAPH ?g`. TW5's
 * `getShadowSource` is the prior-art pattern at the K/V layer; this module
 * exposes the equivalent at the CRDT-residency layer.
 *
 * The `origin-bag` field gets written by the nalu engine on every inbound
 * CRDT change (see nalu-engine._toFields). This module reads it back.
 *
 * Meme:    lar:///ha.ka.ba/lararium/api/residency-model
 * Source:  packages/lararium-tw5/src/residency-surface.ts
 */

/**
 * Structural type — any TW5Wiki-like object that exposes getTiddler satisfies it.
 * Avoids a hard dependency on the TW5 type definitions for a single field read.
 */
interface WikiLikeForOrigin {
  getTiddler(title: string): { fields?: Record<string, unknown> } | null | undefined;
}

/**
 * Residency Model — return the bag URI that a tiddler's current value
 * surfaced from in this wiki. TW5 `getShadowSource` analog at the residency
 * layer. Returns null when the tiddler does not exist or carries no
 * `origin-bag` annotation (the latter normally means an in-memory-only or
 * draft tiddler that never travelled through CRDT inbound).
 *
 * The annotation gets populated by the nalu engine on inbound CRDT writes.
 * Operators may also query `composite.resolveAll(title)` at the mesh layer
 * for the full set of bags holding a Manifestation.
 */
export function getOriginBag(wiki: WikiLikeForOrigin, title: string): string | null {
  const tiddler = wiki.getTiddler(title);
  if (!tiddler) return null;
  const fields = tiddler.fields ?? {};
  const v = fields["origin-bag"];
  return typeof v === "string" && v.length > 0 ? v : null;
}
