/**
 * setup-mempalace — `lares wake --init`: stand up the mempalace PALACE itself
 * (not just the integration deps). Idempotent.
 *
 * Two steps the integration-check never did:
 *   1. `mempalace init <repo> --yes --no-llm` when no palace config exists —
 *      non-interactive, heuristics-only (no LLM call; the navigational structure
 *      rides in-stream, never an inference at setup).
 *   2. Set `hooks.auto_save = false` — THE re-pollution gate. A fresh init
 *      defaults it to true, and mempalace's plugin hooks fire independent of
 *      settings.json, so without this the `sessions` mega-wing returns on the
 *      first turn. Our per-project mining runs through the lares ingest hook
 *      instead.
 *
 * Per-project mining + the lar_* harvest are NOT done here (kept fast + idempotent);
 * they accumulate live via the ingest hook, or run on demand via `lares harvest`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";

const PALACE_CONFIG = join(homedir(), ".mempalace", "config.json");

export interface PalaceSetupStep {
  readonly step: string;
  readonly ran: boolean;
  readonly ok: boolean;
  readonly detail: string;
}

/** Prefer the user-installed CLI, fall back to PATH. */
function resolveMempalace(): string {
  const exe = process.platform === "win32" ? "mempalace.exe" : "mempalace";
  const local = join(homedir(), ".local", "bin", exe);
  return existsSync(local) ? local : "mempalace";
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Stand up the palace (init if absent) and pin the auto_save off-switch. Idempotent. */
export function setupMempalacePalace(): PalaceSetupStep[] {
  const steps: PalaceSetupStep[] = [];
  const mp = resolveMempalace();

  // 1. init the palace if no config exists yet (non-interactive, no LLM).
  if (!existsSync(PALACE_CONFIG)) {
    try {
      const r = spawnSync(mp, ["init", repoRoot, "--yes", "--no-llm"], { timeout: 180_000, encoding: "utf8" });
      const ok = r.status === 0 && existsSync(PALACE_CONFIG);
      steps.push({
        step: "palace-init",
        ran: true,
        ok,
        detail: ok ? `mempalace init ${repoRoot} --yes --no-llm` : `init failed: ${(r.stderr ?? r.error?.message ?? "").toString().trim().slice(0, 160)}`,
      });
    } catch (e) {
      steps.push({ step: "palace-init", ran: true, ok: false, detail: errText(e).slice(0, 160) });
    }
  } else {
    steps.push({ step: "palace-init", ran: false, ok: true, detail: "palace config present" });
  }

  // 2. pin hooks.auto_save = false — the re-pollution gate (read fresh each hook fire).
  try {
    const cfg = existsSync(PALACE_CONFIG)
      ? (JSON.parse(readFileSync(PALACE_CONFIG, "utf8")) as Record<string, unknown>)
      : {};
    const hooks = (cfg["hooks"] ?? {}) as Record<string, unknown>;
    if (hooks["auto_save"] !== false) {
      cfg["hooks"] = { ...hooks, auto_save: false };
      writeFileSync(PALACE_CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      steps.push({ step: "auto-save-off", ran: true, ok: true, detail: "hooks.auto_save=false (re-pollution gate)" });
    } else {
      steps.push({ step: "auto-save-off", ran: false, ok: true, detail: "hooks.auto_save already false" });
    }
  } catch (e) {
    steps.push({ step: "auto-save-off", ran: true, ok: false, detail: errText(e).slice(0, 160) });
  }

  return steps;
}
