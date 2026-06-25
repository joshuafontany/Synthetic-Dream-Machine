/**
 * mempalace-pool — a warm, reused read-client so the sidecar stays alive between
 * recall calls.
 *
 * MempalaceClient spawns `python -m mempalace.mcp_server` and cold-starts chromadb
 * (~8s) on every `start()`. Recall (and recall-into-wake at boot) called it
 * fresh-per-call → an 8s tax each time. This pool starts the sidecar ONCE (lazily)
 * and reuses it, self-healing if it dies. First recall pays the cold start; every
 * recall after is warm (sub-second). The @admin seat holds the warm client for the
 * whole daemon lifetime — this is what makes recall-into-wake fast.
 *
 * Read-only: the pool only ever hands back a client whose tools are list/get/search.
 */

import { MempalaceClient } from "./mempalace-client.js";
import { resolveMempalaceSpawn } from "./spawn-resolve.js";

let pooled: MempalaceClient | null = null;
let starting: Promise<MempalaceClient> | null = null;

async function open(): Promise<MempalaceClient> {
  const spawn = resolveMempalaceSpawn();
  if (!spawn.sidecarPresent) throw new Error("mempalace submodule absent — run `lares wake --install`");
  if (!spawn.python) throw new Error("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const client = new MempalaceClient({ submoduleRoot: spawn.submoduleRoot, python: spawn.python });
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
