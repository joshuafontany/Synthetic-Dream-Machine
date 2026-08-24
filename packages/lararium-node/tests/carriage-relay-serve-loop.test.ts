/**
 * carriage-relay-serve-loop.test.ts — LIVE-WIRE B2+B3: the carriage relay capability (Socket B) + the vessel-side
 * serve-loop carry a sealed cad body between two hearths over real sockets, and stand PROVABLY INERT when off.
 *
 * Two hearths, one carriage relay (all in-process, distinct dirs/seeds/ports):
 *   · a HOLDER hearth runs `startCarriageServeLoop` (the B3 close): it dials the carriage relay and auto-answers
 *     want-blocks on a poll interval — no hand-driven serve turn, the running loop carries the body,
 *   · a MEMBER hearth (its own authenticated channel) fetches the sealed cid: it carries the ciphertext, re-verifies
 *     BLAKE3(ciphertext)==cid SECRET-FREE, and reads the plaintext with the per-body read-cap (carry ⊥ read),
 *   · a STRANGER hearth draws BYTE-IDENTICAL Mu — the same bytes a member draws for a not-held cid (denial ≡ satiety),
 *   · REVERT-VERIFY: flip the ONE membership input and the member's read collapses to Mu — a pass hangs on the gate,
 *   · INERT: the vessel's `url ? startCarriageServeLoop(...) : null` gate opens EXACTLY one socket when configured
 *     and ZERO when not, and `stop()` clears the timer + closes the socket cleanly (no leak, safe before connect).
 *
 * The full two-OS-process crossing (reconnection after a drop, the WSL2 secure-context shore) stays outside this
 * headless proof — here every crypto piece is REAL (Ed25519 proof-of-possession, the cad seal, secret-free verify).
 *
 * Gate: lar:///ha.ka.ba/lararium/node/carriage-relay-serve-loop
 */
import { afterEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { WebSocketServer, type WebSocket } from "ws";
import {
  DeterministicFederationGate, openBodyOnCas, verifyCiphertextCid, utf8Bytes, hex,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";
import { standNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import {
  CAS_WANT_BLOCK, CAS_BLOCK, CAS_MU, muWireBytes, type CasWireServerDeps,
} from "../src/cas-wire.js";
import { AuthenticatedWSMembershipChannel } from "../src/authenticated-membership-relay.js";
import { startCarriageRelay, type CarriageRelay } from "../src/carriage-relay.js";
import { startCarriageServeLoop, type CarriageServeLoop } from "../src/carriage-serve-loop.js";
import { membershipOf, antigenOf, bytesFromPayload } from "./cas-test-setup.js";

const BODY = utf8Bytes("a family body one hearth seals and another carries over the live carriage");
const pubOf = (seed: Uint8Array): Promise<string> => ed.getPublicKeyAsync(seed).then(hex);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A requester hearth: offer a want-block to the holder, then poll for the running serve-loop's answer.
 *  Polls to a wall-clock DEADLINE, not a fixed iteration count — the serve-loop's answer reliably lands, but
 *  under a saturated box (many test workers at once) the WS round-trip + 25ms poll cadence can outrun a short
 *  budget. The 15s deadline sits inside every caller's 20s test timeout: await-the-condition, never a fixed nap. */
async function fetchOverCarriage(args: {
  channel: MembershipChannel; requester: string; holderAddr: string; cid: string; budgetMs?: number;
}): Promise<MembershipEnvelope | null> {
  await args.channel.offer({ kind: CAS_WANT_BLOCK, from: args.requester, to: args.holderAddr, payload: { cid: args.cid } });
  const deadline = Date.now() + (args.budgetMs ?? 15_000);
  while (Date.now() < deadline) {
    const responses = await args.channel.poll(args.requester);
    if (responses.length > 0) return responses[0]!;
    await sleep(25);
  }
  return null;
}

describe("carriage-relay-serve-loop — a sealed body crosses two hearths; a stranger draws Mu; off = inert", () => {
  let relay: CarriageRelay | null = null;
  const loops: CarriageServeLoop[] = [];
  const channels: AuthenticatedWSMembershipChannel[] = [];
  const dirs: string[] = [];

  const mkDir = (tag: string): string => { const d = mkdtempSync(join(tmpdir(), `lares-carriage-${tag}-`)); dirs.push(d); return d; };

  afterEach(async () => {
    for (const l of loops.splice(0)) { try { await l.stop(); } catch { /* down */ } }
    for (const c of channels.splice(0)) { try { c.close(); } catch { /* down */ } }
    if (relay) { try { await relay.close(); } catch { /* down */ } relay = null; }
    for (const d of dirs.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
  });

  /** Seal a body cad on a holder's cadDir + return the installed handle (cid / docId / per-body read-cap). */
  function sealBody(): { registry: ReturnType<typeof makeSealedPlaneRegistry>; cadDir: string; installed: ReturnType<typeof sealCarrierForFederation> } {
    const storageDir = mkDir("store");
    const idDir = mkDir("id");
    const registry = makeSealedPlaneRegistry();
    const keyring = standNexusKeyring({ sealEpoch: 0, dir: idDir });
    const cadDir = cadSealDir(storageDir);
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring });
    return { registry, cadDir, installed };
  }

  test("a MEMBER carries + reads a sealed body over the running serve-loop; a STRANGER draws byte-identical Mu", async () => {
    const holderSeed = new Uint8Array(32).fill(1);
    const memberSeed = new Uint8Array(32).fill(2);
    const strangerSeed = new Uint8Array(32).fill(3);
    const [holderKey, memberKey, strangerKey] = await Promise.all([pubOf(holderSeed), pubOf(memberSeed), pubOf(strangerSeed)]);

    const { registry, cadDir, installed } = sealBody();
    const deps: CasWireServerDeps = {
      cadDir, seal: registry.seal,
      membership: membershipOf([memberKey]),   // the ONE gate input this test also reverts, below
      antigen: antigenOf([]),
      fedGate: new DeterministicFederationGate(holderKey),
    };

    // The carriage relay capability: the authenticated transport + a DHT-free bag-tracker, one service.
    relay = await startCarriageRelay({ gateSeed: holderSeed });
    expect(relay.port).toBeGreaterThan(0);
    expect(relay.tracker.size).toBe(0);   // the composed hint index stands empty until a body announces
    const url = `ws://127.0.0.1:${relay.port}`;

    // The HOLDER hearth runs the serve-loop (B3): it dials + auto-answers want-blocks — no hand-driven serve turn.
    loops.push(startCarriageServeLoop({ relayUrl: url, vesselSeed: holderSeed, serverAddr: holderKey, deps, pollIntervalMs: 25 }));

    // Two requester hearths, each its OWN authenticated channel (its proven key stamps every offer).
    const memberCh = await AuthenticatedWSMembershipChannel.connect(url, memberSeed);
    const strangerCh = await AuthenticatedWSMembershipChannel.connect(url, strangerSeed);
    channels.push(memberCh, strangerCh);

    // ── MEMBER: carries the ciphertext, re-verifies BLAKE3==cid secret-free, reads with the per-body read-cap. ──
    const memberResp = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: installed.cid });
    expect(memberResp?.kind).toBe(CAS_BLOCK);
    const ciphertext = bytesFromPayload(memberResp!);
    expect(verifyCiphertextCid(ciphertext, installed.cid)).toBe(true);             // the requester re-verifies, secret-free
    expect([...ciphertext]).not.toEqual([...BODY]);                                // carried bytes are CIPHERTEXT (carry)
    expect([...openBodyOnCas(ciphertext, installed.readCap)]).toEqual([...BODY]);  // reads with the read-cap (read)

    // ── STRANGER: draws the void — byte-identical to satiety (a member asking for an unheld cid). ──
    const strangerResp = await fetchOverCarriage({ channel: strangerCh, requester: strangerKey, holderAddr: holderKey, cid: installed.cid });
    expect(strangerResp?.kind).toBe(CAS_MU);
    const strangerMu = bytesFromPayload(strangerResp!);
    const satietyResp = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: "blake3:" + "00".repeat(32) });
    expect(satietyResp?.kind).toBe(CAS_MU);
    expect([...strangerMu]).toEqual([...bytesFromPayload(satietyResp!)]);          // denial ≡ satiety (byte-identical)
    expect([...strangerMu]).toEqual([...muWireBytes()]);
  }, 20_000);

  test("REVERT-VERIFY the member gate: with membership FLIPPED (member removed), the SAME member draws Mu", async () => {
    const holderSeed = new Uint8Array(32).fill(4);
    const memberSeed = new Uint8Array(32).fill(5);
    const [holderKey, memberKey] = await Promise.all([pubOf(holderSeed), pubOf(memberSeed)]);
    const { registry, cadDir, installed } = sealBody();

    // The BYPASSED gate: membership = [] — the member is no longer in the member set (the flip the revert-verify wants).
    const bypassedDeps: CasWireServerDeps = {
      cadDir, seal: registry.seal,
      membership: membershipOf([]),   // FLIPPED — no members; a passing member-read here would prove nothing
      antigen: antigenOf([]),
      fedGate: new DeterministicFederationGate(holderKey),
    };
    relay = await startCarriageRelay({ gateSeed: holderSeed });
    const url = `ws://127.0.0.1:${relay.port}`;
    loops.push(startCarriageServeLoop({ relayUrl: url, vesselSeed: holderSeed, serverAddr: holderKey, deps: bypassedDeps, pollIntervalMs: 25 }));
    const memberCh = await AuthenticatedWSMembershipChannel.connect(url, memberSeed);
    channels.push(memberCh);

    // With the gate bypassed the member draws Mu — so the FIRST test's member-read hangs on the membership gate, not transport.
    const resp = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: installed.cid });
    expect(resp?.kind).toBe(CAS_MU);
    expect([...bytesFromPayload(resp!)]).toEqual([...muWireBytes()]);
  }, 20_000);

  test("INERT: the vessel gate opens ZERO carriage sockets when unconfigured, ONE when configured (the dial count)", async () => {
    // A raw counting server counts DIALS — a stood carriage socket, the inert-measure the boot's gate governs.
    let connections = 0;
    const sockets: WebSocket[] = [];
    const counter = new WebSocketServer({ port: 0 });
    counter.on("connection", (s: WebSocket) => { connections += 1; sockets.push(s); });
    await new Promise<void>((r) => counter.on("listening", () => r()));
    const addr = counter.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const url = `ws://127.0.0.1:${port}`;
    const seed = new Uint8Array(32).fill(6);
    const deps: CasWireServerDeps = {
      cadDir: mkDir("inert"), seal: makeSealedPlaneRegistry().seal,
      membership: membershipOf([]), antigen: antigenOf([]), fedGate: new DeterministicFederationGate("00".repeat(8)),
    };

    try {
      // UNCONFIGURED (no URL): the vessel gate `url ? start : null` stands NO loop — the exact ternary the boot uses.
      const unconfiguredUrl: string | null = null;
      const inertLoop: CarriageServeLoop | null = unconfiguredUrl
        ? startCarriageServeLoop({ relayUrl: unconfiguredUrl, vesselSeed: seed, serverAddr: "x", deps })
        : null;
      expect(inertLoop).toBeNull();
      await sleep(200);
      expect(connections).toBe(0);   // provably inert — zero carriage socket opened

      // CONFIGURED: the SAME gate with a URL stands the loop → exactly one dial lands.
      const liveLoop: CarriageServeLoop | null = url
        ? startCarriageServeLoop({ relayUrl: url, vesselSeed: seed, serverAddr: "x", deps, pollIntervalMs: 25 })
        : null;
      expect(liveLoop).not.toBeNull();
      for (let i = 0; i < 40 && connections === 0; i++) await sleep(25);
      expect(connections).toBe(1);

      // stop() resolves cleanly even against a half-open relay that never completes the handshake (no hang, no throw).
      await liveLoop!.stop();
      const early = startCarriageServeLoop({ relayUrl: url, vesselSeed: seed, serverAddr: "x", deps });
      await early.stop();
    } finally {
      for (const s of sockets) { try { s.close(); } catch { /* down */ } }
      await new Promise<void>((r) => counter.close(() => r()));
    }
  }, 20_000);

  test("CLEAN TEARDOWN: stop() halts serving over a live relay — a want-block after stop draws no answer", async () => {
    const holderSeed = new Uint8Array(32).fill(7);
    const memberSeed = new Uint8Array(32).fill(8);
    const [holderKey, memberKey] = await Promise.all([pubOf(holderSeed), pubOf(memberSeed)]);
    const { registry, cadDir, installed } = sealBody();
    const deps: CasWireServerDeps = {
      cadDir, seal: registry.seal,
      membership: membershipOf([memberKey]), antigen: antigenOf([]),
      fedGate: new DeterministicFederationGate(holderKey),
    };
    relay = await startCarriageRelay({ gateSeed: holderSeed });
    const url = `ws://127.0.0.1:${relay.port}`;
    const loop = startCarriageServeLoop({ relayUrl: url, vesselSeed: holderSeed, serverAddr: holderKey, deps, pollIntervalMs: 25 });
    const memberCh = await AuthenticatedWSMembershipChannel.connect(url, memberSeed);
    channels.push(memberCh);

    // The loop is UP: a member's want-block draws the carried body.
    const up = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: installed.cid });
    expect(up?.kind).toBe(CAS_BLOCK);

    // stop() clears the timer + closes the channel — the holder no longer serves, so a fresh want-block draws NOTHING.
    await loop.stop();
    // A negative-absence check: a short budget suffices to confirm the down loop stays silent (no answer ever comes).
    const afterStop = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: installed.cid, budgetMs: 2_000 });
    expect(afterStop).toBeNull();   // no timer polls, no socket carries — the serve-loop is truly down (no leak)
  }, 20_000);
});
