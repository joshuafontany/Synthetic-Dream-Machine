/**
 * D.2 smoke — exercise KeyhiveProvider through the CapabilityProvider
 * interface. Two providers, contact-card exchange, registerBag, delegate,
 * verify on the receiving side.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/provider-smoke.ts
 */

import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";

async function main() {
  const operatorStore = new InMemoryEventStore();
  const deviceStore   = new InMemoryEventStore();

  const operator = new KeyhiveProvider();
  const device   = new KeyhiveProvider();

  const seedA = new Uint8Array(32); seedA.fill(0x42);
  const seedB = new Uint8Array(32); seedB.fill(0x99);

  await operator.init({ seed: seedA, eventStore: operatorStore });
  await device  .init({ seed: seedB, eventStore: deviceStore });
  console.log(`[smoke] operator DID: ${await operator.whoami()}`);
  console.log(`[smoke] device   DID: ${await device.whoami()}`);

  // Contact card exchange — any failures here surface ContactCard byte-shape gaps.
  let operatorCard: Uint8Array;
  let deviceCard:   Uint8Array;
  try {
    operatorCard = await operator.contactCard();
    deviceCard   = await device.contactCard();
    console.log(`[smoke] contactCard sizes: operator=${operatorCard.length} device=${deviceCard.length}`);
  } catch (err) {
    console.error(`[smoke] contactCard failed (D.3 will resolve):`, err instanceof Error ? err.message : err);
    return;
  }

  try {
    const op = await operator.receiveContactCard(deviceCard);
    const dv = await device.receiveContactCard(operatorCard);
    console.log(`[smoke] operator learned device DID: ${op.id}`);
    console.log(`[smoke] device   learned operator DID: ${dv.id}`);
  } catch (err) {
    console.error(`[smoke] receiveContactCard failed:`, err instanceof Error ? err.message : err);
    return;
  }

  const bag = "lar:///ha.ka.ba/bags/admin";
  const reg = await operator.registerBag(bag);
  console.log(`[smoke] operator registered bag ${bag} → docId ${reg.docId.slice(0, 24)}…`);

  const deviceDID = await device.whoami();
  try {
    const result = await operator.delegate({
      audience: deviceDID,
      bagUrl:   bag,
      access:   "admin",
    });
    console.log(`[smoke] delegated; delegationId=${result.delegationId} bytes=${result.bytes.length}`);
  } catch (err) {
    console.error(`[smoke] delegate failed:`, err instanceof Error ? err.message : err);
    return;
  }

  const verifyOp = await operator.verify({
    presenter: deviceDID,
    bagUrl:    bag,
    access:    "admin",
  });
  console.log(`[smoke] operator-side verify (device has admin): ok=${verifyOp.ok} reason=${verifyOp.reason ?? "—"}`);

  const stats = {
    operatorEvents: (await operatorStore.list()).length,
    deviceEvents:   (await deviceStore.list()).length,
  };
  console.log(`[smoke] event-store sizes: ${JSON.stringify(stats)}`);
  console.log(`[smoke] === complete ===`);
}

main().catch((err) => { console.error("[smoke] FATAL:", err); process.exit(1); });
