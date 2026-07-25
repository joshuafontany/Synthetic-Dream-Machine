/**
 * browser-persona-vault.test.ts — the browser persona multitude over REAL IndexedDB + WebCrypto.
 *
 * PLURALITY PONO at the identity layer: a human wears a SET of personas, so the browser vault holds a SET
 * of PersonaGroup-roots keyed by handle-index, WEARS one at a time, and MAY switch. These tests stand the
 * browser adapter (makeBrowserIdbPersonaVault) against the SAME mesh core the node fs vault rides, over the
 * origin's real IDB and WebCrypto — no mock, no fake-indexeddb.
 *
 * The load-bearing claims:
 *   · a multitude of two DISTINCT roots persists + rosters over IDB, and wearing gates on custody-by-type;
 *   · the founding mints a DISTINCT persona-root as the edge SIGNER (signerDid != deviceDid) — the
 *     self-sign floor is gone, replaced by the two-key atom (device inits keyhive; persona-root signs the edge);
 *   · a fresh browser founds ONE persona (not the self-signed floor), and the worn root selects which
 *     binding feeds the worker;
 *   · a joinee (no root) reads its persona through the anchor, never a root it lacks.
 */
import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { runFoundingCeremony } from "@lararium/keyhive";
import {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  generateOrLoadBrowserPersonaRoot, loadBrowserPersonaRootSeed,
  wearBrowserPersona, loadBrowserActivePersona, listBrowserPersonaRoots,
  browserPersonaRootExists, browserJoineePersonaIndex,
  makeBrowserIdbPersonaVault,
} from "../src/browser-vessel-identity.js";
import type { IdentityAnchors } from "@lararium/mesh";

let created = 0;
const freshIdb = (): string => `lares:test-persona:${Date.now()}:${created++}`;
const opened = new Set<string>();
function idb(name?: string): string { const n = name ?? freshIdb(); opened.add(n); return n; }

function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

afterEach(async () => {
  for (const n of opened) await deleteIdb(n);
  opened.clear();
});

describe("the browser persona multitude over IndexedDB", () => {
  test("founds a multitude — two DISTINCT roots persist + roster, ascending", async () => {
    const name = idb();
    const h0 = await generateOrLoadBrowserPersonaRoot(name, 0);
    const h1 = await generateOrLoadBrowserPersonaRoot(name, 1);
    expect(h0.created).toBe(true);
    expect(h1.created).toBe(true);
    // DISTINCT: each root is the vessel's OWN sovereign secret (crypto.generate), never a copied key.
    expect(h0.verifyingKey).not.toBe(h1.verifyingKey);
    expect(await listBrowserPersonaRoots(name)).toEqual([0, 1]);
    expect(await browserPersonaRootExists(name, 0)).toBe(true);
    expect(await browserPersonaRootExists(name, 1)).toBe(true);
    expect(await browserPersonaRootExists(name, 2)).toBe(false);
  });

  test("generate-or-load is idempotent per index — a re-mint LOADS, never a fresh key", async () => {
    const name = idb();
    const first  = await generateOrLoadBrowserPersonaRoot(name, 0);
    const second = await generateOrLoadBrowserPersonaRoot(name, 0);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.verifyingKey).toBe(first.verifyingKey);
    expect(await listBrowserPersonaRoots(name)).toEqual([0]);   // one mint → one roster mark, no dup
  });

  test("wears the second — the selector moves, the root never does", async () => {
    const name = idb();
    await generateOrLoadBrowserPersonaRoot(name, 0);
    await generateOrLoadBrowserPersonaRoot(name, 1);
    expect(await loadBrowserActivePersona(name)).toBeUndefined();   // no inference from an empty selector
    await wearBrowserPersona(name, 1);
    expect(await loadBrowserActivePersona(name)).toBe(1);
    await wearBrowserPersona(name, 0);
    expect(await loadBrowserActivePersona(name)).toBe(0);
    // The roster is untouched by wearing — both roots still held.
    expect(await listBrowserPersonaRoots(name)).toEqual([0, 1]);
  });

  test("custody-by-type — wearing a persona whose root this vessel does NOT hold REFUSES", async () => {
    const name = idb();
    await generateOrLoadBrowserPersonaRoot(name, 0);
    await expect(wearBrowserPersona(name, 5)).rejects.toThrow(/cannot wear persona h5|no persona-root/);
    expect(await loadBrowserActivePersona(name)).toBeUndefined();   // the refusal moved nothing
  });

  test("the seed loads only where a root is HELD; an unheld index throws", async () => {
    const name = idb();
    await generateOrLoadBrowserPersonaRoot(name, 0);
    const seed = await loadBrowserPersonaRootSeed(name, 0);
    expect(seed).toBeInstanceOf(Uint8Array);
    expect(seed.length).toBe(32);
    await expect(loadBrowserPersonaRootSeed(name, 9)).rejects.toThrow(/no persona-root/);
  });
});

