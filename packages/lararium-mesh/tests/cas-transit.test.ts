/**
 * cas-transit.test.ts — the cad REMOTE leg: DHT-free discovery + secret-free BLAKE3(bytes)==cid verify.
 *
 * The load-bearing proofs against the REAL seal primitive (`sealBodyOnCas`) + a MODELED member↔relay transport:
 *   · a member fetches a REMOTE-ONLY body via the transport's holder index (a bag-tracker stand-in) — no DHT,
 *   · a TAMPERED byte fails `verifyCiphertextCid` and is REJECTED at the fetcher (never returned, never cached),
 *   · the transport (relay) serves + the fetcher verifies holding NO secret (verify-cap ⊥ read-cap),
 *   · `dont-have` everywhere → an explicit `null` miss (fail-closed, never a partial/unverified body),
 *   · `makeCidResolver` is LOCAL-FIRST: a local hit never touches transit; a miss fetches, verifies, caches.
 */
import { describe, test, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  sealBodyOnCas, CONVERGENCE_SECRET_LEN,
  fetchCidOverTransit, makeCidResolver,
  type CasTransitTransport, type CasHolder,
} from "../src/index.js";

const secret = new Uint8Array(randomBytes(CONVERGENCE_SECRET_LEN));
const sealed = sealBodyOnCas(new TextEncoder().encode("a sealed body that lives only on a remote holder"), secret);

/**
 * A modeled transport over a holder→bytes store — the relay/bag-tracker stand-in. `discover` returns the holders
 * the store knows (DHT-free hint); `fetchBlock` returns a holder's bytes or `null`. It holds NO secret — only
 * cids + ciphertext, exactly the relay's surface.
 */
function makeStoreTransport(store: Map<string, Map<CasHolder, Uint8Array | null>>): CasTransitTransport {
  return {
    async discover(cid: string): Promise<readonly CasHolder[]> {
      const holders = store.get(cid);
      return holders === undefined ? [] : [...holders.keys()];
    },
    async fetchBlock(cid: string, holder: CasHolder): Promise<Uint8Array | null> {
      return store.get(cid)?.get(holder) ?? null;
    },
  };
}

describe("DHT-free remote fetch — the member finds a holder via the tracker index, no DHT", () => {
  test("a remote-only body fetches + verifies secret-free", async () => {
    const store = new Map([[sealed.cid, new Map<CasHolder, Uint8Array | null>([["relay-A", sealed.ciphertext]])]]);
    const bytes = await fetchCidOverTransit(sealed.cid, makeStoreTransport(store));
    expect(bytes).not.toBeNull();
    expect(bytes).toEqual(sealed.ciphertext);   // the ONE right answer, verified BLAKE3(bytes)==cid, no secret used
  });

  test("a TAMPERED byte fails verify at the fetcher → rejected; a later good holder still wins", async () => {
    const bad = new Uint8Array(sealed.ciphertext); bad[0] ^= 0xff;   // flip one byte
    const store = new Map([[sealed.cid, new Map<CasHolder, Uint8Array | null>([
      ["hostile-relay", bad],          // returns bytes, but BLAKE3(bytes) != cid
      ["honest-relay",  sealed.ciphertext],
    ])]]);
    const bytes = await fetchCidOverTransit(sealed.cid, makeStoreTransport(store));
    expect(bytes).toEqual(sealed.ciphertext);   // the hostile block was skipped, the honest one verified
  });

  test("a lone tampered holder → NULL (fail-closed: never a corrupt body)", async () => {
    const bad = new Uint8Array(sealed.ciphertext); bad[3] ^= 0x01;
    const store = new Map([[sealed.cid, new Map<CasHolder, Uint8Array | null>([["hostile", bad]])]]);
    expect(await fetchCidOverTransit(sealed.cid, makeStoreTransport(store))).toBeNull();
  });

  test("dont-have everywhere → explicit NULL miss", async () => {
    const store = new Map([[sealed.cid, new Map<CasHolder, Uint8Array | null>([["peer-x", null], ["peer-y", null]])]]);
    expect(await fetchCidOverTransit(sealed.cid, makeStoreTransport(store))).toBeNull();
    // No holder known at all → also NULL.
    expect(await fetchCidOverTransit(sealed.cid, makeStoreTransport(new Map()))).toBeNull();
  });
});

describe("makeCidResolver — LOCAL-FIRST, remote leg verifies + caches write-through", () => {
  test("a local hit never touches transit", async () => {
    let discovered = 0;
    const transit: CasTransitTransport = {
      async discover(_cid) { discovered++; return []; },
      async fetchBlock() { return null; },
    };
    const resolve = makeCidResolver(() => sealed.ciphertext, transit, () => {});
    expect(await resolve(sealed.cid)).toEqual(sealed.ciphertext);
    expect(discovered).toBe(0);   // local-first: no discovery ran
  });

  test("a local miss fetches over transit, verifies, and caches the VERIFIED body write-through", async () => {
    const store = new Map([[sealed.cid, new Map<CasHolder, Uint8Array | null>([["relay-A", sealed.ciphertext]])]]);
    const cache = new Map<string, Uint8Array>();
    const resolve = makeCidResolver(
      (cid) => cache.get(cid) ?? null,                 // local reads the cache
      makeStoreTransport(store),
      (cid, bytes) => { cache.set(cid, bytes); },      // write-through
    );
    expect(cache.has(sealed.cid)).toBe(false);
    expect(await resolve(sealed.cid)).toEqual(sealed.ciphertext);
    expect(cache.get(sealed.cid)).toEqual(sealed.ciphertext);   // cached → the next read is local
  });
});
