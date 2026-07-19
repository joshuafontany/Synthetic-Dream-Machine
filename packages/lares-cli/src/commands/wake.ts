/**
 * `lares wake` — the boot ENTRY POINT. Idempotent on every awakening: check (and,
 * with --install, install) the mempalace integration, ensure the live Lararium
 * node is up (ATTACH if healthy, START detached if down — never a restart), and
 * emit a live-delta hydration frame for the waking session.
 *
 * The static CLAUDE.md @-import carries the canonical seed; this frame carries
 * only what is true right now. A degraded wake still returns 0 — the entry point
 * never hard-fails the session (the `ok` field tells the truth).
 */

import { existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";
import { larRoot, larBootstrapPath, larDataDir, larCasDir } from "../env.js";
import { udsAvailable } from "../local-connector.js";
import { emit } from "../render.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import { loadVesselVerifyingKey } from "@lararium/node";
import { checkMempalaceIntegration, installMempalaceIntegration, type InstallStep } from "../integration-check.js";
import { setupSensorium, type PalaceSetupStep } from "../setup-sensorium.js";
import { foundIfAbsent, type FoundStep } from "../found.js";
import { wireClaudeHome, type ClaudeWireResult } from "../claude-wire.js";
import { wireCodexHome, type CodexWireResult } from "../codex-wire.js";
import { wireCopilotHome, type CopilotWireResult } from "../copilot-wire.js";
import { wireVscode, type VscodeWireResult } from "../vscode-wire.js";
import type { ParsedArgs } from "../parse-args.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** This project's wing slug, from the session's cwd (matches the harvest wing). */
function wakeWing(): string {
  const base = (process.cwd().replace(/\\/g, "/").split("/").pop() ?? "").toLowerCase().replace(/[ -]/g, "_").replace(/[^a-z0-9_]/g, "");
  return `wing_${base || "unsorted"}`;
}

interface WakeRecall {
  readonly ok: boolean;
  readonly wing: string;
  readonly drawers?: number;
  readonly recent?: ReadonlyArray<{ room: string; preview: string }>;
  readonly note?: string;
}

/**
 * recall-into-wake — pull this project's recent journey THROUGH the @daemon seat so
 * the woken session climbs already-remembering. Best-effort by construction: any
 * miss (no identity, daemon unreachable, recall error) returns {ok:false,note} and
 * the wake proceeds. A short timeout keeps it inside the SessionStart hook budget.
 */
async function recallIntoWake(): Promise<WakeRecall> {
  const wing = wakeWing();
  let did: string;
  try { did = "0x" + (await loadVesselVerifyingKey(larDataDir())); }
  catch { return { ok: false, wing, note: "no operator identity" }; }
  try {
    // One cold sidecar start can take ~8s; after that the @daemon pool is warm and
    // recall is sub-second. Give the first wake room; warm wakes return instantly.
    const r = await runVerb("recall", { wing, limit: 5 }, did, { timeoutMs: 9000 });
    if (r.status !== "done") return { ok: false, wing, note: r.errorMessage ?? "recall error" };
    const out = summaryOutput(r) ?? {};
    const rows = Array.isArray(out["imagines"]) ? (out["imagines"] as Array<Record<string, unknown>>) : [];
    const recent = rows.slice(0, 5).map((d) => ({
      room: typeof d["room"] === "string" ? d["room"] : "",
      preview: String(d["content_preview"] ?? d["content"] ?? d["preview"] ?? d["text"] ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
    }));
    return { ok: true, wing, drawers: typeof out["total"] === "number" ? out["total"] : rows.length, recent };
  } catch (e) {
    return { ok: false, wing, note: e instanceof Error ? e.message : String(e) };
  }
}

export async function cmdWake(args: ParsedArgs): Promise<number> {
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const root = larRoot();
  const bootstrap = larBootstrapPath();

  // 1. Found-if-absent (the whole shebang) under --install; else just report the cheap check.
  //    Each step is a no-op when its artifact is present; genesis is never rebuilt; the
  //    keypair is never wiped; --install never passes --force.
  let founding: FoundStep[] | undefined;
  // The full standup runs under --init / --install (found a first vessel) OR
  // --admit FILE (join an existing PersonaGroup — own fresh keypair, same group).
  // All idempotent. `--init` and `--install` are synonyms for the full standup.
  const doStandup =
    args.flags["init"] === true || args.flags["install"] === true || args.options["admit"] !== undefined;
  if (doStandup) founding = await foundIfAbsent(args, { root, bootstrap });

  // Under --init / --install: install the mempalace LIBRARY deps (submodule + pip — the sensorium's
  // py organs import it as code) AND stand up the SOVEREIGN sensorium (content/structure/form/
  // persistence/mesh). Both no-op when already done. Bare `lares wake` only CHECKS.
  //
  // What this no longer does: stand the GUEST `~/.mempalace`. Booting it from here wrote the store
  // the comparator ruling reserves as an untouched baseline (RUN-ARC.md:14). The guest is raised
  // deliberately, from its own lane — `lares mempalace setup`.
  let mempalaceSetup: { install: InstallStep[]; palace: PalaceSetupStep[] } | undefined;
  if (args.flags["init"] === true || args.flags["install"] === true) {
    mempalaceSetup = { install: installMempalaceIntegration(), palace: setupSensorium() };
  }
  const integration = checkMempalaceIntegration();

  // 1b. The AI-SURFACE SEATS — every harness reaches the memory sensorium through the same lares seat.
  //     `--init` stands the WHOLE house, so it tends EVERY surface: each wire converges on the RESOLVED
  //     spawn (aligned passes untouched · drifted re-aims · absent wires), which keeps running them on
  //     every init both safe AND load-bearing — a seat aimed at a moved sidecar script otherwise stays
  //     shut while its wire reports success, and only re-aiming heals it. A single surface flag still
  //     targets that one alone; every wire stays graceful when its tool sits un-installed here.
  const initAll = args.flags["init"] === true;
  let claude: ClaudeWireResult | undefined;
  if (initAll || args.flags["claude"]) {
    try { claude = await wireClaudeHome(); }
    catch (e) { claude = { settingsPath: "", backedUp: false, changed: false, steps: [{ item: "claude", action: "missing-script", detail: e instanceof Error ? e.message : String(e) }] }; }
  }
  let codex: CodexWireResult | undefined;
  if (initAll || args.flags["codex"]) {
    try { codex = wireCodexHome(); }
    catch (e) { codex = { configPath: "", changed: false, steps: [{ item: "codex", action: "missing-script", detail: e instanceof Error ? e.message : String(e) }] }; }
  }
  let copilot: CopilotWireResult | undefined;
  if (initAll || args.flags["copilot"]) {
    try { copilot = wireCopilotHome(); }
    catch (e) { copilot = { home: "", changed: false, steps: [{ item: "copilot", action: "missing-script", detail: e instanceof Error ? e.message : String(e) }] }; }
  }
  // Every present VS Code variant (stable + Insiders, remote-server + local-profile).
  let vscode: VscodeWireResult | undefined;
  if (initAll || args.flags["vscode"]) {
    try { vscode = wireVscode(); }
    catch (e) { vscode = { changed: false, steps: [{ item: "vscode", action: "missing-script", detail: e instanceof Error ? e.message : String(e) }] }; }
  }

  // 2. Ensure the node is up — attach if healthy, start detached if down. NOT a restart.
  // "Up" for the CLI means the UDS verb socket answers — the CLI reaches the daemon there
  // alone (the WS relay is the browser vessel's channel, not the CLI's; the CLI carries
  // one transport, the sock — lares↔lararium binding).
  let nodeUp = udsAvailable();
  let started = false;
  let nodeNote = nodeUp ? "attached (already serving)" : "";

  if (!nodeUp) {
    const distMain = join(repoRoot, "packages", "lararium-node", "dist", "src", "main.js");
    if (!existsSync(distMain)) {
      nodeNote = "node dist not built — run `pnpm -r build`, then `lares wake`";
    } else if (!existsSync(bootstrap)) {
      nodeNote = "no bootstrap — run `lares init` (or point LAR_ROOT at an initialized instance)";
    } else {
      const dataDir = larDataDir();   // runtime → <data>/vessel
      mkdirSync(dataDir, { recursive: true });
      const log = join(dataDir, "wake-serve.log");
      // Readiness is SELF-ATTESTED, not requested (no web2 /health probe): the node
      // writes its boot phases to this log — `phase → vessel-ready` on success,
      // `fatal:` on a boot fault. We read that attestation, local-first, from the byte
      // offset we start appending at.
      //   Cross-peer presence (who is breathing in the mesh) is a SEPARATE organ and
      //   never lives in a persisted/synced doc — least of all @oracle, the cache-stable
      //   federation floor. Per canon (api/pono/ea#not-a-heartbeat;
      //   DREAMNET-FEDERATION-RESEARCH "never write presence into the Automerge document"):
      //   presence rides an EPHEMERAL channel — `ea` once at establishment, then CRDT
      //   sync / frame:ack, or an ephemeral broadcast() with TTL derived locally. Presence
      //   ≠ record. This local log-sentinel is exactly the right node-local readiness organ.
      const startOffset = existsSync(log) ? statSync(log).size : 0;
      const logFd = openSync(log, "a");
      // Detached + unref so the hook never blocks on the long-lived daemon.
      const child = spawn("node", [distMain, "--port", String(port), "--root", root], {
        cwd: join(repoRoot, "packages", "lararium-node"),
        detached: true,
        windowsHide: true, // no console window on Windows; harmless on Unix
        stdio: ["ignore", logFd, logFd],
        // Export the corpus CAS dir so the daemon worker's resolveByCid reads the SAME
        // dir the CLI stages carrier bodies to (larCasDir) — deterministic across the two
        // processes regardless of the LAR_ROOT default. A verb rides references, not bodies.
        env: { ...process.env, LAR_CAS: larCasDir() },
      });
      child.unref();
      started = true;

      const readAttestation = (): string => {
        try { return readFileSync(log, "utf8").slice(startOffset); } catch { return ""; }
      };
      // The sd_notify WATCHDOG idiom: a healthy boot that keeps WRITING to the log is making
      // progress, however long the corpus/keyhive replay runs — so extend the window whenever
      // the log grows, and fail only on a genuine STALL (no output for the idle span) or the
      // absolute ceiling. This replaces the fixed 15s deadline that false-timed a slow-but-live
      // boot. (The real CPU cost is paced/deferred separately; this stops the watcher lying.)
      const IDLE_MS = 30_000; // headroom for a silent heavy stretch (Automerge corpus materialize)
      const hardCap = Date.now() + 180_000;
      let idleDeadline = Date.now() + IDLE_MS;
      let seenLen = 0;
      let phase: "starting" | "ready" | "fault" = "starting";
      while (Date.now() < idleDeadline && Date.now() < hardCap) {
        const tail = readAttestation();
        if (/fatal:/.test(tail)) { phase = "fault"; break; }
        if (tail.includes("vessel-ready")) { phase = "ready"; break; }
        if (tail.length > seenLen) { seenLen = tail.length; idleDeadline = Date.now() + IDLE_MS; } // progress → extend
        await sleep(200);
      }
      // `vessel-ready` is attested BEFORE the daemon-keyhive gates settle, so a gate
      // fault (e.g. the Binding Gate) surfaces as a LATE `fatal:`. After a ready attestation,
      // settle and re-read for that late fault — never report up for a node that died.
      if (phase === "ready") {
        await sleep(1500);
        if (/fatal:/.test(readAttestation())) phase = "fault";
      }
      // A verb rides the UDS SOCKET, which binds LATER than vessel-ready and later than the
      // WS port — on a cold boot (post-regenesis), tens of seconds later. "Ready" must mean
      // the socket answers, or a caller (the seed leg, a hook recall) fires into the gap and
      // gets DaemonUnreachable. Poll the socket up to a cold-boot-generous deadline, still
      // bailing on a late fatal.
      if (phase === "ready") {
        const sockDeadline = Date.now() + 120_000;
        while (Date.now() < sockDeadline && !udsAvailable()) {
          if (/fatal:/.test(readAttestation())) { phase = "fault"; break; }
          await sleep(500);
        }
      }
      // `ready` = attested vessel-ready, no late fault, AND the verb socket answers.
      nodeUp = phase === "ready" && udsAvailable();
      nodeNote =
        phase === "ready"
          ? `started detached (pid ${child.pid ?? "?"}); attested vessel-ready`
          : phase === "fault"
            ? `started then attested a boot fault — see ${log}`
            : `starting detached (pid ${child.pid ?? "?"}); boot stalled (no log progress for 15s) before vessel-ready — see ${log}`;
    }
  }

  // 2b. Recall-into-wake — pull this project's recent journey so the woken session
  //     climbs already-remembering. Best-effort: never breaks the wake; skipped when
  //     the node isn't up (verbatim-always / recall-eventual).
  const recall = nodeUp ? await recallIntoWake() : undefined;

  // 3. Emit the live-delta frame (dual output). Graceful: never hard-fail the wake.
  const ok = integration.ok && nodeUp;
  emit(args, {
    ok,
    data: {
      node: { up: nodeUp, started, port, note: nodeNote },
      ...(recall !== undefined ? { recall } : {}),
      mempalace: { ok: integration.ok, checks: integration.checks },
      ...(mempalaceSetup !== undefined ? { mempalaceSetup } : {}),
      ...(founding !== undefined ? { founding } : {}),
      ...(claude !== undefined ? { claude } : {}),
      ...(codex !== undefined ? { codex } : {}),
      ...(copilot !== undefined ? { copilot } : {}),
      ...(vscode !== undefined ? { vscode } : {}),
      root,
      bootstrap: existsSync(bootstrap) ? "present" : "absent",
      timestamp: new Date().toISOString(),
    },
    human: () => {
      console.log("lares wake");
      console.log(`  node:        ${nodeUp ? "up" : "down"} on :${port}${nodeNote ? ` — ${nodeNote}` : ""}`);
      console.log(`  mempalace:   ${integration.ok ? "integrated" : "incomplete"}`);
      for (const c of integration.checks) {
        console.log(`    ${c.ok ? "ok     " : "MISSING"} ${c.name}: ${c.detail}`);
      }
      if (recall?.ok) console.log(`  recall:      ${recall.drawers ?? 0} drawers in ${recall.wing} — recent journey surfaced into the wake`);
      else if (recall) console.log(`  recall:      skipped (${recall.note})`);
      if (mempalaceSetup !== undefined) {
        console.log("  mempalace setup (--init):");
        for (const s of [...mempalaceSetup.install, ...mempalaceSetup.palace])
          console.log(`    ${(s.ran ? (s.ok ? "ran" : "FAIL") : "skip").padEnd(6)} ${s.step}: ${s.detail}`);
      }
      if (founding !== undefined) {
        console.log("  founding (--install):");
        for (const s of founding) console.log(`    ${s.action.padEnd(6)} ${s.step}: ${s.detail}`);
      }
      if (claude !== undefined) {
        console.log(`  claude (--claude): ${claude.changed ? "wired" : "already wired"}${claude.backedUp ? " (settings.json backed up)" : ""}`);
        for (const s of claude.steps) console.log(`    ${s.action.padEnd(8)} ${s.item}: ${s.detail}`);
      }
      if (codex !== undefined) {
        console.log(`  codex (--codex): ${codex.changed ? "wired" : "already wired / nothing to do"}`);
        for (const s of codex.steps) console.log(`    ${s.action.padEnd(8)} ${s.item}: ${s.detail}`);
      }
      if (copilot !== undefined) {
        console.log(`  copilot (--copilot): ${copilot.changed ? "wired" : "already wired / nothing to do"}`);
        for (const s of copilot.steps) console.log(`    ${s.action.padEnd(8)} ${s.item}: ${s.detail}`);
      }
      if (vscode !== undefined) {
        console.log(`  vscode (--vscode): ${vscode.changed ? "wired" : "already wired / nothing to do"}`);
        for (const s of vscode.steps) console.log(`    ${s.action.padEnd(8)} ${s.item}: ${s.detail}`);
      }
      console.log(`  root:        ${root}`);
      console.log(`  bootstrap:   ${existsSync(bootstrap) ? "present" : "absent"}`);
    },
  });

  return 0; // the wake never blocks the session; `ok` in the payload carries the verdict.
}
