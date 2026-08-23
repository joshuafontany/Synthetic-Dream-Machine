/**
 * live-wire-node-crossing.test.ts — LIVE-WIRE S1: two NODE vessels replicate a doc over the real
 * authenticated gate, one dialing the other, headless, in ONE process.
 *
 * browser-crossing.test proves a browser-SHAPED client leaf crosses a node's gate. This proves the
 * NODE-CLIENT leg: a full node vessel — its OWN DaemonAuthGate on its OWN port, NodeFS storage on its
 * OWN dir — mounts a LarWSClientAdapter carrying its OWN Ed25519 identity and dials ANOTHER node's /ws.
 * That models a real node joining a peer node (the transport foundation `lares nexus join` builds on),
 * not a browser leaf. Every crypto piece stays REAL: real DaemonAuthGate, real V3 Ed25519
 * proof-of-possession, real Automerge CRDT sync. The capability barrier reads an admitted-key set — the
 * faithful stand-in for the keyhive worker's grant check the in-process + container crossings also use.
 *
 * It proves:
 *   (1) a doc authored on vessel B reaches the DIALING node A (B → A);
 *   (2) a change authored on A flows back to B (A → B) — the breath both ways over ONE crossed socket;
 *   (3) an UN-admitted node's client ANERGIZES and never becomes a peer (no sync), while the SAME node,
 *       once B admits its key, DOES sync — so the admit check bites by construction (the deny is
 *       load-bearing, not an incidental transport failure).
 *
 * Gate: lar:///ha.ka.ba/lararium/node/live-wire-node-crossing
 */

