/**
 * `lares vessel read` — the inspection surface, NAMESPACED into referents that never collide:
 *
 *   lares vessel read             NODE HEALTH — bootstrap presence, storage size, port in use. Pure
 *                                 local inspection, no vm boot.
 *   lares vessel read --palaces   PALACE ORGANS — the local organ health table.
 *   lares vessel read vessel      THE DEEP PROBE — every Automerge doc, mounted vs condemned.
 *   lares sense status            SENSORIUM TAXONOMY — what the Memory sensorium holds; the read rides
 *                                 the sense door over the daemon's composed caps.
 *
 * Each name resolves to ONE referent, so the isomorphism table holds no name reaching two things.
 *
 * `lares vessel stop` lives here beside it: both act on the same running node, one by looking and one
 * by ending it, and neither boots a vm.
 */

import { larRoot, larDataDir, larPort, vesselDid, larBootstrapPath } from "../env.js";
import { stopIncumbent, probePort } from "../port-control.js";
import { udsAlive } from "../local-connector.js";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import { palaceOrgans, organHealthy, guestMempalaceOrgan, readMemeticWikitextCoupling, runDoctor, formatDoctorReport } from "@lararium/node";
import { readClaudeCleanupPeriod, CLEANUP_PERIOD_DAYS_FLOOR } from "../claude-wire.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const CLAUDE_DEFAULT_CLEANUP_DAYS = 30; // Claude's own default when the key is unset.

/**
 * `lares vessel read --palaces` — the palace-organ health table (re-runnable). Reads the SAME registry
 * `lares vessel stand --init` stands up + `lares sense teardown` removes, so the health view never drifts
 * from what setup/teardown act on. Pure inspection (each organ's cheap probe), no vm boot.
 */
function cmdReadPalaces(args: ParsedArgs): number {
  const organs = palaceOrgans().map((o) => ({ name: o.name, dir: o.dir, healthy: organHealthy(o) }));
  const allHealthy = organs.every((o) => o.healthy);
  // The GUEST rides BESIDE the table, never inside it — `~/.mempalace` never stands as an organ of the
  // vessel (the comparator ruling), so its absence must never read as an unhealthy sovereign store.
  // Surfaced so the operator keeps sight of it: present or not, it is `lares mempalace setup`'s to raise.
  const g = guestMempalaceOrgan();
  const guest = { name: g.name, dir: g.dir, healthy: organHealthy(g) };
  // Read the memetic-wikitext coupling plane through the H¹ gate — makes `coupling.children`
  // load-bearing at the vessel surface (a fused reading OR a hold-open verdict, never a silent average).
  // Cheap + graceful: until the peer salience sidecars fill, it reports the honest no-coupling.
  let coupling: ReturnType<typeof readMemeticWikitextCoupling> | null = null;
  try { coupling = readMemeticWikitextCoupling(); } catch { coupling = null; }
  emit(args, {
    ok: true,
    data: {
      palaces: organs, allHealthy, guest,
      ...(coupling ? { coupling: { sensorium: coupling.sensorium, readable: coupling.readable, sharedUnits: coupling.sharedUnits, verdict: coupling.fusion?.verdict ?? null, note: coupling.note } } : {}),
    },
    human: () => {
      console.log("lares vessel read — palace organs (sovereign)");
      for (const o of organs) {
        console.log(`  ${o.healthy ? "ok     " : "ABSENT "} ${o.name.padEnd(22)} ${o.dir}`);
      }
      console.log("\n  guest (not an organ — the vessel never boots into it)");
      console.log(`  ${guest.healthy ? "ok     " : "absent "} ${guest.name.padEnd(22)} ${guest.dir}`);
      if (coupling) {
        const verdict = coupling.fusion ? coupling.fusion.verdict : "insufficient";
        console.log(`\n  coupling (${coupling.sensorium}): ${verdict} — ${coupling.note}`);
      }
      if (!allHealthy) console.log("\n  → stand up absent organs:  lares vessel stand --init");
      if (!guest.healthy) console.log("  → raise the guest sidecar: lares mempalace setup");
    },
  });
  return 0;
}

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

// `lares vessel read sensorium` — an alias. The sensorium taxonomy reads through the sense door
// (`lares sense status`, which routes to the daemon's composed content cap); this alias points there
// rather than opening a second path. Local organ health rides `lares vessel read --palaces`.
const SENSORIUM_STATUS_REDIRECT =
  "the sensorium taxonomy reads at `lares sense status` (the sovereign door). For local organ health, " +
  "run `lares vessel read --palaces`; for node health, `lares vessel read`.";

/** `lares vessel read sensorium` (alias) — points at `lares sense status`, the sensorium taxonomy door. */
function cmdReadSensorium(args: ParsedArgs): number {
  emit(args, {
    ok: false,
    error: { code: "verb-error", message: SENSORIUM_STATUS_REDIRECT, hint: "run `lares sense status` for the taxonomy; `lares vessel read --palaces` for local organ health." },
    human: () => { console.error(`lares vessel read sensorium → ${SENSORIUM_STATUS_REDIRECT}`); },
  });
  return exitFor("verb-error");
}

