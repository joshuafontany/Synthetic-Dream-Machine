/**
 * D.1 PROBE — operator-delegate-device against @keyhive/keyhive pre-alpha.
 *
 * Goal: confirm that we can stand up two Keyhive instances (operator on
 * machine A, device on machine B), have the operator generate a "device
 * delegation" via Keyhive's membership ops, and have the device verify
 * the delegation arrived. End-to-end with no network mock — both
 * instances live in the same process; we shuttle bytes between them
 * the way two real peers eventually will.
 *
 * Six unknowns this probe answers (or fails to):
 *   1. Does @keyhive/keyhive install + import cleanly under tsx?
 *   2. Does Signer.memorySignerFromBytes accept arbitrary 32-byte seeds?
 *   3. What's the actual flow for "operator delegates to device"?
 *      Hypothesis: operator generates a Document or Group, addMember()s
 *      the device's Individual (or Agent) to it.
 *   4. How are Keyhive events serialized for transport?
 *      Hypothesis: ingestEventsBytes / eventsForAgent are the seam.
 *   5. Bundle / startup time — how long does init() take cold?
 *   6. Any glaring panics, missing methods, or surprises?
 *
 * Usage:
 *   pnpm exec tsx packages/lararium-keyhive/probes/operator-delegate-device.ts
 *
 * Findings land in packages/lararium-keyhive/probes/FINDINGS.md.
 */

import { performance } from "node:perf_hooks";
import * as KH from "@keyhive/keyhive";

console.log(`[probe] @keyhive/keyhive version assumed 0.0.0-alpha.56c`);
console.log(`[probe] exports surface: ${Object.keys(KH).sort().join(", ")}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomSeed(): Uint8Array {
  // Deterministic-enough for a probe; production uses the operator key.
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) seed[i] = Math.floor(Math.random() * 256);
  return seed;
}

async function makePeer(label: string): Promise<KH.Keyhive> {
  const t0 = performance.now();
  const seed = randomSeed();
  const signer = KH.Signer.memorySignerFromBytes(seed);
  const store  = KH.CiphertextStore.newInMemory();
  const events: unknown[] = [];
  const handler = (event: unknown): void => { events.push(event); };
  const kh = await KH.Keyhive.init(signer, store, handler);
  const t1 = performance.now();
  console.log(`[probe] ${label} init done in ${(t1 - t0).toFixed(1)}ms; whoami=${kh.idString}`);
  return kh;
}

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[probe] === Q1: import + init ===");
  const operator = await makePeer("operator");
  const device   = await makePeer("device");

  console.log("[probe] === Q3: contact-card exchange ===");
  // Contact cards are how peers introduce themselves (per the .d.ts surface).
  const operatorCard = await operator.contactCard();
  const deviceCard   = await device.contactCard();
  console.log(`[probe] operator contact card type: ${operatorCard.constructor.name}`);

  // Operator learns about device's identity via the contact card.
  const deviceIndividual = await operator.receiveContactCard(deviceCard);
  console.log(`[probe] operator received device card; deviceIndividual id = ${deviceIndividual.id?.toString()}`);
  // Device also learns operator's identity (mirrors).
  await device.receiveContactCard(operatorCard);

  console.log("[probe] === Q3: operator generates a document and adds device as member ===");
  // The membership model: a Document is a membered principal; addMember
  // grants the device an Access role over that document.
  // generateDocument signature: (coparents: Peer[], initial_content_ref_head: ChangeId, more: ChangeId[])
  // We need a ChangeId; lacking docs, try a smoke value first.
  let doc: KH.Document | null = null;
  try {
    // ChangeId construction unknown — try empty array of coparents and see what error we get.
    // Many WASM types in this surface have private constructors; we'll have to discover.
    // ChangeId has a public constructor(bytes: Uint8Array).
    const cidBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) cidBytes[i] = i;
    const cid = new KH.ChangeId(cidBytes);
    doc = await operator.generateDocument([], cid, []);
    console.log(`[probe] doc generated; id type=${doc.id?.constructor?.name}`);
  } catch (err) {
    console.log(`[probe] generateDocument failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (doc) {
    console.log("[probe] === Q3: addMember(device, doc, access=admin) ===");
    const access = KH.Access.tryFromString("admin");
    if (!access) {
      console.log(`[probe] Access.tryFromString("admin") returned undefined`);
    } else {
      try {
        // addMember signature: (to_add: Agent, membered: Membered, access: Access, other_relevant_docs: Document[])
        // Need Membered from the doc; the doc itself may BE membered (need to convert).
        // Try passing the doc directly; if API rejects, we learn the shape.
        const deviceAgent = await operator.getAgent(deviceIndividual.id);
        if (!deviceAgent) {
          console.log(`[probe] could not fetch device agent`);
        } else {
          const signedDelegation = await operator.addMember(
            deviceAgent,
            doc.toMembered(),  // Document → Membered conversion
            access,
            [],
          );
          console.log(`[probe] addMember succeeded; signed delegation type: ${signedDelegation.constructor.name}`);
        }
      } catch (err) {
        console.log(`[probe] addMember failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log("[probe] === Q4: archive + roundtrip ===");
  const t2 = performance.now();
  const archive = await operator.toArchive();
  const bytes = archive.toBytes();
  const t3 = performance.now();
  console.log(`[probe] archive size: ${bytes.length} bytes; serialize ${(t3 - t2).toFixed(1)}ms`);

  console.log("[probe] === Q5: stats ===");
  try {
    const stats = await operator.stats();
    console.log(`[probe] operator stats: ${JSON.stringify(stats)}`);
  } catch (err) {
    console.log(`[probe] stats failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("[probe] === complete ===");
}

main().catch((err) => {
  console.error("[probe] FATAL:", err);
  process.exit(1);
});
