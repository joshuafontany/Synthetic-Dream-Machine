/**
 * v3-proof-crux.test.ts — the browser↔node crossing fails at "V3 proof verification failed", for the anon
 * AND the admitted vessel alike. So the failure sits BELOW the admit, in the proof itself, and the whole
 * proof rests on ONE unproven assumption:
 *
 *   the keyhive ContactCard's identifier ENDS WITH the raw ed25519 verifying-key of the same seed.
 *
 * The gate derives the peer's key as `id.slice(-64)` off the card, and the leaf signs with the seed whose
 * raw pubkey it presents as `peerPubKey`. If those two keys are not the same bytes, every proof this system
 * ever mints verifies against the wrong key and fails — silently, and identically, for everyone.
 *
 * This test asks the assumption directly, with no browser and no relay, so the answer is a fact and not a
 * guess.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";
import { verifyAuthProof, authProofBytes } from "@lararium/mesh";
import { hex } from "@lararium/mesh";

const SEED = new Uint8Array(32).fill(42);

describe("the V3 proof crux — does the card's identifier carry the signing key?", () => {
  test("the ContactCard identifier ENDS WITH the raw ed25519 pubkey of its own seed", async () => {
    const rawPub = hex(await ed.getPublicKeyAsync(SEED));

    const kh = new KeyhiveProvider();
    await kh.init({ seed: SEED, eventStore: new InMemoryEventStore() });
    const cardBytes = await kh.contactCard();
    const { id } = await kh.receiveContactCard(cardBytes);
    await kh.dispose();

    // THE ASSUMPTION THE GATE MAKES. If this fails, the gate derives the wrong peerPubKey off every card,
    // and "V3 proof verification failed" is not a bug in the leaf — it is the gate verifying a good
    // signature against a key that never signed it.
    expect(String(id).endsWith(rawPub),
      `card id must end with the seed's raw pubkey — else id.slice(-64) is not the signing key\n` +
      `  raw pubkey : ${rawPub}\n  card id    : ${String(id)}`,
    ).toBe(true);
  });

  test("a proof signed by the seed VERIFIES against the key the gate derives from the card", async () => {
    // The end-to-end crux: mint the card, derive the gate's peerPubKey the way the gate does, sign a proof
    // with the seed the way the leaf does, and verify. This is the whole handshake, minus the socket.
    const kh = new KeyhiveProvider();
    await kh.init({ seed: SEED, eventStore: new InMemoryEventStore() });
    const { id } = await kh.receiveContactCard(await kh.contactCard());
    await kh.dispose();

    const peerPubKey = String(id).slice(-64);           // what the gate uses
    const nonce = "ab".repeat(32);
    const gatePubKey = "cd".repeat(32);
    const aud = "lar:///ha.ka.ba/bags/@daemon";
    const ts = "2026-07-13T00:00:00.000Z";

    const bytes = authProofBytes({ nonce, gatePubKey, peerPubKey, aud, ts });
    const sig = hex(await ed.signAsync(bytes, SEED));    // the leaf signs with its seed

    const v = await verifyAuthProof({ nonce, gatePubKey, peerPubKey, aud, ts, sig });
    expect(v.ok, `the gate must accept a proof the leaf signed: ${v.reason ?? ""}`).toBe(true);
  });
});
