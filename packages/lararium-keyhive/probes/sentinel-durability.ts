/**
 * Sentinel durability probe — founding ceremony survives restart.
 *
 * Simulates the full lares vessel found → daemon restart → Gate B/C verify cycle
 * inside a single process, with no disk I/O. The "restart" is: dispose
 * the founding KeyhiveProvider, construct a fresh one, replay the event
 * bytes captured by InMemoryEventStore, then assert sentinel membership
 * still holds for both gates.
 *
 * What this closes:
 *   - hydrateFromEventStore actually restores PersonaGroup + MeshCabal sentinels
 *   - verifySentinelMembership works on a hydrated (not fresh-authored) instance
 *   - The docIdHex oracle values round-trip through hex encoding correctly
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/sentinel-durability.ts
 */

import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";
import { PERSONA_GROUP_SENTINEL_URI, MESH_CABAL_SENTINEL_URI } from "@lararium/mesh";

function pass(msg: string) { console.log(`  ✓ ${msg}`); }
function fail(msg: string) { console.error(`  ✗ ${msg}`); process.exitCode = 1; }

async function main() {
  console.log("[sentinel-durability] === Phase 1: founding ceremony ===");

  const seed = new Uint8Array(32); seed.fill(0x42);
  const store = new InMemoryEventStore();

  const founding = new KeyhiveProvider();
  await founding.init({ seed, eventStore: store });

  const vesselHex = await founding.vesselIdentifierHex();
  console.log(`  vessel   ${vesselHex.slice(0, 20)}…`);

  const personaGroup = await founding.createSentinelDoc(PERSONA_GROUP_SENTINEL_URI);
  await founding.addSentinelMember(vesselHex, personaGroup.docIdHex);
  console.log(`  PersonaGroup doc  ${personaGroup.docIdHex.slice(0, 20)}…`);
  console.log(`  PersonaGroup agent ${personaGroup.agentIdHex.slice(0, 20)}…`);

  const meshCabal = await founding.createSentinelDoc(MESH_CABAL_SENTINEL_URI);
  await founding.addSentinelMember(personaGroup.agentIdHex, meshCabal.docIdHex);
  console.log(`  MeshCabal doc    ${meshCabal.docIdHex.slice(0, 20)}…`);

  // Verify on the founding instance (baseline)
  const baseB = await founding.verifySentinelMembership(vesselHex, personaGroup.docIdHex);
  const baseC = await founding.verifySentinelMembership(personaGroup.agentIdHex, meshCabal.docIdHex);
  baseB.ok ? pass("Gate B on founding instance") : fail(`Gate B baseline: ${baseB.reason}`);
  baseC.ok ? pass("Gate C on founding instance") : fail(`Gate C baseline: ${baseC.reason}`);

  const events = await store.list();
  console.log(`\n[sentinel-durability] === Phase 2: restart (${events.length} events to replay) ===`);

  await founding.dispose();

  // Fresh provider — no state from founding instance
  const rehydrated = new KeyhiveProvider();
  const rehydrateStore = new InMemoryEventStore();
  // Seed events into the new store so hydrateFromEventStore can read them
  for (const e of events) await rehydrateStore.put(e);
  await rehydrated.init({ seed, eventStore: rehydrateStore });

  const { ingested } = await rehydrated.hydrateFromEventStore();
  console.log(`  ingested ${ingested} events`);
  ingested > 0 ? pass("events ingested") : fail("hydrateFromEventStore returned 0 — sentinel state lost");

  console.log("\n[sentinel-durability] === Phase 3: gate verification on rehydrated instance ===");

  const gateB = await rehydrated.verifySentinelMembership(vesselHex, personaGroup.docIdHex);
  const gateC = await rehydrated.verifySentinelMembership(personaGroup.agentIdHex, meshCabal.docIdHex);

  gateB.ok ? pass("Gate B ✓ — vessel holds PersonaGroup membership after restart") : fail(`Gate B failed: ${gateB.reason}`);
  gateC.ok ? pass("Gate C ✓ — PersonaGroup holds MeshCabal membership after restart") : fail(`Gate C failed: ${gateC.reason}`);

  await rehydrated.dispose();

  if (process.exitCode) {
    console.error("\n[sentinel-durability] FAILED — durability gap found, fix before shipping gate checks");
  } else {
    console.log("\n[sentinel-durability] PASSED — founding ceremony survives restart");
  }
}

main().catch((err) => { console.error("[sentinel-durability] unexpected error:", err); process.exit(1); });
