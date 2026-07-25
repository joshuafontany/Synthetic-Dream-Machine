/**
 * crossing-client — the BROWSER half of the containerized crossing, ROLE-DRIVEN so one probe proves
 * the whole gate contract across a real network hop. A browser-shaped leaf (a light Ed25519 identity +
 * LarWSClientAdapter, the shape lararium-browser dials with) attempts the crossing under a role; its
 * EXIT CODE is the verdict (0 = the gate did the right thing).
 *
 * Roles (LAR_CROSS_ROLE), each a civic-protocol invariant:
 *   admitted  (X1/X5) an admitted leaf CROSSES + syncs the doc both ways → the breath.
 *   anon      (X2/A1) a valid leaf with NO grant is DENIED, then founds its OWN island standalone —
 *                     denied ≠ broken; the anon floor persists (veil-ladder#the-base-model).
 *   impostor  (X3)    a leaf that CLAIMS an admitted key but SIGNS with a different seed is DENIED —
 *                     WHO is proven by possession, never claim (V3 proof-of-possession).
 *   wrong-bind(X4)    a leaf binding the WRONG audience is DENIED — a proof is bound to {gate, aud};
 *                     it must not cross a gate/aud it was not minted for (audience-binding).
 *
 * A DENIAL reads as "the crossing never syncs within the window" (the gate closes 4003); a CROSS reads
 * as the doc arriving. Each role asserts the outcome it must produce.
 *
 * Env: LAR_CROSSING_SHARED (req) · LAR_CROSSING_DAEMON_HOST (default crossing-daemon) ·
 *      LAR_CROSSING_GREET (default "the DreamNet breathes") · LAR_CROSS_ROLE (default admitted)
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder (#the-base-model) · browser-crossing
 */

import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Repo, type AutomergeUrl, type DocHandle } from "@automerge/automerge-repo";
import { LarWSClientAdapter, ed25519SignerFromSeed } from "@lararium/mesh";
import { KeyhiveProvider, InMemoryEventStore, foundCabalRealm } from "@lararium/keyhive";
import type { LeafIdentity } from "../src/leaf-identity.js";

const AUD = "lar:///ha.ka.ba/bags/@daemon";
const WRONG_AUD = "lar:///ha.ka.ba/bags/@personal";     // a proof bound here must not cross the @daemon gate
const GREETING_KEY = "lar:///ha.ka.ba/bags/@crossroads/greeting";
const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const SHARED = envOf("LAR_CROSSING_SHARED");
const HOST   = envOf("LAR_CROSSING_DAEMON_HOST", "crossing-daemon");
const GREET  = envOf("LAR_CROSSING_GREET", "the DreamNet breathes");
const ROLE   = envOf("LAR_CROSS_ROLE", "admitted");
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function genKey(): { seed: Uint8Array; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { seed, pub };
}

