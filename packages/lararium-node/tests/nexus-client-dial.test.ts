/**
 * nexus-client-dial.test — B1: the PRODUCTION client dial-out leg, headless, in ONE process.
 *
 * live-wire-node-crossing.test (S1) proved a node dialing another via an INLINE `new LarWSClientAdapter`
 * passed at Repo construction. THIS proves the PRODUCTION helper `startNexusClientDial` — the one the live
 * vessel mounts onto its ALREADY-RUNNING Repo — carries the same crossing: a full node stands its server +
 * gate, THEN mounts the dial onto its live repo (exactly the vessel flow), and syncs a peer's doc both ways.
 *
 * It proves:
 *   (1) the dial mounts onto a live Repo → a doc authored on peer B reaches the DIALING node A (B → A);
 *   (2) a change authored on A flows back to B (A → B) — the breath both ways over ONE crossed socket;
 *   (3) INERT: `maybeStartNexusClientDial` with no sync URL (or a sync URL but no gate key) returns null and
 *       adds NO adapter to the repo — the unconfigured boot opens zero client socket, zero behaviour change;
 *   (4) `stop()` disconnects the mounted adapter cleanly (no leaked socket).
 *
 * Every crypto piece stays REAL: real DaemonAuthGate, real V3 Ed25519 proof-of-possession bound to the
 * DIALED gate, real Automerge CRDT sync. Two sockets stay two — this rides the Automerge `/ws` (Socket A).
 *
 * Gate: lar:///ha.ka.ba/lararium/node/nexus-client-dial
 */

import { describe, test, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { verifyAuthProof, ed25519SignerFromSeed } from "@lararium/mesh";
import type { AuthVerifierShore, LeafIdentity } from "@lararium/mesh";
import { Repo } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { DaemonAuthGate } from "../src/daemon-auth-gate.js";
import { startNexusClientDial, maybeStartNexusClientDial } from "../src/nexus-client-dial.js";

const AUD = "lar:///ha.ka.ba/bags/daemon";
const GREETING_KEY = "lar:///ha.ka.ba/bags/crossroads/greeting";
const REPLY_KEY    = "lar:///ha.ka.ba/bags/personal/reply";
type GreetDoc = { tiddlers: Record<string, { text: string }> };

/** An Ed25519 keypair — raw 32-byte seed + verifying-key hex (the node-vessel-identity pattern). */
function genKey(): { seed: Uint8Array; pub: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
  const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
  return { seed, pub };
}

/** A node's leaf identity — a real Ed25519 signer + a ContactCard carrying its own verifying key. */
function makeNodeIdentity(): { identity: LeafIdentity; seed: Uint8Array; pub: string } {
  const { seed, pub } = genKey();
  return { seed, pub, identity: { contactCard: JSON.stringify({ peerPubKey: pub }), peerPubKey: pub, sign: ed25519SignerFromSeed(seed) } };
}

/** The real shore a vessel's gate arms with: real V3 proof check, then the admitted-set capability decision. */
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

/** Mirrors production's ListeningWSServerAdapter — ready from listen, not from the first client. */
class ReadyWSServerAdapter extends NodeWSServerAdapter {
  override isReady(): boolean { return true; }
  override whenReady(): Promise<void> { return Promise.resolve(); }
}

interface Vessel {
  gate: DaemonAuthGate;
  repo: Repo;
  port: number;
  close: () => Promise<void>;
}

/** Stand a SERVER-ONLY node vessel: its own http+wss behind a real DaemonAuthGate, NodeFS storage, a
 *  gate-ring sharePolicy. NO client — the dial mounts SEPARATELY via the production helper (the vessel flow). */
function standServerVessel(opts: { storageDir: string; gatePubKey: string; admitted: ReadonlySet<string> }): Promise<Vessel> {
  return new Promise((resolve, reject) => {
    const http: Server = createServer();
    const wss  = new WebSocketServer({ server: http });
    const gate = new DaemonAuthGate(wss);
    const serverNetwork = new ReadyWSServerAdapter(gate as unknown as WebSocketServer);

    const peerIdentifierMap = new Map<string, string>();
    serverNetwork.on("peer-candidate", ({ peerId }: { peerId: string }) => {
      queueMicrotask(() => {
        const socket = (serverNetwork.sockets as Record<string, unknown>)[peerId];
        if (!socket) return;
        const identHex = gate.getIdentifierForSocket(socket as Parameters<typeof gate.getIdentifierForSocket>[0]);
        if (identHex) peerIdentifierMap.set(peerId, identHex);
      });
    });

    const repo = new Repo({
      storage: new NodeFSStorageAdapter(opts.storageDir),
      network: [serverNetwork],
      // A WS peer (on the server socket) shares only once its socket carries an admitted identifier; a peer
      // reached over the OUTBOUND client leg is not in the server sockets → shared with freely (production asymmetry).
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
        gate, repo, port: addr.port,
        close: async () => {
          await repo.shutdown();
          await new Promise<void>((res) => wss.close(() => http.close(() => res())));
        },
      });
    });
  });
}

