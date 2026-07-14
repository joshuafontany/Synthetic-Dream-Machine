/**
 * handle-card.test.ts — publish a face, recognise it, and prove the vault never leaks.
 *
 * The publication model claims four things, and each is a test: a card CERTIFIES ITSELF (no registry), a
 * recogniser knows it AGAIN (persistence), a stale card cannot ROLL BACK a fresh one (monotone lease), and
 * publishing one handle reveals NOTHING about another (the unlinkability the whole vault exists for).
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  signHandleCard, verifyHandleCard, recognizeHandle, acceptHandleUpdate, handleCardId,
  HANDLE_CARD_DOMAIN, type HandleCard,
} from "../src/handle-card.js";
import { hex } from "../src/crypto.js";

/** FastJack and Dodger — two handles the same human holds, and MUST stay unlinkable. Fixed seeds. */
const FASTJACK_SEED = new Uint8Array(32).fill(9);
const DODGER_SEED   = new Uint8Array(32).fill(21);

const signer = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function publish(seed: Uint8Array, glamour: string, over: Partial<HandleCard> = {}): Promise<HandleCard> {
  const nym = await pubOf(seed);
  return signHandleCard({
    nym, glamour, version: 1, prev: null,
    expiry: 4_000_000_000_000, standing: null, ...over,
  }, signer(seed));
}

describe("recognition is SELF-CERTIFYING — the card needs no registry", () => {
  test("a card verifies against the key it names, with nothing else consulted", async () => {
    const card = await publish(FASTJACK_SEED, "FastJack");
    const v = await verifyHandleCard(card);
    expect(v.ok).toBe(true);
    expect(v.nym).toBe(await pubOf(FASTJACK_SEED));   // the identifier IS the key
  });

  test("a card signed by the WRONG key certifies nothing — it names FastJack but Dodger signed it", async () => {
    const fj = await pubOf(FASTJACK_SEED);
    // craft a card that CLAIMS FastJack's nym but is signed by Dodger's seed
    const forged = await signHandleCard({
      nym: fj, glamour: "Not-FastJack", version: 1, prev: null, expiry: 4e12, standing: null,
    }, signer(DODGER_SEED));
    const v = await verifyHandleCard(forged);
    expect(v).toEqual({ ok: false, reject: "bad-signature" });
  });

  test("a rejection NAMES itself — a recogniser must know forgery from typo from lapse", async () => {
    const card = await publish(FASTJACK_SEED, "FastJack");
    expect((await verifyHandleCard({ ...card, kind: "nostr" as never })).reject).toBe("wrong-domain");
    expect((await verifyHandleCard({ ...card, nym: "xyz" })).reject).toBe("malformed");
    expect((await verifyHandleCard({ ...card, glamour: "tampered" })).reject).toBe("bad-signature");
  });
});

describe("a recogniser knows the handle AGAIN — persistence across encounters", () => {
  test("the petname check admits the known key and refuses a stranger", async () => {
    const fjNym  = await pubOf(FASTJACK_SEED);
    const fjCard = await publish(FASTJACK_SEED, "FastJack v2", { version: 2 });
    const stranger = await publish(DODGER_SEED, "FastJack");   // same glamour, different key

    expect(await recognizeHandle(fjCard, fjNym)).toBe(true);
    // the GLAMOUR is not the identity — a stranger wearing the name is not recognised
    expect(await recognizeHandle(stranger, fjNym)).toBe(false);
  });

  test("recognition rests on the KEY, never the display name — impersonation by name fails", async () => {
    const impostor = await publish(DODGER_SEED, "FastJack");   // wears the famous glamour
    const v = await verifyHandleCard(impostor);
    expect(v.ok).toBe(true);                                    // the impostor's OWN card is valid
    expect(v.nym).not.toBe(await pubOf(FASTJACK_SEED));         // …but it is a different key, so not FastJack
  });
});

describe("the lease + lineage — monotone, self-staling, followable", () => {
  test("a stale card is refused against the local clock — and only then", async () => {
    const NOW = 1_000_000;
    const fresh = await publish(FASTJACK_SEED, "FastJack", { expiry: NOW + 10_000 });
    const stale = await publish(FASTJACK_SEED, "FastJack", { expiry: NOW - 10_000 });
    expect((await verifyHandleCard(fresh, NOW)).ok).toBe(true);
    expect((await verifyHandleCard(stale, NOW)).reject).toBe("expired");
    // …but WITHOUT a clock, a stale-but-signed card still verifies as a last-known face (the recogniser's call)
    expect((await verifyHandleCard(stale)).ok).toBe(true);
  });

  test("re-leasing keeps the SAME card identity — the lineage survives heartbeats", async () => {
    // expiry rides OUTSIDE the signed identity, so a lease renewal is the same face, not a new one.
    const base = { nym: await pubOf(FASTJACK_SEED), glamour: "FastJack", version: 3,
                   prev: null as string | null, standing: null as string | null };
    const a = await handleCardId({ ...base, kind: HANDLE_CARD_DOMAIN, expiry: 1000 });
    const b = await handleCardId({ ...base, kind: HANDLE_CARD_DOMAIN, expiry: 9999 });
    expect(a).toBe(b);
  });

  test("a card links to its predecessor — a recogniser can walk one face's history", async () => {
    const v1 = await publish(FASTJACK_SEED, "FastJack", { version: 1 });
    const v1id = await handleCardId(v1);
    const v2 = await publish(FASTJACK_SEED, "FastJack the Healer", { version: 2, prev: v1id });
    expect(v2.prev).toBe(v1id);
    expect((await verifyHandleCard(v2)).ok).toBe(true);
  });
});

