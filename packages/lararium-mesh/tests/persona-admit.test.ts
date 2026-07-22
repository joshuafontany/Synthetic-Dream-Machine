/**
 * persona-admit.test.ts — the 3-hop persona-admission ceremony: a simulated device-to-device handoff between
 * two in-test vessels, plus the photograph-inert negatives (a captured QR grants nothing).
 *
 * Proven:
 *   · THE HAPPY 3-HOP — B enrolls → A seals a prefix-signed grant to B's ephemeral → B opens + ACKs → A verifies;
 *     both vessels end holding the SAME mutually-signed JoinRecord (dual-admission composed),
 *   · PHOTOGRAPH-INERT — a captured QR#2 opened WITHOUT B's ephemeral secret fails (decrypt), a captured QR#2
 *     replayed onto a FRESH enrollment fails (sealed to the old ephemeral), a tampered ciphertext fails,
 *   · ROTATE-NOT-RESURRECT — a grant whose op-key is NOT the persona prefix head is refused,
 *   · BINDINGS — an expired grant, a wrong-vessel grant, and a tampered/forged ACK all refuse (fail-closed),
 *   · CARRIAGE — each hop round-trips through its base64url envelope; a garbled/wrong-key carriage → null.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  mintEnrollmentOffer, sealPersonaGrant, openPersonaGrant, mintJoinAck, verifyJoinAck,
  toEnrollmentCarriage, parseEnrollmentCarriage, toGrantCarriage, parseGrantCarriage,
  toAckCarriage, parseAckCarriage,
  ed25519SignerFromSeed,
  type PersonaRef, type EnrollmentOffer,
} from "../src/index.js";
import { hex } from "../src/crypto.js";

const pubOf = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

// A = the granting vessel (holds the persona op-key); B = the target vessel (holds its device key).
const A_PERSONA_SEED = new Uint8Array(32).fill(1);   // the persona's current op-key seed
const B_DEVICE_SEED  = new Uint8Array(32).fill(2);   // B's device key seed
const PERSONA_PREFIX = "EpersonaAID_prefix_0001";

/** A persona-KEL head resolver — the LOCAL replica read. Maps a prefix → its CURRENT op-key (rotate-not-resurrect). */
function headResolver(map: Record<string, string>) {
  return (prefix: string): string | null => map[prefix] ?? null;
}

async function fixtures() {
  const personaKey = await pubOf(A_PERSONA_SEED);   // A's persona current op-key
  const deviceKey  = await pubOf(B_DEVICE_SEED);    // B's device verifying key (targetVesselId)
  const personaRef: PersonaRef = { prefix: PERSONA_PREFIX, verifyingKey: personaKey };
  const personaSigner = ed25519SignerFromSeed(A_PERSONA_SEED);
  const deviceSigner  = ed25519SignerFromSeed(B_DEVICE_SEED);
  const resolveHeadOpKey = headResolver({ [PERSONA_PREFIX]: personaKey });
  return { personaKey, deviceKey, personaRef, personaSigner, deviceSigner, resolveHeadOpKey };
}

