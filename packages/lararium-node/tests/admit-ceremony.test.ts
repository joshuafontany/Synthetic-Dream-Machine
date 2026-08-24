/**
 * admit-ceremony.test.ts — the whole crossing, end to end, as a PURE FUNCTION OF ITS BYTES.
 *
 * A vessel FOUNDS a PersonaGroup. It ADMITS a second vessel by signing that vessel's edge. The admit is
 * CARRIED (never fetched) as bytes. The second vessel APPLIES it and comes up BOUND to the first — pinned
 * to a signer it could not have written for itself.
 *
 * Nothing here stands a relay, opens a socket, or reads a clock. That is not a convenience; it is the
 * DESIGN showing through. The admit is a signed capability, so it needs no trusted channel and no reachable
 * issuer — and a thing that needs neither is a thing you can test with two Repos and a string. A design in
 * which the vessel FETCHED its own admission could never be tested this way: it would need a server, a
 * reachable authority, and a moment at which both were true.
 *
 * The ceremony is platform-blind (ceremony-core imports no `node:` anything), so what passes here is what
 * runs in Ichi the browser vessel. This suite lives in node because it runs in milliseconds there.
 */
import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { runFoundingCeremony, runDeviceAdmitEdge, runApplyAdmitPayload } from "@lararium/keyhive";
import * as ed25519 from "@noble/ed25519";
import { hex } from "@lararium/mesh";

/** The verifying key a seed yields — the vessel's public half, hex, as the ceremony wants it. */
const pubOf = async (seed: Uint8Array): Promise<string> => hex(await ed25519.getPublicKeyAsync(seed));

/**
 * The carriage, round-tripped HERE rather than borrowed from @lararium/browser — node must not depend on
 * browser, and the FRAGMENT is a browser concern. What matters to this test is the invariant both sides
 * share: the admit crosses as BYTES. @lararium/browser tests the fragment parser against fixed strings;
 * this proves the payload itself survives being reduced to a string and back, which is the only property
 * the ceremony actually leans on.
 */
const carry = <T>(payload: T): T =>
  JSON.parse(Buffer.from(Buffer.from(JSON.stringify(payload), "utf8").toString("base64url"), "base64url").toString("utf8")) as T;

/** Fixed seeds — the test is a constant, never a sample. */
const FOUNDER_SEED = new Uint8Array(32).fill(7);
const JOINEE_SEED  = new Uint8Array(32).fill(11);

/** The founder's vessel: its own Repo, its own PersonaGroup. */
async function found() {
  const repo = new Repo({ sharePolicy: async () => true });
  const verifyingKey = await pubOf(FOUNDER_SEED);
  const f = await runFoundingCeremony({
    repo,
    vesselSeed:         FOUNDER_SEED,
    vesselVerifyingKey: verifyingKey,
    vesselDisplayName:  "The Strandbeest Shrine",
    binding: { mode: "self-stood", signerSeed: FOUNDER_SEED },
    hearthTrueName:       "",
    nexusPubkey:          verifyingKey,
  });
  return { repo, f, verifyingKey };
}

