/**
 * `lares vault {status,seal,rotate,export <path>,repair}` — the at-rest seal LIFECYCLE surface.
 *
 * The vessel seals TWO secret carriers at rest under a scrypt-derived passphrase KEK: the keyhive archive
 * (the sovereign identity floor) and the device recovery share. This command is the operator's door to
 * their lifecycle — see them, seal them, rotate the passphrase, export a sealed backup, repair a split.
 *
 * DAEMON-FIRST: when the daemon holds the socket, the MUTATING verbs route THROUGH it, so the
 * daemon re-persists the carriers AND updates its own in-memory seal policy in one act (no un-rotate).
 * When the daemon is DOWN, the CLI does the direct file op itself (same core functions, this process).
 *
 * THE PASSPHRASE NEVER TOUCHES argv OR the shell history: interactively it reads from a no-echo TTY prompt
 * (double-entry for a NEW passphrase — a typo would be a self-lockout); non-interactively it rides an
 * environment variable (LARES_ARCHIVE_PASSPHRASE / _NEW), never a flag. It drops the instant the op returns.
 */

import { resolve, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  archiveSealStatus, sealArchiveWithPassphrase, rotateArchivePassphrase,
  exportSealedArchive, repairSplitKek, weakPassphraseWarning,
  ARCHIVE_PASSPHRASE_ENV,
} from "@lararium/node";
import { vesselDid, larIdentityDir } from "../env.js";
import { discordianReading } from "@lararium/node";
import { runVerb } from "../verb-call.js";
import { udsAlive } from "../local-connector.js";
import { summaryOutput } from "../verb-result.js";
import { emit, exitFor } from "../render.js";
import { canPromptSecret, promptSecret, promptSecretConfirmed } from "../prompt-secret.js";
import type { ParsedArgs } from "../parse-args.js";

/** The env var carrying a NEW/target passphrase for non-interactive seal/rotate/export. */
const NEW_PASS_ENV = "LARES_ARCHIVE_PASSPHRASE_NEW";

function usage(): void {
  console.error("usage: lares vault <status|seal|rotate|export <path>|repair> [--force] [--yes]");
  console.error("");
  console.error("  status            show the seal state of both carriers (--check probes a passphrase → split detection)");
  console.error("  seal              seal cleartext carriers under a NEW passphrase");
  console.error("  rotate            re-seal both carriers old→new passphrase");
  console.error("  export <path>     write a passphrase-SEALED backup of the archive to <path> (--force overwrites)");
  console.error("  repair            re-seal a lagging carrier under the passphrase that opens the other (split-KEK cure)");
  console.error("  passphrase        read back WHICH DAY this vault was sealed on, and what to type");
  console.error("");
  console.error("  every seal STAMPS its Erisian day beside the vault — a record, never part of the passphrase.");
  console.error("");
  console.error(`  non-interactive: ${ARCHIVE_PASSPHRASE_ENV} (current) · ${NEW_PASS_ENV} (new) + --yes`);
}

/** The CURRENT passphrase — env first, else a no-echo prompt. Non-interactive without the env → usage error. */
async function currentPass(args: ParsedArgs, label: string): Promise<string> {
  const env = process.env[ARCHIVE_PASSPHRASE_ENV];
  if (env) {
    if (canPromptSecret()) console.error(`  using ${ARCHIVE_PASSPHRASE_ENV} from the environment — no prompt opened.`);
    return env;
  }
  if (args.flags["yes"] || !canPromptSecret()) {
    throw new UsageError(`set ${ARCHIVE_PASSPHRASE_ENV} for non-interactive use`);
  }
  return promptSecret(`${label}: `);
}

/**
 * A NEW passphrase — env first (non-interactive), else a double-entry no-echo prompt (anti-lockout).
 *
 * A TTY caller carrying the env var keeps the env: setting it deliberately means it. But the bypass
 * SAYS SO, because an operator who expected a prompt and met silence learns nothing from the silence —
 * they conclude the prompt is broken, or worse, that they typed something they never typed. A shell
 * carrying a passphrase from an earlier command reads exactly like a shell that does not.
 */