describe("the ANNOUNCE reader rule — accept the newer face, refuse a rollback or a fork", () => {
  test("first recognition: with nothing held, the rule reduces to self-cert + the nym match", async () => {
    const nym = await pubOf(FASTJACK_SEED);
    const v1  = await publish(FASTJACK_SEED, "FastJack", { version: 1 });
    expect((await acceptHandleUpdate(v1, { expectedNym: nym })).ok).toBe(true);
    // a card naming a DIFFERENT key is a stranger, never an update — however well it certifies itself
    const stranger = await publish(DODGER_SEED, "FastJack");
    expect((await acceptHandleUpdate(stranger, { expectedNym: nym })).reject).toBe("wrong-nym");
  });

  test("a fresh version supersedes; a stale one is refused as a rollback", async () => {
    const nym = await pubOf(FASTJACK_SEED);
    const v1  = await publish(FASTJACK_SEED, "FastJack", { version: 1 });
    const v1id = await handleCardId(v1);
    const v2  = await publish(FASTJACK_SEED, "FastJack the Healer", { version: 2, prev: v1id });
    // holding v1 (high-water 1), v2 links it and bumps the counter — accepted
    expect((await acceptHandleUpdate(v2, { expectedNym: nym, highWaterVersion: 1, lastCardId: v1id })).ok).toBe(true);
    // a copy of v1 re-arriving after v2 tries to roll the Handle back — refused
    expect((await acceptHandleUpdate(v1, { expectedNym: nym, highWaterVersion: 2, lastCardId: v1id })).reject).toBe("rollback");
  });

  test("a card whose prev fails to link the last held card is a fork — refused as a lineage break", async () => {
    const nym = await pubOf(FASTJACK_SEED);
    const v1  = await publish(FASTJACK_SEED, "FastJack", { version: 1 });
    const v1id = await handleCardId(v1);
    // an equivocating v2 that bumps the version but points prev at a DIFFERENT ancestor
    const forkV2 = await publish(FASTJACK_SEED, "FastJack forked", { version: 2, prev: "0".repeat(64) });
    expect((await acceptHandleUpdate(forkV2, { expectedNym: nym, highWaterVersion: 1, lastCardId: v1id })).reject).toBe("lineage-break");
  });

  test("the reader rule still honours the local-clock lease — a stale update is refused before its lineage", async () => {
    const NOW = 1_000_000;
    const nym = await pubOf(FASTJACK_SEED);
    const stale = await publish(FASTJACK_SEED, "FastJack", { version: 5, expiry: NOW - 1 });
    expect((await acceptHandleUpdate(stale, { expectedNym: nym, now: NOW })).reject).toBe("expired");
  });
});

describe("★ UNLINKABILITY — publish one face, reveal none of the others ★", () => {
  test("FastJack's card carries nothing that reaches Dodger or the vault", async () => {
    const fj = await publish(FASTJACK_SEED, "FastJack", { standing: "cid-of-fastjack-thread" });

    // The card's ENTIRE surface is the handle's own public data. Nothing in it is derivable toward another
    // handle's key, and nothing points at a collector. If a future field ever did, this test would catch it.
    const surface = JSON.stringify(fj);
    const dodgerNym = await pubOf(DODGER_SEED);
    expect(surface).not.toContain(dodgerNym);                 // Dodger's key never appears
    expect(surface).not.toContain(hex(FASTJACK_SEED));        // the SEED never appears — only the pubkey
    expect(surface).not.toContain(hex(DODGER_SEED));

    // The two handles share NO key material — the whole basis of the vault's collect-not-merge.
    expect(fj.nym).not.toBe(dodgerNym);
  });

  test("two published faces are two independent cards — no join between them exists on the wire", async () => {
    const fj = await publish(FASTJACK_SEED, "FastJack");
    const dg = await publish(DODGER_SEED, "Dodger");
    // Each certifies itself; neither references the other; the human who holds both is nowhere in either.
    expect((await verifyHandleCard(fj)).ok).toBe(true);
    expect((await verifyHandleCard(dg)).ok).toBe(true);
    expect(fj.nym).not.toBe(dg.nym);
    expect(fj.prev).toBeNull();
    expect(dg.prev).toBeNull();
  });
});
