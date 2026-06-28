/**
 * lares watch — the disk→records gesture, fired on a settle instead of an
 * operator keystroke (NEXT VECTOR build 4: the watcher daemon, last).
 *
 *   lares watch --source <dir> --to <bagUri> [--apply] [--port N] [--debounce ms]
 *
 * A nalu-builder for the disk peer. Disk events are HINTS (§6); the watcher
 * coalesces a settle-window into ONE wave — one scan, one INGEST verb, one
 * projection — never per-file dribbles. Default posture previews (logs what a
 * wave WOULD carry); --apply submits each wave through the island's §6 gate.
 *
 * Settle, by the §6 law: a buffered path drains only after the events quiet
 * (trailing debounce) AND the scan's own hash gate confirms a real change — a
 * no-op save drops at the gate, never a timer alone. The watcher holds ONE
 * vessel connection across every wave of its life; the gesture re-opened one
 * per keystroke.
 *
 * Deletion (moʻolelo 2026-06-14): a vanished carrier enters a ~60s grace window
 * (separate from the edit debounce); a transient delete (git checkout flood)
 * self-heals when its path scans present again; a real delete rides the wave as
 * a `deletions[]` entry once due, OR rides EARLY when a candidate add shares its
 * synced-hash (a rename — the island re-links rather than tombstone+create).
 * The island gate applies the mass-delete brake (`--delete-fraction`).
 *
 * OWED: the file-grain rolling backup (`.stversions`-style) belongs at the
 * PROJECTOR (backup-on-write) — content is gone from disk by the time a delete
 * is seen here. Tracked as a burr; the CRDT op-log covers recovery until epoch.
 *
 * Meme: lar:///ha.ka.ba/@lares/docs/lares/handoff (NEXT VECTOR, build 4)
 */

import { watch as fsWatch, writeFileSync, rmSync, type FSWatcher } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import type { ParsedArgs } from "../parse-args.js";
import { emit } from "../render.js";
import { connectDaemonVessel, summaryOutput, type DaemonVesselHandle } from "../daemon-connector.js";
import { larRoot, operatorDid } from "../env.js";
import { openSyncedTree, scanFiles, candidatesOf, deletionsOf, submitIngestOn, type PendingDeletion } from "../ingest-core.js";

const DEFAULT_DEBOUNCE_MS = 400;   // twillm's field-tested trailing window
const COOKIE_TIMEOUT_MS   = 2_000; // a live backend echoes our own write well under this
const DEFAULT_DELETE_GRACE_MS = 60_000;     // Syncthing's delete-pairing window (moʻolelo 2026-06-14)
const DEFAULT_MASS_DELETE_FRACTION = 0.25;  // tombstones above this fraction of the bag suspend

/** Editor litter and our own projection sidecar never count as carrier events. */
function isNoise(rel: string): boolean {
  if (!rel.endsWith(".md")) return true;
  if (rel.includes(".lararium-projection")) return true;
  if (rel.includes("/.git/") || rel.startsWith(".git/")) return true;
  const base = rel.split("/").pop() ?? rel;
  if (base.startsWith(".") || base.endsWith("~") || base.endsWith(".swp") || base === "4913") return true;
  return false;
}

function printUsage(): void {
  console.log("usage: lares watch --source <dir> --to <bagUri> [--apply] [--port N] [--debounce ms] [--delete-grace ms] [--delete-fraction f]");
  console.log("  default = preview (logs what each settle WOULD ingest, submits nothing);");
  console.log("  --apply submits each settled wave through the island's INGEST gate;");
  console.log("  --delete-grace ms  hold a vanished carrier before tombstoning (default 60000);");
  console.log("  --delete-fraction f  suspend a wave whose tombstones exceed f of the bag (default 0.25).");
}

