/**
 * `lares herm` — stand a HERM (Lares Viales), the wiki-less wayfarer that STANDS the carriage crossroads
 * (Socket B) a family's hearths dial to carry sealed @cad bodies between each other.
 *
 * This is a stand-up verb, NOT a fork of the boot: it spawns the SAME `main.js` the `lares vessel stand` path runs,
 * routed to `openNodeHerm` via `--recipe herm`, with the carriage relay standing when a relay port rides the
 * config (`--relay-port` / `LAR_HERM_RELAY_PORT`). Pi-deployable: a gate seed + a relay port + the http
 * FLOW-map read-face port. The relay's gate seed derives from the Herm's OWN identity (stable across restarts)
 * unless `--relay-seed <hex>` pins one — NEVER a fresh random per boot, so hearths keep dialing the same key.
 *
 * On a live stand it prints the crossroads' dial URL(s) + gate pubkey (echoed from the node's own attestation,
 * the single source of truth for the derived gate key) so the operator can hand a hearth what to dial.
 */

import { existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";
import { loadVesselVerifyingKey } from "@lararium/node";
import { larRoot, larBootstrapPath, larDataDir, larCasDir } from "../env.js";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function cmdHerm(args: ParsedArgs): Promise<number> {
  const port      = Number(args.options["port"]       ?? process.env["LAR_PORT"] ?? "8080");     // http FLOW-map read-face
  const relayPort = Number(args.options["relay-port"] ?? process.env["LAR_HERM_RELAY_PORT"] ?? "8090"); // Socket B crossroads
  const relaySeed = (args.options["relay-seed"] as string | undefined) ?? process.env["LAR_HERM_RELAY_SEED"] ?? undefined;
  const root      = larRoot();
  const bootstrap = larBootstrapPath();
  const dataDir   = larDataDir();

  const distMain = join(repoRoot, "packages", "lararium-node", "dist", "src", "main.js");
  const preflight: string | null =
    !existsSync(distMain)   ? "node dist not built — run `pnpm -r build`, then `lares herm`" :
    !existsSync(bootstrap)  ? "no bootstrap — run `lares vessel found` (or point LAR_ROOT at an initialized instance)" :
    null;

  // The gate pubkey the CLI can name up-front when the relay seed DEFAULTS to the Herm's own identity — a pinned
  // `--relay-seed` derives a different key inside the node, echoed from its log below (never re-derived here).
  let ownGateKey: string | null = null;
  try { ownGateKey = await loadVesselVerifyingKey(dataDir); } catch { /* no identity yet */ }

  const dialHint: string[] = [];
  let live = false;
  let note = "";

  if (preflight) {
    note = preflight;
  } else {
    mkdirSync(dataDir, { recursive: true });
    const log = join(dataDir, "herm-serve.log");
    const startOffset = existsSync(log) ? statSync(log).size : 0;
    const logFd = openSync(log, "a");
    const child = spawn("node", [distMain, "--recipe", "herm", "--port", String(port), "--root", root], {
      cwd: join(repoRoot, "packages", "lararium-node"),
      detached: true,
      windowsHide: true,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        LAR_CAS: larCasDir(),
        LAR_HERM_RELAY_PORT: String(relayPort),
        ...(relaySeed ? { LAR_HERM_RELAY_SEED: relaySeed } : {}),
      },
    });
    child.unref();

    const readAttestation = (): string => {
      try { return readFileSync(log, "utf8").slice(startOffset); } catch { return ""; }
    };
    // Self-attested readiness (no web2 /health probe): the node writes `vessel-ready` on a live stand, `fatal:` on a
    // boot fault. Adaptive window — extend while the log grows, fail only on a genuine stall or the ceiling.
    const IDLE_MS = 30_000;
    const hardCap = Date.now() + 180_000;
    let idleDeadline = Date.now() + IDLE_MS;
    let seenLen = 0;
    let phase: "starting" | "ready" | "fault" = "starting";
    while (Date.now() < idleDeadline && Date.now() < hardCap) {
      const tail = readAttestation();
      if (/fatal:/.test(tail)) { phase = "fault"; break; }
      if (tail.includes("vessel-ready")) { phase = "ready"; break; }
      if (tail.length > seenLen) { seenLen = tail.length; idleDeadline = Date.now() + IDLE_MS; }
      await sleep(200);
    }
    live = phase === "ready";
    note = phase === "ready"
      ? `started detached (pid ${child.pid ?? "?"}); attested vessel-ready`
      : phase === "fault"
        ? `started then attested a boot fault — see ${log}`
        : `starting detached (pid ${child.pid ?? "?"}); boot stalled before vessel-ready — see ${log}`;

    // Echo the node's OWN carriage crossroads lines (dial URLs + gate key) — the node computes the gate key from the
    // configured/derived seed (single source of truth), so a pinned `--relay-seed` prints the RIGHT key without a
    // second derivation here. A short settle lets the carriage line land after vessel-ready.
    if (live) {
      await sleep(400);
      for (const line of readAttestation().split("\n")) {
        const m = /\[herm]\s+(dial → .*|gate key: .*)/.exec(line);
        if (m) dialHint.push(m[1]!.trim());
      }
    }
  }

  const ok = live;
  emit(args, {
    ok,
    data: {
      herm: { live, port, relayPort, note },
      relay: { port: relayPort, gateKey: ownGateKey, seedPinned: relaySeed !== undefined, dial: dialHint },
      root,
      bootstrap: existsSync(bootstrap) ? "present" : "absent",
      timestamp: new Date().toISOString(),
    },
    human: () => {
      console.log("lares herm — the carriage crossroads (Lares Viales)");
      console.log(`  herm:        ${live ? "live" : "down"} on read-face :${port}${note ? ` — ${note}` : ""}`);
      console.log(`  relay port:  ${relayPort}  (Socket B — hearths dial this to carry sealed @cad bodies)`);
      if (!relaySeed && ownGateKey) console.log(`  gate key:    ${ownGateKey}  (derived from this Herm's own identity — stable across restarts)`);
      if (relaySeed) console.log(`  gate key:    (pinned via --relay-seed) — see dial lines below / the node log`);
      if (dialHint.length > 0) {
        console.log("  hand a hearth one of these to dial:");
        for (const d of dialHint) console.log(`    ${d}`);
      }
      console.log(`  root:        ${root}`);
      console.log(`  bootstrap:   ${existsSync(bootstrap) ? "present" : "absent"}`);
    },
  });

  return 0; // the stand-up never hard-fails the session; `ok` carries the verdict.
}
