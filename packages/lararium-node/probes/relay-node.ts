/**
 * relay-node — the Herm's OPEN membership-relay entrypoint: a blind broadcast crossroads the swarm
 * vessels dial (WSMembershipChannel). The Herm's carriage reads NOTHING — it routes opaque ceremony
 * envelopes (contact-card / admit / invite) over live sockets; one relay, the vessels dial it.
 *
 * Env: LAR_RELAY_PORT (default 8090).
 * Run: LAR_RELAY_PORT=8090 pnpm exec tsx packages/lararium-node/probes/relay-node.ts
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { startMembershipRelay } from "../src/ws-membership-channel.js";

const PORT = Number.parseInt(process.env.LAR_RELAY_PORT ?? "8090", 10);

async function main(): Promise<void> {
  const relay = await startMembershipRelay(PORT);
  console.log(`[relay-node] membership relay up on :${String(relay.port)} — vessels may dial ws://<host>:${String(relay.port)}`);
  // Stay up for the swarm's lifetime; the container/process is torn down externally.
}

main().catch((e) => { console.error("[relay-node] FATAL:", e); process.exit(1); });
