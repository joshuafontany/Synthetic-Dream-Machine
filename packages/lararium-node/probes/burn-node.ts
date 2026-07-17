/**
 * burn-node — the CONTENT-layer civic scenario (X6): burning a Handle forfeits access to NEW shared
 * content, forward-only, while the anon FLOOR persists. keyhive revoke + re-key enforce it — no watcher.
 * ShadowTalk's "a blown SIN burned", made cryptographic (veil-ladder#the-price · #the-base-model).
 *
 * Two roles dance over a shared volume (the same calls persona-content-crossing.test proves in-process,
 * their outputs shipped between containers): the FOUNDER delegates a read, encrypts v1, then REVOKES and
 * encrypts v2; the DEVICE reads v1 (before the burn) and must FAIL to read v2 (after), while it still
 * re-reads v1 AND its OWN floor content. The DEVICE carries the verdict (exit 0 = the cut ran forward).
 *
 * Env: LAR_BURN_ROLE (founder|device) · LAR_BURN_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder (#the-price · #the-base-model)
 */

import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";
import { envOf, b64, unb64, ProbeVolume, runProbeRole } from "./probe-ceremony.js";

const SHARED = envOf("LAR_BURN_SHARED");
const ROLE   = envOf("LAR_BURN_ROLE", "device");
const BAG    = "lar:///ha.ka.ba/bags/@catalog/burn-note";
const FLOOR  = "lar:///ha.ka.ba/bags/@catalog/my-own-floor";
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const putList = (vol: ProbeVolume, name: string, us: readonly Uint8Array[]): void => vol.putText(name, JSON.stringify(us.map(b64)));
const readList = (vol: ProbeVolume, name: string): Uint8Array[] => (JSON.parse(vol.readText(name)) as string[]).map(unb64);

async function runFounder(vol: ProbeVolume, founder: KeyhiveProvider): Promise<void> {
  // Introduce (bidirectional cards), then delegate a read on the shared bag.
  vol.putBytes("founder-card", await founder.contactCard());
  await vol.waitFor("device-card", "device card");
  const { id: deviceAgentId } = await founder.receiveContactCard(vol.readBytes("device-card"));
  const { docId } = await founder.registerBag(BAG);
  vol.putText("doc-id", docId);
  const { delegationId } = await founder.delegate({ bagUrl: BAG, audience: deviceAgentId, access: "read" });

  // v1 — BEFORE the burn: the handle still holds.
  vol.putBytes("ct-v1", await founder.encryptContent(BAG, new TextEncoder().encode("v1 — the handle still holds")));
  putList(vol, "events-1", await founder.eventsForPeer(deviceAgentId));
  vol.mark("phase-1-ready");
  console.log(`[burn-node] FOUNDER delegated + shared v1 (delegation=${delegationId.slice(0, 12)}…)`);

  await vol.waitFor("device-read-v1", "device to read v1");

  // BURN — revoke the handle's membership (a convergent CRDT op), then re-key by encrypting anew.
  await founder.revoke(delegationId);
  vol.putBytes("ct-v2", await founder.encryptContent(BAG, new TextEncoder().encode("v2 — after the burn")));
  putList(vol, "events-2", await founder.eventsForPeer(deviceAgentId));
  vol.mark("phase-2-ready");
  console.log(`[burn-node] FOUNDER ✓ burned the handle + shared v2 to the re-keyed group`);

  await vol.waitFor("device-done", "device verdict");
  console.log(`[burn-node] FOUNDER done`);
}

async function runDevice(vol: ProbeVolume, device: KeyhiveProvider): Promise<void> {
  // The device owns its OWN floor content first — the anon floor, its own key, never shared.
  await device.registerBag(FLOOR);
  const floorCt = await device.encryptContent(FLOOR, new TextEncoder().encode("my own floor content"));

  // Introduce (learn the founder), adopt the shared bag, ingest the membership events.
  vol.putBytes("device-card", await device.contactCard());
  await vol.waitFor("founder-card", "founder card");
  await device.receiveContactCard(vol.readBytes("founder-card"));
  device.adoptBag(BAG, await vol.waitFor("doc-id", "shared doc id"));

  await vol.waitFor("phase-1-ready", "founder v1");
  await device.ingestPeerEvents(readList(vol, "events-1"));
  const v1 = new TextDecoder().decode(await device.decryptContent(BAG, vol.readBytes("ct-v1")));
  if (!v1.includes("v1")) { console.log(`[burn-node] DEVICE ✗ could not read v1 before the burn: "${v1}"`); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ read v1 before the burn: "${v1}"`);
  vol.mark("device-read-v1");

  // After the burn: v2 keys to the re-keyed group WITHOUT the burned handle → must FAIL.
  await vol.waitFor("phase-2-ready", "founder v2 (post-burn)");
  await device.ingestPeerEvents(readList(vol, "events-2"));
  let v2Denied = false;
  try { await device.decryptContent(BAG, vol.readBytes("ct-v2")); } catch { v2Denied = true; }
  if (!v2Denied) { console.log(`[burn-node] DEVICE ✗ SECURITY FAILURE — read v2 AFTER the burn`); vol.mark("device-done"); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ correctly DENIED v2 after the burn — the cut runs forward only`);

  // FLOOR PERSISTS: the vessel still reads its OWN content, untouched by the burn.
  const floorAfter = new TextDecoder().decode(await device.decryptContent(FLOOR, floorCt));
  if (!floorAfter.includes("floor")) { console.log(`[burn-node] DEVICE ✗ floor lost after burn: "${floorAfter}"`); vol.mark("device-done"); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ the anon FLOOR persists the burn — kept its own content`);
  vol.mark("device-done");
  console.log(`[burn-node] DEVICE ✓ BURN CONTRACT HELD — forward-cut + floor persists`);
  process.exit(0);
}

async function withProvider(role: "founder" | "device", vol: ProbeVolume): Promise<void> {
  const provider = new KeyhiveProvider();
  await provider.init({ seed: seedOf(role === "founder" ? 3 : 102), eventStore: new InMemoryEventStore() });
  if (role === "founder") await runFounder(vol, provider);
  else await runDevice(vol, provider);
  await provider.dispose();
}

if (!SHARED) throw new Error("LAR_BURN_SHARED required");
const vol = new ProbeVolume(SHARED, ROLE);
await runProbeRole("LAR_BURN_ROLE", { founder: () => withProvider("founder", vol), device: () => withProvider("device", vol) });
if (ROLE === "founder") process.exit(0);
