/**
 * The gate refuses where a browser would withhold, and says why in words a person can act on.
 *
 * The load-bearing property is not that it refuses — a TypeError refuses too. It is that the refusal
 * NAMES THE CAUSE AND THE CURE, on the one path a household actually takes: a phone on a LAN address.
 * So the tests assert the reason's content, not only the verdict.
 */
import { describe, expect, test } from "vitest";

import {
  readSecureContext, assertCanMint, requestDurableStorage,
  type SecureContextHost, type StorageHost,
} from "../src/secure-context-gate.js";

const lanPhone: SecureContextHost = {
  isSecureContext: false, hasSubtle: false, origin: "http://192.168.1.24:5173",
};
const stripped: SecureContextHost = {
  isSecureContext: true, hasSubtle: false, origin: "https://freyja.home.kahu.tld",
};
const ready: SecureContextHost = {
  isSecureContext: true, hasSubtle: true, origin: "https://freyja.home.kahu.tld",
};

describe("the context reading names the root cause, never the symptom", () => {
  test("a phone on a LAN address — the household case", () => {
    const r = readSecureContext(lanPhone);
    expect(r.verdict).toBe("insecure-origin");
    expect(r.canMint).toBe(false);
    expect(r.reason).toContain("192.168.1.24");          // the actual address, so a person recognises it
    expect(r.reason).toMatch(/https|localhost/);          // and the cure
  });

  test("an insecure origin reports the ORIGIN, not the missing API", () => {
    // Both flags read false here. Reporting `no-subtle` first would send a reader after the symptom —
    // the missing API IS the insecure origin, and chasing it wastes the one attempt they will make.
    expect(readSecureContext(lanPhone).verdict).toBe("insecure-origin");
  });

  test("secure but subtle-less reads as an environment finding, not an address one", () => {
    const r = readSecureContext(stripped);
    expect(r.verdict).toBe("no-subtle");
    expect(r.reason).toMatch(/sandboxed|stripped/);
  });

  test("a real secure context may mint", () => {
    const r = readSecureContext(ready);
    expect(r.verdict).toBe("ready");
    expect(r.canMint).toBe(true);
  });
});

describe("the assertion refuses rather than degrading", () => {
  test("it throws where a key cannot be minted, carrying the reason", () => {
    expect(() => assertCanMint(lanPhone)).toThrow(/cannot mint an identity here/);
    expect(() => assertCanMint(lanPhone)).toThrow(/192\.168\.1\.24/);
  });

  test("it passes silently where one can", () => {
    expect(() => assertCanMint(ready)).not.toThrow();
  });

  test("REFUSING beats falling back — a vessel with no identity stays honest", () => {
    // The WASM signer beside this one degrades to an extractable in-memory key when its WebCrypto path
    // throws. That gives a vessel an identity nobody chose, weaker than the one it asked for, surfaced
    // only through a getter nobody reads. This gate has no fallback branch at all, and that is the point.
    let threw = false;
    try { assertCanMint(lanPhone); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

describe("the storage probe reports what it was granted", () => {
  const granted: StorageHost = { persisted: async () => true };
  const grantedOnAsk: StorageHost = { persisted: async () => false, persist: async () => true };
  const refused: StorageHost = { persisted: async () => false, persist: async () => false };
  const throws: StorageHost = { persisted: async () => { throw new Error("nope"); } };

  test("already persistent needs no asking", async () => {
    expect((await requestDurableStorage(granted)).persistence).toBe("persistent");
  });

  test("granted on request", async () => {
    expect((await requestDurableStorage(grantedOnAsk)).persistence).toBe("persistent");
  });

  test("refused reads best-effort AND names the seven-day cap and its exemption", async () => {
    const r = await requestDurableStorage(refused);
    expect(r.persistence).toBe("best-effort");
    expect(r.reason).toMatch(/seven days/);
    expect(r.reason).toMatch(/home screen/);   // the one action that exempts an origin from that clock
  });

  test("a host with no storage API reads unknown, never assumed-durable", async () => {
    // Omitting the argument reads the LIVE browser (asserted below); an empty host drives this branch.
    expect((await requestDurableStorage({})).persistence).toBe("unknown");
  });

  test("against the LIVE browser it answers, and never claims durability it lacks", async () => {
    const r = await requestDurableStorage();
    expect(["persistent", "best-effort", "unknown"]).toContain(r.persistence);
    expect(r.reason.length).toBeGreaterThan(0);
    // A headless origin with no interaction history gets best-effort, which is the truthful answer —
    // and exactly the state a vessel must be able to report rather than assume away.
    if (r.persistence === "best-effort") expect(r.reason).toMatch(/seven days/);
  });

  test("a throwing probe reads unknown rather than sinking the boot", async () => {
    expect((await requestDurableStorage(throws)).persistence).toBe("unknown");
  });
});