/**
 * `lares vessel stop` — halt the daemon on the port (graceful → force), the pair to
 * `lares vessel stand`. Pure port-control (no vm boot, no wipe): SIGTERM the incumbent, escalate to
 * SIGKILL if it lingers, and report which. A free port reads as already-stopped, not an error.
 * It ENDS a vessel and nothing else — `vessel stand --restart` stops then stands, `hooks pause`
 * suppresses capture alone.
 */
export async function cmdStop(args: ParsedArgs): Promise<number> {
  const port = larPort();
  const r = await stopIncumbent(port);
  emit(args, {
    ok: true,
    data: { port, stopped: r.stopped, forced: r.forced },
    human: () => console.log(
      r.stopped
        ? `[lares] stopped the daemon on :${port} (${r.forced ? "forced — SIGKILL" : "graceful — SIGTERM"})`
        : `[lares] :${port} already free — no daemon to stop`,
    ),
  });
  return 0;
}

/**
 * `lares vessel read vessel` — the DEEP health lens (the `git fsck` role, reached through the one
 * read door rather than a verb of its own): probes every Automerge doc in the vessel store through a
 * disposable child-process boundary and charts MOUNTED vs CONDEMNED (a torn doc that would
 * abort the WASM runtime on load). Read-only; a condemned doc points at `lares vessel rite rebirth`.
 * Exits non-zero on a tear, so a boot/CI gate reads health off the exit code.
 */
async function cmdReadVessel(args: ParsedArgs): Promise<number> {
  const storageDir = larDataDir();
  const report = await runDoctor(storageDir);
  emit(args, {
    ok: true,
    data: {
      storageDir,
      total: report.total,
      healthy: report.healthy,
      condemned: report.condemned,
      degraded: report.degraded,
      entries: report.entries,
    },
    human: () => console.log(formatDoctorReport(report, storageDir)),
  });
  return report.degraded ? 1 : 0;
}

export async function cmdRead(args: ParsedArgs): Promise<number> {
  // --palaces: the palace-organ health table (re-runnable; same registry as setup/teardown).
  if (args.flags["palaces"] === true) return cmdReadPalaces(args);
  // The named lenses: sensorium taxonomy (redirected to its own door) · the deep vessel probe.
  if (args.positional[0] === "sensorium") return cmdReadSensorium(args);
  if (args.positional[0] === "vessel") return cmdReadVessel(args);
  // Bare `lares vessel read` — node health, the reading an operator wants most often.
  return cmdReadNode(args);
}

/** Node health — bootstrap presence, storage size, port probe, retention. Pure local inspection. */
async function cmdReadNode(args: ParsedArgs): Promise<number> {

  const root      = larRoot();   // corpus root (genesis); vessel state roots in the home
  const storage   = larDataDir();   // runtime → <lares>/vessel
  const bootstrap = larBootstrapPath();
  const portRaw   = process.env["LAR_PORT"] ?? "8080";
  const port      = Number(portRaw);

  const portInUse  = await probePort(port);
  const hasBoot    = existsSync(bootstrap);
  const storageStr = dirSizeHint(storage);

  // Session-file retention — the mempalace's verbatim harvest source lives in
  // ~/.claude/projects and Claude prunes it on startup by cleanupPeriodDays. Surface
  // it so a short window (evaporating raw memory before it's mined) stays visible.
  const cleanupRaw = readClaudeCleanupPeriod();
  const cleanupEffective = cleanupRaw ?? CLAUDE_DEFAULT_CLEANUP_DAYS;
  const cleanupProtected = cleanupEffective >= CLEANUP_PERIOD_DAYS_FLOOR;

  // Snapshot fields — the same data the prose renders, shaped for an agent.
  const data: Record<string, unknown> = {
    bootstrap: hasBoot ? "present" : "absent",
    storage:   storageStr,
    port,
    portInUse,
    cleanupPeriodDays: cleanupRaw,
    cleanupProtected,
  };
  let residencyLine: string | null = null;

  // C.4 — when the daemon is reachable, ask it for a residency snapshot. The CLI
  // reaches the daemon through the UDS verb socket alone, so that — not the WS
  // relay port — gates the read. Cheap call; any failure falls through silently.
  const daemonReachable = await udsAlive();
  if (daemonReachable) {
    try {
      const { summaryOutput } = await import("../verb-result.js");
      const { runVerb } = await import("../verb-call.js");
      // One line over the sock (the lares↔lararium binding). Cheap probe; any failure
      // falls through silently — `lares vessel read` never errors. The residency verb is
      // cap-gated, so it needs the real VESSEL did (a non-did requestedBy cap-errors
      // quietly) — the Place is what asks.
      const did = await vesselDid();
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
      console.log("lares vessel read (local node)");
      console.log(`  bootstrap:   ${hasBoot ? "present" : "absent (run `lares vessel found`)"}`);
      console.log(`  storage:     ${storageStr}`);
      console.log(`  port ${port}:  ${portInUse ? "in use (node likely running)" : "free"}`);
      if (residencyLine) console.log(`  residency:   ${residencyLine}`);
      console.log(cleanupProtected
        ? `  retention:   ${cleanupEffective} days — session files kept ~forever (mempalace source safe)`
        : `  retention:   ${cleanupEffective} days${cleanupRaw === null ? " (Claude default, unset)" : ""} — raise with \`lares cleanup-days max\` (mempalace source evaporates)`);
    },
  });
  return 0;
}
