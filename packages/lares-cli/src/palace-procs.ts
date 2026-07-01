/**
 * palace-procs — make the mempalace daemon/hook/capture topology OBSERVABLE.
 *
 * WHY THIS EXISTS (the daemon-spawn whack-a-mole, grounded 2026-06-28→07-01):
 *   Warm mempalace write-daemons spawn ON-DEMAND — a client `mempalace … mine
 *   --daemon` HANDS OFF to a per-palace write-daemon (`python -m mempalace.daemon
 *   serve --palace <p>`), auto-starting it if absent (capture-flush.ts). The
 *   `lares` capture + subagents + telemetry legs of the ingest hook fire on every
 *   Stop / SessionEnd / subagent-dispatch → each mints a daemon. Killing the
 *   CHILDREN (daemons) never stops the SPAWNER (the hook). The cure is to make the
 *   spawner legible: every row carries WHO SPAWNED IT, so the reader learns to
 *   kill-the-parent-not-the-children (and to `lares hooks pause` the minting).
 *
 * The parser is PURE over a `ps` table (unit-tested with fixture output); the
 * shell-out lives in {@link livePalaceProcs}. One physical palace = one write-daemon
 * (the `palace-path.ts` singleton) — a second row for the same `--palace` names a
 * spelling-drift bug the topology now surfaces.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/palace-path
 */

import { execFileSync } from "node:child_process";

/** A raw `ps -eo pid=,ppid=,etime=,args=` row, before classification. */
export interface RawProc {
  readonly pid:      number;
  readonly ppid:     number;
  /** Elapsed seconds since start, or null when unparseable / unavailable (Windows). */
  readonly etimeSec: number | null;
  readonly args:     string;
}

/**
 * The palace-integration process kinds. `holdsStore` procs pin the chroma/sqlite
 * store open (a teardown must wait for them); `mintsDaemons` procs are SPAWNERS —
 * they re-mint write-daemons on the next dispatch, so a teardown must PAUSE them
 * first (`lares hooks pause`) or they refill the store mid-tear (the ENOTEMPTY race).
 */
export type ProcKind =
  | "write-daemon"   // python -m mempalace.daemon serve --palace <p>   (the warm singleton)
  | "read-sidecar"   // python -m mempalace.mcp_server / mempalace-mcp  (recall MCP)
  | "one-shot-mine"  // mempalace … mine …                             (a direct/handoff mine)
  | "chroma"         // chromadb / chroma run                          (the vector backend)
  | "node-vessel"    // the lararium node daemon holding the WS port
  | "ingest-hook"    // lares-mempalace-ingest-hook.sh                 (the Stop/SessionEnd SPAWNER)
  | "capture-job"    // lares capture …                               (drawer leg — mints a daemon)
  | "subagents-job"  // lares subagents …                            (spirit leg — mints a daemon)
  | "telemetry-job"; // lares telemetry …                            (gradient leg — mints a daemon)

interface KindMeta {
  readonly holdsStore:   boolean;
  readonly mintsDaemons: boolean;
  /** Human label for the `serves-what` column when nothing more specific parses. */
  readonly label:        string;
}

export const KIND_META: Readonly<Record<ProcKind, KindMeta>> = {
  "write-daemon":  { holdsStore: true,  mintsDaemons: false, label: "write-daemon (warm singleton)" },
  "read-sidecar":  { holdsStore: true,  mintsDaemons: false, label: "recall MCP sidecar" },
  "one-shot-mine": { holdsStore: true,  mintsDaemons: false, label: "one-shot mine" },
  "chroma":        { holdsStore: true,  mintsDaemons: false, label: "chroma backend" },
  "node-vessel":   { holdsStore: false, mintsDaemons: false, label: "lararium node (WS port)" },
  "ingest-hook":   { holdsStore: false, mintsDaemons: true,  label: "ingest hook (SPAWNER)" },
  "capture-job":   { holdsStore: false, mintsDaemons: true,  label: "capture leg" },
  "subagents-job": { holdsStore: false, mintsDaemons: true,  label: "subagents leg" },
  "telemetry-job": { holdsStore: false, mintsDaemons: true,  label: "telemetry leg" },
};

/** A classified palace-integration process, enriched with its spawner. */
export interface PalaceProc {
  readonly pid:        number;
  readonly ppid:       number;
  readonly kind:       ProcKind;
  /** What it serves: a `--palace <path>`, a `--wing <w>`, `ws:<port>`, or the kind label. */
  readonly serves:     string;
  readonly uptimeSec:  number | null;
  /** The parent's short command (teaches kill-the-parent), or "init (orphaned)" when reparented. */
  readonly spawnerCmd: string;
  readonly holdsStore:   boolean;
  readonly mintsDaemons: boolean;
  /** The (truncated) command line. */
  readonly cmd:        string;
}

