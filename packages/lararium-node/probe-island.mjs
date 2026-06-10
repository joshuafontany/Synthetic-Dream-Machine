// Probe: spawn the REAL wiki island worker with a production-shaped manifest
// against the witness root's stored docs; print every island→vessel message.
import { Worker, MessageChannel } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { mkManifest } from "@lararium/mesh";

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const storage = new NodeFSStorageAdapter("/tmp/lares-witness/.lararium");
const repo = new Repo({ storage, sharePolicy: async () => true });

// Pull current doc URLs from the live @lararium doc the daemon last wrote.
// Genesis url from the last serve log line.
const islandUrl = process.argv[2];
if (!islandUrl) { console.error("usage: node probe-island.mjs <lararium-doc-url> [wikiUrl]"); process.exit(2); }
const wikiUrl = process.argv[3] ?? null;

const islandHandle = await repo.find(islandUrl, { allowableStates: ["ready", "unavailable"] });
log("main: lararium doc state:", islandHandle.state, "blobs:", Object.keys(islandHandle.doc()?.blobs ?? {}).length);

const { port1: mainPort, port2: syncPort } = new MessageChannel();
repo.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(mainPort));

const worker = new Worker(new URL("./dist/src/node-wiki-island.js", import.meta.url));
worker.on("message", (m) => log("island →", m?.type, m?.error ?? "", m?.wikiUri ?? ""));
worker.on("error", (e) => log("island ERROR:", e.message));
worker.on("exit", (c) => log("island exit", c));

// Oracle URLs straight from the @lararium doc (same source the vessel patches).
const tid = (uri) => islandHandle.doc()?.tiddlers?.[uri]?.tiddler?.text ?? null;
const catalogUrl = tid("lar:///ha.ka.ba/@catalog");
const laresUrl   = tid("lar:///ha.ka.ba/@lares");
log("main: catalogUrl:", catalogUrl, "laresUrl:", laresUrl);

// PROBE_DRAFT=1: mint a draft doc in a SECOND in-process repo (admin-island
// stand-in) connected to this hub repo, and grant it to the island — the relay
// path production stalls on.
let draftUrl = null;
if (process.env.PROBE_DRAFT) {
  const { port1: hubSide, port2: adminSide } = new MessageChannel();
  repo.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(hubSide));
  const adminRepo = new Repo({ network: [new MessageChannelNetworkAdapter(adminSide)], sharePolicy: async () => true });
  const draftDoc = adminRepo.create();
  draftDoc.change((d) => { d.tiddlers = {}; });
  draftUrl = draftDoc.url;
  log("main: draft minted in admin stand-in:", draftUrl);
}

const mode = process.env.PROBE_MODE ?? "grants";
const grants = {
  islandUrl,
  ...(draftUrl ? { draftUrl } : {}),
  ...(wikiUrl ? { wikiUrl } : {}),
  ...(mode.includes("cat")    || mode === "grants" ? { catalogUrl } : {}),
  ...(mode.includes("lares")  || mode === "grants" ? { laresUrl }   : {}),
};
const islandStorage = mode.includes("nodefs")
  ? { type: "nodefs", dir: "/tmp/lares-witness/.lararium/probe-island" }
  : { type: "memory" };
log("main: mode:", mode, "grants:", Object.keys(grants).join(","), "storage:", islandStorage.type);

const manifest = mkManifest(
  "lar:///probe/wiki",
  syncPort,
  { wikiSlug: "probe" },
  grants,
  null,
  { storage: islandStorage },
);
log("main: posting manifest");
worker.postMessage(manifest, [syncPort]);

setTimeout(async () => { log("main: 30s deadline — terminating"); await worker.terminate(); process.exit(0); }, 30_000);
