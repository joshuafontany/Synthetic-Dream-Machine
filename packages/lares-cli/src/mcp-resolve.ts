/**
 * mcp-resolve — shared helper for the harness-wire modules (claude / codex / copilot).
 * Resolves the mempalace MCP server executable, and the WireAction vocabulary.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type WireAction = "wired" | "present" | "missing-script";

/** Resolve the mempalace-mcp executable's absolute path (prefer ~/.local/bin, then PATH). */
export function resolveMempalaceMcp(): string | null {
  const win = process.platform === "win32";
  const exe = win ? "mempalace-mcp.exe" : "mempalace-mcp";
  const dirs = [join(homedir(), ".local", "bin"), ...(process.env["PATH"] ?? "").split(win ? ";" : ":")];
  for (const d of dirs) {
    if (!d) continue;
    const p = join(d, exe);
    if (existsSync(p)) return p;
  }
  return null;
}
