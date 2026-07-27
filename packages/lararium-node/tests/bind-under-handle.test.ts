/**
 * bind-under-handle.test.ts — the PERSONAGROUP layer: two of a human's vessels BIND into one PersonaGroup so
 * they sync shared content (wikis), end to end through the REAL ceremony + boot + archive.
 *
 * LAYER NOTE (do not conflate): this proves the PersonaGroup — the vessel-binding that syncs content between a
 * human's own devices. It does NOT prove the HANDLE — the veiled-user pseudonym's SOCIAL announcement on the
 * DreamNet, which rides the separate `handle-card` (mesh/handle-card.ts). A PersonaGroup CARRIES one Handle,
 * but binding vessels (here) and announcing the Handle (publishing the card) are two distinct acts.
 *
 * The load-bearing content-sync core: the founder vessel mints
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
import {
  CompositeStore, AutomergeDocStore, DAEMON_BAG_ID, hex, type LarDoc,
  materializeSharedLarDoc, personaKelBoardDocUrl, personaKelChainForPrefix,
} from "@lararium/mesh";
import * as ed25519 from "@noble/ed25519";

const pubOf = async (s: Uint8Array): Promise<string> => hex(await ed25519.getPublicKeyAsync(s));
const seed  = (n: number): Uint8Array => new Uint8Array(32).fill(n);
const FOUNDER_SEED = seed(60);
const JOINEE_SEED  = seed(160);
const BAG = "lar:///ha.ka.ba/bags/@catalog/handle-shared";

/** Boot a live keyhive over a founded/admitted daemon doc, the way a real vessel boots. */
async function bootOver(repo: Repo, daemonUrl: string, s: Uint8Array, verifyingKey: string,
                        pg: { docIdHex: string; agentIdHex: string }, mesh: string, signerDid: string,
                        personaKelPrefix: string, deviceEdge: unknown, archiveBytes?: Uint8Array) {
  const handle = await repo.find<LarDoc>(daemonUrl as AutomergeUrl);
  const composite = new CompositeStore();
  const store = new AutomergeDocStore(handle, DAEMON_BAG_ID);
  composite.addLayer({ bagId: DAEMON_BAG_ID, store, writable: true });
  store.markSyncComplete();
  // Walk the vessel's OWN per-Nexus KEL board (its gate key IS its Nexus key) for the pinned identifier's chain.
  const kelBoard = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(verifyingKey), "@persona-kel");
  const chain = personaKelChainForPrefix(kelBoard.doc(), personaKelPrefix);
  if (!chain) throw new Error(`no persona-KEL chain for ${personaKelPrefix} on this vessel's board`);
  return bootDaemonKeyhive({
    seed: s, eventStore: new DaemonEventStore({ daemon: composite }),
    vesselVerifyingKey: verifyingKey,
    personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex, meshCabalDocIdHex: mesh,
    registerBags: [DAEMON_BAG_ID], signerDid, personaKel: { prefix: personaKelPrefix, chain },
    deviceEdge: deviceEdge as never,
    ...(archiveBytes ? { archiveBytes } : {}),
  });
}

describe("two vessels bind under one Handle", () => {
  test("the joinee joins the founder's PersonaGroup and reads its shared content — real ceremony + boot", async () => {
    const founderRepo = new Repo({ sharePolicy: async () => true });
    const founderKey = await pubOf(FOUNDER_SEED);
    const cer = await runFoundingCeremony({
      repo: founderRepo, vesselSeed: FOUNDER_SEED, vesselVerifyingKey: founderKey,
      vesselDisplayName: "Founder", binding: { mode: "self-stood", signerSeed: FOUNDER_SEED }, hearthTrueName: "", nexusPubkey: founderKey,
    });
    const pg = { docIdHex: cer.personaGroupDocIdHex, agentIdHex: cer.personaGroupAgentIdHex };
    const { keyhive: founder } = await bootOver(founderRepo, cer.daemonUrl, FOUNDER_SEED, founderKey, pg, cer.meshCabalDocIdHex, cer.signerDid, cer.personaKelPrefix, cer.founderEdge);
    // Snapshot the founder's KEL chain — the admit payload carries it so the joinee seeds its LOCAL board.
    const founderKelBoard = await materializeSharedLarDoc(founderRepo, personaKelBoardDocUrl(founderKey), "@persona-kel");
    const founderKelChain = personaKelChainForPrefix(founderKelBoard.doc(), cer.personaKelPrefix)!;

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
      personaKelPrefix: cer.personaKelPrefix, personaKelChain: founderKelChain,
      personaGroupDocIdHex: pg.docIdHex, personaGroupAgentIdHex: pg.agentIdHex, meshCabalDocIdHex: cer.meshCabalDocIdHex,
      syncUrl: null, islandDocUrl: null, personaUrl: cer.personaUrl,
    } as Parameters<typeof runDeviceAdmitEdge>[0]);
    const payload = { ...base, capEvents: bundle.capEvents };

    // Joinee applies the payload (writes the membership to its own @daemon), then BOOTS restoring its Archive.
    const joineeRepo = new Repo({ sharePolicy: async () => true });
    const applied = await runApplyAdmitPayload({
      repo: joineeRepo, vesselSeed: JOINEE_SEED, vesselVerifyingKey: joineeKey,
      vesselDisplayName: "Joinee", payload, nexusPubkey: joineeKey,
    });
    const { keyhive: joinee } = await bootOver(joineeRepo, applied.daemonUrl, JOINEE_SEED, joineeKey,
      { docIdHex: payload.personaGroupDocIdHex, agentIdHex: payload.personaGroupAgentIdHex }, payload.meshCabalDocIdHex,
      payload.signerDid, payload.personaKelPrefix, payload.deviceEdge, joineeArchive);

    // BOUND: the joinee reads the Handle's shared content.
    joinee.adoptBag(BAG, bundle.content[0]!.docIdHex);
    const recovered = await joinee.decryptContent(BAG, Buffer.from(bundle.content[0]!.ciphertext, "base64"));
    expect(new TextDecoder().decode(recovered)).toContain("shared under the Handle");
    await founder.dispose(); await joinee.dispose(); await joineeGen.dispose();
  });
});
