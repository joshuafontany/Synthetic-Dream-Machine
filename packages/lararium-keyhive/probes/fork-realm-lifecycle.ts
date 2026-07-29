/**
 * FORK-REALM LIFECYCLE WITNESS — fork-as-exit over REAL Keyhive: a captured realm is
 * forked into a fresh one that STRUCTURALLY LOCKS OUT the captor. No mocks.
 *
 * The drift:
 *   1. FOUND a realm, join two survivors + one captor (the hostile out-maintainer).
 *   2. old roster = 3 (the captured state).
 *   3. FORK excluding the captor → a fresh sentinel realm, the survivors carried in.
 *   4. the fork's real Keyhive roster = the two survivors ONLY.
 *   5. THE LOCKOUT — the captor holds NO membership in the fork (verifySentinelMembership
 *      fails); it is not on the roster; it keeps only the dead shell.
 *   6. CONTINUITY — the fork records forkedFrom = the captured realm (legitimacy re-anchor),
 *      and a survivor re-points its pointer old→fork (Zooko).
 *
 * If a captor can still reach the fork, fork-as-exit does not hold — surface it.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/fork-realm-lifecycle.ts
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import { foundCabalRealm, openDwelling, dwellersHolding } from "../src/cabal-realm-ceremony.js";
import { forkCabalRealm } from "../src/fork-realm-ceremony.js";
import { repointToFork } from "@lararium/mesh";

const REALM_URI = "lar:///crossroads.cabal.gathers/captured";
const SUBSTRATE = "automerge:captured-realm-substrate";

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`[fork-realm] ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[fork-realm] =========================================================");
  console.log("[fork-realm] fork-as-exit witness — the captor locked out (REAL keyhive)");
  console.log("[fork-realm] =========================================================");

  const legit = new KeyhiveProvider();   // a legitimate maintainer — it holds the forking authority
  await legit.init({ seed: new Uint8Array(32).fill(0x11), eventStore: new InMemoryEventStore() });

  async function member(fill: number): Promise<string> {
    const m = new KeyhiveProvider();
    await m.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
    const { id } = await legit.receiveContactCard(await m.contactCard());
    return id;
  }

  // ── STAGE 1 — FOUND the captured realm, join two survivors + a captor ───────────
  const realm = await foundCabalRealm(legit, REALM_URI, SUBSTRATE);
  const survivorA = await member(0xa1);
  const survivorB = await member(0xb2);
  const captor    = await member(0xcc);
  await openDwelling(legit, realm, survivorA);
  await openDwelling(legit, realm, survivorB);
  await openDwelling(legit, realm, captor);
  const oldDwellers = await dwellersHolding(legit, realm, [survivorA, survivorB, captor]);
  stage("1 CAPTURED — the realm holds two survivors + a captor", oldDwellers.length === 3, `roster=${oldDwellers.length}`);

  // ── STAGE 2 — FORK excluding the captor ────────────────────────────────────────
  const fork = await forkCabalRealm(legit, realm, oldDwellers, [captor]);
  stage("2 FORK — a fresh realm forks, the captor excluded by omission",
    fork.newRealm.realmDocIdHex.length > 0 &&
    fork.newRealm.realmDocIdHex !== realm.realmDocIdHex &&
    fork.survivors.length === 2 && !fork.survivors.includes(captor),
    `fork=${fork.newRealm.realmDocIdHex.slice(0, 10)}… survivors=${fork.survivors.length}`);

  // ── STAGE 3 — the fork's real roster = the survivors ONLY ───────────────────────
  const forkRoster = await dwellersHolding(legit, fork.newRealm, [survivorA, survivorB, captor]);
  stage("3 ROSTER — the fork's real Keyhive roster carries the survivors, not the captor",
    forkRoster.length === 2 && forkRoster.includes(survivorA) && forkRoster.includes(survivorB) && !forkRoster.includes(captor),
    `fork-roster=${forkRoster.length} hasCaptor=${forkRoster.includes(captor)}`);

  // ── STAGE 4 — THE LOCKOUT: the captor holds no key to the fork ──────────────────
  const captorInFork = await legit.verifySentinelMembership(captor, fork.newRealm.realmDocIdHex);
  const survivorInFork = await legit.verifySentinelMembership(survivorA, fork.newRealm.realmDocIdHex);
  stage("4 LOCKOUT — the captor has NO membership in the fork; a survivor does",
    captorInFork.ok === false && survivorInFork.ok === true,
    `captor.ok=${captorInFork.ok} survivorA.ok=${survivorInFork.ok}`);

  // ── STAGE 5 — CONTINUITY + the Zooko re-point ──────────────────────────────────
  const survivorRepoint = repointToFork(realm.realmDocIdHex, fork);        // a survivor moves old→fork
  const captorRepoint = repointToFork("0xcaptor_only_knows_old", fork);    // the captor's other pointer is untouched
  stage("5 CONTINUITY — fork links to the captured realm; a survivor re-points old→fork",
    fork.forkedFromDocIdHex === realm.realmDocIdHex &&
    survivorRepoint === fork.newRealm.realmDocIdHex &&
    captorRepoint === "0xcaptor_only_knows_old",
    `forkedFrom=${fork.forkedFromDocIdHex.slice(0, 10)}… repoint→${survivorRepoint.slice(0, 10)}…`);

  await legit.dispose();

  console.log("[fork-realm] =========================================================");
  if (failures === 0) {
    console.log("[fork-realm] ALL STAGES PASS — fork-as-exit holds: the survivors escape,");
    console.log("[fork-realm] the captor keeps only the dead shell. Capture is survivable.");
  } else {
    console.log(`[fork-realm] ${failures} STAGE(S) FAILED — fork-as-exit does not hold.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[fork-realm] FATAL:", err); process.exit(1); });
