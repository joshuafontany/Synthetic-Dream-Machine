// Does a v2.5.6 repo serve a doc that lives ONLY in its storage (never loaded
// this session) when a remote peer requests it?
//   Phase 1: mint doc into B's NodeFS storage, flush, shutdown.
//   Phase 2: fresh B over same storage (doc cold), C requests via hub relay.
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { MessageChannel } from "worker_threads";
import { rmSync } from "node:fs";

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const DIR = "/tmp/probe-cold-storage";

rmSync(DIR, { recursive: true, force: true });

// Phase 1 — mint + persist + shutdown.
const b1 = new Repo({ storage: new NodeFSStorageAdapter(DIR), sharePolicy: async () => true });
const doc = b1.create();
doc.change((d) => { d.hello = "cold storage"; });
const url = doc.url;
await b1.shutdown();
log("phase 1: minted + persisted", url);

// Phase 2 — fresh repo over same storage; doc NOT loaded.
const ab = new MessageChannel();
const ac = new MessageChannel();
const hub = new Repo({ sharePolicy: async () => true });
hub.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(ab.port1));
hub.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(ac.port1));
const b2 = new Repo({ storage: new NodeFSStorageAdapter(DIR), network: [new MessageChannelNetworkAdapter(ab.port2)], sharePolicy: async () => true });
const c  = new Repo({ network: [new MessageChannelNetworkAdapter(ac.port2)], sharePolicy: async () => true });
void b2;

await new Promise((r) => setTimeout(r, 500));
log("phase 2: C requesting cold doc through hub…");
const t = setTimeout(() => { log("STILL PENDING at 10s — cold-storage docs NOT served over relay"); process.exit(1); }, 10_000);
try {
  const h = await c.find(url, { allowableStates: ["ready", "unavailable"] });
  clearTimeout(t);
  log("C: settled — state:", h.state, "doc:", JSON.stringify(h.doc() ?? null));
} catch (e) {
  clearTimeout(t);
  log("C: threw:", e.message);
}
process.exit(0);
