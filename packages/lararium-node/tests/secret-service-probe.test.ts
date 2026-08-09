/**
 * G1b — the keychain leg answers from a REAL probe, and every unknown reads absent.
 *
 * The hazard this guards: a KEK landing in the kernel keyutils cache seals an archive that stops opening
 * at the next reboot. So a probe that over-reports availability costs the sovereign identity floor, while
 * one that under-reports costs a typed passphrase. Every branch below therefore leans the same way.
 *
 * The live case matters as much as the injected ones — the last test runs the probe against THIS machine
 * and asserts the answer carries a reason, which is what keeps the shore from quietly returning to a
 * hardcoded false.
 */
import { describe, expect, test } from "vitest";

import {
  probeSecretService, keychainKekAvailable, keychainBindingPresent,
  SECRET_SERVICE_BUS_NAME,
} from "../src/secret-service-probe.js";
import { detectSecretService, resolveSealPolicy, ARCHIVE_PASSPHRASE_ENV } from "../src/archive-seal.js";

const BUS = { DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus" } as NodeJS.ProcessEnv;

/** A runner that answers ONE client and refuses every other — models a box with a partial toolset. */
function answering(client: string, stdout: string) {
  return (cmd: string) => (cmd === client ? stdout : null);
}
const refuseAll = () => null;

describe("the platform answers where the OS ships a disk-backed store", () => {
  test("macOS reads persistent", () => {
    const p = probeSecretService({}, "darwin", refuseAll);
    expect(p.persistent).toBe(true);
    expect(p.reason).toMatch(/Keychain/);
  });

  test("Windows reads persistent", () => {
    expect(probeSecretService({}, "win32", refuseAll).persistent).toBe(true);
  });

  test("an unknown platform reads absent and names itself", () => {
    const p = probeSecretService({}, "freebsd", refuseAll);
    expect(p.persistent).toBe(false);
    expect(p.reason).toMatch(/freebsd/);
  });
});

describe("linux earns its answer from the bus, never from the address", () => {
  test("no bus address reads absent", () => {
    const p = probeSecretService({}, "linux", refuseAll);
    expect(p.persistent).toBe(false);
    expect(p.reason).toMatch(/DBUS_SESSION_BUS_ADDRESS/);
  });

  test("THE FALSE POSITIVE THE ENV VAR WOULD PRODUCE: address set, nothing owns the name", () => {
    // This is the live WSL2 shape — the address reads set while no Secret Service answers. A probe that
    // stopped at the address would light the leg here, on the exact platform that bricks the archive.
    const p = probeSecretService(BUS, "linux", answering("dbus-send", "   boolean false\n"));
    expect(p.persistent).toBe(false);
    expect(p.reason).toMatch(/keyutils/);
    expect(p.reason).toContain(SECRET_SERVICE_BUS_NAME);
  });

  test("an owned name reads persistent", () => {
    const p = probeSecretService(BUS, "linux", answering("dbus-send", "   boolean true\n"));
    expect(p.persistent).toBe(true);
  });

  test("gdbus carries the probe when dbus-send is absent", () => {
    expect(probeSecretService(BUS, "linux", answering("gdbus", "(true,)\n")).persistent).toBe(true);
    expect(probeSecretService(BUS, "linux", answering("gdbus", "(false,)\n")).persistent).toBe(false);
  });

  test("no client on the box reads absent rather than assuming", () => {
    const p = probeSecretService(BUS, "linux", refuseAll);
    expect(p.persistent).toBe(false);
    expect(p.reason).toMatch(/no D-Bus client/);
  });

  test("a reply in an unknown shape reads absent", () => {
    // A future client wording, a truncated pipe, a localized message — none of them mean yes.
    const p = probeSecretService(BUS, "linux", answering("dbus-send", "something else entirely"));
    expect(p.persistent).toBe(false);
  });
});

describe("the KEK gate needs BOTH halves", () => {
  test("no binding stands in this build, so the leg reads dark everywhere", () => {
    expect(keychainBindingPresent()).toBe(false);
    // Even on the friendliest possible machine — persistent store, owned name.
    expect(keychainKekAvailable(BUS, "darwin", answering("dbus-send", "boolean true"))).toBe(false);
  });

  test("the passphrase path stays in force while the leg reads dark", () => {
    const policy = resolveSealPolicy({ [ARCHIVE_PASSPHRASE_ENV]: "correct horse battery staple" });
    expect(policy.mode).toBe("passphrase");
  });

  test("an unconfigured vessel still lands cleartext, unchanged", () => {
    expect(resolveSealPolicy({}).mode).toBe("cleartext");
  });
});

describe("the live machine", () => {
  test("the probe answers about THIS box and says why", () => {
    const p = probeSecretService();
    expect(typeof p.persistent).toBe("boolean");
    expect(p.reason.length).toBeGreaterThan(0);
    // detectSecretService reads through to the same probe — one source, two callers.
    expect(detectSecretService()).toBe(p.persistent);
  });
});
