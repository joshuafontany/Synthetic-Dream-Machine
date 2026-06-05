/**
 * boot-admin-keyhive.test.ts — the isomorphic admin-island authn/z boot.
 *
 * Proves the pure `bootAdminKeyhive` sequence that Stage 1 moves into every
 * platform's admin island worker:
 *   - re-hydrates cap state from the admin doc and clears Gates A/B/C
 *   - registers the operator's writable bags so verify() resolves
 *   - HALTs (throws) on a drifted identity (Gate A) or a wrong sentinel (Gate B)
 *
 * Runs entirely in-process (no worker) because the logic is extracted pure —
 * that is the whole point: the worker is just the caller. Founds a real operator
 * via runFoundingCeremony into an in-memory Repo, exactly as the host platform
 * `loadBootstrap` does before the admin worker spawns.
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/vessel-platform#authn-home
 */

import { describe, test, expect, beforeAll } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  type LarDoc,
  CompositeStore, AutomergeDocStore, ADMIN_BAG_ID,
} from "@lararium/mesh";
import {
  KeyhiveProvider, AdminEventStore, bootAdminKeyhive, runFoundingCeremony,
  type BootAdminKeyhiveInput,
} from "@lararium/keyhive";

const SEED = new Uint8Array(32).fill(7);

interface Founded {
  verifyingKey: string;
  eventStore:   AdminEventStore;
  bootArgs:     BootAdminKeyhiveInput;
}

let founded: Founded;

beforeAll(async () => {
  const repo = new Repo();

  // Derive the operator verifying key the seed resolves to (the host keypair
  // adapter produces this; here we read it straight from a throwaway keyhive).
  const probe = new KeyhiveProvider();
  await probe.init({ seed: SEED, eventStore: { put: async () => {}, list: async () => [] } });
  const did = await probe.whoami();
  const verifyingKey = did.startsWith("0x") ? did.slice(2) : did;
  await probe.dispose();

  // Found a real operator into the in-memory repo (host pre-spawn step).
  const cer = await runFoundingCeremony({
    repo, operatorSeed: SEED,
    operatorVerifyingKey: verifyingKey,
    operatorDisplayName:  "Test Operator",
  });

  // Build the admin composite the worker's onEa would receive in ctx.
  const adminHandle = await repo.find<LarDoc>(cer.adminUrl as AutomergeUrl);
  const composite = new CompositeStore();
  const adminStore = new AutomergeDocStore(adminHandle, ADMIN_BAG_ID);
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: adminStore, writable: true });
  adminStore.markSyncComplete();

  const eventStore = new AdminEventStore({ admin: composite });
  founded = {
    verifyingKey, eventStore,
    bootArgs: {
      seed: SEED, eventStore,
      operatorVerifyingKey:  verifyingKey,
      personGroupDocIdHex:   cer.personGroupDocIdHex,
      personGroupAgentIdHex: cer.personGroupAgentIdHex,
      meshCabalDocIdHex:     cer.meshCabalDocIdHex,
      registerBags:          [ADMIN_BAG_ID],
    },
  };
});

describe("bootAdminKeyhive", () => {
  test("clears Gates A/B/C, registers the admin bag, and verifies operator admin", async () => {
    const { keyhive, did } = await bootAdminKeyhive(founded.bootArgs);

    expect(did).toMatch(/^0x/);
    expect(did.endsWith(founded.verifyingKey)).toBe(true);

    // The operator is implicit admin of every bag it registered (generateDocument).
    const v = await keyhive.verify({ presenter: did, bagUrl: ADMIN_BAG_ID, access: "admin" });
    expect(v.ok).toBe(true);

    await keyhive.dispose();
  });

  test("HALTs on identity drift (Gate A)", async () => {
    await expect(bootAdminKeyhive({
      ...founded.bootArgs, operatorVerifyingKey: "deadbeefdeadbeef",
    })).rejects.toThrow(/Gate A/);
  });

  test("HALTs on a non-member sentinel (Gate B)", async () => {
    await expect(bootAdminKeyhive({
      ...founded.bootArgs, personGroupDocIdHex: "00".repeat(32),
    })).rejects.toThrow(/Gate B|Gate C/);
  });
});
