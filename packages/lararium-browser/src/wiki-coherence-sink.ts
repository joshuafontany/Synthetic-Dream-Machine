/**
 * wiki-coherence-sink — the platform SEAM of the S1 coherence projection: the DOM write.
 *
 * The ONLY DOM-touching half of the coherence-nalu. The platform-blind organ
 * (@lararium/tw5 wiki-coherence-projection) reads the radius and shapes the frame; this applies that
 * frame to a live DOM host. Swap this sink (node → none; browser → this) and the organ never changes
 * — `role = capability ≠ platform`. This module imports @lararium/tw5 for the frame TYPE only (a
 * type-only import, erased at runtime), so it drags in zero organ runtime and zero node builtins.
 *
 * newest-wins: the frame carries a monotone `rev`; the sink DROPS a frame that arrives stale (a
 * slower async consistency read that resolved after a newer one) — the coalesce ordering's
 * main-thread half, matching applyProjection's `_projRev` guard.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-coherence-projection
 */

import type { CoherenceIndicatorFrame } from "@lararium/tw5";

/** The frame the sink receives — the pure indicator frame plus the gate's monotone revision. */
export type CoherenceFrameWithRev = CoherenceIndicatorFrame & { rev: number };

/** A mounted coherence indicator — `apply` a frame; `dispose` when the view tears down. */
export interface CoherenceIndicatorSink {
  apply(frame: CoherenceFrameWithRev): void;
  dispose(): void;
}

/**
 * Mount a coherence indicator on a live DOM host — the SINK. It writes the coherence posture onto the
 * host: a `data-coherence` status attribute (a stylesheet colors the indicator off it), the numeric
 * radius, the obstructing tiddler titles as a `title` tooltip, and the human label as the text. A
 * stale frame (older `rev` than the last applied) drops silently — a newer read already landed.
 *
 * DOM-only lives here (the browser tsconfig carries the DOM lib; the tw5 organ does not). The host
 * outlives the sink, so `dispose` holds nothing to release — it stands for the swappable-sink contract.
 */
export function mountCoherenceIndicator(host: HTMLElement): CoherenceIndicatorSink {
  let lastRev = 0;
  return {
    apply(frame: CoherenceFrameWithRev): void {
      if (frame.rev < lastRev) return; // stale — a newer frame already landed (coalesce ordering)
      lastRev = frame.rev;
      host.setAttribute("data-coherence", frame.status);
      host.setAttribute("data-radius", String(frame.radius));
      // the obstruction locus rides a tooltip — the tiddler(s) to look at when the planes fracture.
      if (frame.obstructing.length > 0) host.setAttribute("title", frame.obstructing.join(", "));
      else host.removeAttribute("title");
      host.textContent = frame.label;
    },
    dispose(): void {
      /* the host outlives the sink; nothing worker-held to release. */
    },
  };
}
