/**
 * boot-daemon-keyhive.test.ts — the isomorphic daemon-island authn/z boot.
 *
 * Proves the pure `bootDaemonKeyhive` sequence that Stage 1 moves into every
 * platform's daemon island worker:
 *   - re-hydrates cap state from the daemon doc and clears Gates A/B/C
 *   - registers the operator's writable bags so verify() resolves
 *   - HALTs (throws) on a drifted identity (Gate A) or a forged binding edge (the Binding Gate)
 *
 * Runs entirely in-process (no worker) because the logic is extracted pure —
 * that is the whole point: the worker is just the caller. Founds a real operator
 * via runFoundingCeremony into an in-memory Repo, exactly as the host platform
 * `loadBootstrap` does before the daemon worker spawns.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lararium/vessel-platform#authn-home
 */

import { describe, test, expect, beforeAll } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  type LarDoc,
  CompositeStore, AutomergeDocStore, DAEMON_BAG_ID,
} from "@lararium/mesh";
import {
  KeyhiveProvider, DaemonEventStore, bootDaemonKeyhive, runFoundingCeremony,
  type BootDaemonKeyhiveInput,
} from "@lararium/keyhive";

const SEED = new Uint8Array(32).fill(7);

interface Founded {
  verifyingKey: string;
  eventStore:   DaemonEventStore;
  bootArgs:     BootDaemonKeyhiveInput;
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
    signerSeed: SEED,          // self-signed (signerDid == deviceDid) for the test founder
    hearthTrueName: "",         // hearth-agnostic in the unit test
  });

  // Build the daemon composite the worker's onEa would receive in ctx.
  const daemonHandle = await repo.find<LarDoc>(cer.daemonUrl as AutomergeUrl);
  const composite = new CompositeStore();
  const daemonStore = new AutomergeDocStore(daemonHandle, DAEMON_BAG_ID);
  composite.addLayer({ bagId: DAEMON_BAG_ID, store: daemonStore, writable: true });
  daemonStore.markSyncComplete();

  const eventStore = new DaemonEventStore({ daemon: composite });
  founded = {
    verifyingKey, eventStore,
    bootArgs: {
      seed: SEED, eventStore,
      operatorVerifyingKey:  verifyingKey,
      personaGroupDocIdHex:   cer.personaGroupDocIdHex,
      personaGroupAgentIdHex: cer.personaGroupAgentIdHex,
      meshCabalDocIdHex:     cer.meshCabalDocIdHex,
      registerBags:          [DAEMON_BAG_ID],
      signerDid:             cer.signerDid,
      deviceEdge:            cer.founderEdge,
    },
  };
});

describe("bootDaemonKeyhive", () => {
  test("clears Gate A + the Binding Gate, registers the daemon bag, and verifies operator admin", async () => {
    const { keyhive, did } = await bootDaemonKeyhive(founded.bootArgs);

    expect(did).toMatch(/^0x/);
    expect(did.endsWith(founded.verifyingKey)).toBe(true);

    // The operator is implicit admin of every bag it registered (generateDocument).
    const v = await keyhive.verify({ presenter: did, bagUrl: DAEMON_BAG_ID, access: "admin" });
    expect(v.ok).toBe(true);

    await keyhive.dispose();
  });

  test("HALTs on identity drift (Gate A)", async () => {
    await expect(bootDaemonKeyhive({
      ...founded.bootArgs, operatorVerifyingKey: "deadbeefdeadbeef",
    })).rejects.toThrow(/Gate A/);
  });

  test("HALTs on a forged binding edge (Binding Gate, fail-closed)", async () => {
    await expect(bootDaemonKeyhive({
      ...founded.bootArgs,
      deviceEdge: { ...founded.bootArgs.deviceEdge, signature: "00".repeat(64) },
    })).rejects.toThrow(/Binding Gate/);
  });
});
