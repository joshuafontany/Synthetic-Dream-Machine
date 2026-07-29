/**
 * swarm-node — a container (or local) entrypoint that joins a mesh swarm: found a shared
 * cabal-realm (founder) or join it (joiner), the membership ceremony crossing the shore.
 * CHANNEL-AGNOSTIC (the shore's payoff): file/POST over a shared dir, OR live-WS to a relay
 * — chosen by env, the ceremony identical above the shore. REAL Keyhive.
 *
 * Env:
 *   LAR_SWARM_ROLE   founder | joiner          (default joiner)
 *   LAR_SWARM_RELAY  ws://host:port            (set → live-WS channel)
 *   LAR_SWARM_DIR    shared dir/volume         (used when RELAY unset → file channel)
 *   LAR_SWARM_ID     this vessel's label       (default = role; e.g. vessel-B)
 *   LAR_SWARM_SEED   hex byte for the seed     (default 01; each vessel distinct)
 *   LAR_SWARM_EXPECT founder: joiners to await (default 2)
 *
 * Discovery rides the channel (a re-broadcast INVITE) — no shared realm file — so it works
 * for the persistent file channel AND the ephemeral WS channel (a late/reconnecting joiner
 * catches a later invite). file/POST serves a shared-dir swarm, the WS relay-service serves live sockets —
 * two live forms of the Herm's OPEN ceremony carriage behind one shore, chosen by env.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { KeyhiveProvider, InMemoryEventStore, foundCabalRealm, joinCabalRealm, cabalRealmRoster } from "@lararium/keyhive";
import { MEMBERSHIP_BROADCAST, type MembershipChannel } from "@lararium/mesh";
import { FileMembershipChannel } from "../src/file-membership-channel.js";
import { WSMembershipChannel } from "../src/ws-membership-channel.js";
import { loadVesselSigningSeed, generateOrLoadVesselIdentity } from "../src/node-vessel-identity.js";

const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const ROLE = envOf("LAR_SWARM_ROLE", "joiner");
const RELAY = envOf("LAR_SWARM_RELAY");
const DIR = envOf("LAR_SWARM_DIR");
const ID = envOf("LAR_SWARM_ID", ROLE);
const SEED = Number.parseInt(envOf("LAR_SWARM_SEED", "01"), 16) & 0xff;
const EXPECT = Number.parseInt(envOf("LAR_SWARM_EXPECT", "2"), 10);
const REALM_URI = envOf("LAR_SWARM_REALM", "lar:///crossroads.cabal.gathers/docker-swarm");
const ROOT = envOf("LAR_SWARM_ROOT");   // a founded .lararium dataDir → use its REAL identity (else a test key)
const TRANSPORT = RELAY ? `ws ${RELAY}` : `file ${DIR}`;

/** This vessel's seed: its REAL founded identity (loadVesselSigningSeed) when LAR_SWARM_ROOT
 *  points at a `lares init`-founded dataDir; a deterministic test byte otherwise. */
async function loadSeed(): Promise<Uint8Array> {
  if (ROOT) {
    await generateOrLoadVesselIdentity(ROOT);   // mint this vessel's identity if absent (idempotent, = lares init's mint)
    const seed = await loadVesselSigningSeed(ROOT);
    console.log(`[swarm-node] using FOUNDED vessel identity from ${ROOT}`);
    return seed;
  }
  return new Uint8Array(32).fill(SEED);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");

async function openChannel(): Promise<MembershipChannel> {
  if (RELAY) {
    // Retry the dial — the relay container may not be listening yet at startup.
    for (let attempt = 0; ; attempt++) {
      try { const ws = new WSMembershipChannel(RELAY); await ws.opened(); return ws; }
      catch (e) { if (attempt >= 30) throw e; await sleep(1000); }
    }
  }
  if (!DIR) throw new Error("LAR_SWARM_DIR or LAR_SWARM_RELAY required");
  return new FileMembershipChannel(join(DIR, "channel"));
}

async function runFounder(channel: MembershipChannel, provider: KeyhiveProvider): Promise<void> {
  const realm = await foundCabalRealm(provider, REALM_URI, "automerge:docker-swarm-substrate");
  console.log(`[swarm-node] FOUNDER founded realm=${realm.realmDocIdHex.slice(0, 12)}… via ${TRANSPORT}, expecting ${String(EXPECT)} joiners`);
  const invite = { kind: "invite", from: "founder", to: MEMBERSHIP_BROADCAST, payload: { realmDocIdHex: realm.realmDocIdHex, genesisUri: REALM_URI } };

  const admitted = new Map<string, string>();
  for (let i = 0; i < 240 && admitted.size < EXPECT; i++) {
    await channel.offer(invite);                            // re-broadcast (persists on file; catches late joiners on WS)
    for (const c of await channel.poll("founder")) {
      if (c.kind !== "contact-card" || admitted.has(c.from)) continue;
      const { id } = await provider.receiveContactCard(new Uint8Array(Buffer.from(c.payload as string, "base64")));
      await joinCabalRealm(provider, realm, id);
      admitted.set(c.from, id);
      await channel.offer({ kind: "admit", from: "founder", to: c.from, payload: { memberIdHex: id } });
      console.log(`[swarm-node] FOUNDER admitted ${c.from} (${id.slice(0, 12)}…) — ${String(admitted.size)}/${String(EXPECT)}`);
    }
    await sleep(500);
  }

  const roster = await cabalRealmRoster(provider, realm, [...admitted.values()]);
  if (DIR) writeFileSync(join(DIR, "roster.json"), JSON.stringify({ count: roster.length, members: roster }));
  if (roster.length === EXPECT) {
    console.log(`[swarm-node] FOUNDER ✓ roster=${String(roster.length)}/${String(EXPECT)} — the swarm formed across containers.`);
  } else {
    console.log(`[swarm-node] FOUNDER ✗ roster=${String(roster.length)}/${String(EXPECT)} — incomplete.`);
    process.exit(1);
  }
}

async function runJoiner(channel: MembershipChannel, provider: KeyhiveProvider): Promise<void> {
  let offered = false;
  for (let i = 0; i < 240; i++) {
    for (const m of await channel.poll(ID)) {
      if (!offered && m.kind === "invite") {
        await channel.offer({ kind: "contact-card", from: ID, to: "founder", payload: b64(await provider.contactCard()) });
        offered = true;
        console.log(`[swarm-node] JOINER ${ID} saw invite via ${TRANSPORT}, offered contact-card, awaiting admit…`);
      } else if (offered && m.kind === "admit") {
        const member = String((m.payload as { memberIdHex?: string }).memberIdHex ?? "").slice(0, 12);
        console.log(`[swarm-node] JOINER ${ID} ✓ admitted (member=${member}…)`);
        process.exit(0);
      }
    }
    await sleep(500);
  }
  console.log(`[swarm-node] JOINER ${ID} ✗ never admitted`); process.exit(1);
}

async function main(): Promise<void> {
  const channel = await openChannel();
  const provider = new KeyhiveProvider();
  await provider.init({ seed: await loadSeed(), eventStore: new InMemoryEventStore() });
  if (ROLE === "founder") await runFounder(channel, provider);
  else await runJoiner(channel, provider);
  if (channel instanceof WSMembershipChannel) channel.close();
  await provider.dispose();
}

main().catch((e) => { console.error("[swarm-node] FATAL:", e); process.exit(1); });
