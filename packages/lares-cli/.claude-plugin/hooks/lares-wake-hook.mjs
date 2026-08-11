#!/usr/bin/env node
/*
 * lares-wake-hook.mjs — SessionStart hook, PORTABLE (node, no bash/jq/python).
 * Runs `lares vessel stand --json` and wraps its output as the session's additionalContext.
 * Never fails the wake (always exit 0); the canonical frame is already loaded from
 * CLAUDE.md's static @-import, so this carries only what is true right now.
 *
 * Resolves the lares bin relative to ITSELF (…/.claude-plugin/hooks → …/bin/lares.mjs),
 * so it works whether invoked as an installed plugin (CLAUDE_PLUGIN_ROOT set) or wired
 * directly into ~/.claude/settings.json by `lares vessel stand --claude`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

try { readFileSync(0, "utf8"); } catch { /* no/empty stdin — fine */ }

const hookDir = dirname(fileURLToPath(import.meta.url));
const laresBin = join(hookDir, "..", "..", "bin", "lares.mjs");

let frame = '{"ok":false,"error":"lares vessel stand produced no output"}';
try {
  // THE HOOK HOLDS THE OBSERVE CAP ALONE. Its own context line promises "what is true right now" — a
  // READING — while the verb it calls NAMES an act, and that act ran on every session start. So a session
  // that merely opened stood a daemon nobody asked for, and a /clear quietly undid a deliberate shutdown.
  // `--observe` withholds the standing half: the frame still reports the node, the recall and the sidecar,
  // while standing one remains the operator's act.
  const r = spawnSync(process.execPath, [laresBin, "vessel", "stand", "--json", "--observe"], { encoding: "utf8", timeout: 13_000 });
  if (typeof r.stdout === "string" && r.stdout.trim()) frame = r.stdout.trim();
} catch { /* leave the fallback frame */ }

const additionalContext =
  "Lares live wake (SessionStart) — what is true right now " +
  "(the canonical frame is already loaded from CLAUDE.md): " + frame;

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }) + "\n",
);
process.exit(0);
