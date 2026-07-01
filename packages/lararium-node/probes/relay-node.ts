/**
 * relay-node — the membership RELAY service entrypoint: a dumb broadcast relay the swarm
 * vessels connect to (WSMembershipChannel). The strangler-fig WS transport for the swarm
 * — one relay container, the vessels dial it; the ceremony crosses live sockets.
 *
 * Env: LAR_RELAY_PORT (default 8090).
 * Run: LAR_RELAY_PORT=8090 pnpm exec tsx packages/lararium-node/probes/relay-node.ts
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { startMembershipRelay } from "../src/ws-membership-channel.js";

const PORT = Number.parseInt(process.env.LAR_RELAY_PORT ?? "8090", 10);

async function main(): Promise<void> {
  const relay = await startMembershipRelay(PORT);
  console.log(`[relay-node] membership relay up on :${String(relay.port)} — vessels may dial ws://<host>:${String(relay.port)}`);
  // Stay up for the swarm's lifetime; the container/process is torn down externally.
}

main().catch((e) => { console.error("[relay-node] FATAL:", e); process.exit(1); });
