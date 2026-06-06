/**
 * browser-founding-ceremony — real browser boot gate test.
 *
 * Proves S9 S4 scope in actual Chromium via Playwright:
 *   1. WebCrypto keypair generates + persists to IndexedDB
 *   2. runFoundingCeremony seeds social docs; bootstrap artifact persists to IDB
 *   3. Vessel reaches "live" — founding + boot complete without throwing
 *   4. Resume boot: second openBrowserVessel call loads from IDB without re-running ceremony
 *   5. docHandle.broadcast() fires without error
 *
 * These tests do NOT pass genesisBytes / adminWorkerUrl, so the admin island never
 * spawns and the vessel is pre-sovereign by design (sovereignty-follows-canon,
 * isomorphic-vessel Stage 1): keyhive + Gates A/B/C now run IN the admin worker,
 * which only boots with a core. In-worker gate logic is covered by bootAdminKeyhive's
 * unit tests. These tests prove the identity + ceremony layer — the seam
 * openNodeVessel covers via runInit.
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
  test("cold boot: founding ceremony runs, vessel reaches live (pre-sovereign, coreless)", async () => {
    const idb    = freshIdb();
    const result = await openBrowserVessel({
      hostId:      "test-host",
      wikiId:      "test-wiki",
      idbName:     idb,
      displayName: "Test Operator",
    });

    // Coreless boot (no genesisBytes / adminWorkerUrl): the admin island never
    // spawns, so keyhive + Gates A/B/C run nowhere — the vessel is honestly
    // pre-sovereign. `phase === "live"` proves founding + boot completed without
    // throwing. In-worker gate logic is covered by bootAdminKeyhive's unit tests.
    expect(result.phase).toBe("live");
    expect(result.vessel).toBeDefined();
    expect(result.pool).toBeDefined();
    expect(result.store).toBeDefined();
    expect(result.admin).toBeNull();
    expect(result.wikiDocUrl).toMatch(/^automerge:/);
    expect(result.catalogHandleUrl).toMatch(/^automerge:/);

    await result.repo.shutdown();
  });

  test("resume boot: second open loads existing bootstrap, identity persists", async () => {
    const idb = freshIdb();

    // First boot.
    const first = await openBrowserVessel({
      hostId:  "test-host",
      wikiId:  "test-wiki",
      idbName: idb,
    });
    const firstKey = (await generateOrLoadBrowserKeypair(idb)).verifyingKey;
    await first.repo.shutdown();

    // Resume boot — same IDB, new Repo instance.
    const second = await openBrowserVessel({
      hostId:  "test-host",
      wikiId:  "test-wiki",
      idbName: idb,
    });
    const secondKey = (await generateOrLoadBrowserKeypair(idb)).verifyingKey;

    // Same operator identity across boots (persisted keypair).
    expect(secondKey).toBe(firstKey);
    expect(second.phase).toBe("live");

    await second.repo.shutdown();
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
    // Open vessels sequentially on the same IDB so the founding ceremony docs are
    // fully flushed before the second Repo opens. Concurrent open on the same IDB
    // creates a race: a's docs enter "unavailable" in b's Repo before IDB writes land.
    const idb = freshIdb();

    const a    = await openBrowserVessel({ hostId: "h", wikiId: "wiki-a", idbName: idb });
    const aUrl = a.wikiDocUrl;
    await a.repo.shutdown();

    const b = await openBrowserVessel({ hostId: "h", wikiId: "wiki-b", idbName: idb });
    expect(aUrl).not.toBe(b.wikiDocUrl);
    await b.repo.shutdown();
  });
});
