// Probe: open the witness vessel's storage and scan every reachable doc for
// records missing .tiddler — the shape both live crashes choked on.
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";

const storage = new NodeFSStorageAdapter("/tmp/lares-witness/.lararium");
const repo = new Repo({ storage });

const urls = process.argv.slice(2);
for (const url of urls) {
  try {
    const handle = await repo.find(url, { allowableStates: ["ready", "unavailable"] });
    if (handle.isUnavailable()) { console.log(url, "→ unavailable"); continue; }
    const doc = handle.doc();
    const tiddlers = doc?.tiddlers ?? {};
    const titles = Object.keys(tiddlers);
    console.log(url, "→", titles.length, "tiddlers");
    for (const [key, rec] of Object.entries(tiddlers)) {
      if (!rec || typeof rec !== "object" || !("tiddler" in rec) || rec.tiddler == null) {
        console.log("   !! MALFORMED (no .tiddler):", key, JSON.stringify(rec)?.slice(0, 200));
      } else if (!rec.tiddler.title) {
        console.log("   !! MISSING title:", key, JSON.stringify(rec.tiddler).slice(0, 200));
      }
    }
  } catch (e) {
    console.log(url, "→ error:", e.message);
  }
}
await repo.shutdown();
