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
import { larRoot, larBootstrapPath } from "../env.js";
import { probePort } from "../port-control.js";
import { emit } from "../render.js";
import { checkMempalaceIntegration } from "../integration-check.js";
import { foundIfAbsent, type FoundStep } from "../found.js";
import { wireClaudeHome, type ClaudeWireResult } from "../claude-wire.js";
import type { ParsedArgs } from "../parse-args.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function cmdWake(args: ParsedArgs): Promise<number> {
  const port = Number(args.options["port"] ?? process.env["LAR_PORT"] ?? "8080");
  const root = larRoot();
  const bootstrap = larBootstrapPath();

  // 1. Found-if-absent (the whole shebang) under --install; else just report the cheap check.
  //    Each step is a no-op when its artifact is present; genesis is never rebuilt; the
  //    keypair is never wiped; --install never passes --force.
  let founding: FoundStep[] | undefined;
  // The full standup runs under --install (found a first vessel) OR --admit FILE
  // (join an existing PersonGroup — own fresh keypair, same group). Both idempotent.
  const doStandup = args.flags["install"] === true || args.options["admit"] !== undefined;
  if (doStandup) founding = await foundIfAbsent(args, { root, bootstrap });
  const integration = checkMempalaceIntegration();

  // 1b. Wire the Claude harness home (~/.claude) on --claude — composable with
  //     --install / --admit / bare. Idempotent; preserves existing settings.
  let claude: ClaudeWireResult | undefined;
  if (args.flags["claude"]) {
    try { claude = wireClaudeHome(); }
    catch (e) { claude = { settingsPath: "", backedUp: false, changed: false, steps: [{ item: "claude", action: "missing-script", detail: e instanceof Error ? e.message : String(e) }] }; }
  }

  // 2. Ensure the node is up — attach if healthy, start detached if down. NOT a restart.
  let nodeUp = await probePort(port);
  let started = false;
  let nodeNote = nodeUp ? "attached (already serving)" : "";

  if (!nodeUp) {
    const distMain = join(repoRoot, "packages", "lararium-node", "dist", "src", "main.js");
    if (!existsSync(distMain)) {
      nodeNote = "node dist not built — run `pnpm -r build`, then `lares wake`";
    } else if (!existsSync(bootstrap)) {
      nodeNote = "no bootstrap — run `lares init` (or point LAR_ROOT at an initialized instance)";
    } else {
      const dataDir = join(root, ".lararium");
      mkdirSync(dataDir, { recursive: true });
      const log = join(dataDir, "wake-serve.log");
      // Readiness is SELF-ATTESTED, not requested (no web2 /health probe): the node
      // writes its boot phases to this log — `phase → vessel-ready` on success,
      // `fatal:` on a boot fault. We read that attestation, local-first, from the byte
      // offset we start appending at. (Fuller CRDT form later: a heartbeat tick in the
      // node's oracle doc, read via the change-feed.)
      const startOffset = existsSync(log) ? statSync(log).size : 0;
      const logFd = openSync(log, "a");
      // Detached + unref so the hook never blocks on the long-lived daemon.
      const child = spawn("node", [distMain, "--port", String(port), "--root", root], {
        cwd: join(repoRoot, "packages", "lararium-node"),
        detached: true,
        windowsHide: true, // no console window on Windows; harmless on Unix
        stdio: ["ignore", logFd, logFd],
      });
      child.unref();
      started = true;

      const readAttestation = (): string => {
        try { return readFileSync(log, "utf8").slice(startOffset); } catch { return ""; }
      };
      const deadline = Date.now() + 15_000;
      let phase: "starting" | "ready" | "fault" = "starting";
      while (Date.now() < deadline) {
        const tail = readAttestation();
        if (/fatal:/.test(tail)) { phase = "fault"; break; }
        if (tail.includes("vessel-ready")) { phase = "ready"; break; }
        await sleep(200);
      }
      // `vessel-ready` is attested BEFORE the admin-keyhive gates settle, so a gate
      // fault (e.g. Gate B) surfaces as a LATE `fatal:`. After a ready attestation,
      // settle and re-read for that late fault — never report up for a node that died.
      if (phase === "ready") {
        await sleep(1500);
        if (/fatal:/.test(readAttestation())) phase = "fault";
      }
      // `ready` = attested vessel-ready, no late fault, and the port is actually bound.
      nodeUp = phase === "ready" && (await probePort(port));
      nodeNote =
        phase === "ready"
          ? `started detached (pid ${child.pid ?? "?"}); attested vessel-ready`
          : phase === "fault"
            ? `started then attested a boot fault — see ${log}`
            : `starting detached (pid ${child.pid ?? "?"}); no vessel-ready attestation within 15s — see ${log}`;
    }
  }

  // 3. Emit the live-delta frame (dual output). Graceful: never hard-fail the wake.
  const ok = integration.ok && nodeUp;
  emit(args, {
    ok,
    data: {
      node: { up: nodeUp, started, port, note: nodeNote },
      mempalace: { ok: integration.ok, checks: integration.checks },
      ...(founding !== undefined ? { founding } : {}),
      ...(claude !== undefined ? { claude } : {}),
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
      if (founding !== undefined) {
        console.log("  founding (--install):");
        for (const s of founding) console.log(`    ${s.action.padEnd(6)} ${s.step}: ${s.detail}`);
      }
      if (claude !== undefined) {
        console.log(`  claude (--claude): ${claude.changed ? "wired" : "already wired"}${claude.backedUp ? " (settings.json backed up)" : ""}`);
        for (const s of claude.steps) console.log(`    ${s.action.padEnd(8)} ${s.item}: ${s.detail}`);
      }
      console.log(`  root:        ${root}`);
      console.log(`  bootstrap:   ${existsSync(bootstrap) ? "present" : "absent"}`);
    },
  });

  return 0; // the wake never blocks the session; `ok` in the payload carries the verdict.
}