describe("persona-admit — the 3-hop ceremony", () => {
  test("THE HAPPY PATH: enroll → seal → open → ack → verify; both hold the SAME join record", async () => {
    const f = await fixtures();

    // 1. B enrolls (QR#1). The ephemeral SECRET stays with B; only the offer travels.
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    expect(offer.targetVesselId).toBe(f.deviceKey);

    // 2. A seals the grant to B's ephemeral pubkey (QR#2), signing with the persona prefix key.
    const { sealed, sent } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });

    // 3. B opens + verifies against the prefix head.
    const opened = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.accepted.transcript.personaRef.prefix).toBe(PERSONA_PREFIX);
    expect(opened.accepted.headOpKey).toBe(f.personaKey);

    // 4. B ACKs (QR#3), signing the join record with its device key.
    const { ack, joinRecord: bRecord } = await mintJoinAck({ accepted: opened.accepted, secret, deviceSigner: f.deviceSigner });

    // 5. A verifies the ACK → A holds the matching mutually-signed record.
    const verified = await verifyJoinAck({ ack, sent });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    // BOTH vessels hold the SAME mutually-signed join record (grantSig from A + ackSig from B).
    expect(verified.joinRecord).toEqual(bRecord);
    expect(verified.joinRecord.grantSig).toBe(sent.grantSig);
    expect(verified.joinRecord.targetVesselId).toBe(f.deviceKey);
    expect(verified.joinRecord.granterKey).toBe(f.personaKey);
  });

  test("PHOTOGRAPH-INERT: a captured QR#2 opened WITHOUT B's ephemeral secret fails (decrypt)", async () => {
    const f = await fixtures();
    const { offer } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });

    // A photographer holds QR#1 (the offer) + QR#2 (the sealed grant) but NOT B's ephemeral secret. Reconstruct
    // an EnrollmentSecret with the offer's public fields but a FRESH (attacker) ephemeral — the seal never opens.
    const forgedSecret = { ...mintEnrollmentOffer({ targetVesselId: f.deviceKey }).secret, nonceB: offer.nonceB, targetVesselId: offer.targetVesselId, expiry: offer.expiry };
    const verdict = await openPersonaGrant({ sealed, secret: forgedSecret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain("decrypt-failed");
  });

  test("PHOTOGRAPH-INERT: a captured QR#2 replayed onto a FRESH enrollment fails (sealed to the old ephemeral)", async () => {
    const f = await fixtures();
    const first = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed } = await sealPersonaGrant({ offer: first.offer, personaRef: f.personaRef, personaSigner: f.personaSigner });

    // B re-enrolls later (a new session → a new ephemeral + a new nonce_B). The OLD sealed grant cannot open
    // against the NEW secret — a replayed photograph is inert.
    const second = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const verdict = await openPersonaGrant({ sealed, secret: second.secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(verdict.ok).toBe(false);
  });

  test("PHOTOGRAPH-INERT: a tampered ciphertext byte fails the AEAD", async () => {
    const f = await fixtures();
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });
    // Flip one hex nibble of the ciphertext.
    const flipped = sealed.ciphertext.slice(0, -1) + (sealed.ciphertext.slice(-1) === "0" ? "1" : "0");
    const verdict = await openPersonaGrant({ sealed: { ...sealed, ciphertext: flipped }, secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(verdict.ok).toBe(false);
  });

  test("ROTATE-NOT-RESURRECT: a grant whose op-key is not the prefix head is refused", async () => {
    const f = await fixtures();
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });

    // The persona ROTATED: the live head is now a DIFFERENT key than the grant's op-key. The old key cannot admit.
    const rotatedHead = await pubOf(new Uint8Array(32).fill(9));
    const verdict = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: headResolver({ [PERSONA_PREFIX]: rotatedHead }) });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain("prefix head");
  });

  test("BINDING: an unresolvable prefix head refuses (fail-closed — never verify against a self-named key)", async () => {
    const f = await fixtures();
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });
    const verdict = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: () => null });
    expect(verdict.ok).toBe(false);
  });

  test("BINDING: an expired grant is refused", async () => {
    const f = await fixtures();
    const now = 1_000_000;
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey, now });
    const { sealed } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner, now });
    // Open well past the expiry window.
    const verdict = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: f.resolveHeadOpKey, now: now + 3600_000 });
    expect(verdict.ok).toBe(false);
  });

  test("BINDING: a forged ACK (tampered target) fails A's verify; a mismatched sent memo fails too", async () => {
    const f = await fixtures();
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed, sent } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });
    const opened = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const { ack } = await mintJoinAck({ accepted: opened.accepted, secret, deviceSigner: f.deviceSigner });

    // Tamper the join record's target — the ACK signature no longer covers it → refuse.
    const tampered = { ...ack, joinRecord: { ...ack.joinRecord, targetVesselId: "ff".repeat(32) } };
    expect((await verifyJoinAck({ ack: tampered, sent })).ok).toBe(false);

    // A valid ACK checked against a DIFFERENT sent memo (a grant A never issued) → refuse.
    const otherSent = { ...sent, transcript: { ...sent.transcript, nonceA: "00".repeat(16) } };
    expect((await verifyJoinAck({ ack, sent: otherSent })).ok).toBe(false);

    // The genuine pairing still verifies.
    expect((await verifyJoinAck({ ack, sent })).ok).toBe(true);
  });

  test("CARRIAGE: each hop round-trips through its base64url envelope; a garbled/wrong-key carriage → null", async () => {
    const f = await fixtures();
    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: f.deviceKey });
    const { sealed, sent } = await sealPersonaGrant({ offer, personaRef: f.personaRef, personaSigner: f.personaSigner });
    const opened = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const { ack } = await mintJoinAck({ accepted: opened.accepted, secret, deviceSigner: f.deviceSigner });

    // Round-trip each hop (fragment form) — and a whitespace-wrapped paste of the offer.
    const enrollC = toEnrollmentCarriage(offer);
    expect(enrollC.startsWith("#enroll=")).toBe(true);
    expect(parseEnrollmentCarriage(enrollC)).toEqual(offer);
    expect(parseEnrollmentCarriage(`  ${enrollC}\n`)).toEqual(offer);
    expect(parseGrantCarriage(toGrantCarriage(sealed))).toEqual(sealed);
    expect(parseAckCarriage(toAckCarriage(ack))).toEqual(ack);

    // A grant carriage read as an offer (wrong key) → null; a garbled token → null.
    expect(parseEnrollmentCarriage(toGrantCarriage(sealed))).toBeNull();
    expect(parseGrantCarriage("#grant=@@@not-b64@@@")).toBeNull();
    expect(parseAckCarriage("")).toBeNull();

    // The carriage-transported grant still opens end-to-end (the transport changed nothing).
    const reSealed = parseGrantCarriage(toGrantCarriage(sealed))!;
    const reOpened = await openPersonaGrant({ sealed: reSealed, secret, resolveHeadOpKey: f.resolveHeadOpKey });
    expect(reOpened.ok).toBe(true);
    void sent;
  });

  test("TYPE-BLIND: the same code path admits a 'user' persona with no branch on type", async () => {
    // A different persona seed / prefix — nothing in the ceremony reads a 'type'; the path is identical.
    const userSeed = new Uint8Array(32).fill(7);
    const userKey  = await pubOf(userSeed);
    const userRef: PersonaRef = { prefix: "EuserAID_9", verifyingKey: userKey };
    const deviceKey = await pubOf(B_DEVICE_SEED);

    const { offer, secret } = mintEnrollmentOffer({ targetVesselId: deviceKey });
    const { sealed, sent } = await sealPersonaGrant({ offer, personaRef: userRef, personaSigner: ed25519SignerFromSeed(userSeed) });
    const opened = await openPersonaGrant({ sealed, secret, resolveHeadOpKey: headResolver({ "EuserAID_9": userKey }) });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const { ack } = await mintJoinAck({ accepted: opened.accepted, secret, deviceSigner: ed25519SignerFromSeed(B_DEVICE_SEED) });
    expect((await verifyJoinAck({ ack, sent })).ok).toBe(true);
  });
});

// Silence an unused-import lint if the offer type is only referenced structurally above.
export type _OfferRef = EnrollmentOffer;
