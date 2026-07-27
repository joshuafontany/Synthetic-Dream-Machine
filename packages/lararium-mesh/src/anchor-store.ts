/**
 * anchor-store — the veiled-Handle's sentinel-anchor SHORE (platform-blind).
 *
 * A vessel binds to its veiled Handle through three sentinel ids the founding ceremony mints off
 * keyhive's CSPRNG — unreproducible from any seed. Those ids live OUTSIDE the wiped substrate so a
 * rebirth reforges the store while re-reading the SAME anchors, and the Handle survives the substrate.
 *
 * The core owns only the SHAPE + the roster contract; the platform supplies HOW it persists. Anchors
 * carry PUBLIC doc-ids — no secret material rides here, so no seal touches this shore. (The at-rest
 * seal governs the keyhive ARCHIVE, a distinct node-adapter concern; the core never sees seal policy.)
 *
 * PLURALITY PONO at the identity layer: a vessel that wears several personas anchors EACH to its OWN
 * veiled Handle (a distinct PersonaGroup + MeshCabal + agentId), so the store keys by handle-index. The
 * ROSTER reads the store's OWN keys — an explicit record the writer maintains, never a dir-scan pattern.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/anchor-store
 */

/** The sentinel anchors that bind a vessel to ONE veiled Handle. Hex doc-ids + agentId — all public. */
export interface IdentityAnchors {
  readonly personaGroupDocIdHex: string;
  readonly meshCabalDocIdHex: string;
  /** The PersonaGroup agentId — Gate-C membership reads it, and the bootstrap never carried it. */
  readonly personaGroupAgentIdHex: string;
}

/**
 * How a runtime persists the veiled-Handle anchor SET — keyed by handle-index (one anchor set per
 * persona the vessel holds). `list` returns the roster from the store's OWN explicit record, never a
 * regex dir-scan. A joinee holds anchors at its admitted index with no matching root (listRoots()=[]).
 */
export interface AnchorStore {
  /** Read ONE persona's anchors back, or null when that index holds none. */
  load(handleIndex: number): IdentityAnchors | null;
  /** Write ONE persona's anchors, recording the index into the roster. */
  save(handleIndex: number, anchors: IdentityAnchors): void;
  /** The anchored-persona roster — every handle-index this vessel anchors, ascending. */
  list(): number[];
}

/**
 * Validate an anchor shape read back from a store — every field a present hex string. Returns the
 * value branded as IdentityAnchors, or null when a field is absent/mistyped (a torn write reads null,
 * never a half-anchor the Handle would trust).
 */
export function readIdentityAnchors(parsed: Partial<IdentityAnchors> | null | undefined): IdentityAnchors | null {
  if (
    parsed &&
    typeof parsed.personaGroupDocIdHex === "string" &&
    typeof parsed.meshCabalDocIdHex === "string" &&
    typeof parsed.personaGroupAgentIdHex === "string"
  ) {
    return parsed as IdentityAnchors;
  }
  return null;
}
