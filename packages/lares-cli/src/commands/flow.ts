/**
 * `lares flow` — the READ-ONLY flow gauges for the capture/harvest tide, one screen.
 *
 * Five gauges, all pure local inspection (no vm boot, no daemon call, cheap statSync reads —
 * runnable freely mid-session):
 *   1. WAL          — capture-WAL size in BYTES (statSync, never a full-file read): the sink-
 *                     pressure surface the harvest pacer reads (the same cheap stat).
 *   2. watermarks   — per-wing capture watermark freshness: entry count + mtime age of
 *                     `<state>/harvest/<wing>.capture-state.json`.
 *   3. lag          — per-wing last-transcript vs last-captured lag (Claude surface): newest
 *                     transcript mtime in each ~/.claude/projects dir vs its wing's watermark
 *                     mtime — positive seconds = turns landed after the last capture.
 *   4. palace       — live palace topology one-liner (livePalaceProcs, the mempalace-status
 *                     machinery reused).
 *   5. port         — daemon WS port probe (LAR_PORT, the status.ts probe reused).
 *
 * One surface, two actors: prose on a TTY, the deterministic payload under `--json` (render.ts).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { larDataDir, larHarvestDir, larPort } from "../env.js";
import { wingFromDir, readCwdFromTranscript } from "../wing-law.js";
import { livePalaceProcs, fmtUptime, type PalaceProc } from "../palace-procs.js";
import { portHolderPids } from "../port-control.js";
import { probePort } from "./status.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

interface WalGauge { readonly path: string; readonly bytes: number; readonly ageSec: number | null }
interface WingGauge {
  readonly wing: string;
  /** captured-turn entries in the watermark (the idempotency keys). */
  readonly entries: number;
  /** seconds since the watermark last moved (last captured turn). */
  readonly watermarkAgeSec: number;
  /** seconds the newest transcript outruns the watermark (0 = caught up); null = no transcript seen. */
  readonly lagSec: number | null;
}

/** Gauge 1 — the capture WAL, by cheap stat (bytes = the sink-pressure surface). */
function readWalGauge(): WalGauge | null {
  const path = join(larDataDir(), "capture-nalu", "wal.ndjson");
  try {
    const st = statSync(path);
    return { path, bytes: st.size, ageSec: Math.round((Date.now() - st.mtimeMs) / 1000) };
  } catch {
    return null; // no WAL — daemon never captured / already compacted
  }
}

/** Newest-transcript mtime per wing, from the Claude projects tree (the cheap lag side). */
function newestTranscriptByWing(): Map<string, number> {
  const out = new Map<string, number>();
  const root = join(homedir(), ".claude", "projects");
  let dirs: string[] = [];
  try { dirs = readdirSync(root); } catch { return out; }
  for (const d of dirs) {
    const dir = join(root, d);
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    if (!files.length) continue;
    let newest = 0;
    for (const f of files) {
      try { newest = Math.max(newest, statSync(join(dir, f)).mtimeMs); } catch { /* race — skip */ }
    }
    // Wing by the recorded cwd of the dir's FIRST transcript (the discoverClaude law).
    const first = files.sort()[0];
    const cwd = first ? readCwdFromTranscript(join(dir, first)) : null;
    if (!cwd) continue;
    const wing = wingFromDir(cwd);
    out.set(wing, Math.max(out.get(wing) ?? 0, newest));
  }
  return out;
}

/** Gauges 2+3 — per-wing watermark freshness + transcript lag. */
function readWingGauges(): WingGauge[] {
  const dir = larHarvestDir();
  let files: string[] = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith(".capture-state.json")); } catch { return []; }
  const newest = newestTranscriptByWing();
  const now = Date.now();
  const out: WingGauge[] = [];
  for (const f of files.sort()) {
    const wing = f.slice(0, -".capture-state.json".length);
    const path = join(dir, f);
    try {
      const st = statSync(path);
      let entries = 0;
      try { entries = Object.keys(JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>).length; }
      catch { /* torn write — freshness still reads */ }
      const t = newest.get(wing);
      out.push({
        wing,
        entries,
        watermarkAgeSec: Math.round((now - st.mtimeMs) / 1000),
        lagSec: t === undefined ? null : Math.max(0, Math.round((t - st.mtimeMs) / 1000)),
      });
    } catch { /* watermark vanished mid-read — skip */ }
  }
  return out;
}

/** Gauge 4 — the palace topology, one line (counts per kind from the live proc table). */
function palaceTopology(port: number): { procs: PalaceProc[]; line: string } {
  let vesselPids: number[] = [];
  try { vesselPids = portHolderPids(port); } catch { /* advisory */ }
  const procs = livePalaceProcs({ vesselPids, vesselPort: port });
  if (!procs.length) return { procs, line: "quiet — no live palace process" };
  const byKind = new Map<string, number>();
  for (const p of procs) byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
  const line = [...byKind.entries()].sort().map(([k, n]) => `${n} ${k}`).join(" · ");
  return { procs, line };
}

const fmtBytes = (b: number): string =>
  b < 1024 ? `${b} B` : b < 1 << 20 ? `${(b / 1024).toFixed(1)} KiB` : `${(b / (1 << 20)).toFixed(1)} MiB`;

export async function cmdFlow(args: ParsedArgs): Promise<number> {
  const port = larPort();
  const wal = readWalGauge();
  const wings = readWingGauges();
  const { procs, line: palaceLine } = palaceTopology(port);
  const portOpen = await probePort(port);

  emit(args, {
    ok: true,
    data: {
      wal: wal ?? { path: join(larDataDir(), "capture-nalu", "wal.ndjson"), bytes: 0, ageSec: null },
      wings,
      palace: procs.map((p) => ({ pid: p.pid, kind: p.kind, uptimeSec: p.uptimeSec })),
      port,
      portOpen,
    },
    human: () => {
      console.log("lares flow — the capture/harvest tide (read-only)\n");
      if (wal) console.log(`  WAL:         ${fmtBytes(wal.bytes)}  (last write ${fmtUptime(wal.ageSec)} ago)  ${wal.path}`);
      else console.log("  WAL:         drained/absent — no sink pressure");
      if (wings.length) {
        console.log("  watermarks:");
        for (const w of wings) {
          const lag = w.lagSec === null ? "no transcript seen" : w.lagSec === 0 ? "caught up" : `lag ${fmtUptime(w.lagSec)}`;
          console.log(`    ${w.wing.padEnd(42)} ${String(w.entries).padStart(5)} turns · moved ${fmtUptime(w.watermarkAgeSec)} ago · ${lag}`);
        }
      } else {
        console.log("  watermarks:  none — no wing captured yet");
      }
      console.log(`  palace:      ${palaceLine}`);
      console.log(`  daemon:      port ${port} ${portOpen ? "OPEN (vessel up)" : "closed (vessel down)"}`);
    },
  });
  return 0;
}
