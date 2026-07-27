/**
 * MESH-SWARM LIFECYCLE WITNESS — multiple DIFFERENT PersonaGroups (different humans)
 * found + join a SHARED cabal-realm, the membership ceremony crossing a real FILE
 * channel between separate vessels. REAL Keyhive, no mocks.
 *
 * This is the swarm test the operator ruled: file/POST FIRST (ship it fast), the channel
 * the MembershipChannel SHORE — file/POST rides below it here, live-WS drops in untouched-above.
 * Here the shore's impl is FileMembershipChannel — envelopes as JSON files in a shared
 * dir (the two-vessel e2e's admit.json move, generalized to N vessels + broadcast). In
 * Docker the same shore becomes a shared volume / HTTP-POST; the ceremony never knows.
 *
 * The drift (the WHO-plane crossing the transport, at last):
 *   1. FOUND    — the founder founds a shared multi-human cabal-realm.
 *   2. INVITE   — founder BROADCASTS an invite over the channel; both joiners receive it.
 *   3. CONTACT  — each joiner offers its contact-card over the channel → the founder.
 *   4. ADMIT    — founder receives each card, joins it (real Keyhive), acks over channel.
 *   5. ROSTER   — the place's real Keyhive roster holds all THREE different PersonaGroups.
 *   6. CLOCK    — the capture-clock reads a MULTI-human place: here the spread is
 *                 MEANINGFUL (different principals) — the contrast to the me's immunity.
 *
 * Run: pnpm exec tsx packages/lararium-keyhive/probes/mesh-swarm-lifecycle.ts
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import { foundCabalRealm, joinCabalRealm, cabalRealmRoster } from "../src/cabal-realm-ceremony.js";
import {
  cabalRealmMaintenanceProvenance, cabalRealmLeaseSlot,
  MEMBERSHIP_BROADCAST,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";

// ── FileMembershipChannel — the file/POST impl behind the shore — one of two live forms, chosen by deployment. ──
// Envelopes ride as JSON files in a shared dir; per-recipient seen-set = deliver-once.
class FileMembershipChannel implements MembershipChannel {
  private seq = 0;
  private readonly seen = new Map<string, Set<string>>();
  constructor(private readonly dir: string) { mkdirSync(dir, { recursive: true }); }

  offer(env: MembershipEnvelope): Promise<void> {
    const name = `${String(Date.now())}-${String(this.seq++).padStart(4, "0")}.json`;
    writeFileSync(join(this.dir, name), JSON.stringify(env));
    return Promise.resolve();
  }

  poll(recipient: string): Promise<readonly MembershipEnvelope[]> {
    const seen = this.seen.get(recipient) ?? new Set<string>();
    const out: MembershipEnvelope[] = [];
    for (const f of readdirSync(this.dir).filter((x) => x.endsWith(".json")).sort()) {
      if (seen.has(f)) continue;
      seen.add(f);
      const env = JSON.parse(readFileSync(join(this.dir, f), "utf8")) as MembershipEnvelope;
      if (env.from !== recipient && (env.to === recipient || env.to === MEMBERSHIP_BROADCAST)) out.push(env);
    }
    this.seen.set(recipient, seen);
    return Promise.resolve(out);
  }
}

const PLACE_URI = "lar:///crossroads.cabal.gathers/swarm";
const SUBSTRATE = "automerge:swarm-place-substrate";
const CHANNEL_DIR = join(tmpdir(), `lar-swarm-channel-${String(Date.now())}`);

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`[swarm] ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main(): Promise<void> {
  console.log("[swarm] =========================================================");
  console.log("[swarm] cross-vessel swarm — different PersonaGroups, file channel, REAL keyhive");
  console.log("[swarm] =========================================================");
  const channel = new FileMembershipChannel(CHANNEL_DIR);
  const leaseSlots = new Map<string, string>();

  // Three DIFFERENT humans, each its own vessel (channel address = vessel label).
  const founder = new KeyhiveProvider();
  await founder.init({ seed: new Uint8Array(32).fill(0xf0), eventStore: new InMemoryEventStore() });
  async function makeJoiner(fill: number): Promise<KeyhiveProvider> {
    const p = new KeyhiveProvider();
    await p.init({ seed: new Uint8Array(32).fill(fill), eventStore: new InMemoryEventStore() });
    return p;
  }
  const vesselB = await makeJoiner(0xb0);
  const vesselC = await makeJoiner(0xc0);

  // ── STAGE 1 — FOUND the shared place ──────────────────────────────────────────
  const place = await foundCabalRealm(founder, PLACE_URI, SUBSTRATE, { leaseWriterId: "founder", leaseSlots });
  stage("1 FOUND — the founder founds a shared multi-human cabal-realm",
    place.placeDocIdHex.length > 0, `place=${place.placeDocIdHex.slice(0, 12)}…`);

  // ── STAGE 2 — INVITE broadcast over the channel ───────────────────────────────
  await channel.offer({ kind: "invite", from: "founder", to: MEMBERSHIP_BROADCAST,
    payload: { placeDocIdHex: place.placeDocIdHex, genesisUri: PLACE_URI } });
  const invB = await channel.poll("vessel-B");
  const invC = await channel.poll("vessel-C");
  stage("2 INVITE — founder broadcasts an invite; both joiners receive it over the channel",
    invB.length === 1 && invB[0]?.kind === "invite" && invC.length === 1,
    `B=${invB.length} C=${invC.length}`);

  // ── STAGE 3 — CONTACT: each joiner offers its contact-card → the founder ───────
  // The contact-card is BINARY (UTF-8 bytes); a file/POST channel carries JSON, so the
  // sender base64-encodes it (the real channel's binary-safety burden, not the shore's).
  const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");
  await channel.offer({ kind: "contact-card", from: "vessel-B", to: "founder", payload: b64(await vesselB.contactCard()) });
  await channel.offer({ kind: "contact-card", from: "vessel-C", to: "founder", payload: b64(await vesselC.contactCard()) });
  const cards = await channel.poll("founder");
  stage("3 CONTACT — both contact-cards cross the channel to the founder",
    cards.length === 2 && cards.every((c) => c.kind === "contact-card"),
    `cards=${cards.length}`);

  // ── STAGE 4 — ADMIT: founder receives each card, joins it (real Keyhive), acks ──
  const admitted: Record<string, string> = {};
  for (const c of cards) {
    const bytes = new Uint8Array(Buffer.from(c.payload as string, "base64"));
    const { id } = await founder.receiveContactCard(bytes);
    await joinCabalRealm(founder, place, id);                       // real Keyhive membership
    admitted[c.from] = id;
    await channel.offer({ kind: "admit", from: "founder", to: c.from, payload: { memberIdHex: id } });
  }
  const ackB = await channel.poll("vessel-B");
  stage("4 ADMIT — founder joins each over real Keyhive + acks; the joiner hears its admit",
    Object.keys(admitted).length === 2 && ackB.length === 1 && ackB[0]?.kind === "admit",
    `admitted=${Object.keys(admitted).length} ackB=${ackB.length}`);

  // ── STAGE 5 — ROSTER holds all three DIFFERENT PersonaGroups ──────────────────
  const idB = admitted["vessel-B"] ?? "", idC = admitted["vessel-C"] ?? "";
  const roster = await cabalRealmRoster(founder, place, [idB, idC]);
  stage("5 ROSTER — the shared place's real Keyhive roster holds both joined PersonaGroups",
    roster.length === 2 && roster.includes(idB) && roster.includes(idC),
    `roster=${roster.length} (cross-channel membership witnessed)`);

  // ── STAGE 6 — the clock reads a MULTI-human place: the spread MEANS something ──
  leaseSlots.set(cabalRealmLeaseSlot(place.placeDocIdHex, idB), "20");   // B out-feeds
  leaseSlots.set(cabalRealmLeaseSlot(place.placeDocIdHex, idC), "2");
  const clock = cabalRealmMaintenanceProvenance(place, leaseSlots);
  stage("6 CLOCK — on a multi-human place the spread is a REAL capture signal (vs the me's immunity)",
    clock.maintainerCount === 3 && clock.spread >= 18 && clock.leadingCount === 1,
    `maintainers=${clock.maintainerCount} spread=${clock.spread} — here it MEANS capture`);

  await founder.dispose();
  try { rmSync(CHANNEL_DIR, { recursive: true, force: true }); } catch { /* best-effort */ }

  console.log("[swarm] =========================================================");
  if (failures === 0) {
    console.log("[swarm] ALL STAGES PASS — the WHO-plane crossed the transport: different");
    console.log("[swarm] PersonaGroups joined a shared place through a file channel (shore ready for WS).");
  } else {
    console.log(`[swarm] ${failures} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[swarm] FATAL:", err); process.exit(1); });
