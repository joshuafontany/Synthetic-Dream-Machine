/**
 * `lares status` — quick health snapshot for the lararium node.
 *
 * Probes:
 *   - genesis/social-bootstrap.json presence (init has run)
 *   - .lararium/ storage directory presence + size hint
 *   - whether the LAR_PORT (default 8080) is in use (a node process likely runs)
 *
 * No vm boot — pure local inspection. This command stays cheap so operators
 * can run it freely during a session.
 */

import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "node:net";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import type { ParsedArgs } from "../parse-args.js";

function dirSizeHint(dir: string): string {
  if (!existsSync(dir)) return "(absent)";
  let bytes = 0;
  let count = 0;
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else { try { bytes += statSync(full).size; count++; } catch { /* race; skip */ } }
    }
  };
  try { walk(dir); } catch { return "(unreadable)"; }
  return `${count} files, ${(bytes / 1024).toFixed(1)} KiB`;
}

function probePort(port: number, host = "127.0.0.1", timeoutMs = 200): Promise<boolean> {
  return new Promise((resolveP) => {
    const sock = createConnection({ port, host });
    const done = (open: boolean): void => {
      sock.removeAllListeners();
      sock.destroy();
      resolveP(open);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("error",   () => done(false));
    sock.once("timeout", () => done(false));
  });
}

export async function cmdStatus(_args: ParsedArgs): Promise<number> {
  const nodePkg   = join(REPO_ROOT, "packages", "lararium-node");
  const storage   = join(nodePkg, ".lararium");
  const bootstrap = join(nodePkg, "genesis", "social-bootstrap.json");
  const portRaw   = process.env["LAR_PORT"] ?? "8080";
  const port      = Number(portRaw);

  const portInUse = await probePort(port);

  console.log("lares status");
  console.log(`  bootstrap:   ${existsSync(bootstrap) ? "present" : "absent (run `lares init`)"}`);
  console.log(`  storage:     ${dirSizeHint(storage)}`);
  console.log(`  port ${port}:  ${portInUse ? "in use (node likely running)" : "free"}`);

  // C.4 — when the daemon is up, ask it for a residency snapshot. Cheap
  // call (one job-tiddler round-trip); if anything fails, fall through
  // silently — `lares status` stays cheap and never errors.
  if (portInUse) {
    try {
      const { connectAdminVessel, submitJob, summaryOutput } = await import("../admin-connector.js");
      const vessel = await connectAdminVessel({});
      try {
        const r = await submitJob(vessel, "residency", {}, "lares-status", { timeoutMs: 2000 });
        if (r.status === "done") {
          const stats   = summaryOutput(r) ?? {};
          const pinned  = (stats["pinned"] ?? []) as string[];
          const hot     = (stats["hot"]    ?? []) as Array<{ url: string }>;
          const coldCnt = stats["coldCount"] as number;
          const hotCap  = stats["hotCap"]    as number;
          console.log(`  residency:   ${pinned.length} pinned · ${hot.length}/${hotCap} hot · ${coldCnt} cold`);
        }
      } finally {
        await vessel.disconnect();
      }
    } catch {
      // Daemon up but residency probe failed — quiet.
    }
  }

  return 0;
}
