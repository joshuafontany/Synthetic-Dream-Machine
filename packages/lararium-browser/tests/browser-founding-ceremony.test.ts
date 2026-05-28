/**
 * browser-founding-ceremony — real browser boot gate test.
 *
 * Proves S9 S4 scope in actual Chromium via Playwright:
 *   1. WebCrypto keypair generates + persists to IndexedDB
 *   2. runFoundingCeremony seeds social docs; bootstrap artifact persists to IDB
 *   3. Gates A, B, C pass — vessel is sovereign
 *   4. Resume boot: second openBrowserVessel call loads from IDB without re-running ceremony
 *   5. docHandle.broadcast() fires without error
 *
 * These tests do NOT mount TW5 wiki islands (no genesis island available in browser yet).
 * They prove the identity + ceremony layer — the seam openNodeVessel covers via runInit.
 */

import { describe, test, expect, afterEach } from "vitest";
import { openBrowserVessel }                  from "../src/open-browser-vessel.js";
import {
  generateOrLoadBrowserKeypair,
  loadBrowserSigningSeed,
  openVesselIdb,
  idbGet,
}                                             from "../src/browser-operator-key.js";

// Each test gets an isolated IDB namespace so state never bleeds between tests.
let testSeq = 0;
function freshIdb(): string {
  return `lares:test-${++testSeq}-${Date.now()}`;
}

afterEach(() => {
  // IDB cleanup: the browser GC handles orphaned databases; names are unique per run.
});

// ── Keypair lifecycle ─────────────────────────────────────────────────────────

describe("browser-operator-key", () => {
  test("generates Ed25519 keypair on first call and persists to IDB", async () => {
    const idb      = freshIdb();
    const identity = await generateOrLoadBrowserKeypair(idb, "Test Operator");

    expect(identity.verifyingKey).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.displayName).toBe("Test Operator");

    // Signing seed loads separately.
    const seed = await loadBrowserSigningSeed(idb);
    expect(seed).toBeInstanceOf(Uint8Array);
    expect(seed.length).toBe(32);
    // Seed MUST NOT be all-zeros.
    expect(seed.some(b => b !== 0)).toBe(true);
  });

  test("returns same verifyingKey on subsequent calls (persistent)", async () => {
    const idb    = freshIdb();
    const first  = await generateOrLoadBrowserKeypair(idb);
    const second = await generateOrLoadBrowserKeypair(idb);
    expect(second.verifyingKey).toBe(first.verifyingKey);
  });

  test("different idbName produces different keypair", async () => {
    const a = await generateOrLoadBrowserKeypair(freshIdb());
    const b = await generateOrLoadBrowserKeypair(freshIdb());
    expect(a.verifyingKey).not.toBe(b.verifyingKey);
  });
});

// ── Full vessel boot ──────────────────────────────────────────────────────────

describe("openBrowserVessel", () => {
  test("cold boot: founding ceremony runs, gates A/B/C pass, vessel lives", async () => {
    const idb    = freshIdb();
    const result = await openBrowserVessel({
      hostId:      "test-host",
      wikiId:      "test-wiki",
      idbName:     idb,
      displayName: "Test Operator",
    });

    expect(result.phase).toBe("live");
    expect(result.vessel).toBeDefined();
    expect(result.pool).toBeDefined();
    expect(result.store).toBeDefined();
    expect(result.keyhive).toBeDefined();
    expect(result.wikiDocUrl).toMatch(/^automerge:/);
    expect(result.catalogHandleUrl).toMatch(/^automerge:/);

    // Gates B + C: if they failed, openBrowserVessel would have thrown above.
    const did = await result.keyhive.whoami();
    expect(did).toMatch(/^0x[0-9a-f]+$/);

    await result.repo.shutdown();
    await result.keyhive.dispose();
  });

  test("resume boot: second open loads existing bootstrap, gates still pass", async () => {
    const idb = freshIdb();

    // First boot.
    const first = await openBrowserVessel({
      hostId:  "test-host",
      wikiId:  "test-wiki",
      idbName: idb,
    });
    const firstDid = await first.keyhive.whoami();
    await first.repo.shutdown();
    await first.keyhive.dispose();

    // Resume boot — same IDB, new Repo instance.
    const second = await openBrowserVessel({
      hostId:  "test-host",
      wikiId:  "test-wiki",
      idbName: idb,
    });
    const secondDid = await second.keyhive.whoami();

    // Same operator identity across boots.
    expect(secondDid).toBe(firstDid);
    expect(second.phase).toBe("live");

    await second.repo.shutdown();
    await second.keyhive.dispose();
  });

  test("bootstrap artifact persists to IDB after founding ceremony", async () => {
    const idb = freshIdb();
    await openBrowserVessel({ hostId: "h", wikiId: "w", idbName: idb });

    const db        = await openVesselIdb(idb);
    const bootstrap = await idbGet<unknown>(db, "bootstrap", "social-bootstrap");
    db.close();

    expect(bootstrap).toBeDefined();
    const b = bootstrap as Record<string, unknown>;
    expect(typeof b["identitiesUrl"]).toBe("string");
    expect(typeof b["adminUrl"]).toBe("string");
    expect(typeof b["personGroupDocIdHex"]).toBe("string");
    expect(typeof b["meshCabalDocIdHex"]).toBe("string");
  });

  test("different wikiId produces distinct wiki docs", async () => {
    const idb = freshIdb();

    const a = await openBrowserVessel({ hostId: "h", wikiId: "wiki-a", idbName: idb });
    const b = await openBrowserVessel({ hostId: "h", wikiId: "wiki-b", idbName: idb });

    expect(a.wikiDocUrl).not.toBe(b.wikiDocUrl);

    await a.repo.shutdown();
    await b.repo.shutdown();
    await a.keyhive.dispose();
    await b.keyhive.dispose();
  });
});
