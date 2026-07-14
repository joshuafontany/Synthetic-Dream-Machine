/**
 * persona-crossing — the @catalog admit crossing as one composable pair: admit a vessel into the human's
 * PersonaGroup and hand it everything it needs to READ the group's shared content.
 *
 * The verified primitives live on KeyhiveProvider; this composes them in the ONE load-bearing order keyhive
 * demands. keyhive read runs FORWARD-ONLY, so the founder ADDS the joinee first, ENCRYPTS after the add (the
 * fresh PCS op keys the content to the joinee's leaf), and CAPTURES the events after the encrypt (they carry
 * that PCS op). Ship the bundle over any relay — it holds only public CGKA/membership ops + already-encrypted
 * ciphertext; the joinee decrypts with its OWN prekey secret, nothing secret crosses the wire.
 *
 * The bags must already delegate to the PersonaGroup (production wires that at bind-mint). This pair assumes
 * that and does NOT touch the founding ceremony or the admit-edge signer — a caller composes it alongside.
 */
import type { KeyhiveProvider } from "./keyhive-provider.js";
import { bytesToBase64, base64ToBytes } from "./bytes-base64.js";

/** One shared chunk the joinee should read — the bag it belongs to, the doc it lives in, and its ciphertext. */
export interface CrossingContent {
  readonly bagUrl:    string;
  readonly docIdHex:  string;
  readonly ciphertext: string;   // base64 — already E2E, safe on any relay
}

/** Everything a joinee ingests to become a PersonaGroup member and read the shared content. All base64/plain. */
export interface PersonaCrossingBundle {
  readonly founderCard: string;                    // base64 — the joinee receives it first
  readonly capEvents:   readonly string[];         // base64 — public CGKA/membership ops (incl. the PCS update)
  readonly content:     readonly CrossingContent[];
}

/** One chunk the founder wants the joinee to read — the bag, its doc id, and the plaintext to encrypt. */
export interface CrossingPlaintext {
  readonly bagUrl:   string;
  readonly docIdHex: string;
  readonly plaintext: Uint8Array;
}

/** The PersonaGroup a crossing admits into — its sentinel doc id (membership) and agent id (delegation target). */
export interface PersonaGroupRef {
  readonly docIdHex:   string;
  readonly agentIdHex: string;
}

/**
 * FOUNDER side: admit a vessel into the PersonaGroup and pack the crossing bundle.
 *
 * Order is the whole discipline — add, THEN encrypt, THEN capture. The bags in `content` must already
 * delegate to the PersonaGroup, or `encryptContent` keys to a group the joinee never reaches.
 */
export async function packPersonaCrossing(
  founder: KeyhiveProvider,
  joineeContactCardBytes: Uint8Array,
  personaGroup: PersonaGroupRef,
  content: readonly CrossingPlaintext[],
): Promise<PersonaCrossingBundle> {
  const { id: joineeAgentId } = await founder.receiveContactCard(joineeContactCardBytes);
  await founder.addSentinelMember(joineeAgentId, personaGroup.docIdHex);  // ADD first — forward-only demands it
  const packed: CrossingContent[] = [];
  for (const c of content) {
    // Route A: RE-DELEGATE the bag to the PersonaGroup after the join, so the bag's tree sees the re-keyed
    // group (incl. the joinee) — the transitive re-key does NOT auto-propagate to a bag delegated before the
    // join. THEN encrypt, so the ciphertext keys to an epoch the joinee reaches.
    await founder.delegate({ bagUrl: c.bagUrl, audience: personaGroup.agentIdHex, access: "read" });
    const ct = await founder.encryptContent(c.bagUrl, c.plaintext);       // ENCRYPT after re-delegate
    packed.push({ bagUrl: c.bagUrl, docIdHex: c.docIdHex, ciphertext: bytesToBase64(ct) });
  }
  const events = await founder.eventsForPeer(joineeAgentId);              // CAPTURE after the encrypt
  return {
    founderCard: bytesToBase64(await founder.contactCard()),
    capEvents:   events.map(bytesToBase64),
    content:     packed,
  };
}

/**
 * JOINEE side: apply a crossing bundle — receive the founder, ingest membership, decrypt each shared chunk.
 * Returns the recovered plaintext per bag. A bag whose content keyed to an epoch before this vessel's add
 * throws — the forward-only boundary, honestly surfaced (route A owes a re-encrypt).
 */
export async function applyPersonaCrossing(
  joinee: KeyhiveProvider,
  bundle: PersonaCrossingBundle,
): Promise<{ bagUrl: string; plaintext: Uint8Array }[]> {
  await joinee.receiveContactCard(base64ToBytes(bundle.founderCard));
  await joinee.ingestPeerEvents(bundle.capEvents.map(base64ToBytes));
  const out: { bagUrl: string; plaintext: Uint8Array }[] = [];
  for (const c of bundle.content) {
    joinee.adoptBag(c.bagUrl, c.docIdHex);
    out.push({ bagUrl: c.bagUrl, plaintext: await joinee.decryptContent(c.bagUrl, base64ToBytes(c.ciphertext)) });
  }
  return out;
}
