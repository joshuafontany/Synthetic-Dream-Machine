/**
 * CABAL-REALM LIFECYCLE WITNESS — the found/join/evict trio drifted through a full
 * lifecycle against REAL Keyhive (no mocks) + cut 1's mesh floor.
 *
 * The Realm-Wright's drift (Epic 2, cut 2; + the charter-founding drift):
 *   1. FOUND a cabal-realm AND its veil-public charter (foundCabalRealmWithCharter)
 *  1b. assert the founding founds the CHARTER (name+bearing+meta; no roster/substrate)
 *   2. JOIN two members (contact-card exchange → addSentinelMember via the INERT join gate)
 *   3. assert BOTH in the roster (the Keyhive doc-roster, verified per-member)
 *  3b. VEIL holds in a real founding — a charter over the LIVE roster + a secret leaks neither
 *   4. ROLL its lease (effectiveLeaseEpoch advances 0 → 1)
 *   5. STARVE + cool the substrate to anu (deriveCabalRealmLiveness → "dissolved")
 *   6. RE-WARM (feedCabalRealm → "alive")
 *   7. EVICT one member (convergent revokeSentinelMember)
 *   8. re-verify the roster SHRANK to one (the evicted member lost access)
 *
 * Real lifecycle, not green-units: the sentinel is a real Keyhive Document, the
 * members are independent KeyhiveProvider instances introduced by contact card, the
 * eviction is a real REVOKED tombstone, the cooling/warming rides the real
 * BagResidencyManager, the lease rolls through the real max-register.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/cabal-realm-lifecycle.ts
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import {
  foundCabalRealmWithCharter, joinCabalRealm, evictMember, cabalRealmRoster, cabalRealmLiveness,
} from "../src/cabal-realm-ceremony.js";
import {
  BagResidencyManager,
  cabalRealmLeaseSlot,
  feedCabalRealm,
  effectiveLeaseEpoch,
  rolledLeaseEpoch,
  projectCabalRealmCharter,
  cabalRealmCharterSnapshot,
} from "@lararium/mesh";

const PLACE_URI    = "lar:///crossroads.cabal.gathers/probe-place";
const SUBSTRATE_URL = "automerge:cabal-realm-substrate-probe";
const WRITER_ID    = "founder-vessel";

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  const tag = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[cabal-realm] ${tag} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[cabal-realm] =========================================================");
  console.log("[cabal-realm] founding-ceremony lifecycle witness (REAL keyhive, no mocks)");
  console.log("[cabal-realm] =========================================================");

  // ── The founder — owns the realm's sentinel Document. ──────────────────────────
  const founder = new KeyhiveProvider();
  await founder.init({ seed: new Uint8Array(32).fill(0x11), eventStore: new InMemoryEventStore() });

  // The liveness instruments from cut 1's floor.
  const residency  = new BagResidencyManager({ idleMs: 1 });   // 1ms idle so a sweep cools fast
  const leaseSlots = new Map<string, string>();

  // ── STAGE 1 — FOUND (realm + its veil-public charter, born together) ────────────
  // A fixed foundedAt so the founding stays deterministic (a live founder passes its
  // own Date.now(); the ceremony itself reads no clock).
  const FOUNDED_AT = 1_700_000_000_000;
  const { place, charter } = await foundCabalRealmWithCharter(
    founder, PLACE_URI, SUBSTRATE_URL,
    { title: "Probe Place", description: "a cabal-realm founded by the witness", foundedAt: FOUNDED_AT },
    { residency, leaseWriterId: WRITER_ID, leaseSlots },
  );
  const slot = cabalRealmLeaseSlot(place.placeDocIdHex, WRITER_ID);
  stage("1 FOUND — sentinel minted, substrate registered cold, lease slot at genesis 0",
    place.placeDocIdHex.length > 0 &&
    place.placeAgentIdHex.length > 0 &&
    residency.tier(SUBSTRATE_URL) === "anu" &&
    leaseSlots.get(slot) === "0",
    `doc=${place.placeDocIdHex.slice(0, 16)}… tier=${residency.tier(SUBSTRATE_URL)} epoch=${leaseSlots.get(slot)}`);

  // ── STAGE 1b — CHARTER (the founding founds the realm's veil-public face) ───────
  const charterKeys = Object.keys(charter);
  stage("1b CHARTER — founding founds the veil-public charter (name+bearing+meta; NO roster/substrate keys)",
    charter.placeDocIdHex === place.placeDocIdHex &&
    charter.genesisUri === PLACE_URI &&
    charter.foundedAt === FOUNDED_AT &&
    charter.title === "Probe Place" &&
    !charterKeys.includes("roster") &&
    !charterKeys.includes("substrateContent") &&
    !charterKeys.includes("memberCount"),     // never auto-disclosed
    `keys=[${charterKeys.join(",")}]`);

  // ── STAGE 2 — JOIN two members ─────────────────────────────────────────────────
  // Each member is an independent vessel; the founder must KNOW it as an agent first
  // (contact-card exchange), mirroring the founding ceremony's in-scope agents.
  async function makeMember(fill: number): Promise<string> {
    const m = new KeyhiveProvider();
    await m.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
    const card = await m.contactCard();
    const { id } = await founder.receiveContactCard(card);
    return id;
  }
  const memberA = await makeMember(0xa1);
  const memberB = await makeMember(0xb2);
  await joinCabalRealm(founder, place, memberA);
  await joinCabalRealm(founder, place, memberB);
  stage("2 JOIN — two members added through the INERT join gate",
    memberA !== memberB,
    `A=${memberA.slice(0, 14)}… B=${memberB.slice(0, 14)}…`);

  // ── STAGE 3 — roster holds BOTH ────────────────────────────────────────────────
  const roster0 = await cabalRealmRoster(founder, place, [memberA, memberB]);
  stage("3 ROSTER — both members present in the doc-roster",
    roster0.length === 2 && roster0.includes(memberA) && roster0.includes(memberB),
    `roster=${roster0.length}`);

  // ── STAGE 3b — VEIL HOLDS IN A REAL FOUNDING ───────────────────────────────────
  // Project a charter from a publish-state carrying the LIVE keyhive member ids + a
  // secret substrate payload — the exact bag a real served charter would be built
  // from once the realm has members. The membrane must drop BOTH, in the output AND
  // in the serialized snapshot bytes (the wire form a peer actually pulls).
  const SECRET = "SECRET-SUBSTRATE-PAYLOAD-must-not-cross";
  const withRoster = projectCabalRealmCharter({
    place,
    meta: { title: "Probe Place", foundedAt: FOUNDED_AT },
    roster: roster0,                              // the REAL member ids (memberA, memberB)
    substrateContent: { secret: SECRET, note: `${memberA} posted here` },
  });
  const snap = await cabalRealmCharterSnapshot(withRoster);
  const wireBytes = Buffer.from(snap.bytes).toString("latin1");
  const outJson   = JSON.stringify(withRoster);
  const leaked =
    roster0.some((id) => outJson.includes(id) || wireBytes.includes(id)) ||
    outJson.includes(SECRET) || wireBytes.includes(SECRET);
  stage("3b VEIL — charter over the LIVE roster + secret leaks NEITHER (output + snapshot bytes)",
    !leaked &&
    withRoster.placeDocIdHex === place.placeDocIdHex &&   // the public name still crosses
    snap.cid.length === 64,                                // a real content-addressed snapshot
    `roster=${roster0.length} secret-in-wire=${wireBytes.includes(SECRET)} cid=${snap.cid.slice(0, 12)}…`);

  // ── STAGE 4 — ROLL the lease (max-register 0 → 1) ──────────────────────────────
  const eff0 = effectiveLeaseEpoch(leaseSlots.values());
  leaseSlots.set(slot, String(rolledLeaseEpoch(eff0)));   // the writer rolls its OWN slot
  const eff1 = effectiveLeaseEpoch(leaseSlots.values());
  stage("4 LEASE — effectiveLeaseEpoch advanced on churn",
    eff0 === 0 && eff1 === 1,
    `${eff0} → ${eff1}`);

  // ── STAGE 5 — STARVE + cool to anu (dissolved) ─────────────────────────────────
  // First warm it (so there is something to cool), then starve: a sweep past idleMs cools it.
  await feedCabalRealm(residency, place);                 // alive for a beat
  await new Promise((r) => setTimeout(r, 5));             // exceed idleMs (1ms)
  await residency.sweepOnce();                            // hoʻoanu — cools the unfed substrate
  const livenessCold = cabalRealmLiveness(residency, place);
  stage("5 STARVE — unfed substrate cooled to anu, place reads dissolved",
    residency.tier(SUBSTRATE_URL) === "anu" && livenessCold === "dissolved",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessCold}`);

  // ── STAGE 6 — RE-WARM (alive) ──────────────────────────────────────────────────
  await feedCabalRealm(residency, place);                 // hoʻowela — the members feed it again
  const livenessWarm = cabalRealmLiveness(residency, place);
  stage("6 RE-WARM — fed substrate warms to wela, place reads alive",
    residency.tier(SUBSTRATE_URL) === "wela" && livenessWarm === "alive",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessWarm}`);

  // ── STAGE 7 — EVICT one member (convergent revoke) ─────────────────────────────
  await evictMember(founder, place, memberA);
  stage("7 EVICT — convergent-removal fired on member A", true, `dropped ${memberA.slice(0, 14)}…`);

  // ── STAGE 8 — roster SHRANK to one ─────────────────────────────────────────────
  const roster1 = await cabalRealmRoster(founder, place, [memberA, memberB]);
  stage("8 ROSTER — shrank to one; evicted A gone, B retained",
    roster1.length === 1 && !roster1.includes(memberA) && roster1.includes(memberB),
    `roster=${roster1.length} hasA=${roster1.includes(memberA)} hasB=${roster1.includes(memberB)}`);

  await founder.dispose();

  console.log("[cabal-realm] =========================================================");
  if (failures === 0) {
    console.log("[cabal-realm] ALL STAGES PASS — the cabal-realm lifecycle holds, charter founded, veil intact.");
  } else {
    console.log(`[cabal-realm] ${failures} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[cabal-realm] FATAL:", err); process.exit(1); });
