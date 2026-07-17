/**
 * burn-node — the CONTENT-layer civic-protocol scenario, across a real container boundary: burning a
 * Handle forfeits access to NEW shared content, forward-only, while the anon FLOOR persists. This is
 * ShadowTalk's "a blown SIN burned" made cryptographic — the veil-ladder#the-price cut, enforced by
 * keyhive revoke + re-key, not a watcher.
 *
 * Two roles dance over a shared volume (the same calls persona-content-crossing.test proves in-process,
 * their outputs shipped between containers): the FOUNDER delegates a read, encrypts v1, then REVOKES
 * and encrypts v2; the DEVICE reads v1 (before the burn), and must FAIL to read v2 (after), while it
 * still re-reads v1 (kept what it already decrypted) AND its OWN floor content (never shared, never cut).
 * The DEVICE carries the verdict (exit 0 = the burn cut forward only).
 *
 * Env: LAR_BURN_ROLE (founder|device) · LAR_BURN_SHARED (req, shared volume)
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder (#the-price · #the-base-model)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { KeyhiveProvider, InMemoryEventStore } from "@lararium/keyhive";

const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const ROLE   = envOf("LAR_BURN_ROLE", "device");
const SHARED = envOf("LAR_BURN_SHARED");
const BAG    = "lar:///ha.ka.ba/bags/@catalog/burn-note";
const FLOOR  = "lar:///ha.ka.ba/bags/@catalog/my-own-floor";
const seedOf = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");
const unb64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

const P = (name: string): string => join(SHARED, name);
const putBytes = (name: string, u: Uint8Array): void => writeFileSync(P(name), b64(u));
const putList  = (name: string, us: readonly Uint8Array[]): void => writeFileSync(P(name), JSON.stringify(us.map(b64)));
const putMark  = (name: string): void => writeFileSync(P(name), "ok");

async function waitFor(name: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(P(name))) return readFileSync(P(name), "utf8");
    if (i === 0) console.log(`[burn-node] (${ROLE}) awaiting ${label}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

async function runFounder(founder: KeyhiveProvider): Promise<void> {
  // Introduce (bidirectional cards), then delegate a read on the shared bag.
  putBytes("founder-card", await founder.contactCard());
  const deviceCard = unb64(await waitFor("device-card", "device card"));
  const { id: deviceAgentId } = await founder.receiveContactCard(deviceCard);
  const { docId } = await founder.registerBag(BAG);
  writeFileSync(P("doc-id"), docId);
  const { delegationId } = await founder.delegate({ bagUrl: BAG, audience: deviceAgentId, access: "read" });

  // v1 — BEFORE the burn: the handle still holds.
  putBytes("ct-v1", await founder.encryptContent(BAG, new TextEncoder().encode("v1 — the handle still holds")));
  putList("events-1", await founder.eventsForPeer(deviceAgentId));
  putMark("phase-1-ready");
  console.log(`[burn-node] FOUNDER delegated + shared v1 (delegation=${delegationId.slice(0, 12)}…)`);

  await waitFor("device-read-v1", "device to read v1");

  // BURN — revoke the handle's membership (a convergent CRDT op), then re-key by encrypting anew.
  await founder.revoke(delegationId);
  putBytes("ct-v2", await founder.encryptContent(BAG, new TextEncoder().encode("v2 — after the burn")));
  putList("events-2", await founder.eventsForPeer(deviceAgentId));
  putMark("phase-2-ready");
  console.log(`[burn-node] FOUNDER ✓ burned the handle + shared v2 to the re-keyed group`);

  await waitFor("device-done", "device verdict");
  console.log(`[burn-node] FOUNDER done`);
}

async function runDevice(device: KeyhiveProvider): Promise<void> {
  // The device owns its OWN floor content first — the anon floor, its own key, never shared.
  await device.registerBag(FLOOR);
  const floorCt = await device.encryptContent(FLOOR, new TextEncoder().encode("my own floor content"));

  // Introduce (learn the founder), adopt the shared bag, ingest the membership events.
  putBytes("device-card", await device.contactCard());
  await device.receiveContactCard(unb64(await waitFor("founder-card", "founder card")));
  const docId = await waitFor("doc-id", "shared doc id");
  device.adoptBag(BAG, docId);

  await waitFor("phase-1-ready", "founder v1");
  await device.ingestPeerEvents((JSON.parse(readFileSync(P("events-1"), "utf8")) as string[]).map(unb64));
  const v1 = new TextDecoder().decode(await device.decryptContent(BAG, unb64(readFileSync(P("ct-v1"), "utf8"))));
  if (!v1.includes("v1")) { console.log(`[burn-node] DEVICE ✗ could not read v1 before the burn: "${v1}"`); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ read v1 before the burn: "${v1}"`);
  putMark("device-read-v1");

  // After the burn: v2 keys to the re-keyed group WITHOUT the burned handle → must FAIL.
  await waitFor("phase-2-ready", "founder v2 (post-burn)");
  await device.ingestPeerEvents((JSON.parse(readFileSync(P("events-2"), "utf8")) as string[]).map(unb64));
  let v2Denied = false;
  try { await device.decryptContent(BAG, unb64(readFileSync(P("ct-v2"), "utf8"))); }
  catch { v2Denied = true; }
  if (!v2Denied) { console.log(`[burn-node] DEVICE ✗ SECURITY FAILURE — read v2 AFTER the burn`); putMark("device-done"); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ correctly DENIED v2 after the burn — the cut runs forward only`);

  // FLOOR PERSISTS: the vessel still reads its OWN content, untouched by the burn.
  const floorAfter = new TextDecoder().decode(await device.decryptContent(FLOOR, floorCt));
  if (!floorAfter.includes("floor")) { console.log(`[burn-node] DEVICE ✗ floor lost after burn: "${floorAfter}"`); putMark("device-done"); process.exit(1); }
  console.log(`[burn-node] DEVICE ✓ the anon FLOOR persists the burn — kept its own content`);
  putMark("device-done");
  console.log(`[burn-node] DEVICE ✓ BURN CONTRACT HELD — forward-cut + floor persists`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_BURN_SHARED required");
  mkdirSync(SHARED, { recursive: true });
  const provider = new KeyhiveProvider();
  await provider.init({ seed: seedOf(ROLE === "founder" ? 3 : 102), eventStore: new InMemoryEventStore() });
  if (ROLE === "founder") await runFounder(provider);
  else await runDevice(provider);
  await provider.dispose();
  if (ROLE === "founder") process.exit(0);
}

main().catch((e) => { console.error(`[burn-node] (${ROLE}) ✗ FATAL:`, e); process.exit(1); });