async function waitForFile(path: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(path)) return readFileSync(path, "utf8");
    if (i === 0) console.log(`[crossing-client] (${ROLE}) awaiting ${label}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

/** Attempt the crossing; resolve "synced" if the daemon's doc arrives within the window, else "denied"
 *  (the gate refused — a denied crossing never hands the socket to Automerge). */
type GreetDoc = { tiddlers: Record<string, { text: string }> };

async function attemptCrossing(identity: LeafIdentity, aud: string, gatePubKey: string, url: string, docUrl: string): Promise<{
  outcome: "synced" | "denied"; found: DocHandle<GreetDoc>; repo: Repo; adapter: LarWSClientAdapter;
}> {
  const adapter = new LarWSClientAdapter({ url, identity, aud, gatePubKey });
  const repo = new Repo({ network: [adapter], sharePolicy: async () => true });
  const found = await repo.find<GreetDoc>(docUrl as AutomergeUrl);
  const outcome = await Promise.race([
    new Promise<"synced">((resolve) => {
      const check = (): void => { if (found.doc()?.tiddlers?.[GREETING_KEY]) resolve("synced"); };
      found.on("change", check); check();
    }),
    new Promise<"denied">((resolve) => setTimeout(() => resolve("denied"), 8_000)),
  ]);
  return { outcome, found, repo, adapter };
}

/** The anon floor: a denied leaf MUST still stand as itself — found its own island, no group, no gate. */
async function foundStandaloneFloor(seed: Uint8Array): Promise<void> {
  const provider = new KeyhiveProvider();
  await provider.init({ seed, eventStore: new InMemoryEventStore() });
  const place = await foundCabalRealm(provider, "lar:///anon.floor.stands/denied-but-whole", "automerge:anon-floor-substrate");
  console.log(`[crossing-client] (anon) ✓ denied at the gate, yet WHOLE — founded own island place=${place.placeDocIdHex.slice(0, 12)}…`);
  await provider.dispose();
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_CROSSING_SHARED required");
  mkdirSync(SHARED, { recursive: true });

  // Every role publishes a real leaf pubkey (the daemon's from-file admit names it). The impostor
  // publishes/claims this key but will SIGN with a different one.
  const own = genKey();
  writeFileSync(join(SHARED, "leaf-pub"), own.pub);
  console.log(`[crossing-client] (${ROLE}) leaf ${own.pub.slice(0, 12)}… published`);

  const coords = JSON.parse(await waitForFile(join(SHARED, "crossing.json"), "crossing coordinates")) as {
    gatePubKey: string; docUrl: string; port: number;
  };
  const url = `ws://${HOST}:${String(coords.port)}/`;

  // Build the role's identity + binding: the impostor claims `own.pub` but signs with a foreign seed;
  // wrong-bind signs correctly but binds the wrong audience; the rest sign truly and bind @daemon.
  const signSeed = ROLE === "impostor" ? genKey().seed : own.seed;         // impostor forges the signature
  const aud      = ROLE === "wrong-bind" ? WRONG_AUD : AUD;                // wrong-bind mis-binds the audience
  const identity: LeafIdentity = {
    contactCard: JSON.stringify({ peerPubKey: own.pub }), peerPubKey: own.pub, sign: ed25519SignerFromSeed(signSeed),
  };
  console.log(`[crossing-client] (${ROLE}) CROSSING → ${url} (aud=${aud === AUD ? "@daemon" : "@personal(wrong)"})`);

  const { outcome, found, repo, adapter } = await attemptCrossing(identity, aud, coords.gatePubKey, url, coords.docUrl);

  if (ROLE === "admitted") {
    if (outcome !== "synced") { console.log(`[crossing-client] (admitted) ✗ expected to CROSS but was denied`); process.exit(1); }
    const got = found.doc()?.tiddlers?.[GREETING_KEY]?.text;
    if (got !== GREET) { console.log(`[crossing-client] (admitted) ✗ content mismatch: "${String(got)}"`); process.exit(1); }
    console.log(`[crossing-client] (admitted) ✓ crossed + read the mesh: "${String(got)}"`);
    found.change((d) => { d.tiddlers["lar:///ha.ka.ba/bags/@personal/reply"] = { text: "a citizen answers" }; });
    await sleep(2_000);
    console.log(`[crossing-client] (admitted) ✓ CROSSING COMPLETE — a browser-shaped leaf breathes with the node`);
    process.exit(0);
  }

  // Every non-admitted role MUST be denied. A crossing that syncs is a security failure.
  try { adapter.disconnect(); } catch { /* not connected */ }
  await repo.shutdown();
  if (outcome === "synced") {
    console.log(`[crossing-client] (${ROLE}) ✗ SECURITY FAILURE — the gate admitted a leaf it must refuse`);
    process.exit(1);
  }
  console.log(`[crossing-client] (${ROLE}) ✓ correctly DENIED at the gate`);
  if (ROLE === "anon") await foundStandaloneFloor(own.seed);   // denied ≠ broken — the floor persists
  console.log(`[crossing-client] (${ROLE}) ✓ CROSSING CONTRACT HELD`);
  process.exit(0);
}

main().catch((e) => { console.error(`[crossing-client] (${ROLE}) ✗ FATAL:`, e); process.exit(1); });