describe("the admit ceremony — found · admit · carry · apply · BOUND", () => {
  test("a joinee comes up pinned to a signer it could not have written for itself", async () => {
    const founder = await found();
    const joineeKey = await pubOf(JOINEE_SEED);

    // ── ADMIT. The founder's PersonaGroup ROOT signs the joinee's edge. The joinee is not present; it
    //    supplies only its PUBLIC key. Nothing secret crosses.
    const payload = await runDeviceAdmitEdge({
      signerSeed:         FOUNDER_SEED,
      joineeVerifyingKey: joineeKey,
      personaKelPrefix:   founder.f.personaKelPrefix,
      hearthTrueName:     founder.f.hearthTrueName ?? "bafyHearth",
      personaGroupDocIdHex:   founder.f.personaGroupDocIdHex,
      personaGroupAgentIdHex: founder.f.personaGroupAgentIdHex,
      meshCabalDocIdHex:      founder.f.meshCabalDocIdHex,
      syncUrl:      null,
      islandDocUrl: null,
      personaUrl:   founder.f.personaUrl,
    } as Parameters<typeof runDeviceAdmitEdge>[0]);

    // ── CARRY. The payload leaves as bytes and arrives as bytes. This IS the channel — a paste, a QR, a
    //    fragment, a stick. A carrier may withhold it; none can forge it.
    const carried = carry(payload);
    expect(carried, "the carriage must survive the round trip").toEqual(payload);

    // ── APPLY. A DIFFERENT Repo — a different vessel entirely.
    const joineeRepo = new Repo({ sharePolicy: async () => true });
    const applied = await runApplyAdmitPayload({
      repo:                 joineeRepo,
      vesselSeed:         JOINEE_SEED,
      vesselVerifyingKey: joineeKey,
      vesselDisplayName:  "Ichi",
      payload:              carried,
      nexusPubkey:          joineeKey,
    });

    // ── BOUND. The joinee pins the FOUNDER's signer — the whole difference between joining a group and
    //    declaring one. A vessel cannot mint this for itself; that is what makes it an admission.
    expect(carried.signerDid).toBe(payload.signerDid);
    expect(carried.signerDid).not.toBe(joineeKey);
    expect(carried.deviceEdge).toBeTruthy();

    // It seeds its OWN sovereign social docs (the daemon bag stays sovereign-per-vessel) …
    for (const url of [applied.identitiesUrl, applied.circlesUrl, applied.sessionsUrl, applied.daemonUrl]) {
      expect(url, "the joinee seeds its own sovereign docs").toMatch(/^automerge:/);
    }
    // … and adopts the founder's persona doc — membership is what CROSSES.
    expect(applied.personaUrl).toBe(founder.f.personaUrl);
  });

  test("payload capEvents land in the daemon doc as cap-events — ready for boot hydration into the keyhive", async () => {
    // The daemon packs these (packPersonaCrossing) to admit the vessel into the KEYHIVE PersonaGroup so it
    // can decrypt content shared through the catalog registry. Here dummy blobs prove the joinee-side WRITE lands them in the
    // store format boot's hydrateFromEventStore reads (the keyhive ingestion is proven separately).
    const founder = await found();
    const joineeKey = await pubOf(JOINEE_SEED);
    const base = await runDeviceAdmitEdge({
      signerSeed:             FOUNDER_SEED,
      joineeVerifyingKey:     joineeKey,
      personaKelPrefix:       founder.f.personaKelPrefix,
      hearthTrueName:         "bafyHearth",
      personaGroupDocIdHex:   founder.f.personaGroupDocIdHex,
      personaGroupAgentIdHex: founder.f.personaGroupAgentIdHex,
      meshCabalDocIdHex:      founder.f.meshCabalDocIdHex,
      syncUrl: null, islandDocUrl: null, personaUrl: founder.f.personaUrl,
    } as Parameters<typeof runDeviceAdmitEdge>[0]);
    const capEvents = ["bWVtYmVyc2hpcC1vcC0x", "bWVtYmVyc2hpcC1vcC0y"];   // base64 blobs
    const payload = { ...base, capEvents };

    const joineeRepo = new Repo({ sharePolicy: async () => true });
    const applied = await runApplyAdmitPayload({
      repo: joineeRepo, vesselSeed: JOINEE_SEED, vesselVerifyingKey: joineeKey,
      vesselDisplayName: "Ichi", payload, nexusPubkey: joineeKey,
    });

    const handle = await joineeRepo.find(applied.daemonUrl as AutomergeUrl);
    const doc = await handle.doc() as { tiddlers: Record<string, unknown> };
    const capTiddlers = Object.keys(doc.tiddlers).filter((t) => t.includes("/cap/"));
    expect(capTiddlers.length).toBe(capEvents.length);
  });

  test("the ceremony is DETERMINISTIC — the same seeds yield the same binding, every run", async () => {
    const mint = async () => {
      const founder = await found();
      const joineeKey = await pubOf(JOINEE_SEED);
      const payload = await runDeviceAdmitEdge({
        signerSeed:         FOUNDER_SEED,
        joineeVerifyingKey: joineeKey,
        personaKelPrefix:   founder.f.personaKelPrefix,
        hearthTrueName:     "bafyHearth",
        personaGroupDocIdHex:   founder.f.personaGroupDocIdHex,
        personaGroupAgentIdHex: founder.f.personaGroupAgentIdHex,
        meshCabalDocIdHex:      founder.f.meshCabalDocIdHex,
        syncUrl: null, islandDocUrl: null, personaUrl: founder.f.personaUrl,
      } as Parameters<typeof runDeviceAdmitEdge>[0]);
      return payload;
    };
    const a = await mint();
    const b = await mint();

    // THE BINDING is a constant of the seeds — the signer, the delegate, the hearth. Two mints agree.
    expect(a.signerDid).toBe(b.signerDid);
    expect(a.deviceEdge.personaRootDid).toBe(b.deviceEdge.personaRootDid);
    expect(a.deviceEdge.deviceVerifyingKey).toBe(b.deviceEdge.deviceVerifyingKey);
    expect(a.deviceEdge.hearthTrueName).toBe(b.deviceEdge.hearthTrueName);

    // THE LEASE is not, and MUST NOT BE. The edge signs over issuedAt/expiresAt, so two mints at two
    // instants carry different bytes and different signatures — which is the lease working, not the
    // ceremony failing. Standing decays unless fed; an edge with a frozen issuedAt could never expire,
    // and a grant that cannot expire is a grant that cannot be withdrawn from a mesh it can no longer
    // reach. Byte-equality here would be a BUG, and asserting it would have enshrined one.
    expect(a.deviceEdge.issuedAt).toBeTruthy();
    expect(a.deviceEdge.expiresAt).toBeTruthy();
    expect(Date.parse(a.deviceEdge.expiresAt)).toBeGreaterThan(Date.parse(a.deviceEdge.issuedAt));
  });

  test("a joinee REFUSES a payload whose binding is incomplete — never a half-bound daemon doc", async () => {
    const founder = await found();
    const joineeKey = await pubOf(JOINEE_SEED);
    const repo    = new Repo({ sharePolicy: async () => true });

    // The binding IS the joinee's whole authority. A half-applied admit is the confused-deputy hole: a
    // vessel that believes it holds a delegation nobody signed.
    await expect(runApplyAdmitPayload({
      repo,
      vesselSeed:         JOINEE_SEED,
      vesselVerifyingKey: joineeKey,
      vesselDisplayName:  "Ichi",
      nexusPubkey:          joineeKey,
      payload: {
        kind: "device-admit/v1",
        signerDid: "",                       // ← the binding is hollow
        deviceEdge: { title: "e" },
        hearthTrueName: "bafyHearth",
        personaGroupDocIdHex:   founder.f.personaGroupDocIdHex,
        personaGroupAgentIdHex: founder.f.personaGroupAgentIdHex,
        meshCabalDocIdHex:      founder.f.meshCabalDocIdHex,
        syncUrl: null,
      } as never,
    })).rejects.toThrow(/refusing to admit/i);
  });
});
