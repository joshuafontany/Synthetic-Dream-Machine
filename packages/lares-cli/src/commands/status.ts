/**
 * `lares status` — the status surface, NAMESPACED into two referents (the name-collision cure):
 *
 *   lares node status        NODE HEALTH — bootstrap presence, storage size, port in use. The
 *                            historical `lares status` behavior; pure local inspection, no vm boot.
 *   lares sensorium status   SENSORIUM TAXONOMY — what the Memory sensorium holds. Mirrors the
 *                            isomorphic MCP `status` tool (py `content_io` taxonomy). SEATED STUB
 *                            today: the read rides the DEFERRED @daemon-cap-wire.
 *   lares status             muscle-memory ALIAS → `lares node status`.
 *   lares status sensorium   also reaches the sensorium taxonomy (the alias spelled long).
 *
 * The two carried one name before (CLI status = node-health · MCP status = taxonomy); they name
 * one referent each now, so the isomorphism table holds no name resolving to two things.
 *
 * `lares status --palaces` keeps the palace-organ health table (a third, distinct local view).
 */

import { larRoot, larDataDir } from "../env.js";
import { udsAvailable } from "../local-connector.js";
import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "node:net";
import { repoRoot as REPO_ROOT } from "@lararium/mesh/node";
import { palaceOrgans, organHealthy, guestMempalaceOrgan, readMemeticWikitextCoupling, runDoctor, formatDoctorReport } from "@lararium/node";
import { readClaudeCleanupPeriod, CLEANUP_PERIOD_DAYS_FLOOR } from "../claude-wire.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const CLAUDE_DEFAULT_CLEANUP_DAYS = 30; // Claude's own default when the key is unset.

/**
 * `lares status --palaces` — the palace-organ health table (re-runnable). Reads the SAME registry
 * `lares wake --init` stands up + `lares palace-teardown` removes, so the health view never drifts
 * from what setup/teardown act on. Pure inspection (each organ's cheap probe), no vm boot.
 */
function cmdStatusPalaces(args: ParsedArgs): number {
  const organs = palaceOrgans().map((o) => ({ name: o.name, dir: o.dir, healthy: organHealthy(o) }));
  const allHealthy = organs.every((o) => o.healthy);
  // The GUEST rides BESIDE the table, never inside it — `~/.mempalace` is not an organ the vessel
  // stands (the comparator ruling), so its absence must never read as an unhealthy sovereign store.
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
      console.log("lares status — palace organs (sovereign)");
      for (const o of organs) {
        console.log(`  ${o.healthy ? "ok     " : "ABSENT "} ${o.name.padEnd(22)} ${o.dir}`);
      }
      console.log("\n  guest (not an organ — the vessel never boots into it)");
      console.log(`  ${guest.healthy ? "ok     " : "absent "} ${guest.name.padEnd(22)} ${guest.dir}`);
      if (coupling) {
        const verdict = coupling.fusion ? coupling.fusion.verdict : "insufficient";
        console.log(`\n  coupling (${coupling.sensorium}): ${verdict} — ${coupling.note}`);
      }
      if (!allHealthy) console.log("\n  → stand up absent organs:  lares wake --init");
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

export function probePort(port: number, host = "127.0.0.1", timeoutMs = 200): Promise<boolean> {
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

// The sensorium-taxonomy SEATED STUB. The verb shape stands now (isomorphic with the MCP `status`
// tool = the sensorium taxonomy), but the read stays unwired: the taxonomy lives in the py
// `content_io` backend, which CLI verbs reach only across the DEFERRED @daemon-cap-wire. Node health
// (`lares node status`) reads local and answers today; the taxonomy waits for the wire.
const SENSORIUM_STATUS_STUB =
  "sensorium status routing deferred — rides the @daemon-cap-wire. The taxonomy (what the Memory " +
  "sensorium holds) lives in the py content_io backend; CLI verbs reach it only once the cap-wire " +
  "routes them there. For local organ health today, run `lares status --palaces`; for node health, " +
  "`lares node status`.";

/** `lares sensorium status` — the taxonomy mirror of MCP `status`. SEATED STUB (read deferred). */
function cmdSensoriumStatus(args: ParsedArgs): number {
  emit(args, {
    ok: false,
    error: { code: "verb-error", message: SENSORIUM_STATUS_STUB, hint: "`lares status --palaces` shows local organ health; the taxonomy lands once the @daemon-cap-wire routes to py content_io." },
    human: () => { console.error(`lares sensorium status: ${SENSORIUM_STATUS_STUB}`); },
  });
  return exitFor("verb-error");
}

/** `lares node <subverb>` — the node command group; `status` reads node health (the historical view). */
export async function cmdNode(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (sub === undefined || sub === "status") return cmdNodeStatus(args);
  console.error(`lares node: unknown subverb "${sub}". Run \`lares node status\`.`);
  return 2;
}

/** `lares sensorium <subverb>` — the sensorium command group; `status` mirrors the MCP `status` tool. */
export async function cmdSensorium(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (sub === undefined || sub === "status") return cmdSensoriumStatus(args);
  console.error(`lares sensorium: unknown subverb "${sub}". Run \`lares sensorium status\`.`);
  return 2;
}

/**
 * `lares status vessel` — the DEEP health lens (the `git fsck` role, folded into status
 * rather than a sibling verb): probes every Automerge doc in the vessel store through a
 * disposable child-process boundary and charts MOUNTED vs CONDEMNED (a torn doc that would
 * abort the WASM runtime on load). Read-only; a condemned doc points at `lares regenesis`.
 * Exits non-zero on a tear, so a boot/CI gate reads health off the exit code.
 */
export async function cmdStatusVessel(args: ParsedArgs): Promise<number> {
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

export async function cmdStatus(args: ParsedArgs): Promise<number> {
  // --palaces: the palace-organ health table (re-runnable; same registry as setup/teardown).
  if (args.flags["palaces"] === true) return cmdStatusPalaces(args);
  // Namespaced lenses reached through the alias: sensorium taxonomy · node health · deep vessel probe.
  if (args.positional[0] === "sensorium") return cmdSensoriumStatus(args);
  if (args.positional[0] === "node") return cmdNodeStatus(args);
  if (args.positional[0] === "vessel") return cmdStatusVessel(args);
  // Bare `lares status` = muscle-memory alias → node health.
  return cmdNodeStatus(args);
}

/** Node health — bootstrap presence, storage size, port probe, retention. Pure local inspection. */
async function cmdNodeStatus(args: ParsedArgs): Promise<number> {

  const root      = larRoot();   // corpus root (genesis); vessel state roots in the home
  const storage   = larDataDir();   // runtime → ~/.lares/.lararium
  const bootstrap = join(root, "genesis", "social-bootstrap.json");
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
  const daemonReachable = udsAvailable();
  if (daemonReachable) {
    try {
      const { summaryOutput } = await import("../verb-result.js");
      const { runVerb } = await import("../verb-call.js");
      const { loadVesselVerifyingKey } = await import("@lararium/node");
      // One line over the sock (the lares↔lararium binding). Cheap probe; any failure
      // falls through silently — `lares status` never errors. The residency verb is
      // cap-gated, so it needs the real operator did (a non-did requestedBy cap-errors
      // quietly — the old "lares-status" label always did).
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
      console.log(cleanupProtected
        ? `  retention:   ${cleanupEffective} days — session files kept ~forever (mempalace source safe)`
        : `  retention:   ${cleanupEffective} days${cleanupRaw === null ? " (Claude default, unset)" : ""} — raise with \`lares cleanup-days max\` (mempalace source evaporates)`);
    },
  });
  return 0;
}
