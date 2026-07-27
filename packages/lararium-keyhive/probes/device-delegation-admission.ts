/**
 * DEVICE-DELEGATION ADMISSION WITNESS — the operator's-own-device admission path, witnessed behaviorally.
 *
 * The daemon gate's device-delegation branch in `verifyPeer`
 * (operator-daemon-behavior.ts): a peer presenting a valid device-delegation edge
 * — PINNED to the hearth root (signerDid), bound to THIS proven identity
 * (edge.deviceDid === id), carrying a verified V3 proof-of-possession — is
 * ADMITTED at the operator's-own-device tier even with NO cap=admin grant. The
 * crypto verifier (verifyDeviceDelegation) has unit tests; the verifyPeer BRANCH
 * itself had no direct behavioral witness. This is that witness — the "cap-wall
 * dissolves" proof.
 *
 * LEVEL — the REAL committed closure, no reimplementation. We build the real
 * `makeOperatorDaemonBehavior`, drive its `onEa` (which boots a REAL keyhive via
 * `verifierFactory` → `bootDaemonKeyhive`, setting the closure's `kh`/`mintedByHex`),
 * then route a real `daemon:verify-request` through `onSignal` — the SAME path the
 * host AuthVerifierSeam uses. The verdict returns via `ctx.post`. Real keyhive
 * (WASM), real ed25519 edges (buildDeviceDelegation), real V3 proofs
 * (buildAuthResponse + ed25519SignerFromSeed). The verifier is NEVER mocked.
 *
 * Enforcement stays ON (LAR_V3_ALLOW_UNPROVEN cleared) so case 4 (no proof → deny)
 * is meaningful.
 *
 *   pnpm exec tsx packages/lararium-keyhive/probes/device-delegation-admission.ts
 *
 * Meme: lar:///ha.ka.ba/lararium/keyhive/device-delegation-admission
 */

import {
  buildDeviceDelegation,
  buildAuthResponse,
  ed25519SignerFromSeed,
  mintPersonaInception,
  mkDaemonVerifyRequest,
  type AuthProofWire,
  type DeviceDelegationTiddler,
  type DaemonMsg_VerifyResult,
  type IslandMsg_Manifest,
} from "@lararium/mesh";
import { KeyhiveProvider, InMemoryEventStore } from "../src/index.js";
import { makeOperatorDaemonBehavior } from "../src/operator-daemon-behavior.js";
import type { IslandContext } from "@lararium/tw5";

// ── Enforcement ON — the no-proof case must actually deny ──────────────────────
delete process.env["LAR_V3_ALLOW_UNPROVEN"];

const DAEMON_BAG = "lar:///ha.ka.ba/bags/@daemon";
const PLACE      = "bafkreic7r3jrao44srh5bp47uryotaqp62bnmovzpqccbfy2kclf447bra";
const ISSUED     = "2026-06-24T00:00:00.000Z";
const EXPIRES    = "2026-12-31T00:00:00.000Z";

/** Derive the raw ed25519 verifying-key hex of a seed via the mesh minter
 *  (personaRootDid = "0x"+vk) — no direct @noble dependency in this dir. */
async function vkOfSeed(seed: Uint8Array): Promise<string> {
  const e = await buildDeviceDelegation({
    personaRootSeed: seed, deviceVerifyingKey: "00".repeat(32),
    hearthTrueName: "", issuedAt: ISSUED, expiresAt: EXPIRES, boundEpoch: 1,
  });
  return e.personaRootDid.slice(2);
}

/** Mint a real signed device-delegation edge: `signerSeed` (root) → device `deviceVk`. */
async function mintEdge(signerSeed: Uint8Array, deviceVk: string): Promise<DeviceDelegationTiddler> {
  return buildDeviceDelegation({
    personaRootSeed: signerSeed, deviceVerifyingKey: deviceVk,
    hearthTrueName: PLACE, issuedAt: ISSUED, expiresAt: EXPIRES, boundEpoch: 1,
  });
}

/** Produce a real V3 proof-of-possession the peer signs with its OWN seed, bound to
 *  THIS gate's key (gateVk) and the target bag (aud). Mirrors the live leaf path
 *  (LarWSClientAdapter: buildAuthResponse over ed25519SignerFromSeed). */
async function mintProof(peerSeed: Uint8Array, peerVk: string, gateVk: string, aud: string): Promise<AuthProofWire> {
  const auth = await buildAuthResponse({
    contactCard: "",                    // unused by the seam (cardBytes carries identity)
    nonce:       "ab".repeat(32),
    gatePubKey:  gateVk,
    peerPubKey:  peerVk,
    aud,
    ts:          new Date().toISOString(),
    sign:        ed25519SignerFromSeed(peerSeed),
  });
  return { nonce: auth.nonce, sig: auth.sig, ts: auth.ts ?? "" };
}

