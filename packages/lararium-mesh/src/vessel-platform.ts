/**
 * vessel-platform — host-side seams for the isomorphic vessel.
 *
 * Today this holds only `AuthVerifierSeam` (the host↔admin-island verify proxy,
 * consumed by the Stage-1+2 coupled unit). The full `VesselPlatform` contract —
 * the single adapter that distinguishes a node vessel from a browser vessel
 * (capabilities preset + storage/key/genesis/bootstrap/inbound-transport) —
 * lands with the Stage-0b kernel extraction, shaped by the factories AFTER
 * Stage 1 slims them. Writing that interface ahead of need produced a
 * speculative shape that the `mountPrimaryWiki` divergence already contradicted,
 * so it waits for its real consumer (YIN, 2026-06-05).
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/vessel-platform
 */

/**
 * AuthVerifierSeam — the host-side verification interface for an inbound
 * untrusted peer. Path (b): the implementation MESSAGES the admin island and
 * awaits its keyhive verdict (the host holds no keyhive after Stage 1).
 *
 * Bound only where an untrusted inbound transport lands. Node binds it to the WS
 * `AdminAuthGate`; the browser leaves it unbound (no inbound peer today), ready
 * to wire when it gains a relay/WebRTC connection.
 */
export interface AuthVerifierSeam {
  /**
   * Resolve the keyhive verdict for `cardBytes` against the access on `bagUrl`.
   * `identifier` carries the peer's keyhive Identifier hex (from the island's
   * `receiveContactCard`) so the host transport can key its peer/sharePolicy map
   * without a local keyhive — the host has none after Stage 1.
   */
  verify(
    cardBytes: Uint8Array,
    bagUrl: string,
    access: "read" | "admin",
  ): Promise<{ ok: boolean; identifier?: string; reason?: string }>;
}
