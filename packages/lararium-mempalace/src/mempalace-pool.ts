/**
 * mempalace-pool — the warm, reused READ client: ONE python reader, held for the daemon's life.
 *
 * The store lives in py; the TS @daemon points at it and proxies, computing nothing and holding no
 * payload. The reader NAMES its palace (`palacePath` → `--palace <path>`): it reads the sovereign
 * `<memory>/content`, the plane the capture path fills every turn. An unnamed palace would fall back to
 * whatever `~/.mempalace/config.json` happens to name — a silent reach into the guest comparator, and
 * a store the vessel writes but never reads.
 *
 * ONE reader, pooled for the daemon's lifetime — never one per call, never one per harness session.
 * The @daemon coordinates a py reader; it never becomes one. The first recall pays the chromadb cold
 * start; every recall after runs warm, which keeps recall-into-wake fast.
 *
 * Read-only: the pool hands back a client whose tools cover list/get/search, and nothing more.
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
