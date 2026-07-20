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

import { resolve } from "node:path";
import {
  archiveSealStatus, sealArchiveWithPassphrase, rotateArchivePassphrase,
  exportSealedArchive, repairSplitKek, weakPassphraseWarning,
  ARCHIVE_PASSPHRASE_ENV,
} from "@lararium/node";
import { operatorDid } from "../env.js";
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

export async function cmdVault(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub) { usage(); return 2; }
  const daemonUp = udsAvailable();

  try {
    switch (sub) {
      case "status":  return await vaultStatus(args, daemonUp);
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
    const did = await operatorDid();
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
    },
  });
  return 0;
}

async function vaultSeal(args: ParsedArgs, daemonUp: boolean): Promise<number> {
  const pass = await newPass(args, "new passphrase");
  warnIfWeak(pass);
  const { output, via } = await routed(daemonUp, "vault-seal", { passphrase: pass }, () => ({ ...sealArchiveWithPassphrase(pass) }));
  emit(args, {
    ok: true, data: { ...output, via },
    human: () => {
      const sealed = (output["sealed"] ?? []) as string[];
      console.log(`sealed ${sealed.length ? sealed.join(", ") : "(nothing — carriers already sealed or absent)"} (${via})`);
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
