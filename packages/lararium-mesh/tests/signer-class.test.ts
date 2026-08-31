/**
 * signer-class — which of a human's keys may stand on an artifact that travels.
 *
 * ── THE LEAK THIS NAMES ─────────────────────────────────────────────────────────────────────────
 * A charter is public by construction: seated keys, threshold and epoch lineage are the material a
 * joining operator verifies a quorum signature against, so it must travel before she can consent.
 *
 * What it carries today is PersonaGroup ROOTS. `seal seat` seats `generateOrLoadPersonaGroupRoot(…)
 * .verifyingKey`, and a founding seat "draws every key from ONE vault … three seated chairs at genesis
 * are therefore three faces of one operator". So the artifact designed to travel publishes three roots
 * of one human's own device-overlay, CORRELATED by standing together in one charter.
 *
 * The same key class signs a membership stamp, while a HandleCard signs with `veiled.verifyingKey` —
 * "the sovereign pseudonym presented through the veil". Only the second is the public Handle.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * A public Handle over a private Persona group is what signs anything shared. Vessel keys and the
 * PersonaGroup those devices compose stay private, so neither belongs on an artifact that travels.
 *
 * This READS a key's class against the material a vessel holds; it decides no policy and moves no
 * key. A key of unknown class is reported unknown rather than assumed safe — an artifact that travels
 * is the wrong place to guess.
 */
import { describe, it, expect } from "vitest";
import { signerClass } from "../src/signer-class.js";

const ROOT   = "a".repeat(64);
const VEILED = "b".repeat(64);
const VESSEL = "c".repeat(64);
const held = { personaGroupRoots: [ROOT], veiledHandles: [VEILED], vesselKeys: [VESSEL] };

describe("signer-class — what may hang outside, and what stays in the household", () => {
  it("★ a veiled Handle MAY stand on a travelling artifact ★", () => {
    const r = signerClass(VEILED, held);
    expect(r.klass).toBe("veiled-handle");
    expect(r.publishable).toBe(true);
    expect(r.reading).toMatch(/handle|pseudonym|through the veil/i);
  });

  it("★ a PersonaGroup ROOT may NOT — it names a human's device-overlay ★", () => {
    const r = signerClass(ROOT, held);
    expect(r.klass).toBe("persona-group-root");
    expect(r.publishable).toBe(false);
    expect(r.reading).toMatch(/device|overlay|correlat/i);
  });

  it("★ a VESSEL key may NOT — it is device-minted and must never co-surface ★", () => {
    const r = signerClass(VESSEL, held);
    expect(r.klass).toBe("vessel-key");
    expect(r.publishable).toBe(false);
  });

  it("★ an unknown key is UNKNOWN, never assumed safe ★", () => {
    // A travelling artifact is the wrong place to guess: the cost of a wrong yes is permanent.
    const r = signerClass("d".repeat(64), held);
    expect(r.klass).toBe("unknown");
    expect(r.publishable).toBe(false);
    expect(r.reading).toMatch(/cannot tell|unknown|not held/i);
  });

  it("★ case never splits one key into two classes ★", () => {
    expect(signerClass(VEILED.toUpperCase(), held).klass).toBe("veiled-handle");
    expect(signerClass(ROOT.toUpperCase(), held).klass).toBe("persona-group-root");
  });

  it("★ a key held as BOTH reads as the private class — the stricter reading wins ★", () => {
    // If a derivation ever collided, publishing on the permissive reading would be irreversible.
    const both = { personaGroupRoots: [ROOT], veiledHandles: [ROOT], vesselKeys: [] };
    const r = signerClass(ROOT, both);
    expect(r.publishable).toBe(false);
    expect(r.klass).toBe("persona-group-root");
  });

  it("★ every reading says which class it found and why that answers ★", () => {
    for (const k of [VEILED, ROOT, VESSEL, "d".repeat(64)]) {
      expect(signerClass(k, held).reading.length).toBeGreaterThan(40);
    }
  });
});