import { describe, test, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { verifyAuthProof, ed25519SignerFromSeed, LarWSClientAdapter } from "@lararium/mesh";
import type { AuthVerifierShore } from "@lararium/mesh";
import { Repo, type PeerId } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { DaemonAuthGate } from "../src/daemon-auth-gate.js";
import type { LeafIdentity } from "../src/leaf-identity.js";

const AUD = "lar:///ha.ka.ba/bags/daemon";
const GREETING_KEY = "lar:///ha.ka.ba/bags/crossroads/greeting";
const REPLY_KEY    = "lar:///ha.ka.ba/bags/personal/reply";
type GreetDoc = { tiddlers: Record<string, { text: string }> };

/** An Ed25519 keypair (the node-vessel-identity pattern): raw 32-byte seed + verifying-key hex. */
function genKey(): { seed: Uint8Array; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { seed, pub };
}

/** A node's leaf identity — a real Ed25519 signer + a ContactCard carrying its own verifying key. The
 *  SAME light identity a headless node dials out with (leaf-identity.ts); no browser shape enters here. */
function makeNodeIdentity(): { identity: LeafIdentity; seed: Uint8Array; pub: string } {
  const { seed, pub } = genKey();
  return { seed, pub, identity: { contactCard: JSON.stringify({ peerPubKey: pub }), peerPubKey: pub, sign: ed25519SignerFromSeed(seed) } };
}

/**
 * The real shore a vessel's gate arms with: it runs the REAL V3 Ed25519 proof check, then the CAPABILITY
 * decision — a peer crosses only when its key sits in the admitted set (the daemon-bag grant). A valid
 * proof proves WHO, never WHETHER-GRANTED; an un-admitted node is turned away here.
 */
function makeCapabilityShore(gatePubKey: string, admitted: ReadonlySet<string>): AuthVerifierShore {
  return {
    async verify(cardBytes, bagUrl, _access, proof) {
      if (!proof) return { ok: false, reason: "V3 proof required" };
      const card = JSON.parse(new TextDecoder().decode(cardBytes)) as { peerPubKey?: string };
      const peerPubKey = card.peerPubKey;
      if (!peerPubKey) return { ok: false, reason: "no peer key in card" };
      const v = await verifyAuthProof({ nonce: proof.nonce, gatePubKey, peerPubKey, aud: bagUrl, ts: proof.ts, sig: proof.sig });
      if (!v.ok) return { ok: false, reason: v.reason ?? "proof failed" };
      if (!admitted.has(peerPubKey)) return { ok: false, reason: "insufficient capability (not admitted to @daemon)" };
      return { ok: true, identifier: peerPubKey };
    },
  };
}

/**
 * Node-side Automerge readiness override (mirrors the production ListeningWSServerAdapter): upstream's
 * NodeWSServerAdapter declares ready only on its FIRST client — un-pono for a local-first vessel whose
 * readiness reads from local state. The override keeps the vessel ready from listen, the shape
 * open-node-vessel wires in production.
 */
class ReadyWSServerAdapter extends NodeWSServerAdapter {
  override isReady(): boolean { return true; }
  override whenReady(): Promise<void> { return Promise.resolve(); }
}

interface VesselOpts {
  storageDir: string;
  gatePubKey: string;
  /** The keys THIS vessel's gate admits (the daemon-bag grant it enforces on INBOUND dials). */
  admitted:   ReadonlySet<string>;
  /** When present, the vessel ALSO mounts a client adapter and dials a peer node's gate — the node-client
   *  leg. Its `gatePubKey` binds the proof to the DIALED gate, never this vessel's own. */
  dialOut?: { url: string; identity: LeafIdentity; peerGatePubKey: string };
}

interface Vessel {
  gate: DaemonAuthGate;
  repo: Repo;
  port: number;
  /** The dial-out client adapter (present only when `dialOut` was given) — carries `.anergized`. */
  client: LarWSClientAdapter | null;
  close: () => Promise<void>;
}

/**
 * Stand a FULL node vessel: its own http+wss behind a real DaemonAuthGate on its own port, NodeFS storage
 * on its own dir, and a Repo whose gate-ring sharePolicy shares a doc ONLY with a WS peer whose socket
 * carries an admitted identifier. When `dialOut` is set, the vessel also mounts a LarWSClientAdapter and
 * dials the named peer node — so ONE vessel both SERVES its gate and DIALS another's, the real node shape.
 */
function standNodeVessel(opts: VesselOpts): Promise<Vessel> {
  return new Promise((resolve, reject) => {
    const http: Server = createServer();
    const wss  = new WebSocketServer({ server: http });
    const gate = new DaemonAuthGate(wss);
    const serverNetwork = new ReadyWSServerAdapter(gate as unknown as WebSocketServer);

    // The gate ring: a WS peer arriving on THIS vessel's own gate shares only once its socket carries an
    // admitted identifier. A peer reached over the OUTBOUND client leg is not in the server sockets, so the
    // policy shares with it freely — exactly the production asymmetry (a node serves gated, dials open).
    const peerIdentifierMap = new Map<string, string>();
    serverNetwork.on("peer-candidate", ({ peerId }: { peerId: string }) => {
      queueMicrotask(() => {
        const socket = (serverNetwork.sockets as Record<string, unknown>)[peerId];
        if (!socket) return;
        const identHex = gate.getIdentifierForSocket(socket as Parameters<typeof gate.getIdentifierForSocket>[0]);
        if (identHex) peerIdentifierMap.set(peerId, identHex);
      });
    });

    let client: LarWSClientAdapter | null = null;
    const network: (ReadyWSServerAdapter | LarWSClientAdapter)[] = [serverNetwork];
    if (opts.dialOut) {
      client = new LarWSClientAdapter({
        url: opts.dialOut.url, identity: opts.dialOut.identity, aud: AUD, gatePubKey: opts.dialOut.peerGatePubKey,
      });
      network.push(client);
    }

    const repo = new Repo({
      storage: new NodeFSStorageAdapter(opts.storageDir),
      network,
      sharePolicy: async (peerId) => {
        const wsSocket = (serverNetwork.sockets as Record<string, unknown> | undefined)?.[peerId];
        return wsSocket ? peerIdentifierMap.has(peerId) : true;
      },
    });

    gate.arm(makeCapabilityShore(opts.gatePubKey, opts.admitted), AUD, opts.gatePubKey);

    http.listen(0, "127.0.0.1", () => {
      const addr = http.address();
      if (!addr || typeof addr === "string") { reject(new Error("bad address")); return; }
      resolve({
        gate, repo, port: addr.port, client,
        close: async () => {
          try { client?.disconnect(); } catch { /* never connected */ }
          await repo.shutdown();
          await new Promise<void>((res) => wss.close(() => http.close(() => res())));
        },
      });
    });
  });
}

/** Resolve once `handle`'s doc carries `key`, or reject after `ms` (a denial reads as "never synced"). */
function awaitKey(handle: { doc: () => GreetDoc | undefined; on: (e: "change", cb: () => void) => void }, key: string, ms: number, label: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
    const check = (): void => { if (handle.doc()?.tiddlers?.[key]) { clearTimeout(timer); resolve(); } };
    handle.on("change", check);
    check();
  });
}

