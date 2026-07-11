/**
 * mempalace-pool — the warm, reused READ client: ONE python reader, held for the daemon's life.
 *
 * The shape is already the pono one — the store lives in py, the TS @daemon only points at it and
 * proxies (it computes nothing, holds no payload). What was WRONG was where it pointed.
 *
 * `MempalaceClient` supports `palacePath` and `defaultArgs()` appends `--palace <path>` — but this
 * pool never passed it, so the sidecar fell back to whatever `~/.mempalace/config.json` named. That
 * single omission is why recall read the GUEST comparator while the capture path filled the sovereign
 * `<memory>/content` every turn: the lararium's own content plane was WRITE-ONLY, and every harness
 * that wanted memory reached past the node to grab the guest palace itself — N readers on one Chroma
 * index. It now reads the plane the vessel actually writes.
 *
 * ONE reader, pooled for the daemon's lifetime (not one per call, not one per harness session): the
 * @daemon coordinates a py reader; it does not become one. First recall pays the chromadb cold start;
 * every recall after is warm, which is what makes recall-into-wake fast.
 *
 * Read-only: the pool only ever hands back a client whose tools are list/get/search.
 */

import { MempalaceClient } from "./mempalace-client.js";
import { resolveMempalaceSpawn } from "./spawn-resolve.js";
import { memorySensoriumContentDir } from "./xdg-base.js";

let pooled: MempalaceClient | null = null;
let starting: Promise<MempalaceClient> | null = null;

async function open(): Promise<MempalaceClient> {
  const spawn = resolveMempalaceSpawn();
  if (!spawn.sidecarPresent) throw new Error("mempalace submodule absent — run `lares wake --install`");
  if (!spawn.python) throw new Error("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const client = new MempalaceClient({
    submoduleRoot: spawn.submoduleRoot,
    python: spawn.python,
    // NAME the palace. An unpassed palacePath is not a default — it is a silent reach into the guest.
    palacePath: memorySensoriumContentDir(),
  });
  await client.start();
  return client;
}

/** The warm, reused read-client. Starts the sidecar lazily; restarts it if dead. */
export async function getMempalaceClient(): Promise<MempalaceClient> {
  if (pooled && pooled.isAlive()) return pooled;
  pooled = null; // dead/absent — drop it, restart below
  if (!starting) {
    starting = open().then(
      (c) => { pooled = c; starting = null; return c; },
      (e) => { starting = null; throw e; },
    );
  }
  return starting;
}

/** Drop the pooled client (e.g. after a sidecar death) so the next get restarts it. */
export async function resetMempalaceClient(): Promise<void> {
  const c = pooled;
  pooled = null;
  starting = null;
  if (c) await c.stop().catch(() => { /* best effort */ });
}

/**
 * Run a read against the warm client; on a sidecar-death error, reset + retry ONCE
 * with a fresh client. Callers get warm-fast reads without handling lifecycle.
 */
export async function withMempalace<T>(fn: (client: MempalaceClient) => Promise<T>): Promise<T> {
  const client = await getMempalaceClient();
  try {
    return await fn(client);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/exited|stopped|not started|EPIPE|write after end/i.test(msg)) {
      await resetMempalaceClient();
      const fresh = await getMempalaceClient();
      return await fn(fresh);
    }
    throw e;
  }
}
