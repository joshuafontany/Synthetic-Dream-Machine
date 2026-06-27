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

import { larRoot, larDataDir } from "../env.js";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "node:net";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import { emit } from "../render.js";
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

export async function cmdStatus(args: ParsedArgs): Promise<number> {
  const root      = larRoot();   // corpus root (genesis); vessel state roots in the home
  const storage   = larDataDir();   // runtime → ~/.lares/.lararium
  const bootstrap = join(root, "genesis", "social-bootstrap.json");
  const portRaw   = process.env["LAR_PORT"] ?? "8080";
  const port      = Number(portRaw);

  const portInUse  = await probePort(port);
  const hasBoot    = existsSync(bootstrap);
  const storageStr = dirSizeHint(storage);

  // Snapshot fields — the same data the prose renders, shaped for an agent.
  const data: Record<string, unknown> = {
    bootstrap: hasBoot ? "present" : "absent",
    storage:   storageStr,
    port,
    portInUse,
  };
  let residencyLine: string | null = null;

  // C.4 — when the daemon is up, ask it for a residency snapshot. Cheap
  // call (one verb-tiddler round-trip); if anything fails, fall through
  // silently — `lares status` stays cheap and never errors.
  if (portInUse) {
    try {
      const { summaryOutput } = await import("../daemon-connector.js");
      const { runVerb } = await import("../verb-call.js");
      const { loadVesselVerifyingKey } = await import("@lararium/node");
      // UDS fast path, WS fallback (the lares↔lararium binding). Cheap probe;
      // any failure falls through silently — `lares status` never errors. The
      // residency verb is cap-gated, so it needs the real operator did (a non-did
      // requestedBy cap-errors quietly — the old "lares-status" label always did).
      const did = "0x" + (await loadVesselVerifyingKey(larDataDir()));
      const r = await runVerb("residency", {}, did, { timeoutMs: 2000 });
      if (r.status === "done") {
        const stats   = summaryOutput(r) ?? {};
        const pinned  = (stats["pinned"] ?? []) as string[];
        const wela    = (stats["wela"]   ?? []) as Array<{ url: string }>;
        const anuCnt  = stats["anuCount"] as number;
        const hotCap  = stats["hotCap"]   as number;
        data["residency"] = { pinned: pinned.length, wela: wela.length, hotCap, anu: anuCnt };
        residencyLine = `${pinned.length} pinned · ${wela.length}/${hotCap} wela · ${anuCnt} anu`;
      }
    } catch {
      // Daemon up but residency probe failed — quiet.
    }
  }

  emit(args, {
    ok: true,
    data,
    human: () => {
      console.log("lares status (local node)");
      console.log(`  bootstrap:   ${hasBoot ? "present" : "absent (run `lares init`)"}`);
      console.log(`  storage:     ${storageStr}`);
      console.log(`  port ${port}:  ${portInUse ? "in use (node likely running)" : "free"}`);
      if (residencyLine) console.log(`  residency:   ${residencyLine}`);
    },
  });
  return 0;
}
