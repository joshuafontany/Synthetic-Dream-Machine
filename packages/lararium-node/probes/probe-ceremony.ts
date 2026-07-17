/**
 * probe-ceremony — the shared harness every civic-protocol container probe runs on. Collapses the
 * volume-handshake boilerplate the burn / kahu-custody / kahu-recovery probes each re-rolled: a
 * pet-named-file ceremony over a shared volume, role-dispatched, verdict-by-exit-code.
 *
 * The harness IS the pattern-integrity triangle, made a test primitive: NAMELESS ENTITIES (the roles
 * carry no identity beyond the cap-role the env names) address each other ONLY through PET-NAMED FILES
 * in the shared volume (never a global registry), and each side reads its OWN local view of that volume
 * (NO GLOBAL NOW — a `waitFor` polls the island's own disk, never a shared clock). The volume is the
 * causal island's tideline; the marks are the only sync.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const envOf = (k: string, d = ""): string => process.env[k] ?? d;
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
export const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64");
export const unb64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

/** The shared-volume handshake: put/read text + bytes, drop a mark, wait for a pet-named file to appear. */
export class ProbeVolume {
  constructor(private readonly dir: string, private readonly tag = "") {
    mkdirSync(dir, { recursive: true });
  }
  path(name: string): string { return join(this.dir, name); }
  has(name: string): boolean { return existsSync(this.path(name)); }
  mark(name: string): void { writeFileSync(this.path(name), "ok"); }
  putText(name: string, text: string): void { writeFileSync(this.path(name), text); }
  putBytes(name: string, bytes: Uint8Array): void { writeFileSync(this.path(name), b64(bytes)); }
  readText(name: string): string { return readFileSync(this.path(name), "utf8"); }
  readBytes(name: string): Uint8Array { return unb64(readFileSync(this.path(name), "utf8")); }

  /** Wait (local poll, no global now) for a pet-named file to appear; return its text. Throws on timeout. */
  async waitFor(name: string, label: string): Promise<string> {
    for (let i = 0; i < 240; i++) {
      if (existsSync(this.path(name))) return readFileSync(this.path(name), "utf8");
      if (i === 0) console.log(`[probe]${this.tag ? ` (${this.tag})` : ""} awaiting ${label}…`);
      await sleep(500);
    }
    throw new Error(`timeout awaiting ${label}`);
  }
}

/**
 * Dispatch a role-driven probe: the env names which cap-role this nameless entity picks up (default =
 * the first role). Runs the handler; a throw exits FATAL(1) — the verdict rides the exit code. Roles
 * that carry the verdict `process.exit(0)` themselves; a background role returns and the caller exits.
 */
export async function runProbeRole(roleEnv: string, roles: Record<string, () => Promise<void>>): Promise<void> {
  const role = envOf(roleEnv, Object.keys(roles)[0]!);
  const handler = roles[role];
  if (!handler) { console.error(`[probe] unknown role: ${role}`); process.exit(1); }
  try { await handler(); }
  catch (e) { console.error(`[probe] (${role}) ✗ FATAL:`, e); process.exit(1); }
}
