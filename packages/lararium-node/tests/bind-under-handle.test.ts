/**
 * bind-under-handle.test.ts — the milestone: two vessels BIND under one human-chosen Handle (PersonaGroup)
 * and the joinee reads the group's shared content, end to end through the REAL ceremony + boot + archive.
 *
 * This is the load-bearing core of "two anon vessels bind together under a Handle": the founder vessel mints
 * the joinee into its PersonaGroup (packPersonaCrossing), ships the membership as capEvents in the admit
 * payload, the joinee applies it (runApplyAdmitPayload → @daemon), then BOOTS restoring its own Archive so
 * its prekeys match the card the founder minted-to (bootDaemonKeyhive), hydrates, and decrypts the shared
 * content. No throwaway identity, no founder-card side channel — the crossing stands on the real path.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import {
  KeyhiveProvider, DaemonEventStore, bootDaemonKeyhive, runFoundingCeremony,
  runDeviceAdmitEdge, runApplyAdmitPayload, packPersonaCrossing,
} from "@lararium/keyhive";
import { CompositeStore, AutomergeDocStore, DAEMON_BAG_ID, hex, type LarDoc } from "@lararium/mesh";
import * as ed25519 from "@noble/ed25519";

const pubOf = async (s: Uint8Array): Promise<string> => hex(await ed25519.getPublicKeyAsync(s));
const seed  = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const FOUNDER_SEED = seed(60);
const JOINEE_SEED  = seed(160);
const BAG = "lar:///ha.ka.ba/bags/@catalog/handle-shared";

/** Boot a live keyhive over a founded/admitted daemon doc, the way a real vessel boots. */
async function bootOver(repo: Repo, daemonUrl: string, s: Uint8Array, verifyingKey: string,
                        pg: { docIdHex: string; agentIdHex: string }, mesh: string, signerDid: string,
                        deviceEdge: unknown, archiveBytes?: Uint8Array) {
  const handle = await repo.find<LarDoc>(daemonUrl as AutomergeUrl);
  const composite = new CompositeStore();
  const store = new AutomergeDocStore(handle, DAEMON_BAG_ID);
  composite.addLayer({ bagId: DAEMON_BAG_ID, store, writable: true });
  store.markSyncComplete();
  return bootDaemonKeyhive({
    seed: s, eventStore: new DaemonEventStore({ daemon: composite }),
    operatorVerifyingKey: verifyingKey,
    personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex, meshCabalDocIdHex: mesh,
    registerBags: [DAEMON_BAG_ID], signerDid, deviceEdge: deviceEdge as never,
    ...(archiveBytes ? { archiveBytes } : {}),
  });
}

describe("two vessels bind under one Handle", () => {
  test("the joinee joins the founder's PersonaGroup and reads its shared content — real ceremony + boot", async () => {
    const founderRepo = new Repo({ sharePolicy: async () => true });
    const founderKey = await pubOf(FOUNDER_SEED);
    const cer = await runFoundingCeremony({
      repo: founderRepo, operatorSeed: FOUNDER_SEED, operatorVerifyingKey: founderKey,
      operatorDisplayName: "Founder", signerSeed: FOUNDER_SEED, hearthTrueName: "",
    });
    const pg = { docIdHex: cer.personaGroupDocIdHex, agentIdHex: cer.personaGroupAgentIdHex };
    const { keyhive: founder } = await bootOver(founderRepo, cer.daemonUrl, FOUNDER_SEED, founderKey, pg, cer.meshCabalDocIdHex, cer.signerDid, cer.founderEdge);

    // Joinee mints its identity ONCE — its card + its Archive (persisted encrypted-at-rest in prod).
    const joineeGen = new KeyhiveProvider();
    await joineeGen.init({ seed: JOINEE_SEED, eventStore: { put: async () => {}, list: async () => [] } });
    const joineeCard = await joineeGen.contactCard();
    const joineeArchive = await joineeGen.exportArchive();
    const joineeKey = await pubOf(JOINEE_SEED);

    // Founder registers the shared bag, then mints the joinee into the PersonaGroup + packs the content.
    const { docId } = await founder.registerBag(BAG);
    const bundle = await packPersonaCrossing(founder, joineeCard, pg,
      [{ bagUrl: BAG, docIdHex: docId, plaintext: new TextEncoder().encode("shared under the Handle") }]);

    // Admit payload: the signed edge + the membership capEvents.
    const base = await runDeviceAdmitEdge({
      signerSeed: FOUNDER_SEED, joineeVerifyingKey: joineeKey, hearthTrueName: "bafyHearth",
      personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex, meshCabalDocIdHex: cer.meshCabalDocIdHex,
      syncUrl: null, islandDocUrl: null, personaUrl: cer.personaUrl,
    } as Parameters<typeof runDeviceAdmitEdge>[0]);
    const payload = { ...base, capEvents: bundle.capEvents };

    // Joinee applies the payload (writes the membership to its own @daemon), then BOOTS restoring its Archive.
    const joineeRepo = new Repo({ sharePolicy: async () => true });
    const applied = await runApplyAdmitPayload({
      repo: joineeRepo, operatorSeed: JOINEE_SEED, operatorVerifyingKey: joineeKey,
      operatorDisplayName: "Joinee", payload,
    });
    const { keyhive: joinee } = await bootOver(joineeRepo, applied.daemonUrl, JOINEE_SEED, joineeKey,
      { docIdHex: payload.personaGroupDocIdHex, agentIdHex: payload.personaGroupAgentIdHex }, payload.meshCabalDocIdHex,
      payload.signerDid, payload.deviceEdge, joineeArchive);

    // BOUND: the joinee reads the Handle's shared content.
    joinee.adoptBag(BAG, bundle.content[0]!.docIdHex);
    const recovered = await joinee.decryptContent(BAG, Buffer.from(bundle.content[0]!.ciphertext, "base64"));
    expect(new TextDecoder().decode(recovered)).toContain("shared under the Handle");
    await founder.dispose(); await joinee.dispose(); await joineeGen.dispose();
  });
});
