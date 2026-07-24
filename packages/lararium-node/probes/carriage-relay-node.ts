/**
 * carriage-relay-node — the CARRIAGE relay service entrypoint (Socket B): a proof-of-possession authenticated
 * relay the family vessels dial to carry sealed @cad ciphertext bodies hearth to hearth, plus the DHT-free
 * bag-tracker. Distinct from relay-node (the Herm's OPEN membership-CEREMONY relay); this is the member-gated
 * SEALED-body @cad carriage (Socket B). Both are Herm transports; NEITHER is the Automerge /ws doc relay (Socket A).
 *
 * The relay reads no ciphertext, holds no read-cap, keeps no charter / keyring / roster; it stands from a 32-byte
 * gate seed + a bound port. The member gate lives on the vessels' cas-wire serve side, never here.
 *
 * Env: LAR_CARRIAGE_RELAY_PORT (default 8091) · LAR_CARRIAGE_GATE_SEED (64-hex; a fresh random seed mints if unset).
 * Run: LAR_CARRIAGE_RELAY_PORT=8091 pnpm exec tsx packages/lararium-node/probes/carriage-relay-node.ts
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-place#carriage
 */

import { randomBytes } from "node:crypto";
import * as ed from "@noble/ed25519";
import { hex } from "@lararium/mesh";
import { startCarriageRelay } from "../src/carriage-relay.js";

const PORT = Number.parseInt(process.env["LAR_CARRIAGE_RELAY_PORT"] ?? "8091", 10);

/** Read the gate seed from env (64-hex), or mint a fresh 32-byte random one for this run. */
function resolveGateSeed(): Uint8Array {
  const fromEnv = process.env["LAR_CARRIAGE_GATE_SEED"];
  if (fromEnv && /^[0-9a-fA-F]{64}$/.test(fromEnv)) return Uint8Array.from(Buffer.from(fromEnv, "hex"));
  return new Uint8Array(randomBytes(32));
}

async function main(): Promise<void> {
  const gateSeed = resolveGateSeed();
  const gatePubKey = hex(await ed.getPublicKeyAsync(gateSeed));
  const relay = await startCarriageRelay({ gateSeed, port: PORT });
  console.log(`[carriage-relay-node] carriage relay up on :${String(relay.port)} — members may dial ws://<host>:${String(relay.port)}`);
  console.log(`[carriage-relay-node] gate pubkey ${gatePubKey} (the proof-of-possession binding)`);
  // Stay up for the family's lifetime; the container/process is torn down externally.
}

main().catch((e) => { console.error("[carriage-relay-node] FATAL:", e); process.exit(1); });
