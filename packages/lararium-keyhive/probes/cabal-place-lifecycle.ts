/**
 * CABAL-PLACE LIFECYCLE WITNESS — the found/join/evict trio drifted through a full
 * lifecycle against REAL Keyhive (no mocks) + cut 1's mesh floor.
 *
 * The Place-Wright's drift (Epic 2, cut 2):
 *   1. FOUND a cabal-place (mint sentinel Document + registerCold substrate + register lease slot)
 *   2. JOIN two members (contact-card exchange → addSentinelMember via the INERT join gate)
 *   3. assert BOTH in the roster (the Keyhive doc-roster, verified per-member)
 *   4. ROLL its lease (effectiveLeaseEpoch advances 0 → 1)
 *   5. STARVE + cool the substrate to anu (deriveCabalPlaceLiveness → "dissolved")
 *   6. RE-WARM (feedCabalPlace → "alive")
 *   7. EVICT one member (convergent revokeSentinelMember)
 *   8. re-verify the roster SHRANK to one (the evicted member lost access)
 *
 * Real lifecycle, not green-units: the sentinel is a real Keyhive Document, the
 * members are independent KeyhiveProvider instances introduced by contact card, the
 * eviction is a real REVOKED tombstone, the cooling/warming rides the real
 * BagResidencyManager, the lease rolls through the real max-register.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/cabal-place-lifecycle.ts
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import {
  foundCabalPlace, joinCabalPlace, evictMember, cabalPlaceRoster, cabalPlaceLiveness,
} from "../src/cabal-place-ceremony.js";
import {
  BagResidencyManager,
  cabalPlaceLeaseSlot,
  feedCabalPlace,
  effectiveLeaseEpoch,
  rolledLeaseEpoch,
} from "@lararium/mesh";

const PLACE_URI    = "lar:///crossroads.cabal.gathers/probe-place";
const SUBSTRATE_URL = "automerge:cabal-place-substrate-probe";
const WRITER_ID    = "founder-vessel";

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  const tag = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[cabal-place] ${tag} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[cabal-place] =========================================================");
  console.log("[cabal-place] founding-ceremony lifecycle witness (REAL keyhive, no mocks)");
  console.log("[cabal-place] =========================================================");

  // ── The founder — owns the place's sentinel Document. ──────────────────────────
  const founder = new KeyhiveProvider();
  await founder.init({ seed: new Uint8Array(32).fill(0x11), eventStore: new InMemoryEventStore() });

  // The liveness instruments from cut 1's floor.
  const residency  = new BagResidencyManager({ idleMs: 1 });   // 1ms idle so a sweep cools fast
  const leaseSlots = new Map<string, string>();

  // ── STAGE 1 — FOUND ────────────────────────────────────────────────────────────
  const place = await foundCabalPlace(founder, PLACE_URI, SUBSTRATE_URL, {
    residency, leaseWriterId: WRITER_ID, leaseSlots,
  });
  const slot = cabalPlaceLeaseSlot(place.placeDocIdHex, WRITER_ID);
  stage("1 FOUND — sentinel minted, substrate registered cold, lease slot at genesis 0",
    place.placeDocIdHex.length > 0 &&
    place.placeAgentIdHex.length > 0 &&
    residency.tier(SUBSTRATE_URL) === "anu" &&
    leaseSlots.get(slot) === "0",
    `doc=${place.placeDocIdHex.slice(0, 16)}… tier=${residency.tier(SUBSTRATE_URL)} epoch=${leaseSlots.get(slot)}`);

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
  await joinCabalPlace(founder, place, memberA);
  await joinCabalPlace(founder, place, memberB);
  stage("2 JOIN — two members added through the INERT join gate",
    memberA !== memberB,
    `A=${memberA.slice(0, 14)}… B=${memberB.slice(0, 14)}…`);

  // ── STAGE 3 — roster holds BOTH ────────────────────────────────────────────────
  const roster0 = await cabalPlaceRoster(founder, place, [memberA, memberB]);
  stage("3 ROSTER — both members present in the doc-roster",
    roster0.length === 2 && roster0.includes(memberA) && roster0.includes(memberB),
    `roster=${roster0.length}`);

  // ── STAGE 4 — ROLL the lease (max-register 0 → 1) ──────────────────────────────
  const eff0 = effectiveLeaseEpoch(leaseSlots.values());
  leaseSlots.set(slot, String(rolledLeaseEpoch(eff0)));   // the writer rolls its OWN slot
  const eff1 = effectiveLeaseEpoch(leaseSlots.values());
  stage("4 LEASE — effectiveLeaseEpoch advanced on churn",
    eff0 === 0 && eff1 === 1,
    `${eff0} → ${eff1}`);

  // ── STAGE 5 — STARVE + cool to anu (dissolved) ─────────────────────────────────
  // First warm it (so there is something to cool), then starve: a sweep past idleMs cools it.
  await feedCabalPlace(residency, place);                 // alive for a beat
  await new Promise((r) => setTimeout(r, 5));             // exceed idleMs (1ms)
  await residency.sweepOnce();                            // hoʻoanu — cools the unfed substrate
  const livenessCold = cabalPlaceLiveness(residency, place);
  stage("5 STARVE — unfed substrate cooled to anu, place reads dissolved",
    residency.tier(SUBSTRATE_URL) === "anu" && livenessCold === "dissolved",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessCold}`);

  // ── STAGE 6 — RE-WARM (alive) ──────────────────────────────────────────────────
  await feedCabalPlace(residency, place);                 // hoʻowela — the members feed it again
  const livenessWarm = cabalPlaceLiveness(residency, place);
  stage("6 RE-WARM — fed substrate warms to wela, place reads alive",
    residency.tier(SUBSTRATE_URL) === "wela" && livenessWarm === "alive",
    `tier=${residency.tier(SUBSTRATE_URL)} liveness=${livenessWarm}`);

  // ── STAGE 7 — EVICT one member (convergent revoke) ─────────────────────────────
  await evictMember(founder, place, memberA);
  stage("7 EVICT — convergent-removal fired on member A", true, `dropped ${memberA.slice(0, 14)}…`);

  // ── STAGE 8 — roster SHRANK to one ─────────────────────────────────────────────
  const roster1 = await cabalPlaceRoster(founder, place, [memberA, memberB]);
  stage("8 ROSTER — shrank to one; evicted A gone, B retained",
    roster1.length === 1 && !roster1.includes(memberA) && roster1.includes(memberB),
    `roster=${roster1.length} hasA=${roster1.includes(memberA)} hasB=${roster1.includes(memberB)}`);

  await founder.dispose();

  console.log("[cabal-place] =========================================================");
  if (failures === 0) {
    console.log("[cabal-place] ALL 8 STAGES PASS — the cabal-place lifecycle holds.");
  } else {
    console.log(`[cabal-place] ${failures} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[cabal-place] FATAL:", err); process.exit(1); });
