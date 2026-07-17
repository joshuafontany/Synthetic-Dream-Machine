/**
 * crossing-client — the BROWSER half of the containerized crossing: a browser-shaped leaf (a light
 * Ed25519 identity + LarWSClientAdapter, exactly the shape lararium-browser dials with) that crosses a
 * real containerized daemon's armed DaemonAuthGate and syncs a doc over the crossed socket.
 *
 * It proves the civic-protocol crossing END TO END over a real network hop: publish leaf pubkey →
 * (daemon admits it) → read the crossing coordinates → cross the gate → find + sync the daemon's doc →
 * write back → exit 0. A denied/broken crossing exits 1. This is the pre-browser gate — a real leaf,
 * held to the real Ed25519 capability gate, reads and writes the mesh.
 *
 * Env:
 *   LAR_CROSSING_SHARED       shared dir/volume        (required — the file handshake)
 *   LAR_CROSSING_DAEMON_HOST  daemon container host     (default crossing-daemon)
 *   LAR_CROSSING_GREET        expected doc text         (default "the DreamNet breathes")
 *
 * Meme: lar:///ha.ka.ba/lararium/node/browser-crossing
 */

import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Repo, type PeerId, type AutomergeUrl } from "@automerge/automerge-repo";
import { LarWSClientAdapter, ed25519SignerFromSeed } from "@lararium/mesh";
import type { LeafIdentity } from "../src/leaf-identity.js";

const AUD = "lar:///ha.ka.ba/bags/@daemon";
const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const SHARED = envOf("LAR_CROSSING_SHARED");
const HOST   = envOf("LAR_CROSSING_DAEMON_HOST", "crossing-daemon");
const GREET  = envOf("LAR_CROSSING_GREET", "the DreamNet breathes");
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A browser-shaped leaf: a real Ed25519 signer + a ContactCard carrying its verifying key (the
 *  faithful stand-in for keyhive.receiveContactCard deriving the peer key from the card). */
function makeLeaf(): { identity: LeafIdentity; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { pub, identity: { contactCard: JSON.stringify({ peerPubKey: pub }), peerPubKey: pub, sign: ed25519SignerFromSeed(seed) } };
}

async function waitForFile(path: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(path)) return readFileSync(path, "utf8");
    if (i === 0) console.log(`[crossing-client] awaiting ${label} at ${path}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_CROSSING_SHARED required");
  mkdirSync(SHARED, { recursive: true });

  // Publish this leaf's pubkey so the daemon can admit exactly this key (the operator cannot admit a
  // stranger it cannot name; here the shared volume is that naming channel).
  const { identity, pub } = makeLeaf();
  writeFileSync(join(SHARED, "leaf-pub"), pub);
  console.log(`[crossing-client] leaf ${pub.slice(0, 12)}… published; awaiting the daemon's crossing coordinates`);

  const coords = JSON.parse(await waitForFile(join(SHARED, "crossing.json"), "crossing coordinates")) as {
    gatePubKey: string; docUrl: string; port: number;
  };
  const url = `ws://${HOST}:${String(coords.port)}/`;
  console.log(`[crossing-client] CROSSING → ${url}  gate=${coords.gatePubKey.slice(0, 12)}…`);

  const adapter = new LarWSClientAdapter({ url, identity, aud: AUD, gatePubKey: coords.gatePubKey });
  const repo = new Repo({ network: [adapter], sharePolicy: async () => true });

  // Cross the gate, find the daemon's doc, await the seeded greeting — the crossing proof.
  const found = await repo.find<{ tiddlers: Record<string, { text: string }> }>(coords.docUrl as AutomergeUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout: never synced the daemon's doc (denied or broken crossing)")), 20_000);
    const check = () => {
      if (found.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/@crossroads/greeting"]) { clearTimeout(timer); resolve(); }
    };
    found.on("change", check);
    check();
  });

  const got = found.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/@crossroads/greeting"]?.text;
  if (got !== GREET) { console.log(`[crossing-client] ✗ synced but content mismatch: "${String(got)}" ≠ "${GREET}"`); process.exit(1); }
  console.log(`[crossing-client] ✓ crossed the gate and read the mesh: "${String(got)}"`);

  // Write back — prove the breath runs both ways.
  found.change((d) => { d.tiddlers["lar:///ha.ka.ba/bags/@personal/reply"] = { text: "a citizen answers" }; });
  console.log(`[crossing-client] wrote back @personal/reply; the daemon should witness it`);
  await sleep(2000);   // let the write-back flush over the socket

  console.log(`[crossing-client] ✓ CROSSING COMPLETE — a browser-shaped leaf breathes with the node`);
  process.exit(0);
}

main().catch((e) => { console.error("[crossing-client] ✗ FATAL:", e); process.exit(1); });
