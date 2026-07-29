/**
 * ME-CIRCLE LIFECYCLE WITNESS — the operator's ruling, tested with the infrastructure:
 * a "me" composes as a SINGLE-PRINCIPAL cabal-realm, founded + contracted over REAL
 * Keyhive (no mocks), reusing the EXACT cabal-realm machinery (found + join + the
 * capture-clock) with the multi-principal complexity DEGENERATE to trivial.
 *
 * The drift:
 *   1. The HUMAN founds a me-place (foundCabalRealm) + wraps it in a MeCircle.
 *   2. CONTRACT three of the human's own PersonaGroups (slices) — each a known Keyhive
 *      agent joined to the me-place AND added to the constellation. First takes the blame.
 *   3. The me-place's roster (real Keyhive) holds all three; one persona is accountable.
 *   4. SWITCH the blame to another slice (free — single-principal).
 *   5. PROMOTE a veiled slice → known (re-contract with a petname — the disclosure dial).
 *   6. THE DEGENERACY (the load-bearing proof): one persona out-feeds the others (rolls
 *      its lease deep). The capture-clock RUNS and reports a large spread — exactly the
 *      shape that signals capture on a MULTI-human place. But this is a ME: every face
 *      is the one principal, so meCircleDegeneracy reads captureImmune — you cannot
 *      capture your own me. Same machinery, collapsed meaning.
 *   7. RELEASE a slice (kāpae) — the blame passes on.
 *
 * If the single-principal place STRAINS the cabal-realm machinery (a tie-break engages,
 * a join is refused, the clock can't read it), the ruling does not hold — surface it.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/me-circle-lifecycle.ts
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import { foundCabalRealm, openDwelling, dwellersHolding } from "../src/cabal-realm-ceremony.js";
import {
  foundMeCircle, contractPersona, releasePersona, activePersona, withActivePersona,
  meCircleDegeneracy, cabalRealmMaintenanceProvenance, cabalRealmLeaseSlot,
  type MeCircle,
} from "@lararium/mesh";

const ME_URI       = "lar:///me.constellation.overlaps/josh";
const ME_SUBSTRATE = "automerge:me-place-substrate-probe";

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`[me-circle] ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[me-circle] =========================================================");
  console.log("[me-circle] single-principal me-place witness (REAL keyhive, no mocks)");
  console.log("[me-circle] =========================================================");

  // ── The HUMAN — the one ordering authority over their own constellation. ────────
  const human = new KeyhiveProvider();
  await human.init({ seed: new Uint8Array(32).fill(0x4a), eventStore: new InMemoryEventStore() });

  const leaseSlots = new Map<string, string>();

  // ── STAGE 1 — FOUND the me-place + wrap in a MeCircle ───────────────────────────
  const mePlace = await foundCabalRealm(human, ME_URI, ME_SUBSTRATE, {
    leaseWriterId: "principal", leaseSlots,
  });
  let me: MeCircle = foundMeCircle(mePlace, "0x" + mePlace.placeAgentIdHex.slice(0, 16));
  stage("1 FOUND — a me-place founds as a single-principal cabal-realm",
    mePlace.placeDocIdHex.length > 0 && me.constellation.length === 0 && me.activeHandleHex === null,
    `place=${mePlace.placeDocIdHex.slice(0, 12)}…`);

  // ── STAGE 2 — CONTRACT three slices of the one human ────────────────────────────
  // Each slice (PersonaGroup) is a holdable agent the human knows (contact-card); the
  // human contracts only their OWN slices — that is what makes it single-principal.
  async function makeSlice(fill: number, petname?: string): Promise<{ handleHex: string; petname?: string }> {
    const s = new KeyhiveProvider();
    await s.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
    const { id } = await human.receiveContactCard(await s.contactCard());
    await openDwelling(human, mePlace, id);                 // real Keyhive membership
    return petname !== undefined ? { handleHex: id, petname } : { handleHex: id };
  }
  const joshua   = await makeSlice(0xa1, "Joshua Fontany");
  const engineer = await makeSlice(0xe2, "Sr. Engineer Josh");
  const veiled   = await makeSlice(0xc3);                     // a slice that stays veiled
  me = contractPersona(me, joshua);
  me = contractPersona(me, engineer);
  me = contractPersona(me, veiled);
  stage("2 CONTRACT — three slices overlap in the me; the first takes the blame",
    me.constellation.length === 3 && me.activeHandleHex === joshua.handleHex,
    `active=${activePersona(me)?.petname}`);

  // ── STAGE 3 — the real Keyhive roster holds all three ───────────────────────────
  const roster = await dwellersHolding(human, mePlace, [joshua.handleHex, engineer.handleHex, veiled.handleHex]);
  stage("3 ROSTER — the me-place's real Keyhive roster holds all three slices",
    roster.length === 3, `roster=${roster.length}`);

  // ── STAGE 4 — SWITCH the blame (free — single-principal) ─────────────────────────
  me = withActivePersona(me, engineer.handleHex);
  let threw = false;
  try { withActivePersona(me, "0xnot_my_slice"); } catch { threw = true; }
  stage("4 BLAME — switching faces is free; an un-contracted face FAILS LOUD",
    activePersona(me)?.petname === "Sr. Engineer Josh" && threw,
    `active=${activePersona(me)?.petname} fail-loud=${threw}`);

  // ── STAGE 5 — PROMOTE the veiled slice → known (turn the disclosure dial) ────────
  me = contractPersona(me, { handleHex: veiled.handleHex, petname: "Guru Josh" });
  const promoted = me.constellation.find((p) => p.handleHex === veiled.handleHex);
  stage("5 PROMOTE — a veiled slice turns the disclosure dial to known, no duplicate",
    promoted?.petname === "Guru Josh" && me.constellation.length === 3,
    `petname=${promoted?.petname} size=${me.constellation.length}`);

  // ── STAGE 6 — THE DEGENERACY: the clock runs, the spread is NOT capture ──────────
  // One slice out-feeds the others (rolls its lease deep) — the exact shape that signals
  // capture on a multi-HUMAN place. Roll the slots:
  leaseSlots.set(cabalRealmLeaseSlot(mePlace.placeDocIdHex, joshua.handleHex),   "30");
  leaseSlots.set(cabalRealmLeaseSlot(mePlace.placeDocIdHex, engineer.handleHex), "2");
  leaseSlots.set(cabalRealmLeaseSlot(mePlace.placeDocIdHex, veiled.handleHex),   "1");
  const clock = cabalRealmMaintenanceProvenance(mePlace, leaseSlots);
  const d = meCircleDegeneracy(me);
  stage("6 DEGENERACY — the capture-clock runs + shows a spread, yet the me is capture-IMMUNE",
    clock.spread >= 28 && clock.leadingCount === 1 &&   // the clock sees the lopsided shape...
    d.captureImmune === true && d.tieBreakEngaged === false && d.legitimacyContested === false, // ...but it's YOUR faces
    `clock.spread=${clock.spread} captureImmune=${d.captureImmune} tieBreak=${d.tieBreakEngaged}`);

  // ── STAGE 7 — RELEASE a slice (kāpae); the blame passes on ───────────────────────
  // A me-circle runs SINGLE-PRINCIPAL, so releasing a slice needs no eviction and never did: the human
  // stops standing under that face. `releasePersona` carries the whole act — the constellation shrinks and
  // the sentinel dwelling simply stops being exercised. No hostile hand exists here to shadow a relation.
  me = releasePersona(me, engineer.handleHex);
  stage("7 RELEASE — kāpae drops the active slice; the blame passes to a remaining face",
    me.constellation.length === 2 && me.activeHandleHex !== engineer.handleHex && me.activeHandleHex !== null,
    `size=${me.constellation.length} active=${activePersona(me)?.petname ?? "(veiled)"}`);

  await human.dispose();

  console.log("[me-circle] =========================================================");
  if (failures === 0) {
    console.log("[me-circle] ALL STAGES PASS — the 'me' is load-bearing: a single-principal place,");
    console.log("[me-circle] the cabal-realm machinery reused, the multi-principal complexity collapsed.");
  } else {
    console.log(`[me-circle] ${failures} STAGE(S) FAILED — the single-principal place STRAINS the machinery.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[me-circle] FATAL:", err); process.exit(1); });
