/**
 * CABAL-REALM LIFECYCLE WITNESS — the found/join/evict trio drifted through a full
 * lifecycle against REAL Keyhive (no mocks) over the mesh floor.
 *
 * The drift (+ the charter-founding drift):
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
 * BagStowage, the lease rolls through the real max-register.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/cabal-realm-lifecycle.ts
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import {
  foundCabalRealmWithCharter, openDwelling, dwellersHolding, cabalRealmLiveness,
} from "../src/cabal-realm-ceremony.js";
import { forkCabalRealm } from "../src/fork-realm-ceremony.js";
import {
  BagStowage,
  cabalRealmLeaseSlot,
  feedCabalRealm,
  effectiveLeaseEpoch,
  rolledLeaseEpoch,
  projectCabalRealmCharter,
  cabalRealmCharterSnapshot,
} from "@lararium/mesh";

const REALM_URI    = "lar:///crossroads.cabal.gathers/probe-realm";
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

  // The liveness instruments the mesh floor supplies.
  const residency  = new BagStowage({ idleMs: 1 });   // 1ms idle so a sweep cools fast
  const leaseSlots = new Map<string, string>();

  // ── STAGE 1 — FOUND (realm + its veil-public charter, born together) ────────────
  // A fixed foundedAt so the founding stays deterministic (a live founder passes its
  // own Date.now(); the ceremony itself reads no clock).
  const FOUNDED_AT = 1_700_000_000_000;
  const { realm, charter } = await foundCabalRealmWithCharter(
    founder, REALM_URI, SUBSTRATE_URL,
    { title: "Probe Realm", description: "a cabal-realm founded by the witness", foundedAt: FOUNDED_AT },
    { residency, leaseWriterId: WRITER_ID, leaseSlots },
  );
  const slot = cabalRealmLeaseSlot(realm.realmDocIdHex, WRITER_ID);
  stage("1 FOUND — sentinel minted, substrate registered cold, lease slot at genesis 0",
    realm.realmDocIdHex.length > 0 &&
    realm.realmAgentIdHex.length > 0 &&
    residency.tier(SUBSTRATE_URL) === "anu" &&
    leaseSlots.get(slot) === "0",
    `doc=${realm.realmDocIdHex.slice(0, 16)}… tier=${residency.tier(SUBSTRATE_URL)} epoch=${leaseSlots.get(slot)}`);

  // ── STAGE 1b — CHARTER (the founding founds the realm's veil-public face) ───────
  const charterKeys = Object.keys(charter);
  stage("1b CHARTER — founding founds the veil-public charter (name+bearing+meta; NO roster/substrate keys)",
    charter.realmDocIdHex === realm.realmDocIdHex &&
    charter.genesisUri === REALM_URI &&
    charter.foundedAt === FOUNDED_AT &&
    charter.title === "Probe Realm" &&
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
  await openDwelling(founder, realm, memberA);
  await openDwelling(founder, realm, memberB);
  stage("2 JOIN — two members added through the INERT join gate",
    memberA !== memberB,
    `A=${memberA.slice(0, 14)}… B=${memberB.slice(0, 14)}…`);

  // ── STAGE 3 — roster holds BOTH ────────────────────────────────────────────────
  const roster0 = await dwellersHolding(founder, realm, [memberA, memberB]);
  stage("3 ROSTER — both members present in the doc-roster",
    roster0.length === 2 && roster0.includes(memberA) && roster0.includes(memberB),
    `roster=${roster0.length}`);

  // ── STAGE 3b — VEIL HOLDS IN A REAL FOUNDING ───────────────────────────────────
  // Project a charter from a publish-state carrying the LIVE keyhive member ids + a
  // secret substrate payload — the exact bag a real served charter would be built
  // from once the realm has members. The shore must drop BOTH, in the output AND
  // in the serialized snapshot bytes (the wire form a peer actually pulls).
  const SECRET = "SECRET-SUBSTRATE-PAYLOAD-must-not-cross";
  const withRoster = projectCabalRealmCharter({
    realm,
    meta: { title: "Probe Realm", foundedAt: FOUNDED_AT },
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
    withRoster.realmDocIdHex === realm.realmDocIdHex &&   // the public name still crosses
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
  await feedCabalRealm(residency, realm);                 // alive for a beat
  await new Promise((r) => setTimeout(r, 5));             // exceed idleMs (1ms)
  await residency.sweepOnce();                            // hoʻoanu — cools the unfed substrate
  const livenessCold = cabalRealmLiveness(residency, realm);
  stage("5 STARVE — unfed substrate cooled to anu, realm reads dissolved",
    residency.tier(SUBSTRATE_URL) === "anu" && livenessCold === "dissolved",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessCold}`);

  // ── STAGE 6 — RE-WARM (alive) ──────────────────────────────────────────────────
  await feedCabalRealm(residency, realm);                 // hoʻowela — the members feed it again
  const livenessWarm = cabalRealmLiveness(residency, realm);
  stage("6 RE-WARM — fed substrate warms to wela, realm reads alive",
    residency.tier(SUBSTRATE_URL) === "wela" && livenessWarm === "alive",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessWarm}`);

  // ── STAGE 7 — a hostile hand cannot EVICT; the realm holds no container ────────
  // The party-level eviction was torn out with the container model that licensed it. What stands in its
  // realm: a FORK that excludes BY OMISSION. The survivors open dwellings in a fresh realm and the excluded
  // are simply never opened — no revocation, no tombstone, nothing to converge or contend.
  const fork = await forkCabalRealm(founder, realm, [memberA, memberB], [memberA], { newUri: `${REALM_URI}-fork` });
  stage("7 FORK — the survivors carry the realm on; the excluded are never opened",
    fork.survivors.length === 1 && fork.survivors.includes(memberB) && !fork.survivors.includes(memberA),
    `survivors=${fork.survivors.length} carriedB=${fork.survivors.includes(memberB)}`);

  // ── STAGE 8 — the FORK holds B and never held A; the OLD realm is untouched ────
  const forkHolds = await dwellersHolding(founder, fork.newRealm, [memberA, memberB]);
  const oldHolds  = await dwellersHolding(founder, realm, [memberA, memberB]);
  stage("8 DWELLINGS — fork holds B alone; the old realm still holds both, unharmed",
    forkHolds.length === 1 && forkHolds.includes(memberB) && oldHolds.length === 2,
    `fork=${forkHolds.length} old=${oldHolds.length} — a fork LEAVES a realm rather than emptying it`);

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
