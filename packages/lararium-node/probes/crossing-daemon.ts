/**
 * crossing-daemon — the NODE half of the containerized browser↔node crossing (the civic-protocol
 * transport+auth+sync gate, across a real container boundary). This is the production open-node-vessel
 * crossing surface, standing alone: a WS server behind a real DaemonAuthGate (real Ed25519 V3 proof +
 * a capability barrier), an Automerge Repo whose gate-ring sharePolicy shares a doc ONLY with an
 * admitted WS peer, and a seeded doc the crossed client reads.
 *
 * The in-process browser-crossing.test proves this logic; this proves it holds over a real socket
 * between containers — the pre-browser gate. The capability is an admitted-key set (the faithful
 * stand-in for the keyhive worker's grant check); the crypto (Ed25519 proof-of-possession) is REAL.
 *
 * Handshake (shared volume, the roster.json pattern): the client writes its leaf pubkey to
 * `<shared>/leaf-pub`; the daemon admits it, arms the gate, seeds a doc, then publishes
 * `<shared>/crossing.json` = {gatePubKey, docUrl}. The client reads that, crosses, and syncs.
 *
 * Env:
 *   LAR_CROSSING_PORT    ws listen port         (default 8080)
 *   LAR_CROSSING_SHARED  shared dir/volume      (required — the file handshake)
 *   LAR_CROSSING_GREET   the doc's seeded text   (default "the DreamNet breathes")
 *   LAR_CROSSING_ADMIT   who the gate admits     (default from-file):
 *                          from-file → admit the leaf pubkey the client publishes (X1 happy path)
 *                          none      → admit NOBODY (X2 anon-denial — the gate turns the leaf away)
 *                          <hex,…>   → admit exactly these keys
 *
 * Meme: lar:///ha.ka.ba/lararium/node/browser-crossing
 */

import { createServer, type Server } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { Repo } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { verifyAuthProof } from "@lararium/mesh";
import type { AuthVerifierShore } from "@lararium/mesh";
import { DaemonAuthGate } from "../src/daemon-auth-gate.js";

const AUD = "lar:///ha.ka.ba/bags/daemon";
const envOf = (k: string, d = ""): string => process.env[k] ?? d;
const PORT   = Number.parseInt(envOf("LAR_CROSSING_PORT", "8080"), 10);
const SHARED = envOf("LAR_CROSSING_SHARED");
const GREET  = envOf("LAR_CROSSING_GREET", "the DreamNet breathes");
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Node's WS server adapter, ready from listen (mirrors production ListeningWSServerAdapter). */
class ReadyWSServerAdapter extends NodeWSServerAdapter {
  override isReady(): boolean { return true; }
  override whenReady(): Promise<void> { return Promise.resolve(); }
}

/** The real shore: run the REAL V3 Ed25519 proof check, then the CAPABILITY decision — a leaf crosses
 *  only if its key sits in the admitted set (the daemon grant). A valid proof proves WHO, never
 *  WHETHER-GRANTED; the un-admitted anon leaf is turned away here. */
function makeCapabilityShore(gatePubKey: string, admitted: ReadonlySet<string>): AuthVerifierShore {
  return {
    async verify(cardBytes, bagUrl, _access, proof) {
      if (!proof) return { ok: false, reason: "V3 proof required" };
      const card = JSON.parse(new TextDecoder().decode(cardBytes)) as { peerPubKey?: string };
      const peerPubKey = card.peerPubKey;
      if (!peerPubKey) return { ok: false, reason: "no peer key in card" };
      const v = await verifyAuthProof({ nonce: proof.nonce, gatePubKey, peerPubKey, aud: bagUrl, ts: proof.ts, sig: proof.sig });
      if (!v.ok) return { ok: false, reason: v.reason ?? "proof failed" };
      if (!admitted.has(peerPubKey)) return { ok: false, reason: "insufficient capability (not admitted to the daemon bag)" };
      return { ok: true, identifier: peerPubKey };
    },
  };
}

