/**
 * secret-service-probe (node atom) — does this machine offer a secret store that SURVIVES A REBOOT?
 *
 * WHY THE QUESTION READS THAT WAY. The archive KEK policy runs passphrase-primary, keychain-conditional,
 * and the conditional half turns on one hazard: `@napi-rs/keyring` on Linux resolves to the kernel's
 * *keyutils* backend when no Secret Service answers. Keyutils holds its keys IN MEMORY. A KEK landing
 * there seals an archive that stops opening at the next reboot — a permanent lockout, arriving silently,
 * on the one carrier the vessel cannot re-mint. So the probe never asks //is a keychain reachable//; it
 * asks //does a PERSISTENT one answer//, and treats every unknown as absent.
 *
 * THE ENV VAR ALONE LIES, and this repo's own dev box proves it. Under headless WSL2
 * `DBUS_SESSION_BUS_ADDRESS` reads SET while nothing owns `org.freedesktop.secrets` — so a probe that
 * stopped at the address would answer "available" on precisely the platform that bricks. The probe
 * therefore asks the bus WHO OWNS THE NAME, which is exactly the discriminator between a disk-backed
 * Secret Service (gnome-keyring, KWallet) and the volatile keyutils fallback beneath it.
 *
 * EVERY FAILURE READS ABSENT. A missing D-Bus client, a bus that will not answer, a call that runs long,
 * an unparsable reply — each resolves false. The probe also carries a REASON, so `vault status` can say
 * why a leg stays dark instead of leaving an operator to guess.
 *
 * The probe answers availability ONLY. Lighting the KEK leg needs this AND a keyring binding
 * (`keychainBindingPresent`), which stays a separate, deliberately visible act.
 */

import { spawnSync } from "node:child_process";

/** How long the bus gets to answer before the probe gives up and reads absent. Boot must never hang. */
const PROBE_TIMEOUT_MS = 2000;

/** The well-known bus name a disk-backed Secret Service owns (freedesktop Secret Service API). */
export const SECRET_SERVICE_BUS_NAME = "org.freedesktop.secrets";

export interface SecretServiceProbe {
  /** True only when a secret store answers AND holds its keys across a reboot. */
  readonly persistent: boolean;
  /** Why the probe landed where it did — surfaced to the operator, never a secret. */
  readonly reason: string;
}

/** Run one probe command, returning its stdout, or null when it fails, times out, or is absent. */
function tryRun(cmd: string, args: readonly string[]): string | null {
  try {
    const r = spawnSync(cmd, [...args], {
      timeout: PROBE_TIMEOUT_MS,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (r.error || r.status !== 0 || typeof r.stdout !== "string") return null;
    return r.stdout;
  } catch {
    return null;   // spawn refused outright — absent, like every other unknown
  }
}

/** The command shape each client uses to ask the bus whether anything owns the Secret Service name. */
type Runner = (cmd: string, args: readonly string[]) => string | null;

function nameHasOwner(run: Runner): boolean | null {
  const viaDbusSend = run("dbus-send", [
    "--session", "--dest=org.freedesktop.DBus", "--type=method_call", "--print-reply",
    "/org/freedesktop/DBus", "org.freedesktop.DBus.NameHasOwner", `string:${SECRET_SERVICE_BUS_NAME}`,
  ]);
  if (viaDbusSend !== null) {
    if (/boolean\s+true/.test(viaDbusSend)) return true;
    if (/boolean\s+false/.test(viaDbusSend)) return false;
    return null;   // answered in a shape this parser does not know — unknown reads absent
  }
  const viaGdbus = run("gdbus", [
    "call", "--session", "--dest", "org.freedesktop.DBus",
    "--object-path", "/org/freedesktop/DBus",
    "--method", "org.freedesktop.DBus.NameHasOwner", SECRET_SERVICE_BUS_NAME,
  ]);
  if (viaGdbus !== null) {
    if (/\(\s*true\s*,?\s*\)/.test(viaGdbus)) return true;
    if (/\(\s*false\s*,?\s*\)/.test(viaGdbus)) return false;
    return null;
  }
  return null;   // no client on the box to ask with
}

/**
 * Probe this machine for a reboot-surviving secret store.
 *
 * macOS and Windows ship one as part of the OS (Keychain / Credential Manager), both disk-backed, so the
 * platform itself answers. Linux earns its answer from the session bus. Everything else reads absent.
 *
 * `env` and `run` inject so a test drives every branch without a live bus.
 */
export function probeSecretService(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  run: Runner = tryRun,
): SecretServiceProbe {
  if (platform === "darwin") {
    return { persistent: true, reason: "macOS Keychain — OS-provided and disk-backed" };
  }
  if (platform === "win32") {
    return { persistent: true, reason: "Windows Credential Manager — OS-provided and disk-backed" };
  }
  if (platform !== "linux") {
    return { persistent: false, reason: `no known persistent secret store on platform "${platform}"` };
  }
  if (!env["DBUS_SESSION_BUS_ADDRESS"]) {
    return { persistent: false, reason: "no DBUS_SESSION_BUS_ADDRESS — nothing to ask" };
  }
  const owned = nameHasOwner(run);
  if (owned === null) {
    return { persistent: false, reason: "no D-Bus client answered the ownership probe (dbus-send / gdbus)" };
  }
  if (!owned) {
    return {
      persistent: false,
      reason: `nothing owns ${SECRET_SERVICE_BUS_NAME} — a keyring here would fall to the kernel keyutils cache, which drops its keys on reboot`,
    };
  }
  return { persistent: true, reason: `${SECRET_SERVICE_BUS_NAME} is owned — a disk-backed Secret Service answers` };
}

/**
 * Does a keyring binding stand in this build?
 *
 * The probe above answers whether the MACHINE could hold a KEK; this answers whether the CODE can reach it.
 * Adding `@napi-rs/keyring` as a dependency is what flips this — a native binding across every platform the
 * monorepo builds on, and a decision that wants to be seen rather than inferred. Until then the KEK leg
 * stays dark on every machine, including the ones that would carry it fine.
 */
export function keychainBindingPresent(): boolean {
  return false;
}

/**
 * The gate the seal policy consults: a keychain KEK rides only when the machine holds a persistent store
 * AND this build can reach it. Either half absent leaves the passphrase path in force — the fail-safe the
 * operator ruling names, since degrading to a weaker or more volatile key would trade a typed passphrase
 * for a silent brick.
 */
export function keychainKekAvailable(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  run: Runner = tryRun,
): boolean {
  return keychainBindingPresent() && probeSecretService(env, platform, run).persistent;
}
