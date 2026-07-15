/**
 * doctor (node) — the nodefs read-side of the health sweep. Enumerates every doc in a
 * NodeFS store root, probes each through the L1 child_process boundary, and hands back the
 * isomorphic `DoctorReport`. Read-only — the `git fsck` role. `lares status vessel` renders
 * it; recovery rides the existing `lares regenesis` (CRDT rebirth from bags/), never a new
 * verb.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sweepDocs, type DoctorReport } from "@lararium/mesh";
import { makeChildProcessDocLoadProbe } from "./doc-load-probe.js";

const SHARD_RE = /^[0-9A-Za-z]{2}$/;

/**
 * List every documentId stored under a NodeFS root. A doc lives at
 * `<root>/<shard2>/<rest>/{snapshot,incremental}` — the id reads back as `shard2 + rest`.
 * The aux dirs (`cas`, `capture-nalu`, `daemon`/`lares` sub-stores, quarantine folders)
 * carry no 2-char shard name and drop out.
 */
export function enumerateStoreDocs(storageDir: string): string[] {
  const out: string[] = [];
  let shards: string[];
  try {
    shards = readdirSync(storageDir);
  } catch {
    return out;
  }
  for (const shard of shards) {
    if (!SHARD_RE.test(shard)) continue;
    const shardPath = join(storageDir, shard);
    try {
      if (!statSync(shardPath).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const rest of readdirSync(shardPath)) {
      const docPath = join(shardPath, rest);
      try {
        if (!statSync(docPath).isDirectory()) continue;
      } catch {
        continue;
      }
      if (existsSync(join(docPath, "snapshot")) || existsSync(join(docPath, "incremental"))) {
        out.push(shard + rest);
      }
    }
  }
  return out;
}

/** Probe every doc in the store and tally the health chart. Read-only. */
export async function runDoctor(
  storageDir: string,
  opts: { concurrency?: number } = {},
): Promise<DoctorReport> {
  const ids = enumerateStoreDocs(storageDir);
  const probe = makeChildProcessDocLoadProbe(storageDir);
  return sweepDocs(ids, probe, { concurrency: opts.concurrency ?? 4 });
}

/** Render a DoctorReport as an operator-facing prose block. */
export function formatDoctorReport(report: DoctorReport, storageDir: string): string {
  const lines: string[] = [];
  lines.push(`vessel doctor — ${storageDir}`);
  lines.push(`  ${report.total} docs · ${report.healthy} healthy · ${report.condemned} condemned`);
  const bad = report.entries.filter((e) => e.status !== "ok").sort((a, b) => a.documentId.localeCompare(b.documentId));
  if (bad.length === 0) {
    lines.push(`  all clean ✓`);
  } else {
    lines.push(`  condemned:`);
    for (const e of bad) {
      lines.push(`    ${e.documentId}  [${e.status}]  ${e.reason ?? ""}`.trimEnd());
    }
    lines.push(`  recover with: lares regenesis`);
  }
  return lines.join("\n");
}