// ── etime parsing ─────────────────────────────────────────────────────────────

/** Parse a `ps` etime field ([[DD-]hh:]mm:ss) to seconds; null when unparseable. */
export function parseEtime(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "-") return null;
  // Split optional leading "DD-".
  let days = 0;
  let rest = t;
  const dash = t.indexOf("-");
  if (dash >= 0) {
    days = Number(t.slice(0, dash));
    rest = t.slice(dash + 1);
    if (!Number.isFinite(days)) return null;
  }
  const parts = rest.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  let hh = 0, mm = 0, ss = 0;
  if (parts.length === 3)      [hh, mm, ss] = parts as [number, number, number];
  else if (parts.length === 2) [mm, ss]     = parts as [number, number];
  else if (parts.length === 1) [ss]         = parts as [number];
  else return null;
  return days * 86_400 + hh * 3_600 + mm * 60 + ss;
}

// ── the pure table parser ─────────────────────────────────────────────────────

/**
 * Parse a `ps -eo pid=,ppid=,etime=,args=` dump into RawProcs. Tolerant of the
 * variable whitespace `ps` emits (pid/ppid right-padded, etime any width, args to
 * EOL). A line that does not lead with two integers + an etime token is skipped.
 */
export function parseProcTable(raw: string): RawProc[] {
  const out: RawProc[] = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!m || m[4] === undefined) continue;
    out.push({
      pid:      Number(m[1]),
      ppid:     Number(m[2]),
      etimeSec: parseEtime(m[3] ?? ""),
      args:     m[4],
    });
  }
  return out;
}

// ── classification ────────────────────────────────────────────────────────────

/**
 * The kind of a command line, or null when it is not a palace-integration process.
 * Order is load-bearing: the daemon `serve` and the MCP sidecar must be caught
 * BEFORE the generic `mempalace … mine` / `mempalace` matchers, and the bash hook
 * wrapper BEFORE its `lares capture/subagents` children (a `bash …-hook.sh` line
 * also mentions neither — it is its own kind).
 */
export function classifyKind(args: string): ProcKind | null {
  // The ingest-hook bash wrapper (the top-level SPAWNER) — match by script name.
  if (/lares-mempalace-ingest-hook/.test(args)) return "ingest-hook";
  // mempalace python module invocations.
  if (/mempalace\.daemon\b.*\bserve\b|\bdaemon\.py\b.*\bserve\b/.test(args)) return "write-daemon";
  if (/mempalace[._-]mcp(_server)?|mempalace\.mcp_server|mempalace-mcp/.test(args)) return "read-sidecar";
  // A `mempalace … mine …` (console script, `-m mempalace … mine`, or a direct mine).
  if (/\bmempalace\b.*\bmine\b/.test(args)) return "one-shot-mine";
  // The chroma vector backend (rare as a standalone proc, but possible).
  if (/\bchromadb\b|\bchroma\s+run\b|\bchroma\.cli\b/.test(args)) return "chroma";
  // The `lares` hook legs — each mints a daemon on the next dispatch.
  if (/\blares\b.*\bcapture\b/.test(args))   return "capture-job";
  if (/\blares\b.*\bsubagents\b/.test(args)) return "subagents-job";
  if (/\blares\b.*\btelemetry\b/.test(args)) return "telemetry-job";
  return null;
}

/** Extract the `serves-what` cell for a classified proc. */
function servesOf(kind: ProcKind, args: string, port?: number): string {
  if (kind === "node-vessel") return port ? `ws:${port}` : "WS port";
  const palace = args.match(/--palace(?:[=\s])(\S+)/);
  const wing   = args.match(/--wing(?:[=\s])(\S+)/);
  // The `lares` hook legs are keyed by their WING (their domain); a stray `--palace`
  // in a shell-snapshot wrapper is misleading, so prefer the wing for those kinds.
  const wingFirst = kind === "capture-job" || kind === "subagents-job" || kind === "telemetry-job";
  const pick = wingFirst ? (wing?.[1] ?? palace?.[1]) : (palace?.[1] ?? wing?.[1]);
  return pick ?? KIND_META[kind].label;
}