/** A minimal IslandContext — only what `onEa` touches: verifierFactory's event-store
 *  backing (composite.listVisible/get), the VerbDispatcher.start subscriptions (tw5
 *  wiki listeners + composite.subscribe), and `post` (the verdict sink). Cast like the
 *  worldline-read-vm test's fakeCtx — the seam reads a small, named slice. */
function makeFakeCtx(posted: unknown[]): IslandContext {
  const noopUnsub = () => {};
  return {
    wikiUri:   DAEMON_BAG,
    catalogUrl: null,
    oracleUrl:  null,
    handles:   new Map(),
    engine:    { sha256: "", version: "" },
    recipe:    {},
    repo:      {},
    post:      (msg: unknown) => { posted.push(msg); },
    tw5: {
      $tw: { wiki: {
        addEventListener:    noopUnsub,
        removeEventListener: noopUnsub,
        getTiddler:          () => undefined,
      } },
    },
    composite: {
      listVisible: async () => [],
      get:         async () => undefined,
      getLive:     async () => undefined,
      put:         async () => {},
      subscribe:   () => noopUnsub,
    },
  } as unknown as IslandContext;
}

/** Drive the real onSignal verify-request and await the posted verdict. */
async function callVerifyPeer(
  behavior: ReturnType<typeof makeOperatorDaemonBehavior>,
  ctx: IslandContext,
  posted: unknown[],
  args: { requestId: string; cardBytes: Uint8Array; bagUrl: string; access: "read" | "admin"; proof?: AuthProofWire; edge?: DeviceDelegationTiddler },
): Promise<DaemonMsg_VerifyResult> {
  const req = mkDaemonVerifyRequest(args);
  const claimed = behavior.onSignal("daemon:verify-request", req, ctx);
  if (!claimed) throw new Error("onSignal did not claim daemon:verify-request");
  // The branch verifies async then posts on a microtask — poll the sink.
  const deadline = Date.now() + 8000;
  for (;;) {
    const hit = posted.find(
      (m): m is DaemonMsg_VerifyResult =>
        typeof m === "object" && m !== null &&
        (m as { type?: string }).type === "daemon:verify-result" &&
        (m as { requestId?: string }).requestId === args.requestId,
    );
    if (hit) return hit;
    if (Date.now() > deadline) throw new Error(`verdict timeout for ${args.requestId}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

let failures = 0;
function check(name: string, pass: boolean, verdict: DaemonMsg_VerifyResult): void {
  const tag = pass ? "PASS" : "FAIL";
  if (!pass) failures++;
  console.log(`[delegation-admit] ${tag} — ${name}`);
  console.log(`           verdict: ok=${verdict.ok} proofVerified=${verdict.proofVerified ?? "—"} reason=${JSON.stringify(verdict.reason ?? null)}`);
}

async function main(): Promise<void> {
  // ── The gate: the operator's founding daemon. signerDid = the operator root (self). ──
  const daemonSeed = new Uint8Array(32).fill(3);
  const operatorVk = await vkOfSeed(daemonSeed);
  const signerDid  = `0x${operatorVk}`;
  const selfEdge   = await mintEdge(daemonSeed, operatorVk); // founding self-delegation (Binding Gate)
  // The persona-KEL the gate pins + walks: an unarmed inception over the founding op-key (== signerDid). At
  // inception the head IS signerDid, so the pin-move is behavior-identical here (and a rotation would move it).
  const inception  = mintPersonaInception(signerDid, "");

  const daemonAuth: NonNullable<IslandMsg_Manifest["daemonAuth"]> = {
    seed:                   daemonSeed,
    vesselVerifyingKey:   operatorVk,
    personaGroupDocIdHex:   "11".repeat(32), // unread by boot (affiliation left the boot path)
    personaGroupAgentIdHex: "22".repeat(32),
    meshCabalDocIdHex:      "33".repeat(32),
    registerBags:           [DAEMON_BAG],
    signerDid,
    personaKel:             { prefix: inception.prefix, chain: [inception] },
    deviceEdge:             selfEdge,
  };
  const manifest = { daemonAuth } as unknown as IslandMsg_Manifest;

  const behavior = makeOperatorDaemonBehavior(manifest);
  const posted: unknown[] = [];
  const ctx = makeFakeCtx(posted);

  // Drive onEa → verifierFactory boots the REAL keyhive (sets the closure's kh/mintedByHex).
  // Later onEa steps (VerbDispatcher.start / engine-watch) run over stubs; a throw there is
  // harmless — kh is already set by the first cap's first await. Surface, never swallow blind.
  try {
    await behavior.onEa(ctx);
  } catch (err) {
    console.log(`[delegation-admit] (onEa partial — keyhive booted before a downstream stub threw: ${err instanceof Error ? err.message : String(err)})`);
  }

  // ── The peer: the operator's SECOND device — its OWN per-vessel key (anti-pono to share the seed). ──
  const peerSeed = new Uint8Array(32).fill(9);
  const peerVk   = await vkOfSeed(peerSeed);
  const peer = new KeyhiveProvider();
  await peer.init({ seed: peerSeed, eventStore: new InMemoryEventStore() });
  const cardBytes = await peer.contactCard();   // gate's kh.receiveContactCard → id = "0x"+peerVk
  const goodProof = await mintProof(peerSeed, peerVk, operatorVk, DAEMON_BAG);

  console.log("[delegation-admit] =========================================================");
  console.log("[delegation-admit] witnessing verifyPeer's device-delegation branch (REAL committed closure)");
  console.log(`[delegation-admit] gate operatorVk=0x${operatorVk.slice(0, 12)}…  peer id=0x${peerVk.slice(0, 12)}…`);
  console.log("[delegation-admit] =========================================================");

  // CASE 1 — ADMIT: edge signed by the pinned root, bound to the presenter, valid proof.
  // THE CAP-WALL DISSOLVES.
  {
    const edge = await mintEdge(daemonSeed, peerVk);
    const v = await callVerifyPeer(behavior, ctx, posted, { requestId: "c1", cardBytes, bagUrl: DAEMON_BAG, access: "admin", proof: goodProof, edge });
    check("CASE 1 ADMIT — valid edge + pin + bind + proof → admitted via device-delegation",
      v.ok === true && v.proofVerified === true && /device-delegation/.test(v.reason ?? ""), v);
  }

  // CASE 2 — DENY (wrong root): same shape, edge signed by a DIFFERENT root (the pin rejects).
  {
    const attackerSeed = new Uint8Array(32).fill(13);
    const edge = await mintEdge(attackerSeed, peerVk); // internally valid, but not the pinned root
    const v = await callVerifyPeer(behavior, ctx, posted, { requestId: "c2", cardBytes, bagUrl: DAEMON_BAG, access: "admin", proof: goodProof, edge });
    check("CASE 2 DENY  — edge signed by a non-pinned root → rejected (confused-deputy cure)",
      v.ok === false && /pinned root/.test(v.reason ?? ""), v);
  }

  // CASE 3 — DENY (not bound to presenter): valid edge from the pinned root, but for ANOTHER device.
  {
    const otherSeed = new Uint8Array(32).fill(21);
    const otherVk   = await vkOfSeed(otherSeed);
    const edge = await mintEdge(daemonSeed, otherVk); // pinned-root edge, deviceDid !== presenter id
    const v = await callVerifyPeer(behavior, ctx, posted, { requestId: "c3", cardBytes, bagUrl: DAEMON_BAG, access: "admin", proof: goodProof, edge });
    check("CASE 3 DENY  — edge.deviceDid ≠ presenter id → not bound to the presented identity",
      v.ok === false && /not bound to the presented identity/.test(v.reason ?? ""), v);
  }

  // CASE 4 — DENY (no proof): valid edge + pin + bind, but NO V3 proof under enforcement.
  {
    const edge = await mintEdge(daemonSeed, peerVk);
    const v = await callVerifyPeer(behavior, ctx, posted, { requestId: "c4", cardBytes, bagUrl: DAEMON_BAG, access: "admin", edge }); // proof omitted
    check("CASE 4 DENY  — valid edge but no V3 proof under enforcement → required",
      v.ok === false && v.proofVerified === false && /proof required/i.test(v.reason ?? ""), v);
  }

  // Best-effort teardown of whatever onEa wired.
  try { await behavior.onHooAnu(ctx); } catch { /* best-effort */ }

  console.log("[delegation-admit] =========================================================");
  if (failures === 0) {
    console.log("[delegation-admit] ALL 4 CASES PASS — the device-delegation admission seam holds.");
  } else {
    console.log(`[delegation-admit] ${failures} CASE(S) FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => { console.error("[delegation-admit] FATAL:", err); process.exit(1); });
