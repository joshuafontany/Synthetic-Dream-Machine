/**
 * plugin-attestation — the builder's signature over a plugin build, and what a reader may conclude without it.
 *
 * An attestation's hashes bind BYTES excellently and PROVENANCE not at all: anyone who writes the file writes
 * the digests to match whatever they shipped. The signature names who stood behind the build — the one thing a
 * reader could not have recomputed alone. These pin that, and pin the refusals beside it: no clock, no
 * reachable builder, and UNSIGNED reported as its own answer rather than folded into "invalid".
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/genesis-doc
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import {
  PLUGIN_ATTESTATION_DOMAIN, pluginAttestationBytes, signPluginAttestation, verifyPluginAttestation,
  type PluginBuildAttestation,
} from "../src/genesis-doc.js";
import { hex, hexToBytes } from "../src/crypto.js";

const seedOf = (n: number) => new Uint8Array(32).fill(n);
const signer = (s: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, s).then(hex);
const pubOf  = (s: Uint8Array) => ed.getPublicKeyAsync(s).then(hex);
const verify = (b: Uint8Array, sig: string, signerHex: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(signerHex)).catch(() => false);

/** A build the pipeline would emit — every digest present, nobody standing behind it yet. */
const BUILD: Omit<PluginBuildAttestation, "builder"> = {
  format:               "lararium-tw5-plugin-build/v1",
  canonicalTitle:       "$:/plugins/lares/memetic-wikitext",
  moduleManifestPath:   "dist-plugin/module-manifest.json",
  moduleManifestSha256: "a".repeat(64),
  packTranscriptPath:   "dist-plugin/pack-transcript.json",
  packTranscriptSha256: "b".repeat(64),
  moduleCount:          23,
  packedTiddlerCount:   115,
  pluginJsonSha256:     "c".repeat(64),
};

describe("the signature names who stood behind the build", () => {
  test("★ a signed attestation reads back its signer, OFFLINE — no reachable builder, no clock ★", async () => {
    const key = await pubOf(seedOf(7));
    const signed = await signPluginAttestation(BUILD, key, signer(seedOf(7)));
    expect(await verifyPluginAttestation(signed, verify)).toEqual({ signer: key });
  });

  test("★ UNSIGNED reads as its own answer, never as invalid ★", async () => {
    // An unsigned build still carries usable diff handles. Folding it into "forged" would make the
    // reader's policy unstatable — they could no longer tell "nobody signed" from "someone lied".
    expect(await verifyPluginAttestation(BUILD as PluginBuildAttestation, verify)).toBe("unsigned");
  });

  test("a FORGED signature reads forged — and the read still returns rather than throwing", async () => {
    const key = await pubOf(seedOf(7));
    const forged: PluginBuildAttestation = { ...BUILD, builder: { signer: key, sig: "00".repeat(64) } };
    expect(await verifyPluginAttestation(forged, verify)).toBe("forged");
  });

  test("★ a TAMPERED digest breaks the signature — the hashes ride INSIDE the signed bytes ★", async () => {
    // The whole point: a builder who swaps the shipped blob must also swap a digest, and that moves the
    // preimage. A signature beside the digests rather than over them would certify nothing.
    const signed = await signPluginAttestation(BUILD, await pubOf(seedOf(7)), signer(seedOf(7)));
    const tampered: PluginBuildAttestation = { ...signed, pluginJsonSha256: "d".repeat(64) };
    expect(await verifyPluginAttestation(tampered, verify)).toBe("forged");
  });

  test("a signature by ANOTHER key reads forged — the signer field never speaks for itself", async () => {
    const signed = await signPluginAttestation(BUILD, await pubOf(seedOf(7)), signer(seedOf(7)));
    const swapped: PluginBuildAttestation = {
      ...signed, builder: { signer: await pubOf(seedOf(9)), sig: signed.builder!.sig },
    };
    expect(await verifyPluginAttestation(swapped, verify)).toBe("forged");
  });
});

describe("the signed bytes carry the domain and every field they claim to cover", () => {
  test("★ the preimage names its DOMAIN — a signature means nothing without the domain it was made in ★", async () => {
    const parsed = JSON.parse(new TextDecoder().decode(pluginAttestationBytes(BUILD)));
    expect(parsed.domain).toBe(PLUGIN_ATTESTATION_DOMAIN);
  });

  test("the preimage covers every attestation field, and carries no signature over itself", async () => {
    const parsed = JSON.parse(new TextDecoder().decode(pluginAttestationBytes(BUILD)));
    for (const k of Object.keys(BUILD)) expect(parsed).toHaveProperty(k);
    expect(parsed).not.toHaveProperty("builder");
  });

  test("the bytes stay canonical — key order at the call site never moves the signature", async () => {
    const reordered = { pluginJsonSha256: BUILD.pluginJsonSha256, ...BUILD };
    expect(pluginAttestationBytes(reordered)).toEqual(pluginAttestationBytes(BUILD));
  });

  test("★ NO clock rides the preimage — a build verifies in a mesh cut off for five hundred years ★", async () => {
    const wire = new TextDecoder().decode(pluginAttestationBytes(BUILD));
    expect(wire).not.toMatch(/\b(timestamp|issuedAt|expiresAt|notBefore|notAfter|builtAt)\b/);
  });
});