export async function cmdWatch(args: ParsedArgs): Promise<number> {
  const source = args.options["source"];
  const toBag  = args.options["to"];
  if (!source || !toBag) { printUsage(); return 2; }

  const root      = larRoot();
  const apply     = Boolean(args.flags["apply"]);
  const debounceMs = args.options["debounce"] ? Number(args.options["debounce"]) : DEFAULT_DEBOUNCE_MS;
  const deleteGraceMs = args.options["delete-grace"] ? Number(args.options["delete-grace"]) : DEFAULT_DELETE_GRACE_MS;
  const massDeleteFraction = args.options["delete-fraction"] ? Number(args.options["delete-fraction"]) : DEFAULT_MASS_DELETE_FRACTION;

  // One vessel + one operator identity for the whole life of the watch (the
  // gesture re-opened these per keystroke; the daemon holds them open).
  let vessel: DaemonVesselHandle | undefined;
  let did = "";
  if (apply) {
    try { did = await operatorDid(); } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit(args, { ok: false, error: msg, human: () => console.error(`lares watch: ${msg}`) });
      return 3;
    }
    try {
      const portOpt = args.options["port"];
      vessel = await connectDaemonVessel(portOpt ? { port: Number(portOpt) } : {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit(args, { ok: false, error: msg, human: () => { console.error(`lares watch: ${msg}`); console.error("  Start the daemon with `lares serve` and try again."); } });
      return 3;
    }
  }

  // ── the drain seat — one wave at a time (recipe-watch kick, disk-side) ──
  const buffer = new Set<string>();        // absolute carrier paths pending a wave
  // Vanished carriers held in the grace window: a real delete waits for a
  // possibly-lagging paired add (rename) before it tombstones; a transient
  // delete (git checkout flood) self-heals when its path scans present again.
  const pendingDeletes = new Map<string, { syncedHash: string; deadline: number }>();
  let busy  = false;
  let rerun = false;
  let timer: NodeJS.Timeout | null = null;
  let waveNo = 0;

  const drain = async (): Promise<void> => {
    const now = Date.now();
    const files = [...buffer];
    buffer.clear();

    const tree = openSyncedTree();     // fresh read — the projection moves under us
    const { rows, skipped } = scanFiles(root, files, toBag, tree);
    const candidates = candidatesOf(rows);

    // A pending delete whose path scanned present again has RETURNED — drop it
    // (the transient-delete self-heal: a checkout that re-creates the file).
    for (const r of rows) if (r.status !== "deleted" && pendingDeletes.has(r.uri)) pendingDeletes.delete(r.uri);
    // Newly-vanished carriers enter the grace window; wake to flush at expiry.
    for (const d of deletionsOf(rows)) {
      if (!pendingDeletes.has(d.uri)) {
        pendingDeletes.set(d.uri, { syncedHash: d.syncedHash, deadline: now + deleteGraceMs });
        setTimeout(kick, deleteGraceMs + 50);
      }
    }

    // Which pending deletes ride THIS wave: DUE (grace expired) OR PAIRED (a
    // candidate add shares its synced-hash — a rename; ride together so the
    // island re-links rather than tombstone+create).
    const addHashes = new Set(candidates.map((c) => c.diskHash));
    const ride: PendingDeletion[] = [];
    for (const [uri, p] of pendingDeletes) {
      if (p.deadline <= now || addHashes.has(p.syncedHash)) ride.push({ uri, syncedHash: p.syncedHash });
    }
    for (const d of ride) pendingDeletes.delete(d.uri);

    if (candidates.length === 0 && ride.length === 0) {
      if (rows.length > 0) console.log(`  ${rows.length} touched · 0 changed (all match the Synced tree)`);
      return;
    }
    const n = ++waveNo;

    if (!apply || !vessel) {
      console.log(`  wave ${n} (preview): ${candidates.length} change(s), ${ride.length} deletion(s) of ${rows.length} touched`);
      for (const r of candidates) console.log(`    ${r.status.toUpperCase().padEnd(8)} ${r.uri}`);
      for (const d of ride)       console.log(`    DELETE   ${d.uri}`);
      if (skipped.length) console.log(`    (${skipped.length} skipped — outside bags/ or unreadable)`);
      return;
    }

    try {
      const result = await submitIngestOn(vessel, { source, toBag, candidates, did, deletions: ride, massDeleteFraction });
      if (result.status === "error") {
        console.error(`  wave ${n}: INGEST failed — ${result.errorMessage ?? "unknown"}`);
        return;
      }
      const summary  = summaryOutput(result) ?? {};
      const carriers = (summary as { carriers?: Array<Record<string, unknown>> })["carriers"] ?? [];
      const del      = (summary as { deletions?: Record<string, unknown> })["deletions"];
      console.log(`  wave ${n}: ${candidates.length} change(s) + ${ride.length} deletion(s) submitted · audit lar:///ha.ka.ba/@daemon/outcomes/${result.requestId}`);
      for (const c of carriers) console.log(`    ${String(c["decision"]).toUpperCase().padEnd(10)} ${c["uri"]}`);
      if (del && (del as { decision?: string })["decision"] === "suspend") {
        console.error(`    ⚠ mass-delete brake TRIPPED — ${String((del as { reason?: string })["reason"] ?? "")}; nothing applied, re-run to confirm.`);
      }
    } catch (err) {
      console.error(`  wave ${n}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Serialize: a settle arriving mid-drain queues exactly one rerun.
  const kick = (): void => {
    if (busy) { rerun = true; return; }
    busy = true;
    void (async () => {
      try { do { rerun = false; await drain(); } while (rerun); }
      finally { busy = false; }
    })();
  };

  const scheduleDrain = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(kick, debounceMs);
  };

  // ── the watch ──────────────────────────────────────────────────────────
  let watcher: FSWatcher;
  try {
    watcher = fsWatch(source, { recursive: true }, (_event, filename) => {
      if (!filename) return;                       // some backends omit the name — ignore
      const rel = filename.toString();
      if (isNoise(rel)) return;
      const abs = isAbsolute(rel) ? rel : join(source, rel);
      // Every event is a hint; the drain's scan is truth (it classifies the
      // path as add / unchanged / vanished). A vanished carrier enters the
      // grace window there, not here.
      buffer.add(abs);
      scheduleDrain();
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: msg, human: () => console.error(`lares watch: cannot watch "${source}": ${msg}`) });
    if (vessel) await vessel.disconnect();
    return 3;
  }

  // ── cookie self-test — a dead backend (WSL2 /mnt = no inotify) fails HERE ──
  const cookieLive = await cookieSelfTest(source, watcher);
  if (!cookieLive) {
    console.error(`  ⚠ watch self-test: no event for our own cookie write under "${source}".`);
    console.error(`    The backend looks dead (WSL2 /mnt emits no inotify events — keep the bag tree on ext4).`);
    console.error(`    Events will not arrive; a periodic full scan stays the only truth here.`);
  }

  console.log(`lares watch: ${apply ? "LIVE" : "preview"} · source "${source}" → ${toBag} · settle ${debounceMs}ms${cookieLive ? " · backend live" : " · BACKEND DEAD"}`);
  console.log("  watching… (Ctrl-C to stop)");

  // ── lifetime — hold until interrupted, drain a final wave on the way out ──
  await new Promise<void>((resolve) => {
    const shutdown = (): void => {
      watcher.close();
      if (timer) clearTimeout(timer);
      resolve();
    };
    process.once("SIGINT",  shutdown);
    process.once("SIGTERM", shutdown);
  });

  if (vessel) await vessel.disconnect();
  console.log(`\nlares watch: stopped after ${waveNo} wave(s).`);
  return 0;
}

/**
 * Write a cookie carrier under the source and await our OWN event for it within
 * a window (the Watchman cookie discipline). A live backend echoes the write;
 * a dead one (WSL2 /mnt, an unsupported FS) never does. The cookie sits outside
 * bags/ derivation so it never becomes an ingest candidate, and we remove it.
 */
function cookieSelfTest(source: string, watcher: FSWatcher): Promise<boolean> {
  const cookieName = `.lares-watch-cookie-${process.pid}-${Date.now()}`;
  const cookiePath = join(source, cookieName);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (live: boolean): void => {
      if (settled) return;
      settled = true;
      watcher.off("change", onChange);
      clearTimeout(timeout);
      try { rmSync(cookiePath, { force: true }); } catch { /* best effort */ }
      resolve(live);
    };
    const onChange = (_e: string, fn: string | Buffer | null): void => {
      if (fn && fn.toString().includes(cookieName)) finish(true);
    };
    watcher.on("change", onChange);
    const timeout = setTimeout(() => finish(false), COOKIE_TIMEOUT_MS);
    try { writeFileSync(cookiePath, "cookie"); } catch { finish(false); }
  });
}
