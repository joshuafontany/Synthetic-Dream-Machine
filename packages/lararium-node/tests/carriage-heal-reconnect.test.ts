/**
 * carriage-heal-reconnect.test.ts — the HEAL tooth: the carriage serve-loop RE-DIALS after a drop + RE-FOLDS the board.
 *
 * The serve-loop connected ONCE (memory B6): a relay that dropped mid-serve left a dead channel and a spinning
 * poll timer, no recovery. This proves the reconnecting dialer:
 *   1. kill the live socket mid-serve → the loop re-dials → a SECOND connection lands on the relay,
 *   2. the RE-connect fires `onReconnect` (the board re-fold) — NEVER fired on the first connect,
 *   3. `stop()` after a drop halts the re-dial → no connection outlives teardown (no leak, no infinite retry).
 *
 * A minimal handshake relay stands in for the real crossroads: it challenges, answers `auth-ok`, and exposes a
 * `killLive()` that closes the current socket (the drop the heal watches). The two-OS-process crossing + a Pi's
 * real partition stay outside this headless proof — here the reconnection machinery itself is exercised for real.
 *
 * Gate: lar:///ha.ka.ba/lararium/node/carriage-serve-loop#heal
 */
import { afterEach, describe, test, expect } from "vitest";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { webGetRandomValues, hex } from "@lararium/mesh";
import type { CasWireServerDeps } from "../src/cas-wire.js";
import { startCarriageServeLoop, type CarriageServeLoop } from "../src/carriage-serve-loop.js";
import { DeterministicFederationGate } from "@lararium/mesh";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const asText = (d: RawData): string => (typeof d === "string" ? d : d.toString());

/** A minimal handshake relay: challenge → (client auth) → auth-ok. Tracks connections + can kill the live socket. */
function startHandshakeRelay(): Promise<{
  port: number; connections: () => number; killLive: () => void; close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0 });
    let count = 0;
    let live: WebSocket | null = null;
    wss.on("connection", (sock: WebSocket) => {
      count += 1;
      live = sock;
      const nonce = hex(webGetRandomValues(new Uint8Array(32)));
      sock.send(JSON.stringify({ t: "challenge", nonce, gatePubKey: "00".repeat(32) }));
      sock.on("message", (data: RawData) => {
        let frame: { t?: string };
        try { frame = JSON.parse(asText(data)) as { t?: string }; } catch { return; }
        if (frame.t === "auth") sock.send(JSON.stringify({ t: "auth-ok" }));   // accept — the reconnection is under test, not the proof
      });
    });
    wss.on("listening", () => {
      const addr = wss.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        port,
        connections: () => count,
        killLive: () => { try { live?.close(); } catch { /* down */ } },
        close: () => new Promise<void>((r) => wss.close(() => r())),
      });
    });
  });
}

const inertDeps = (): CasWireServerDeps => ({
  cadDir: "/nonexistent-cad", seal: makeSealedPlaneRegistry().seal,
  membership: { isMemberPeer: () => false }, antigen: { kapaed: new Set(), presenterNym: (p) => p },
  fedGate: new DeterministicFederationGate("00".repeat(8)),
});

describe("carriage HEAL — the serve-loop re-dials after a drop and re-folds the board", () => {
  const loops: CarriageServeLoop[] = [];
  const relays: Awaited<ReturnType<typeof startHandshakeRelay>>[] = [];
  afterEach(async () => {
    for (const l of loops.splice(0)) { try { await l.stop(); } catch { /* down */ } }
    for (const r of relays.splice(0)) { try { await r.close(); } catch { /* down */ } }
  });

  test("kill the live socket mid-serve → the loop RE-DIALS and fires onReconnect (never on the first connect)", async () => {
    const relay = await startHandshakeRelay();
    relays.push(relay);
    const url = `ws://127.0.0.1:${relay.port}`;
    let reconnects = 0;

    const loop = startCarriageServeLoop({
      relayUrl: url, operatorSeed: new Uint8Array(32).fill(9), serverAddr: "holder",
      deps: inertDeps(), pollIntervalMs: 25, reconnectDelayMs: 100,
      onReconnect: () => { reconnects += 1; },   // the board re-fold — asserted below
    });
    loops.push(loop);

    // First connect lands — ONE connection, and onReconnect has NOT fired (a fresh read needs no re-fold).
    for (let i = 0; i < 60 && relay.connections() < 1; i++) await sleep(25);
    // Let the handshake fully reach auth-ok BEFORE the kill, so the drop is a LIVE-channel close (the onClose
    // HEAL path) — never a mid-handshake reject that the connect-retry would mask. This isolates the heal guard.
    await sleep(300);
    expect(relay.connections()).toBe(1);
    expect(reconnects).toBe(0);

    // Kill the now-LIVE socket mid-serve — the drop the heal (onClose) watches.
    relay.killLive();

    // The loop re-dials on its backoff → a SECOND connection lands AND onReconnect fires exactly once for it.
    for (let i = 0; i < 80 && relay.connections() < 2; i++) await sleep(25);
    expect(relay.connections()).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 40 && reconnects < 1; i++) await sleep(25);
    expect(reconnects).toBeGreaterThanOrEqual(1);   // the RE-connect re-folded the board
  }, 20_000);

  test("stop() after a drop halts the re-dial — no connection outlives teardown", async () => {
    const relay = await startHandshakeRelay();
    relays.push(relay);
    const url = `ws://127.0.0.1:${relay.port}`;
    const loop = startCarriageServeLoop({
      relayUrl: url, operatorSeed: new Uint8Array(32).fill(10), serverAddr: "holder",
      deps: inertDeps(), pollIntervalMs: 25, reconnectDelayMs: 100,
    });
    for (let i = 0; i < 60 && relay.connections() < 1; i++) await sleep(25);
    expect(relay.connections()).toBe(1);

    // Drop the socket, then stop BEFORE the backoff fires — the pending re-dial must be cancelled.
    relay.killLive();
    await loop.stop();
    const at = relay.connections();
    await sleep(400);   // longer than the 100ms backoff — a leaked re-dial would land here
    expect(relay.connections()).toBe(at);   // stayed put — stop() cancelled the re-dial (no leak, no infinite retry)
  }, 20_000);
});
