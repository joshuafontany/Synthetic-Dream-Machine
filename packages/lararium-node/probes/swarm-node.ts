/**
 * swarm-node — a container (or local) entrypoint that joins a mesh swarm: found a shared
 * cabal-place (founder) or join it (joiner), the membership ceremony crossing a FILE
 * channel over a shared directory (a Docker VOLUME in the deployed swarm). REAL Keyhive.
 *
 * Env:
 *   LAR_SWARM_ROLE   founder | joiner        (default joiner)
 *   LAR_SWARM_DIR    the shared dir/volume   (required — the file channel lives here)
 *   LAR_SWARM_ID     this vessel's label     (default = role; e.g. vessel-B)
 *   LAR_SWARM_SEED   hex byte for the seed   (default 01; each vessel distinct)
 *   LAR_SWARM_EXPECT founder: joiners to await (default 2)
 *
 * This is the invokable ceremony the container-boot lacked. file/POST first (a shared
 * volume, no relay service); the live-WS relay is the strangler-fig follow.
 *
 * Local run (3 processes, one shared dir): see tools/swarm-local-witness.sh.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { KeyhiveProvider, InMemoryEventStore, foundCabalPlace, joinCabalPlace, cabalPlaceRoster } from "@lararium/keyhive";
import { FileMembershipChannel } from "../src/file-membership-channel.js";

const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const ROLE = envOf("LAR_SWARM_ROLE", "joiner");
const DIR = envOf("LAR_SWARM_DIR");
const ID = envOf("LAR_SWARM_ID", ROLE);
const SEED = Number.parseInt(envOf("LAR_SWARM_SEED", "01"), 16) & 0xff;
const EXPECT = Number.parseInt(envOf("LAR_SWARM_EXPECT", "2"), 10);
const PLACE_URI = envOf("LAR_SWARM_PLACE", "lar:///crossroads.cabal.gathers/docker-swarm");

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");

async function runFounder(channel: FileMembershipChannel, provider: KeyhiveProvider, placeInfoPath: string): Promise<void> {
  const place = await foundCabalPlace(provider, PLACE_URI, "automerge:docker-swarm-substrate");
  writeFileSync(placeInfoPath, JSON.stringify({ placeDocIdHex: place.placeDocIdHex, genesisUri: PLACE_URI }));
  console.log(`[swarm-node] FOUNDER founded place=${place.placeDocIdHex.slice(0, 12)}… expecting ${String(EXPECT)} joiners`);

  const admitted = new Map<string, string>();               // channel-label → member id hex
  for (let i = 0; i < 120 && admitted.size < EXPECT; i++) {
    for (const c of await channel.poll("founder")) {
      if (c.kind !== "contact-card" || admitted.has(c.from)) continue;
      const { id } = await provider.receiveContactCard(new Uint8Array(Buffer.from(c.payload as string, "base64")));
      await joinCabalPlace(provider, place, id);
      admitted.set(c.from, id);
      await channel.offer({ kind: "admit", from: "founder", to: c.from, payload: { memberIdHex: id } });
      console.log(`[swarm-node] FOUNDER admitted ${c.from} (${id.slice(0, 12)}…) — ${String(admitted.size)}/${String(EXPECT)}`);
    }
    await sleep(500);
  }

  const roster = await cabalPlaceRoster(provider, place, [...admitted.values()]);
  writeFileSync(join(DIR, "roster.json"), JSON.stringify({ count: roster.length, members: roster }));
  if (roster.length === EXPECT) {
    console.log(`[swarm-node] FOUNDER ✓ roster=${String(roster.length)}/${String(EXPECT)} — the swarm formed across containers.`);
  } else {
    console.log(`[swarm-node] FOUNDER ✗ roster=${String(roster.length)}/${String(EXPECT)} — incomplete.`);
    process.exit(1);
  }
}

async function runJoiner(channel: FileMembershipChannel, provider: KeyhiveProvider, placeInfoPath: string): Promise<void> {
  for (let i = 0; i < 120 && !existsSync(placeInfoPath); i++) await sleep(500);
  if (!existsSync(placeInfoPath)) { console.log(`[swarm-node] JOINER ${ID} ✗ place never appeared`); process.exit(1); }
  readFileSync(placeInfoPath, "utf8");                       // the place is discoverable (contact still crosses the channel)
  await channel.offer({ kind: "contact-card", from: ID, to: "founder", payload: b64(await provider.contactCard()) });
  console.log(`[swarm-node] JOINER ${ID} offered contact-card, awaiting admit…`);
  for (let i = 0; i < 120; i++) {
    for (const a of await channel.poll(ID)) {
      if (a.kind === "admit") {
        const member = String((a.payload as { memberIdHex?: string }).memberIdHex ?? "").slice(0, 12);
        console.log(`[swarm-node] JOINER ${ID} ✓ admitted (member=${member}…)`);
        process.exit(0);
      }
    }
    await sleep(500);
  }
  console.log(`[swarm-node] JOINER ${ID} ✗ never admitted`); process.exit(1);
}

async function main(): Promise<void> {
  if (!DIR) throw new Error("LAR_SWARM_DIR required");
  const channel = new FileMembershipChannel(join(DIR, "channel"));
  const provider = new KeyhiveProvider();
  await provider.init({ seed: new Uint8Array(32).fill(SEED), eventStore: new InMemoryEventStore() });
  const placeInfoPath = join(DIR, "place.json");
  if (ROLE === "founder") await runFounder(channel, provider, placeInfoPath);
  else await runJoiner(channel, provider, placeInfoPath);
  await provider.dispose();
}

main().catch((e) => { console.error("[swarm-node] FATAL:", e); process.exit(1); });