async function waitForFile(path: string, label: string): Promise<string> {
  for (let i = 0; i < 240; i++) {
    if (existsSync(path)) return readFileSync(path, "utf8");
    if (i === 0) console.log(`[crossing-daemon] awaiting ${label} at ${path}…`);
    await sleep(500);
  }
  throw new Error(`timeout awaiting ${label}`);
}

async function main(): Promise<void> {
  if (!SHARED) throw new Error("LAR_CROSSING_SHARED required");
  mkdirSync(SHARED, { recursive: true });

  // The client publishes its leaf pubkey first (always — it syncs the handshake); WHO the gate admits
  // rides the admit policy, so a denial scenario can turn that very leaf away.
  const publishedPub = (await waitForFile(join(SHARED, "leaf-pub"), "client leaf pubkey")).trim();
  const ADMIT = envOf("LAR_CROSSING_ADMIT", "from-file");
  const admitted = ADMIT === "from-file" ? new Set([publishedPub])
                 : ADMIT === "none"      ? new Set<string>()
                 : new Set(ADMIT.split(",").map((s) => s.trim()).filter(Boolean));
  console.log(`[crossing-daemon] admit policy=${ADMIT} → gate admits ${String(admitted.size)} key(s)`);

  // Generate the gate key (published to the client, bound into its proof — a data binding, not a signer).
  const { publicKey } = generateKeyPairSync("ed25519");
  const gatePubKey = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");

  const http: Server = createServer();
  const wss  = new WebSocketServer({ server: http });
  const gate = new DaemonAuthGate(wss);
  const network = new ReadyWSServerAdapter(gate as unknown as WebSocketServer);
  const peerIdentifierMap = new Map<string, string>();
  network.on("peer-candidate", ({ peerId }: { peerId: string }) => {
    queueMicrotask(() => {
      const socket = (network.sockets as Record<string, unknown>)[peerId];
      if (!socket) return;
      const identHex = gate.getIdentifierForSocket(socket as Parameters<typeof gate.getIdentifierForSocket>[0]);
      if (identHex) peerIdentifierMap.set(peerId, identHex);
    });
  });
  const repo = new Repo({
    network: [network],
    sharePolicy: async (peerId) => {
      const wsSocket = (network.sockets as Record<string, unknown> | undefined)?.[peerId];
      return wsSocket ? peerIdentifierMap.has(peerId) : true;   // the gate ring
    },
  });

  gate.arm(makeCapabilityShore(gatePubKey, admitted), AUD, gatePubKey);

  const doc = repo.create<{ tiddlers: Record<string, { text: string }> }>({ tiddlers: {} });
  doc.change((d) => { d.tiddlers["lar:///ha.ka.ba/bags/crossroads/greeting"] = { text: GREET }; });

  await new Promise<void>((resolve, reject) => {
    http.listen(PORT, "0.0.0.0", () => resolve());
    http.on("error", reject);
  });

  // Publish the crossing coordinates the client dials with (gate key + doc url).
  writeFileSync(join(SHARED, "crossing.json"), JSON.stringify({ gatePubKey, docUrl: doc.url, port: PORT }));
  console.log(`[crossing-daemon] armed ws://0.0.0.0:${String(PORT)}/  gate=${gatePubKey.slice(0, 12)}…  doc=${doc.url.slice(0, 24)}…`);
  console.log(`[crossing-daemon] serving — awaiting the admitted leaf's crossing`);

  // Stay alive; watch for the client's write-back to witness the bidirectional breath.
  doc.on("change", () => {
    if (doc.doc()?.tiddlers?.["lar:///ha.ka.ba/bags/personal/reply"]) {
      console.log(`[crossing-daemon] ✓ observed the browser leaf's write-back — the breath runs both ways`);
      writeFileSync(join(SHARED, "daemon-saw-reply"), "ok");
    }
  });
  // Keep the process alive.
  await new Promise<void>(() => { /* serve until the container stops */ });
}

main().catch((e) => { console.error("[crossing-daemon] FATAL:", e); process.exit(1); });
