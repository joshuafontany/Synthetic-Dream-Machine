/**
 * wing-law — the ONE per-project wing derivation, extracted from harvest.ts so every
 * consumer (harvest · capture · `lares wing-of` · the ingest hook via `wing-of`) reads
 * the SAME law instead of mirroring it per language. The bash mirror in the ingest hook
 * survives only as the broken-dist FALLBACK; the cross-language fixture
 * (tests/ingest-hook-wing.test.ts) pins the agreement.
 *
 * The wing names the AI PROJECT a transcript belongs to — derived from the transcript's
 * RECORDED cwd (rows carry it), never the live payload cwd (it drifts with every agent cd).
 */

import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** Derive a per-project wing slug from a directory/cwd name. */
export function wingFromDir(dir: string): string {
  const slug = basename(dir).toLowerCase().replace(/[ -]/g, "_").replace(/[^a-z0-9_]/g, "");
  return `wing_${slug || "unsorted"}`;
}

/** Recover the real cwd a transcript ran in (rows carry it), to derive a stable wing. */
export function readCwdFromTranscript(jsonl: string): string | null {
  try {
    const lines = readFileSync(jsonl, "utf8").split("\n");
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const l = lines[i];
      if (!l || !l.trim()) continue;
      try {
        const r = JSON.parse(l) as Record<string, unknown>;
        if (typeof r["cwd"] === "string" && r["cwd"]) return r["cwd"];
      } catch { /* skip torn line */ }
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Resolve a transcript's wing — the hook's project-cwd law: read the recorded cwd from the
 * FIRST sibling transcript in the project dir (the dir's stable identity, discoverClaude
 * parity), then from the transcript itself; null when neither carries one (the caller keeps
 * its own fallback ladder — the hook falls to payload cwd → PWD).
 */
export function resolveTranscriptWing(transcript: string): string | null {
  const dir = dirname(transcript);
  let firstSibling: string[] = [];
  try {
    firstSibling = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort().slice(0, 1)
      .map((f) => join(dir, f));
  } catch { /* unreadable dir — fall through to the transcript itself */ }
  for (const p of [...firstSibling, transcript]) {
    const cwd = readCwdFromTranscript(p);
    if (cwd) return wingFromDir(cwd);
  }
  return null;
}
