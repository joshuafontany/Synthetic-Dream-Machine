/**
 * daemon-auth-gate.test.ts — Path L auth gate smoke tests.
 *
 * Tests the pre-Automerge lar:challenge / lar:auth / lar:auth-ok wire exchange
 * using a real WebSocket server, raw WebSocket client connections, and a stub
 * AuthVerifierSeam. No Automerge-repo, no TW5, no filesystem.
 *
 * Post Stage 1 the host holds no keyhive — the gate arms with an AuthVerifierSeam
 * that proxies to the admin island, which does receiveContactCard + verify
 * in-worker and returns the verdict plus the peer's Identifier hex.
 *
 * Gate: lar:///ha.ka.ba/@lararium/v0.1/node/daemon-auth-gate
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createServer }                               from "node:http";
import { WebSocketServer, WebSocket }                 from "ws";
import { DaemonAuthGate }                              from "../src/daemon-auth-gate.js";
import type { AuthVerifierSeam, AuthProofWire }       from "@lararium/mesh";
import {
  isLarChallengeMsg, isLarAuthOkMsg, isLarAuthDeniedMsg,
  mkLarAuth,
} from "@lararium/mesh";

// ── Stub AuthVerifierSeam ─────────────────────────────────────────────────────

type StubVerifyResult = { ok: true } | { ok: false; reason: string };

// Mirrors the admin island's verify-proxy: an `ok` verdict carries the peer's
// Identifier hex (receiveContactCard's id), which the gate keys its sharePolicy
// map on; a denial carries only the reason.
function makeStubSeam(opts: {
  receiveResult: { id: string };
  verifyResult:  StubVerifyResult;
}): AuthVerifierSeam {
  return {
    async verify() {
      return opts.verifyResult.ok
        ? { ok: true, identifier: opts.receiveResult.id }
        : { ok: false, reason: opts.verifyResult.reason };
    },
  };
}

// Capturing seam — records the proof + access the gate relays, so we can assert
// the V3 plumbing (gate forwards {nonce, sig, ts} to the keyholder worker).
function makeCapturingSeam(id = "0xaabbcc"): {
  seam: AuthVerifierSeam;
  calls: Array<{ bagUrl: string; access: string; proof?: AuthProofWire }>;
} {
  const calls: Array<{ bagUrl: string; access: string; proof?: AuthProofWire }> = [];
  return {
    calls,
    seam: {
      async verify(_cardBytes, bagUrl, access, proof) {
        calls.push({ bagUrl, access, ...(proof ? { proof } : {}) });
        return { ok: true, identifier: id };
      },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeServer(): Promise<{ wss: WebSocketServer; port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const http = createServer();
    const wss  = new WebSocketServer({ server: http });
    http.listen(0, "127.0.0.1", () => {
      const addr = http.address();
      if (!addr || typeof addr === "string") { reject(new Error("bad address")); return; }
      resolve({
        wss,
        port: addr.port,
        close: () => new Promise<void>((res) => {
          wss.close(() => http.close(() => res()));
        }),
      });
    });
  });
}

// BufferedSocket wraps a WebSocket and eagerly buffers every incoming message
// from the moment of connection. On loopback the server can send the challenge
// in the same TCP segment as the HTTP 101 upgrade, so a plain `ws.once("message")`
// registered after `await connect()` would miss it. The buffer drains on each
// `nextMessage()` call, preserving delivery order.
class BufferedSocket {
  readonly ws: WebSocket;
  private readonly _buf: unknown[] = [];
  private readonly _waiters: Array<(v: unknown) => void> = [];

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (data: Buffer | string) => {
      const msg = JSON.parse(data.toString());
      const waiter = this._waiters.shift();
      if (waiter) { waiter(msg); }
      else        { this._buf.push(msg); }
    });
  }

  nextMessage(): Promise<unknown> {
    if (this._buf.length > 0) return Promise.resolve(this._buf.shift()!);
    return new Promise((res) => this._waiters.push(res));
  }

  send(data: string): void { this.ws.send(data); }
  close(): void { this.ws.close(); }
  terminate(): void { (this.ws as unknown as { terminate(): void }).terminate(); }

  once(event: "close", handler: (code: number, reason: Buffer) => void): void {
    this.ws.once(event as "close", handler);
  }
}

function connect(port: number): Promise<BufferedSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const buf = new BufferedSocket(ws);
    ws.once("open",  () => resolve(buf));
    ws.once("error", reject);
  });
}

function nextMessage(s: BufferedSocket): Promise<unknown> {
  return s.nextMessage();
}

function nextClose(s: BufferedSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    s.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DaemonAuthGate — pre-sync auth exchange", () => {
  let serverInfo: Awaited<ReturnType<typeof makeServer>>;
  let gate: DaemonAuthGate;

  beforeEach(async () => {
    serverInfo = await makeServer();
    gate = new DaemonAuthGate(serverInfo.wss);
  });

  afterEach(async () => {
    await serverInfo.close();
  });

  test("disarmed gate rejects connection with 4503", async () => {
    const ws = await connect(serverInfo.port);
    // Gate is not armed — no challenge is sent; socket closes immediately with 4503.
    const { code } = await nextClose(ws);
    expect(code).toBe(4503);
  });

  test("armed gate sends lar:challenge on connect", async () => {
    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: true },
    }));

    const ws  = await connect(serverInfo.port);
    const msg = await nextMessage(ws);

    expect(isLarChallengeMsg(msg)).toBe(true);
    expect(typeof (msg as { nonce: string }).nonce).toBe("string");
    expect((msg as { nonce: string }).nonce).toHaveLength(64); // 32 bytes hex

    ws.close();
  });

  test("valid auth → lar:auth-ok; gate emits connection to adapter", async () => {
    const connectionSeen = new Promise<void>((resolve) => {
      gate.once("connection", () => resolve());
    });

    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: true },
    }));

    const ws      = await connect(serverInfo.port);
    const chal    = await nextMessage(ws) as { nonce: string };
    expect(isLarChallengeMsg(chal)).toBe(true);

    ws.send(JSON.stringify(mkLarAuth("valid-card-json", chal.nonce, "stub-sig")));
    const response = await nextMessage(ws);
    expect(isLarAuthOkMsg(response)).toBe(true);

    await connectionSeen;

    // socket is in clients set after auth
    expect(gate.clients.size).toBe(1);

    ws.close();
  });

  test("insufficient capability → lar:auth-denied + close(4003)", async () => {
    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: false, reason: "no admin grant" },
    }));

    const ws    = await connect(serverInfo.port);
    const chal  = await nextMessage(ws) as { nonce: string };

    ws.send(JSON.stringify(mkLarAuth("card", chal.nonce, "sig")));

    const denied = await nextMessage(ws);
    expect(isLarAuthDeniedMsg(denied)).toBe(true);
    expect((denied as { reason: string }).reason).toContain("no admin grant");

    const { code } = await nextClose(ws);
    expect(code).toBe(4003);
  });

  test("wrong nonce → lar:auth-denied + close(4003)", async () => {
    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: true },
    }));

    const ws = await connect(serverInfo.port);
    await nextMessage(ws); // consume challenge

    ws.send(JSON.stringify(mkLarAuth("card", "wrong-nonce", "sig")));

    const denied = await nextMessage(ws);
    expect(isLarAuthDeniedMsg(denied)).toBe(true);

    const { code } = await nextClose(ws);
    expect(code).toBe(4003);
  });

  test("sending non-auth message → lar:auth-denied + close(4003)", async () => {
    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: true },
    }));

    const ws = await connect(serverInfo.port);
    await nextMessage(ws); // consume challenge

    ws.send(JSON.stringify({ type: "join", senderId: "peer-x" })); // automerge message

    const denied = await nextMessage(ws);
    expect(isLarAuthDeniedMsg(denied)).toBe(true);

    const { code } = await nextClose(ws);
    expect(code).toBe(4003);
  });

  test("V3: armed with a gatePubKey, the challenge advertises it (gate-binding)", async () => {
    const { seam } = makeCapturingSeam();
    gate.arm(seam, "lar:///ha.ka.ba/@daemon", "deadbeef".repeat(8));

    const ws  = await connect(serverInfo.port);
    const msg = await nextMessage(ws) as { nonce: string; gatePubKey?: string };

    expect(isLarChallengeMsg(msg)).toBe(true);
    expect(msg.gatePubKey).toBe("deadbeef".repeat(8));

    ws.close();
  });

  test("V3: a lar:auth with sig+ts relays the proof {nonce, sig, ts} to the seam", async () => {
    const { seam, calls } = makeCapturingSeam();
    gate.arm(seam, "lar:///ha.ka.ba/@daemon", "00".repeat(32));

    const ws   = await connect(serverInfo.port);
    const chal = await nextMessage(ws) as { nonce: string };

    // mkLarAuth(card, nonce, sig) + an explicit ts → the gate should bundle a proof.
    ws.send(JSON.stringify({ ...mkLarAuth("card", chal.nonce, "ab".repeat(64)), ts: "2026-06-07T00:00:00.000Z" }));
    await nextMessage(ws); // auth-ok

    expect(calls).toHaveLength(1);
    expect(calls[0]!.proof).toEqual({ nonce: chal.nonce, sig: "ab".repeat(64), ts: "2026-06-07T00:00:00.000Z" });

    ws.close();
  });

  test("V3: a legacy lar:auth without ts relays NO proof (back-compat)", async () => {
    const { seam, calls } = makeCapturingSeam();
    gate.arm(seam); // no gatePubKey, legacy posture

    const ws   = await connect(serverInfo.port);
    const chal = await nextMessage(ws) as { nonce: string };

    ws.send(JSON.stringify(mkLarAuth("card", chal.nonce, "stub-sig"))); // no ts
    await nextMessage(ws); // auth-ok

    expect(calls).toHaveLength(1);
    expect(calls[0]!.proof).toBeUndefined();

    ws.close();
  });

  test("clients set decrements when authenticated connection closes", async () => {
    gate.arm(makeStubSeam({
      receiveResult: { id: "0xaabbcc" },
      verifyResult:  { ok: true },
    }));

    const ws   = await connect(serverInfo.port);
    const chal = await nextMessage(ws) as { nonce: string };
    ws.send(JSON.stringify(mkLarAuth("card", chal.nonce, "sig")));
    await nextMessage(ws); // auth-ok

    expect(gate.clients.size).toBe(1);

    // terminate() is a forced close that fires the server-side "close" event
    // synchronously without waiting for a graceful handshake.
    ws.terminate();
    await new Promise<void>((r) => setTimeout(r, 50));
    expect(gate.clients.size).toBe(0);
  });
});
