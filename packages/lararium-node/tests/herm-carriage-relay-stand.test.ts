/**
 * herm-carriage-relay-stand.test.ts — WAVE 1 of the full-pono Herm: a Herm STANDS the carriage crossroads
 * (Socket B) so a family's hearths dial IT to carry sealed @cad bodies between each other.
 *
 * This proves the boot's relay-STANDING shore (the server side), the complement to carriage-relay-serve-loop.test.ts
 * (which proves the vessel's serve-loop client side against a free-standing relay):
 *   · STANDS + CARRIES — the Herm-boot gate stands `startCarriageRelay` on its resolved gate seed; a HOLDER hearth
 *     serves over it and a MEMBER hearth dials the Herm's `ws://` URL, carries the ciphertext, re-verifies
 *     BLAKE3(ciphertext)==cid SECRET-FREE, and reads with the per-body read-cap (carry ⊥ read),
 *   · STRANGER draws Mu — a non-member dialing the SAME crossroads draws byte-identical Mu (denial ≡ satiety),
 *   · INERT — the EXACT boot gate (`relayPort !== null ? startCarriageRelay : null`) stands ZERO sockets when no
 *     relay port rides the config and ONE when it does (an un-configured Herm behaves as today),
 *   · STABLE IDENTITY — `resolveRelayGateSeed` (the shore the boot reads) yields the SAME gate key across restarts
 *     from the Herm's own identity seed, a DIFFERENT one from a pinned seed hex, and NEVER a fresh random,
 *   · CLEAN TEARDOWN — `close()` stops the crossroads: a dial after close cannot connect (no leaked WS server).
 *
 * The full openNodeHerm boot (genesis + identity + read-face) stays outside this headless proof — here the boot's
 * relay-standing gate + seed-resolution run VERBATIM (`resolveRelayGateSeed` + the `startCarriageRelay` ternary),
 * and every crypto piece is REAL (Ed25519 proof-of-possession, the @cad seal, secret-free verify). What only a Pi /
 * two-OS-process crossing proves: a stable bound port surviving a real process restart, the LAN secure-context shore.
 *
 * Gate: lar:///ha.ka.ba/lararium/node/herm-carriage-relay-stand
 */
import { afterEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { WebSocket } from "ws";
import {
  DeterministicFederationGate, openBodyOnCas, verifyCiphertextCid, utf8Bytes, hex,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";
import { standNexusKeyring } from "../src/nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "../src/seal-carrier-federation.js";
import { makeSealedPlaneRegistry } from "../src/plane-seal.js";
import { CAS_WANT_BLOCK, CAS_BLOCK, CAS_MU, muWireBytes, type CasWireServerDeps } from "../src/cas-wire.js";
import { AuthenticatedWSMembershipChannel } from "../src/authenticated-membership-relay.js";
import { startCarriageRelay, resolveRelayGateSeed, type CarriageRelay } from "../src/carriage-relay.js";
import { startCarriageServeLoop, type CarriageServeLoop } from "../src/carriage-serve-loop.js";
import { membershipOf, antigenOf, bytesFromPayload } from "./cas-test-setup.js";

const BODY = utf8Bytes("a family body one hearth seals and another carries over the Herm's crossroads");
const pubOf = (seed: Uint8Array): Promise<string> => ed.getPublicKeyAsync(seed).then(hex);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function fetchOverCarriage(args: {
  channel: MembershipChannel; requester: string; holderAddr: string; cid: string;
}): Promise<MembershipEnvelope | null> {
  await args.channel.offer({ kind: CAS_WANT_BLOCK, from: args.requester, to: args.holderAddr, payload: { cid: args.cid } });
  for (let i = 0; i < 60; i++) {
    const responses = await args.channel.poll(args.requester);
    if (responses.length > 0) return responses[0]!;
    await sleep(25);
  }
  return null;
}

/** The EXACT boot gate: a relay stands ONLY when a port rides the config, on the resolved (stable) gate seed. */
function bootRelayGate(cfg: {
  vesselSeed: Uint8Array; relayPort: number | null; gateSeedHex?: string;
}): Promise<CarriageRelay | null> {
  const seed = resolveRelayGateSeed(cfg.vesselSeed, cfg.gateSeedHex);
  return cfg.relayPort !== null && !Number.isNaN(cfg.relayPort)
    ? startCarriageRelay({ gateSeed: seed, port: cfg.relayPort })
    : Promise.resolve(null);
}

describe("herm-carriage-relay-stand — a Herm stands the crossroads; a member carries, a stranger draws Mu; off = inert", () => {
  let relay: CarriageRelay | null = null;
  const loops: CarriageServeLoop[] = [];
  const channels: AuthenticatedWSMembershipChannel[] = [];
  const dirs: string[] = [];

  const mkDir = (tag: string): string => { const d = mkdtempSync(join(tmpdir(), `lares-herm-${tag}-`)); dirs.push(d); return d; };

  afterEach(async () => {
    for (const l of loops.splice(0)) { try { await l.stop(); } catch { /* down */ } }
    for (const c of channels.splice(0)) { try { c.close(); } catch { /* down */ } }
    if (relay) { try { await relay.close(); } catch { /* down */ } relay = null; }
    for (const d of dirs.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
  });

  function sealBody(): { cadDir: string; installed: ReturnType<typeof sealCarrierForFederation>; registry: ReturnType<typeof makeSealedPlaneRegistry> } {
    const storageDir = mkDir("store");
    const idDir = mkDir("id");
    const registry = makeSealedPlaneRegistry();
    const keyring = standNexusKeyring({ sealEpoch: 0, dir: idDir });
    const cadDir = cadSealDir(storageDir);
    const installed = sealCarrierForFederation({ registry, cadDir, plaintext: BODY, keyring });
    return { cadDir, installed, registry };
  }

  test("STANDS + CARRIES: a member dials the Herm's crossroads + reads a sealed body; a stranger draws byte-identical Mu", async () => {
    // The Herm's OWN identity seed (in the boot this is `vesselSeed`, loaded from store → stable across restarts).
    const hermSeed    = new Uint8Array(32).fill(11);
    const holderSeed  = new Uint8Array(32).fill(12);
    const memberSeed  = new Uint8Array(32).fill(13);
    const strangerSeed = new Uint8Array(32).fill(14);
    const [holderKey, memberKey, strangerKey] = await Promise.all([pubOf(holderSeed), pubOf(memberSeed), pubOf(strangerSeed)]);

    const { cadDir, installed, registry } = sealBody();
    const deps: CasWireServerDeps = {
      cadDir, seal: registry.seal,
      membership: membershipOf([memberKey]),
      antigen: antigenOf([]),
      fedGate: new DeterministicFederationGate(holderKey),
    };

    // ── THE HERM STANDS THE CROSSROADS — the boot gate on the Herm's own identity seed (port 0 → OS-assigned). ──
    relay = await bootRelayGate({ vesselSeed: hermSeed, relayPort: 0 });
    expect(relay).not.toBeNull();
    expect(relay!.port).toBeGreaterThan(0);
    // ★ THE GATE KEY IS DERIVED FROM THE HERM'S IDENTITY, NEVER EQUAL TO IT ★ — this line once asserted
    // equality, which stated the flaw as an invariant: the published crossroads key WAS the vessel
    // identity key, joining the transport and identity trust domains in one correlatable pair.
    expect(relay!.gatePubKey).toBe(await pubOf(resolveRelayGateSeed(hermSeed)));
    expect(relay!.gatePubKey).not.toBe(await pubOf(hermSeed));
    expect(relay!.tracker.size).toBe(0);
    const url = `ws://127.0.0.1:${relay!.port}`;

    // A holder hearth serves its sealed body over the Herm's crossroads; two requester hearths dial the same URL.
    loops.push(startCarriageServeLoop({ relayUrl: url, vesselSeed: holderSeed, serverAddr: holderKey, deps, pollIntervalMs: 25 }));
    const memberCh = await AuthenticatedWSMembershipChannel.connect(url, memberSeed);
    const strangerCh = await AuthenticatedWSMembershipChannel.connect(url, strangerSeed);
    channels.push(memberCh, strangerCh);

    // MEMBER: carries the ciphertext over the Herm, re-verifies secret-free, reads with the per-body read-cap.
    const memberResp = await fetchOverCarriage({ channel: memberCh, requester: memberKey, holderAddr: holderKey, cid: installed.cid });
    expect(memberResp?.kind).toBe(CAS_BLOCK);
    const ciphertext = bytesFromPayload(memberResp!);
    expect(verifyCiphertextCid(ciphertext, installed.cid)).toBe(true);
    expect([...ciphertext]).not.toEqual([...BODY]);
    expect([...openBodyOnCas(ciphertext, installed.readCap)]).toEqual([...BODY]);

    // STRANGER: dials the SAME crossroads, draws the void — byte-identical to satiety.
    const strangerResp = await fetchOverCarriage({ channel: strangerCh, requester: strangerKey, holderAddr: holderKey, cid: installed.cid });
    expect(strangerResp?.kind).toBe(CAS_MU);
    expect([...bytesFromPayload(strangerResp!)]).toEqual([...muWireBytes()]);
  }, 20_000);

  test("INERT: the boot gate stands ZERO crossroads sockets when no relay port rides the config, ONE when it does", async () => {
    const hermSeed = new Uint8Array(32).fill(21);

    // UNCONFIGURED (no port): the EXACT boot ternary stands NO relay — an un-configured Herm behaves as today.
    const inert = await bootRelayGate({ vesselSeed: hermSeed, relayPort: null });
    expect(inert).toBeNull();

    // CONFIGURED: the SAME gate with a port stands exactly one crossroads a hearth can dial.
    relay = await bootRelayGate({ vesselSeed: hermSeed, relayPort: 0 });
    expect(relay).not.toBeNull();
    const url = `ws://127.0.0.1:${relay!.port}`;
    const dialed = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(url);
      const done = (v: boolean) => { try { ws.close(); } catch { /* down */ } resolve(v); };
      ws.on("open", () => done(true));
      ws.on("error", () => done(false));
      setTimeout(() => done(false), 2000);
    });
    expect(dialed).toBe(true);   // a hearth reaches the stood crossroads
  }, 20_000);

  test("STABLE IDENTITY: the resolved gate seed is deterministic — same across restarts, distinct from a pinned seed", async () => {
    const hermSeed = new Uint8Array(32).fill(31);

    // Two "restarts" from the Herm's own identity seed → the IDENTICAL gate seed (a hearth keeps dialing one key).
    const restart1 = resolveRelayGateSeed(hermSeed);
    const restart2 = resolveRelayGateSeed(hermSeed);
    expect([...restart2]).toEqual([...restart1]);   // stable across restarts — the property that matters

    // A pinned seed hex → a DIFFERENT, still-deterministic key (the operator's out-of-band choice).
    const pinnedHex = "aa".repeat(32);
    const pinned1 = resolveRelayGateSeed(hermSeed, pinnedHex);
    const pinned2 = resolveRelayGateSeed(hermSeed, pinnedHex);
    expect([...pinned1]).toEqual([...pinned2]);
    expect([...pinned1]).not.toEqual([...hermSeed]);   // the pin overrides the identity seed
    expect(hex(pinned1)).toBe(pinnedHex);

    // An empty / absent seed hex falls back to the identity seed — never a fresh random.
    // ★ AND THE DERIVED SEED IS NOT THE VESSEL'S OWN ★ — an empty/absent pin still DERIVES rather than
    // passing the identity seed through. These two lines once asserted equality, pinning the flaw: the
    // relay gate key WAS the vessel identity key, published to every dialing hearth, joining two trust
    // domains in one correlatable pair. Deterministic still, separated now.
    expect([...resolveRelayGateSeed(hermSeed, "")]).not.toEqual([...hermSeed]);
    expect([...resolveRelayGateSeed(hermSeed, undefined)]).not.toEqual([...hermSeed]);
    expect([...resolveRelayGateSeed(hermSeed, "")]).toEqual([...resolveRelayGateSeed(hermSeed, undefined)]);
    expect(resolveRelayGateSeed(hermSeed).length).toBe(32);   // an Ed25519 seed's exact width

    // The gate PUBKEY the two restarts announce is therefore identical — the stable-identity guarantee, end to end.
    const stood1 = await startCarriageRelay({ gateSeed: restart1, port: 0 });
    const stood2 = await startCarriageRelay({ gateSeed: restart2, port: 0 });
    try { expect(stood1.gatePubKey).toBe(stood2.gatePubKey); }
    finally { await stood1.close(); await stood2.close(); }
  }, 20_000);

  test("CLEAN TEARDOWN: close() stops the crossroads — a dial after close cannot connect (no leaked WS server)", async () => {
    const hermSeed = new Uint8Array(32).fill(41);
    const stood = await bootRelayGate({ vesselSeed: hermSeed, relayPort: 0 });
    expect(stood).not.toBeNull();
    const url = `ws://127.0.0.1:${stood!.port}`;

    // UP: a hearth reaches the crossroads.
    const upDial = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(url);
      const done = (v: boolean) => { try { ws.close(); } catch { /* down */ } resolve(v); };
      ws.on("open", () => done(true));
      ws.on("error", () => done(false));
      setTimeout(() => done(false), 2000);
    });
    expect(upDial).toBe(true);

    // close() tears the WS server down — a fresh dial to the SAME port now fails (no leaked listener).
    await stood!.close();
    const afterDial = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(url);
      const done = (v: boolean) => { try { ws.close(); } catch { /* down */ } resolve(v); };
      ws.on("open", () => done(true));
      ws.on("error", () => done(false));
      setTimeout(() => done(false), 2000);
    });
    expect(afterDial).toBe(false);
  }, 20_000);
});