describe("LIVE-WIRE S1 — two NODE vessels, one dialing the other over the real authenticated gate", () => {
  const dirs: string[] = [];
  let vessels: Vessel[] = [];

  function mkStorageDir(): string { const d = mkdtempSync(join(tmpdir(), "lar-livewire-")); dirs.push(d); return d; }

  afterEach(async () => {
    for (const v of vessels) { try { await v.close(); } catch { /* already down */ } }
    vessels = [];
    // Drain, then delete: repo.shutdown() flushes but does NOT cancel the StorageSource's armed asyncThrottle
    // (saveDebounceRate) trailing sync-state/incremental save; a rmSync ahead of that timer draws an ENOENT
    // unhandled rejection. Wait past the debounce (deadline ≤ arm+100ms < this 200ms) so the write lands live.
    await new Promise((r) => setTimeout(r, 200));
    for (const d of dirs.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
  });

  test("node A dials node B; a doc authored on B replicates to A, AND a change on A flows back to B (both ways)", async () => {
    // Node A's identity is known before B stands, so B can admit it.
    const a = makeNodeIdentity();
    const bGate = genKey().pub;
    const aGate = genKey().pub;

    // Vessel B — the DIALED node. Its gate admits A's key.
    const nodeB = await standNodeVessel({ storageDir: mkStorageDir(), gatePubKey: bGate, admitted: new Set([a.pub]) });
    vessels.push(nodeB);

    // Vessel A — a FULL node (its own gate on its own port + storage) that ALSO dials B carrying A's identity.
    const nodeA = await standNodeVessel({
      storageDir: mkStorageDir(), gatePubKey: aGate, admitted: new Set(),
      dialOut: { url: `ws://127.0.0.1:${nodeB.port}`, identity: a.identity, peerGatePubKey: bGate },
    });
    vessels.push(nodeA);

    // B authors a doc — its AutomergeUrl is the capability token A resolves across the crossed socket.
    const docB = nodeB.repo.create<GreetDoc>({ tiddlers: {} });
    docB.change((d) => { d.tiddlers[GREETING_KEY] = { text: "the DreamNet breathes" }; });

    // B → A: the dialing node finds + syncs B's doc.
    const foundOnA = await nodeA.repo.find<GreetDoc>(docB.url);
    await awaitKey(foundOnA, GREETING_KEY, 5_000, "node A never synced node B's doc");
    expect(foundOnA.doc()?.tiddlers?.[GREETING_KEY]?.text).toBe("the DreamNet breathes");

    // A → B: A writes to the same handle; B observes it over the same crossed socket (the breath both ways).
    foundOnA.change((d) => { d.tiddlers[REPLY_KEY] = { text: "node A answers" }; });
    await awaitKey(docB, REPLY_KEY, 5_000, "node B never saw node A's change");
    expect(docB.doc()?.tiddlers?.[REPLY_KEY]?.text).toBe("node A answers");

    // The dialing node crossed the gate as a real peer.
    expect(nodeB.gate.clients.size).toBe(1);
  }, 12_000);

  // The deny and its positive control run as a MATCHED PAIR — identical wiring, the admitted set the only
  // difference. Together they prove the deny hangs on the admit check (the bite), not on incidental
  // transport failure: flip the one input, the outcome flips.

  test("an UN-admitted node's client is DENIED — it anergizes and never syncs (the barrier holds)", async () => {
    const c = makeNodeIdentity();
    const bGate = genKey().pub;
    // B admits NOBODY. C's proof verifies, yet it holds no @daemon grant.
    const nodeB = await standNodeVessel({ storageDir: mkStorageDir(), gatePubKey: bGate, admitted: new Set() });
    vessels.push(nodeB);

    const docB = nodeB.repo.create<GreetDoc>({ tiddlers: {} });
    docB.change((d) => { d.tiddlers[GREETING_KEY] = { text: "the DreamNet breathes" }; });

    const nodeC = await standNodeVessel({
      storageDir: mkStorageDir(), gatePubKey: genKey().pub, admitted: new Set(),
      dialOut: { url: `ws://127.0.0.1:${nodeB.port}`, identity: c.identity, peerGatePubKey: bGate },
    });
    vessels.push(nodeC);

    // A denied node holds no peer and no local copy, so find() never resolves the doc — bound it in a race
    // (the container crossing-client bounds it the same way) and assert the doc never crossed.
    const findOutcome = await Promise.race([
      nodeC.repo.find<GreetDoc>(docB.url).then(() => "found" as const, () => "unavailable" as const),
      new Promise<"pending">((r) => setTimeout(() => r("pending"), 1_500)),
    ]);
    expect(findOutcome).not.toBe("found");         // the denied node never synced B's doc
    expect(nodeB.gate.clients.size).toBe(0);       // never a peer — the real barrier held
    expect(nodeC.client?.anergized).toBeTruthy();  // the dialing node anergized on the refusal
  }, 12_000);

  test("the positive control (the bite): the SAME un-admitted setup, once B admits C's key, DOES sync", async () => {
    const c = makeNodeIdentity();
    const bGate = genKey().pub;
    // The ONLY change from the deny test: B admits C's key → the crossing must now breathe.
    const nodeB = await standNodeVessel({ storageDir: mkStorageDir(), gatePubKey: bGate, admitted: new Set([c.pub]) });
    vessels.push(nodeB);

    const docB = nodeB.repo.create<GreetDoc>({ tiddlers: {} });
    docB.change((d) => { d.tiddlers[GREETING_KEY] = { text: "the DreamNet breathes" }; });

    const nodeC = await standNodeVessel({
      storageDir: mkStorageDir(), gatePubKey: genKey().pub, admitted: new Set(),
      dialOut: { url: `ws://127.0.0.1:${nodeB.port}`, identity: c.identity, peerGatePubKey: bGate },
    });
    vessels.push(nodeC);

    const foundOnC = await nodeC.repo.find<GreetDoc>(docB.url);
    await awaitKey(foundOnC, GREETING_KEY, 5_000, "admitted node C never synced (positive control failed)");
    expect(foundOnC.doc()?.tiddlers?.[GREETING_KEY]?.text).toBe("the DreamNet breathes");
    expect(nodeC.client?.anergized).toBeNull();    // admitted → never anergized
  }, 12_000);
});