describe("the True Name Model — the founding mints a DISTINCT persona-root as the edge signer", () => {
  let repo: Repo | null = null;
  afterEach(async () => { await repo?.shutdown(); repo = null; });

  test("a fresh browser founds ONE persona — signerDid is the ROOT, never the device (no self-sign floor)", async () => {
    const name = idb();
    repo = new Repo({ sharePolicy: async () => true });

    // The exact subsequence open-browser-vessel runs on FOUND: device key inits keyhive; a distinct
    // persona-root signs the edge; the vessel wears the founded root.
    const device = await generateOrLoadBrowserVesselIdentity(name, "Test Operator");
    const operatorSeed = await loadBrowserSigningSeed(name);
    const root = await generateOrLoadBrowserPersonaRoot(name, 0);
    const signerSeed = await loadBrowserPersonaRootSeed(name, 0);
    await wearBrowserPersona(name, 0);

    const f = await runFoundingCeremony({
      repo,
      operatorSeed,
      operatorVerifyingKey: device.verifyingKey,
      operatorDisplayName: "Test Operator",
      signerSeed,
      hearthTrueName: "",
      nexusPubkey: device.verifyingKey,
    });

    // signerDid = "0x" + <signer verifying-key hex>. The persona-root SIGNS, so it is the root's DID —
    // DISTINCT from the device DID. The self-signed floor (signerDid == deviceDid) is gone.
    expect(f.signerDid).toBe(`0x${root.verifyingKey}`);
    expect(f.signerDid).not.toBe(`0x${device.verifyingKey}`);
    expect(f.founderEdge.operatorDid).toBe(f.signerDid);      // the edge chains to the root
    expect(f.founderEdge.deviceDid).toBe(`0x${device.verifyingKey}`);  // the delegate is the device

    // A fresh browser founds ONE persona, worn.
    expect(await listBrowserPersonaRoots(name)).toEqual([0]);
    expect(await loadBrowserActivePersona(name)).toBe(0);
  });

  test("the worn root selects which binding feeds the worker — found h0, add + wear h1", async () => {
    const name = idb();
    repo = new Repo({ sharePolicy: async () => true });

    const device = await generateOrLoadBrowserVesselIdentity(name, "Op");
    const operatorSeed = await loadBrowserSigningSeed(name);
    await generateOrLoadBrowserPersonaRoot(name, 0);
    const signer0 = await loadBrowserPersonaRootSeed(name, 0);
    await wearBrowserPersona(name, 0);
    await runFoundingCeremony({
      repo, operatorSeed, operatorVerifyingKey: device.verifyingKey,
      operatorDisplayName: "Op", signerSeed: signer0, hearthTrueName: "", nexusPubkey: device.verifyingKey,
    });

    // The multitude grows: mint h1 and WEAR it. The worker-reach selector (browserJoineePersonaIndex)
    // now names h1 — the worn root the daemonAuth binding threads.
    const h1 = await generateOrLoadBrowserPersonaRoot(name, 1);
    expect(h1.created).toBe(true);
    await wearBrowserPersona(name, 1);
    expect(await browserJoineePersonaIndex(name)).toBe(1);
    expect(await loadBrowserActivePersona(name)).toBe(1);
    expect(await listBrowserPersonaRoots(name)).toEqual([0, 1]);
  });
});

describe("the joinee-wear path — a joinee reads its persona through the anchor, never a root", () => {
  test("no root held → listRoots is empty; the joinee index reads the ANCHOR", async () => {
    const name = idb();
    const vault = await makeBrowserIdbPersonaVault(name);
    // A joinee's vault holds NO root (root-on-founder).
    expect(await vault.listRoots()).toEqual([]);
    expect(await browserJoineePersonaIndex(name)).toBeUndefined();   // neither founder nor admitted yet

    // The admit lands exactly one anchor set at the admitted index — public doc-ids, no secret.
    const anchors: IdentityAnchors = {
      personaGroupDocIdHex: "aa11", meshCabalDocIdHex: "bb22", personaGroupAgentIdHex: "cc33",
    };
    vault.anchors.save(3, anchors);
    expect(vault.anchors.list()).toEqual([3]);      // the in-process snapshot is authoritative at once
    expect(vault.anchors.load(3)).toEqual(anchors);

    // The joinee-index read spins a FRESH vault (re-primed from IDB), so let the fire-and-forget write-
    // through land — the real joinee reads anchors a prior admit session persisted, never a same-tick save.
    await new Promise((r) => setTimeout(r, 50));
    // The joinee reads "which persona am I" from the anchor — a root it never held.
    expect(await browserJoineePersonaIndex(name)).toBe(3);
    expect(await listBrowserPersonaRoots(name)).toEqual([]);   // still no root — custody-by-type intact
  });

  test("the anchor snapshot re-primes from IDB across a fresh vault handle (write-through persisted)", async () => {
    const name = idb();
    const first = await makeBrowserIdbPersonaVault(name);
    first.anchors.save(2, { personaGroupDocIdHex: "d1", meshCabalDocIdHex: "d2", personaGroupAgentIdHex: "d3" });
    // Give the fire-and-forget write-through a moment to reach IDB, then re-prime a NEW vault handle.
    await new Promise((r) => setTimeout(r, 50));
    const second = await makeBrowserIdbPersonaVault(name);
    expect(second.anchors.list()).toEqual([2]);
    expect(second.anchors.load(2)?.personaGroupDocIdHex).toBe("d1");
  });
});