/** Resolve once the gate reports a crossed peer (the dial's socket is up), or reject after `ms`. Mounting
 *  the dial post-construction means the repo's `whenReady()` has already resolved on the server adapter, so
 *  a `find()` fired before the crossing completes races to "unavailable"; the operator's pull rides AFTER the
 *  socket is up — this waits for that, the faithful order. */
function awaitPeer(gate: DaemonAuthGate, ms: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const tick = (): void => {
      if (gate.clients.size >= 1) { resolve(); return; }
      if (Date.now() - started > ms) { reject(new Error("timeout: dial never crossed the gate")); return; }
      setTimeout(tick, 25);
    };
    tick();
  });
}

/** Resolve once `handle`'s doc carries `key`, or reject after `ms`. */
function awaitKey(handle: { doc: () => GreetDoc | undefined; on: (e: "change", cb: () => void) => void }, key: string, ms: number, label: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
    const check = (): void => { if (handle.doc()?.tiddlers?.[key]) { clearTimeout(timer); resolve(); } };
    handle.on("change", check);
    check();
  });
}

describe("B1 — the production client dial-out mounts onto a live Repo and crosses the gate", () => {
  const dirs: string[] = [];
  let vessels: Vessel[] = [];
  const dials: Array<{ stop: () => void }> = [];

  function mkStorageDir(): string { const d = mkdtempSync(join(tmpdir(), "lar-nexusdial-")); dirs.push(d); return d; }

  afterEach(async () => {
    for (const d of dials.splice(0)) { try { d.stop(); } catch { /* already down */ } }
    for (const v of vessels) { try { await v.close(); } catch { /* already down */ } }
    vessels = [];
    // Drain, then delete: repo.shutdown() flushes but does NOT cancel the StorageSource's armed asyncThrottle
    // (saveDebounceRate) trailing sync-state/incremental save; a rmSync ahead of that timer draws an ENOENT
    // unhandled rejection. Wait past the debounce (deadline ≤ arm+100ms < this 200ms) so the write lands live.
    await new Promise((r) => setTimeout(r, 200));
    for (const d of dirs.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
  });

  test("node A mounts the dial onto its LIVE repo, syncs B's doc, and a change flows back (both ways)", async () => {
    const a = makeNodeIdentity();
    const bGate = genKey().pub;
    const aGate = genKey().pub;

    // Vessel B — the DIALED node; its gate admits A's key.
    const nodeB = await standServerVessel({ storageDir: mkStorageDir(), gatePubKey: bGate, admitted: new Set([a.pub]) });
    vessels.push(nodeB);

    // Vessel A — a full server vessel, THEN the production dial mounts onto its already-running repo.
    const nodeA = await standServerVessel({ storageDir: mkStorageDir(), gatePubKey: aGate, admitted: new Set() });
    vessels.push(nodeA);

    const adaptersBefore = nodeA.repo.networkSubsystem.adapters.length;
    const dial = startNexusClientDial({
      repo: nodeA.repo, syncUrl: `ws://127.0.0.1:${nodeB.port}`, gatePubKey: bGate, identity: a.identity, aud: AUD,
    });
    dials.push(dial);
    // The mount added exactly one adapter (Socket A) to the live repo.
    expect(nodeA.repo.networkSubsystem.adapters.length).toBe(adaptersBefore + 1);

    // B authors a doc — its AutomergeUrl is the capability token A resolves across the crossed socket.
    const docB = nodeB.repo.create<GreetDoc>({ tiddlers: {} });
    docB.change((d) => { d.tiddlers[GREETING_KEY] = { text: "the DreamNet breathes" }; });

    // Wait for the dial to CROSS the gate before pulling — the operator's find rides an up socket.
    await awaitPeer(nodeB.gate, 6_000);

    // B → A: the dialing node finds + syncs B's doc.
    const foundOnA = await nodeA.repo.find<GreetDoc>(docB.url);
    await awaitKey(foundOnA, GREETING_KEY, 5_000, "node A never synced node B's doc");
    expect(foundOnA.doc()?.tiddlers?.[GREETING_KEY]?.text).toBe("the DreamNet breathes");

    // A → B: A writes; B observes over the same crossed socket (the breath both ways).
    foundOnA.change((d) => { d.tiddlers[REPLY_KEY] = { text: "node A answers" }; });
    await awaitKey(docB, REPLY_KEY, 5_000, "node B never saw node A's change");
    expect(docB.doc()?.tiddlers?.[REPLY_KEY]?.text).toBe("node A answers");

    expect(nodeB.gate.clients.size).toBe(1);       // the dialing node crossed the gate as a real peer
    expect(dial.adapter.anergized).toBeNull();     // admitted → never anergized

    // stop() disconnects cleanly — no leaked socket past teardown.
    dial.stop();
  }, 12_000);

  test("INERT: no sync URL → maybeStart returns null and adds NO adapter (the unconfigured boot is untouched)", async () => {
    const a = makeNodeIdentity();
    const node = await standServerVessel({ storageDir: mkStorageDir(), gatePubKey: genKey().pub, admitted: new Set() });
    vessels.push(node);

    const before = node.repo.networkSubsystem.adapters.length;
    // The default path: no join config rides the boot.
    const dial = maybeStartNexusClientDial({ repo: node.repo, identity: a.identity, syncUrl: null, gatePubKey: null });
    expect(dial).toBeNull();
    expect(node.repo.networkSubsystem.adapters.length).toBe(before);   // zero socket, zero change

    // Fail-closed: a sync URL WITHOUT a gate key cannot bind the anti-relay proof → still inert (no gate-less dial).
    const dialNoGate = maybeStartNexusClientDial({ repo: node.repo, identity: a.identity, syncUrl: `ws://127.0.0.1:${node.port}`, gatePubKey: null });
    expect(dialNoGate).toBeNull();
    expect(node.repo.networkSubsystem.adapters.length).toBe(before);   // still no adapter mounted
  });

  test("CONFIGURED: a sync URL + a gate key → maybeStart mounts exactly one adapter (the bite of the inert gate)", async () => {
    // The matched positive control: flip the inputs the INERT test withholds, the outcome flips — proving the
    // null return hangs on the missing config, not on incidental failure. (Points at B's port; stop() before sync.)
    const a = makeNodeIdentity();
    const bGate = genKey().pub;
    const nodeB = await standServerVessel({ storageDir: mkStorageDir(), gatePubKey: bGate, admitted: new Set([a.pub]) });
    vessels.push(nodeB);
    const node = await standServerVessel({ storageDir: mkStorageDir(), gatePubKey: genKey().pub, admitted: new Set() });
    vessels.push(node);

    const before = node.repo.networkSubsystem.adapters.length;
    const dial = maybeStartNexusClientDial({ repo: node.repo, identity: a.identity, syncUrl: `ws://127.0.0.1:${nodeB.port}`, gatePubKey: bGate });
    expect(dial).not.toBeNull();
    expect(node.repo.networkSubsystem.adapters.length).toBe(before + 1);
    dial!.stop();
  });
});
