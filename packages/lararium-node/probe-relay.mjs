// Does automerge-repo v2.5.6 RELAY a doc between two MessageChannel peers
// through a hub repo that doesn't hold the doc itself?
//   B (minter) — creates doc            \
//                                         A (hub, like vessel main)
//   C (seeker) — find(doc) through A    /
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { MessageChannel } from "worker_threads";

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const ab = new MessageChannel();
const ac = new MessageChannel();

import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
// Mirror production: A constructed with storage + NO channel adapters; the two
// island channels attach LATE (attachMessageChannelSync order), B first, C after
// B has minted (the wiki island spawns after resolveBinding).
const A = new Repo({ storage: new NodeFSStorageAdapter("/tmp/probe-relay-hub"), sharePolicy: async () => true });
A.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(ab.port1));
const B = new Repo({ network: [new MessageChannelNetworkAdapter(ab.port2)], sharePolicy: async () => true });
const C = new Repo({ network: [new MessageChannelNetworkAdapter(ac.port2)], sharePolicy: async () => true });

const doc = B.create();
doc.change((d) => { d.hello = "from B"; });
log("B minted", doc.url);

await new Promise((r) => setTimeout(r, 500));
// C's channel to the hub attaches only now — like the pool mounting the wiki island.
A.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(ac.port1));
await new Promise((r) => setTimeout(r, 200));

log("C: find through hub…");
const t = setTimeout(() => { log("C: STILL PENDING at 10s — relay does NOT work"); process.exit(1); }, 10_000);
try {
  let target = doc.url;
  if (process.env.PROBE_MISSING) {
    // a VALID url whose doc no repo holds: mint in a throwaway repo, never connect it
    const orphanRepo = new Repo({ sharePolicy: async () => true });
    target = orphanRepo.create().url;
  }
  const h = await C.find(target, { allowableStates: ["ready", "unavailable"] });
  clearTimeout(t);
  log("C: find settled — state:", h.state, "unavailable:", h.isUnavailable(), "doc:", JSON.stringify(h.doc() ?? null));
} catch (e) {
  clearTimeout(t);
  log("C: find threw:", e.message);
}
process.exit(0);
