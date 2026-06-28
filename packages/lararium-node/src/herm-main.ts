/**
 * herm-main — the runnable Herm (Lares Viales) entrypoint. Assembles the real deps an ephemeral
 * wayfarer needs — an HTTP server, an in-memory Repo, a fresh signer (anon, self-certifying), an
 * empty mesh-palace — and stands a {@link createHerm} over them. No daemon VM, no wiki, no keyhive:
 * a Herm is a minimal composition, built UP from its caps, never a Lararium with skips.
 *
 * `startHerm` is the testable boot; the env entrypoint at the foot reads HERM_PORT / HERM_PEERS /
 * HERM_STORAGE for a container. Per the ruling, a Herm boots PERMISSIONLESSLY (its own key, anon) —
 * every leyline it forms is a separately-signed PEER/TRANSIT edge, not a blessing.
 *
 * Canon: lar:///ha.ka.ba/@lararium/mesh/vessel-caps#lares-viales
 */

import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Repo } from "@automerge/automerge-repo";
import { defaultCryptoProvider, type MeshPalaceDoc } from "@lararium/mesh";
import { createHerm, type Herm } from "./herm.js";

export interface StartHermOpts {
  /** Listen port; 0 = an ephemeral OS-assigned port. */
  readonly port:            number;
  /** Peer base URLs whose FLOW-maps this Herm carries. */
  readonly peers:           readonly string[];
  /** Dir for the read-face's monotone-pointer state (ephemeral is fine for a Herm). */
  readonly storageDir:      string;
  /** Signer seed; default a fresh random 32 bytes (an anon, self-certifying wayfarer). */
  readonly signerSeed?:     Uint8Array;
  readonly pullIntervalMs?: number;
  readonly onLog?:          (line: string) => void;
}

export interface RunningHerm {
  readonly port:  number;
  readonly herm:  Herm;
  readonly close: () => Promise<void>;
}

/** Stand a runnable Herm: an HTTP server + Repo + anon signer, carrying its peers' FLOW-maps. */
export async function startHerm(opts: StartHermOpts): Promise<RunningHerm> {
  const httpServer = createServer();
  await new Promise<void>((resolve) => httpServer.listen(opts.port, "0.0.0.0", resolve));
  const port = (httpServer.address() as { port: number }).port;

  const repo = new Repo({ sharePolicy: async () => true });
  const meshPalaceHandle = repo.create<MeshPalaceDoc>({ schemaVersion: "0.1", tiddlers: {} });
  const signerSeed = opts.signerSeed ?? defaultCryptoProvider.getRandomValues(new Uint8Array(32));

  const herm = await createHerm({
    httpServer, meshPalaceHandle, signerSeed, storageDir: opts.storageDir, peers: opts.peers,
    ...(opts.pullIntervalMs !== undefined ? { pullIntervalMs: opts.pullIntervalMs } : {}),
    ...(opts.onLog ? { onLog: opts.onLog } : {}),
  });
  opts.onLog?.(`herm: listening on :${port}, carrying ${opts.peers.length} peer(s)`);

  return {
    port, herm,
    close: async () => {
      herm.dispose();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

/** Boot a Herm from the container env: HERM_PORT, HERM_PEERS (comma-separated), HERM_STORAGE. */
export async function mainFromEnv(): Promise<void> {
  const port = Number.parseInt(process.env["HERM_PORT"] ?? "8080", 10);
  const peers = (process.env["HERM_PEERS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const storageDir = process.env["HERM_STORAGE"] ?? mkdtempSync(join(tmpdir(), "herm-"));
  const running = await startHerm({ port, peers, storageDir, onLog: (l) => console.log(l) });

  const shutdown = (): void => { void running.close().then(() => process.exit(0)); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Run when invoked as the node entrypoint (the container), not when imported (tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void mainFromEnv();
}