/** Shorten a command line, keeping the HEAD (for the full-cmd cell). */
function shortCmd(args: string, max = 140): string {
  const t = args.trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

/**
 * Shorten a SPAWNER command, keeping the TAIL — the informative bit of a parent is
 * the end (the `…/lares-mempalace-ingest-hook.sh`, the `lares capture … --wing w`),
 * never the leading `bash /very/long/path`. So front-elide when over `max`.
 */
function shortSpawner(args: string, max = 80): string {
  const t = args.trim();
  return t.length <= max ? t : "…" + t.slice(t.length - (max - 1));
}

/**
 * Classify a `ps` table into the palace topology, resolving each proc's SPAWNER
 * from the same table (parent's args, or "init (orphaned)" when reparented to 1).
 * `selfPid` drops our own `ps`-launching process; `vesselPids` marks the WS-port
 * holder(s) as the node vessel (looked up out-of-band via the OS port table).
 */
export function classifyPalaceProcs(
  table: readonly RawProc[],
  opts: { selfPid?: number; vesselPids?: readonly number[]; vesselPort?: number } = {},
): PalaceProc[] {
  const byPid = new Map<number, RawProc>();
  for (const p of table) byPid.set(p.pid, p);
  const self = opts.selfPid ?? -1;
  const vessel = new Set(opts.vesselPids ?? []);

  const out: PalaceProc[] = [];
  for (const p of table) {
    if (p.pid === self) continue;
    let kind = classifyKind(p.args);
    if (kind === null && vessel.has(p.pid)) kind = "node-vessel";
    if (kind === null) continue;

    const parent = byPid.get(p.ppid);
    const spawnerCmd = p.ppid <= 1 || parent === undefined
      ? "init (orphaned)"
      : shortSpawner(parent.args);
    const meta = KIND_META[kind];
    out.push({
      pid:          p.pid,
      ppid:         p.ppid,
      kind,
      serves:       servesOf(kind, p.args, opts.vesselPort),
      uptimeSec:    p.etimeSec,
      spawnerCmd,
      holdsStore:   meta.holdsStore,
      mintsDaemons: meta.mintsDaemons,
      cmd:          shortCmd(p.args, 140),
    });
  }
  // Stable order: holders first (the teardown blockers), then spawners, by pid.
  const rank = (k: ProcKind): number => (KIND_META[k].holdsStore ? 0 : KIND_META[k].mintsDaemons ? 2 : 1);
  return out.sort((a, b) => rank(a.kind) - rank(b.kind) || a.pid - b.pid);
}

// ── the live shell-out ────────────────────────────────────────────────────────

/** Read the live `ps` table (POSIX) or a coarse tasklist (Windows). Best-effort — empty on failure. */
function readProcTable(): RawProc[] {
  try {
    if (process.platform === "win32") {
      // Windows ships no `ps`; tasklist gives no ppid/etime, so uptime + spawner
      // stay unknown there. Best-effort: PID + image name only (advisory).
      const raw = execFileSync("tasklist", ["/fo", "csv", "/nh"], { encoding: "utf8", maxBuffer: 1 << 24 });
      const out: RawProc[] = [];
      for (const line of raw.split("\n")) {
        const m = line.match(/^"([^"]*)","(\d+)"/);
        if (!m || m[1] === undefined) continue;
        out.push({ pid: Number(m[2]), ppid: 0, etimeSec: null, args: m[1] });
      }
      return out;
    }
    const raw = execFileSync("ps", ["-eo", "pid=,ppid=,etime=,args="], { encoding: "utf8", maxBuffer: 1 << 24 });
    return parseProcTable(raw);
  } catch {
    return [];
  }
}

/**
 * The live palace topology — every mempalace daemon / recall sidecar / one-shot
 * mine / chroma / `lares` hook-leg + ingest-hook, plus the node vessel (the WS-port
 * holder), each with its SPAWNER. `vesselPids` is passed in by the caller (it owns
 * the OS port-table read via port-control, avoiding a dep cycle).
 */
export function livePalaceProcs(opts: { vesselPids?: readonly number[]; vesselPort?: number } = {}): PalaceProc[] {
  return classifyPalaceProcs(readProcTable(), {
    selfPid: process.pid,
    ...(opts.vesselPids !== undefined ? { vesselPids: opts.vesselPids } : {}),
    ...(opts.vesselPort !== undefined ? { vesselPort: opts.vesselPort } : {}),
  });
}

/** Format an uptime in seconds as a compact `Nd`/`Nh`/`Nm`/`Ns` string; "—" when unknown. */
export function fmtUptime(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3_600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86_400) return `${Math.floor(sec / 3_600)}h${Math.floor((sec % 3_600) / 60)}m`;
  return `${Math.floor(sec / 86_400)}d${Math.floor((sec % 86_400) / 3_600)}h`;
}