async function newPass(args: ParsedArgs, label: string): Promise<string> {
  const env = process.env[NEW_PASS_ENV];
  if (args.flags["yes"] || !canPromptSecret()) {
    if (!env) throw new UsageError(`set ${NEW_PASS_ENV} for non-interactive use`);
    return env;
  }
  if (env) {
    console.error(`  using ${NEW_PASS_ENV} from the environment — no prompt opened.`);
    console.error(`  to type it instead:  env -u ${NEW_PASS_ENV} lares vault <verb>`);
    return env;
  }
  return promptSecretConfirmed(label);
}

class UsageError extends Error {}

/** Warn (never reject) on a weak passphrase — the SOFT floor. */
function warnIfWeak(pass: string): void {
  const w = weakPassphraseWarning(pass);
  if (w) console.error(`  warning: ${w}`);
}

/** Where the seal-day rides — NON-SECRET, beside the identity it belongs to. */
function sealDayPath(): string { return join(larIdentityDir(), ".archive-seal-day.json"); }

/**
 * Record the seal-day in the clear — a STAMP ON the passphrase, never a PART of it (operator ruling,
 * 2026-08-08).
 *
 * ── WHY IT STAMPS RATHER THAN COMPOSES ───────────────────────────────────────────────────────────
 * An earlier shape concatenated the day INTO the passphrase. It would have added no strength — the
 * Discordian date is PUBLIC, computable by anyone for any day, so an attacker who knows roughly when a
 * vault was sealed knows that component outright. And it would have added a whole new way to lose the
 * vault: with the day inside the secret, losing the RECORD locks the operator out even holding the correct
 * secret. Zero entropy bought at the price of a second single point of failure reads as a bad trade in
 * both directions.
 *
 * Stamping keeps everything the ceremony was for and costs nothing. The passphrase stays exactly what the
 * operator typed; the vault carries the day it was founded as a memory-anchor beside it; losing the stamp
 * loses a nice fact and no access at all.
 *
 * The stamp is the COMPUTED form, never `ddate`'s prose — that binary's output shape varies by invocation
 * (measured), and a record meant to read back identically cannot ride a moving string.
 */
function writeSealDay(stamp: string, prose: string, source: string): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  writeFileSync(sealDayPath(), `${JSON.stringify({ stamp, prose, source }, null, 2)}\n`, { mode: 0o600, encoding: "utf8" });
}

/** Read the recorded seal-day, or null when this vault was sealed without one. */
function readSealDay(): { stamp: string; prose: string; source: string } | null {
  try { return JSON.parse(readFileSync(sealDayPath(), "utf8")) as { stamp: string; prose: string; source: string }; }
  catch { return null; }
}

/**
 * `lares vault passphrase` — read back WHICH DAY a sealed vault carries, and what to type.
 *
 * ANSWERING THE FIRST QUESTION PLAINLY: no CLI can set `LARES_ARCHIVE_PASSPHRASE` in the operator's shell —
 * a child process cannot write its parent's environment, on any OS. What a CLI can do is hold the ceremony
 * (`vault seal --ddate`) and read the record back (here), so the operator never has to remember a composed
 * string, only their own secret.
 */
function vaultPassphrase(args: ParsedArgs): number {
  const recorded = readSealDay();
  const today    = discordianReading();
  emit(args, {
    ok: true,
    data: { recorded, today: { prose: today.prose, stamp: today.stamp, source: today.source, agrees: today.agrees ?? null } },
    human: () => {
      console.log(`today:  ${today.prose}   [${today.source}]`);
      if (today.agrees === false) {
        console.log("  ⚠ ddate and the computed calendar DISAGREE — a foreign ddate, or a leap-year rule we have wrong.");
      }
      if (!recorded) {
        console.log("this vault carries NO recorded seal-day — it was sealed before the stamp existed.");
        console.log("  a re-seal or a rotate records one; the passphrase itself is unaffected either way.");
        return;
      }
      console.log(`sealed: ${recorded.prose}`);
      console.log(`  stamp:  ${recorded.stamp}`);
      console.log("  the day is a STAMP ON the passphrase, never a PART of it — this vault opens on your");
      console.log("  secret alone. Losing this record loses a nice fact and no access at all.");
    },
  });
  return 0;
}

