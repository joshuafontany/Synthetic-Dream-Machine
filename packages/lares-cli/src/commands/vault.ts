/**
 * `lares vault {status,seal,rotate,export <path>,repair}` — the at-rest seal LIFECYCLE surface (#60).
 *
 * The vessel seals TWO secret carriers at rest under a scrypt-derived passphrase KEK: the keyhive archive
 * (the sovereign identity floor) and the device recovery share. This command is the operator's door to
 * their lifecycle — see them, seal them, rotate the passphrase, export a sealed backup, repair a split.
 *
 * DAEMON-FIRST (FORK-1): when the daemon holds the socket, the MUTATING verbs route THROUGH it, so the
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
import { udsAvailable } from "../local-connector.js";
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
  console.error("  seal --ddate      compose your secret with the Erisian day, FROZEN at seal and recorded in");
  console.error("                    the clear. The day is PUBLIC — it anchors the memory, never the strength.");
  console.error("");
  console.error(`  non-interactive: ${ARCHIVE_PASSPHRASE_ENV} (current) · ${NEW_PASS_ENV} (new) + --yes`);
}

/** The CURRENT passphrase — env first, else a no-echo prompt. Non-interactive without the env → usage error. */
async function currentPass(args: ParsedArgs, label: string): Promise<string> {
  const env = process.env[ARCHIVE_PASSPHRASE_ENV];
  if (env) return env;
  if (args.flags["yes"] || !canPromptSecret()) {
    throw new UsageError(`set ${ARCHIVE_PASSPHRASE_ENV} for non-interactive use`);
  }
  return promptSecret(`${label}: `);
}

/** A NEW passphrase — env first (non-interactive), else a double-entry no-echo prompt (anti-lockout). */
async function newPass(args: ParsedArgs, label: string): Promise<string> {
  const env = process.env[NEW_PASS_ENV];
  if (args.flags["yes"] || !canPromptSecret()) {
    if (!env) throw new UsageError(`set ${NEW_PASS_ENV} for non-interactive use`);
    return env;
  }
  if (env) return env;   // an operator who set the env even at a TTY means it
  return promptSecretConfirmed(label);
}

class UsageError extends Error {}

/** Warn (never reject) on a weak passphrase — the SOFT floor (FORK-4). */
function warnIfWeak(pass: string): void {
  const w = weakPassphraseWarning(pass);
  if (w) console.error(`  warning: ${w}`);
}

/** Where the seal-day rides — NON-SECRET, beside the identity it belongs to. */
function sealDayPath(): string { return join(larIdentityDir(), ".archive-seal-day.json"); }

/**
 * Compose the operator's secret with the day the vault was sealed, in the Erisian reckoning.
 *
 * ── WHAT THE DAY CONTRIBUTES, STATED HONESTLY ────────────────────────────────────────────────────
 * NOT entropy. The Discordian date is PUBLIC — anyone may compute it for any day, so an attacker who knows
 * roughly when a vault was sealed knows this component outright. It contributes CEREMONY and a MEMORY
 * ANCHOR: the vault carries the day it was founded, and the operator holds one secret instead of a long
 * string. All of the strength still comes from the secret. Claiming otherwise would make a mechanism read
 * as a control it is not.
 *
 * ── AND THE DAY IS FROZEN, NEVER RECOMPUTED ──────────────────────────────────────────────────────
 * A passphrase composed with TODAY's date would change every midnight and lock the operator out of their own
 * vault by morning. So the seal FREEZES the day it happened on, records it beside the identity in the clear,
 * and every later open reads the record rather than the calendar. The stamp is the COMPUTED form, never
 * `ddate`'s prose: that binary's output shape varies by invocation (measured), and a derivation cannot ride
 * a moving string.
 */
function composeWithSealDay(secret: string, stamp: string): string {
  return `${secret}:${stamp}`;
}

/** Record the seal-day in the clear. It is not a secret and pretending otherwise would only lose it. */
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
        console.log("this vault carries NO recorded seal-day — it was sealed with a bare passphrase.");
        console.log("  compose one with:  lares vault seal --ddate");
        return;
      }
      console.log(`sealed: ${recorded.prose}`);
      console.log(`  the passphrase reads  <your secret>:${recorded.stamp}`);
      console.log("  the day is PUBLIC and adds no entropy — it anchors the memory; the secret carries the strength.");
      console.log(`  non-interactive:  export ${ARCHIVE_PASSPHRASE_ENV}='<your secret>:${recorded.stamp}'`);
    },
  });
  return 0;
}

export async function cmdVault(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub) { usage(); return 2; }
  const daemonUp = udsAvailable();

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
  // `--ddate` composes the secret with the day this seal happens on, FROZEN and recorded in the clear.
  // Without it the passphrase stays exactly what the operator typed — the ceremony is opt-in, never a
  // surprise an operator discovers when a bare passphrase stops opening their vault.
  const erisian = args.flags["ddate"] === true ? discordianReading() : null;
  const pass    = erisian ? composeWithSealDay(secret, erisian.stamp) : secret;
  if (erisian) writeSealDay(erisian.stamp, erisian.prose, erisian.source);
  const { output, via } = await routed(daemonUp, "vault-seal", { passphrase: pass }, () => ({ ...sealArchiveWithPassphrase(pass) }));
  emit(args, {
    ok: true, data: { ...output, via },
    human: () => {
      const sealed = (output["sealed"] ?? []) as string[];
      console.log(`sealed ${sealed.length ? sealed.join(", ") : "(nothing — carriers already sealed or absent)"} (${via})`);
      if (erisian) {
        console.log(`  sealed on ${erisian.prose}   [${erisian.source}]`);
        console.log(`  the passphrase reads  <your secret>:${erisian.stamp}`);
        console.log("  the day is FROZEN and recorded in the clear — it never recomputes, so tomorrow still opens.");
        console.log("  read it back any time with:  lares vault passphrase");
      }
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
