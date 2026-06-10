// Does a storage-MISS find() settle on the production .lararium root
// (which contains the admin island's nested storage dir)?
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const repo = new Repo({ storage: new NodeFSStorageAdapter("/tmp/lares-witness/.lararium"), sharePolicy: async () => true });

const url = process.argv[2];  // the draft doc url — absent from MAIN's storage
log("find()", url, "with no network…");
const t = setTimeout(() => { log("STILL PENDING at 8s — storage-miss find never settles"); process.exit(1); }, 8_000);
try {
  const h = await repo.find(url, { allowableStates: ["ready", "unavailable"] });
  clearTimeout(t);
  log("settled — state:", h.state, "unavailable:", h.isUnavailable());
} catch (e) {
  clearTimeout(t);
  log("threw:", e.message);
}
process.exit(0);
