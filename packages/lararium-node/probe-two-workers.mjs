// The last untested leg: doc minted in WORKER B's repo, requested by WORKER C,
// relayed through the main-thread hub — exactly admin-island → main → wiki-island.
import { Worker, MessageChannel } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const MINTER = `
import { parentPort, workerData } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
const repo = new Repo({ network: [new MessageChannelNetworkAdapter(workerData.port)], sharePolicy: async () => true });
const doc = repo.create();
doc.change((d) => { d.hello = "from worker B"; });
parentPort.postMessage({ url: doc.url });
`;

const SEEKER = `
import { parentPort, workerData } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
const repo = new Repo({ network: [new MessageChannelNetworkAdapter(workerData.port)], sharePolicy: async () => true });
const h = await repo.find(workerData.url, { allowableStates: ["ready", "unavailable"] });
parentPort.postMessage({ state: h.state, unavailable: h.isUnavailable(), doc: h.doc() ?? null });
`;

const hub = new Repo({ sharePolicy: async () => true });

const bc = new MessageChannel();
hub.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(bc.port1));
const b = new Worker(MINTER, { eval: true, workerData: { port: bc.port2 }, transferList: [bc.port2] });
const url = await new Promise((res) => b.once("message", (m) => res(m.url)));
log("worker B minted", url);

const cc = new MessageChannel();
hub.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(cc.port1));
const c = new Worker(SEEKER, { eval: true, workerData: { port: cc.port2, url }, transferList: [cc.port2] });
c.on("error", (e) => { log("seeker error:", e.message); process.exit(1); });

const t = setTimeout(() => { log("STILL PENDING at 10s — two-worker relay BROKEN"); process.exit(1); }, 10_000);
const result = await new Promise((res) => c.once("message", res));
clearTimeout(t);
log("worker C find settled:", JSON.stringify(result));
process.exit(0);
