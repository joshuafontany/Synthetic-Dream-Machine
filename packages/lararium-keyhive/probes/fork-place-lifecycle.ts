/**
 * FORK-PLACE LIFECYCLE WITNESS — fork-as-exit over REAL Keyhive: a captured place is
 * forked into a fresh one that STRUCTURALLY LOCKS OUT the captor. No mocks.
 *
 * The drift:
 *   1. FOUND a place, join two survivors + one captor (the hostile out-maintainer).
 *   2. old roster = 3 (the captured state).
 *   3. FORK excluding the captor → a fresh sentinel place, the survivors carried in.
 *   4. the fork's real Keyhive roster = the two survivors ONLY.
 *   5. THE LOCKOUT — the captor holds NO membership in the fork (verifySentinelMembership
 *      fails); it is not on the roster; it keeps only the dead shell.
 *   6. CONTINUITY — the fork records forkedFrom = the captured place (legitimacy re-anchor),
 *      and a survivor re-points its pointer old→fork (Zooko).
 *
 * If a captor can still reach the fork, fork-as-exit does not hold — surface it.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/fork-place-lifecycle.ts
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import { foundCabalRealm, joinCabalRealm, cabalRealmRoster } from "../src/cabal-realm-ceremony.js";
import { forkCabalRealm } from "../src/fork-place-ceremony.js";
import { repointToFork } from "@lararium/mesh";

const PLACE_URI = "lar:///crossroads.cabal.gathers/captured";
const SUBSTRATE = "automerge:captured-place-substrate";

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`[fork-place] ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[fork-place] =========================================================");
  console.log("[fork-place] fork-as-exit witness — the captor locked out (REAL keyhive)");
  console.log("[fork-place] =========================================================");

  const legit = new KeyhiveProvider();   // a legitimate maintainer — it holds the forking authority
  await legit.init({ seed: new Uint8Array(32).fill(0x11), eventStore: new InMemoryEventStore() });

  async function member(fill: number): Promise<string> {
    const m = new KeyhiveProvider();
    await m.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
    const { id } = await legit.receiveContactCard(await m.contactCard());
    return id;
  }

  // ── STAGE 1 — FOUND the captured place, join two survivors + a captor ───────────
  const place = await foundCabalRealm(legit, PLACE_URI, SUBSTRATE);
  const survivorA = await member(0xa1);
  const survivorB = await member(0xb2);
  const captor    = await member(0xcc);
  await joinCabalRealm(legit, place, survivorA);
  await joinCabalRealm(legit, place, survivorB);
  await joinCabalRealm(legit, place, captor);
  const oldRoster = await cabalRealmRoster(legit, place, [survivorA, survivorB, captor]);
  stage("1 CAPTURED — the place holds two survivors + a captor", oldRoster.length === 3, `roster=${oldRoster.length}`);

  // ── STAGE 2 — FORK excluding the captor ────────────────────────────────────────
  const fork = await forkCabalRealm(legit, place, oldRoster, [captor]);
  stage("2 FORK — a fresh place forks, the captor excluded by omission",
    fork.newPlace.placeDocIdHex.length > 0 &&
    fork.newPlace.placeDocIdHex !== place.placeDocIdHex &&
    fork.survivors.length === 2 && !fork.survivors.includes(captor),
    `fork=${fork.newPlace.placeDocIdHex.slice(0, 10)}… survivors=${fork.survivors.length}`);

  // ── STAGE 3 — the fork's real roster = the survivors ONLY ───────────────────────
  const forkRoster = await cabalRealmRoster(legit, fork.newPlace, [survivorA, survivorB, captor]);
  stage("3 ROSTER — the fork's real Keyhive roster carries the survivors, not the captor",
    forkRoster.length === 2 && forkRoster.includes(survivorA) && forkRoster.includes(survivorB) && !forkRoster.includes(captor),
    `fork-roster=${forkRoster.length} hasCaptor=${forkRoster.includes(captor)}`);

  // ── STAGE 4 — THE LOCKOUT: the captor holds no key to the fork ──────────────────
  const captorInFork = await legit.verifySentinelMembership(captor, fork.newPlace.placeDocIdHex);
  const survivorInFork = await legit.verifySentinelMembership(survivorA, fork.newPlace.placeDocIdHex);
  stage("4 LOCKOUT — the captor has NO membership in the fork; a survivor does",
    captorInFork.ok === false && survivorInFork.ok === true,
    `captor.ok=${captorInFork.ok} survivorA.ok=${survivorInFork.ok}`);

  // ── STAGE 5 — CONTINUITY + the Zooko re-point ──────────────────────────────────
  const survivorRepoint = repointToFork(place.placeDocIdHex, fork);        // a survivor moves old→fork
  const captorRepoint = repointToFork("0xcaptor_only_knows_old", fork);    // the captor's other pointer is untouched
  stage("5 CONTINUITY — fork links to the captured place; a survivor re-points old→fork",
    fork.forkedFromDocIdHex === place.placeDocIdHex &&
    survivorRepoint === fork.newPlace.placeDocIdHex &&
    captorRepoint === "0xcaptor_only_knows_old",
    `forkedFrom=${fork.forkedFromDocIdHex.slice(0, 10)}… repoint→${survivorRepoint.slice(0, 10)}…`);

  await legit.dispose();

  console.log("[fork-place] =========================================================");
  if (failures === 0) {
    console.log("[fork-place] ALL STAGES PASS — fork-as-exit holds: the survivors escape,");
    console.log("[fork-place] the captor keeps only the dead shell. Capture is survivable.");
  } else {
    console.log(`[fork-place] ${failures} STAGE(S) FAILED — fork-as-exit does not hold.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[fork-place] FATAL:", err); process.exit(1); });