export async function cmdVault(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub) { usage(); return 2; }
  const daemonUp = await udsAlive();

  try {
    switch (sub) {
      case "status":     return await vaultStatus(args, daemonUp);
      case "passphrase": return vaultPassphrase(args);
      case "seal":    return await vaultSeal(args, daemonUp);
      case "rotate":  return await vaultRotate(args, daemonUp);
      case "export":  return await vaultExport(args, daemonUp);
      case "repair":  return await vaultRepair(args, daemonUp);
      default:
        console.error(`lares vault: unknown sub-verb "${sub}"`);
        usage();
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof UsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares vault ${sub}: ${msg}`) });
    return exitFor(code);
  }
}

/** Route a mutating verb through the daemon (up) or the direct core op (down), returning its payload. */
async function routed(
  daemonUp: boolean,
  verb: string,
  vargs: Record<string, unknown>,
  direct: () => Record<string, unknown>,
): Promise<{ output: Record<string, unknown>; via: "daemon" | "direct" }> {
  if (daemonUp) {
    const did = await vesselDid();
    const r = await runVerb(verb, vargs, did, { timeoutMs: 30_000 });
    if (r.status === "error") throw new Error(r.errorMessage ?? "verb failed");
    return { output: summaryOutput(r) ?? {}, via: "daemon" };
  }
  return { output: direct(), via: "direct" };
}

async function vaultStatus(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  // --check probes a passphrase to detect a split-KEK (the carriers disagree on it).
  let probe: string | undefined;
  if (args.flags["check"]) {
    probe = process.env[ARCHIVE_PASSPHRASE_ENV] ?? (canPromptSecret() ? await promptSecret("passphrase to probe: ") : undefined);
  }
  const vargs: Record<string, unknown> = probe ? { probe } : {};
  const { output, via } = await routed(daemonUp, "vault-status", vargs, () => ({ ...archiveSealStatus(probe ? { probe } : {}) }));
  emit(args, {
    ok: true,
    data: { ...output, via },
    human: () => {
      const carriers = (output["carriers"] ?? {}) as Record<string, { state: string; mode?: string; opensUnderProbe?: boolean }>;
      console.log(`vault status (${via}):`);
      for (const [name, c] of Object.entries(carriers)) {
        const probeMark = c.opensUnderProbe === undefined ? "" : c.opensUnderProbe ? "  ✓ opens under probe" : "  ✗ does NOT open under probe";
        console.log(`  ${name.padEnd(14)} ${c.state}${c.mode ? ` (${c.mode})` : ""}${probeMark}`);
      }
      if (output["split"]) console.error("  ⚠ SPLIT-KEK: the carriers ride different passphrases — run `lares vault repair`");
      console.log(`  sealExpected   ${output["sealExpected"]}`);
      console.log(`  passphraseEnv  ${output["passphraseEnvSet"] ? "set" : "unset"}`);
      // The keychain leg says WHY it reads dark. A silent leg gets mistaken for a leg that never ran.
      const kc = output["keychain"] as { persistentStore?: boolean; reason?: string; kekAvailable?: boolean } | undefined;
      if (kc) {
        console.log(`  keychainKek    ${kc.kekAvailable ? "available" : "dark"} — ${kc.reason ?? "no reason reported"}`);
      }
    },
  });
  return 0;
}

async function vaultSeal(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  const secret = await newPass(args, "new passphrase");
  warnIfWeak(secret);
  // EVERY seal stamps its day. It needs no flag because it changes nothing about the passphrase — the
  // vault opens on exactly what the operator typed, and the day rides beside it as a record.
  const pass    = secret;
  const erisian = discordianReading();
  const { output, via } = await routed(daemonUp, "vault-seal", { passphrase: pass }, () => ({ ...sealArchiveWithPassphrase(pass) }));
  const sealed = (output["sealed"] ?? []) as string[];

  // THE STAMP RECORDS A SEAL THAT HAPPENED, never one that was attempted. Written ahead of the call it
  // described, it dated a vault that sealed NOTHING — so a no-op left behind a record claiming today's
  // work, and `vault passphrase` would read that date back as fact. A day nobody sealed on is worse than
  // no day at all: an operator recovering a vault trusts the stamp to narrow what they typed and when.
  if (sealed.length > 0) writeSealDay(erisian.stamp, erisian.prose, erisian.source);

  emit(args, {
    ok: true, data: { ...output, via, sealedCount: sealed.length, stamped: sealed.length > 0 },
    human: () => {
      if (sealed.length === 0) {
        // A no-op reads as a no-op. The common cause is worth naming: a passphrase in the environment
        // during founding seals the carriers THERE, so this movement finds nothing left to do.
        console.log(`sealed NOTHING (${via}) — every carrier already stands sealed, or none exists yet.`);
        console.log("  no stamp written: the day records a seal that happened, never one attempted.");
        console.log("  see what stands:      lares vault status");
        console.log("  change the passphrase: lares vault rotate");
        return;
      }
      console.log(`sealed ${sealed.join(", ")} (${via})`);
      console.log(`  sealed on ${erisian.prose}   [${erisian.source}]`);
      console.log("  the day is a STAMP, never part of the passphrase — the vault opens on what you typed.");
      console.log("  read it back any time with:  lares vault passphrase");
    },
  });
  return 0;
}

async function vaultRotate(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  const oldP = await currentPass(args, "current passphrase");
  const newP = await newPass(args, "new passphrase");
  warnIfWeak(newP);
  const { output, via } = await routed(daemonUp, "vault-rotate", { old: oldP, new: newP }, () => ({ ...rotateArchivePassphrase(oldP, newP) }));
  emit(args, {
    ok: true, data: { ...output, via },
    human: () => console.log(`rotated ${((output["rotated"] ?? []) as string[]).join(", ") || "(none)"} (${via})`),
  });
  return 0;
}

async function vaultExport(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  const path = args.positional[1];
  if (!path) throw new UsageError("export needs a destination path: `lares vault export <path>`");
  const dest = resolve(path);
  const force = Boolean(args.flags["force"]);
  // The BACKUP seal passphrase (a fresh choice for the portable file) — double-entry at a TTY.
  const pass = await newPass(args, "backup passphrase");
  warnIfWeak(pass);
  const { output, via } = await routed(daemonUp, "vault-export", { passphrase: pass, dest, force }, () => ({ ...exportSealedArchive(pass, dest, force) }));
  emit(args, {
    ok: true, data: { ...output, via },
    human: () => console.log(`exported sealed backup → ${output["dest"]} (${output["bytes"]} bytes, ${via})`),
  });
  return 0;
}

async function vaultRepair(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  // The lagging carrier opens under the OPEN passphrase; re-seal it under the SEAL (target) passphrase.
  const openP = await currentPass(args, "passphrase that opens the LAGGING carrier");
  const sealP = await newPass(args, "target passphrase (opens the other carrier)");
  const { output, via } = await routed(daemonUp, "vault-repair", { openPass: openP, sealPass: sealP }, () => ({ ...repairSplitKek(openP, sealP) }));
  emit(args, {
    ok: true, data: { ...output, via },
    human: () => {
      const repaired = (output["repaired"] ?? []) as string[];
      console.log(`repaired ${repaired.length ? repaired.join(", ") : "(nothing — carriers already consistent)"} (${via})`);
    },
  });
  return 0;
}
