/**
 * signer-class — which of a human's keys may stand on an artifact that travels.
 *
 * ── THE THREE KEYS ARE NOT INTERCHANGEABLE ──────────────────────────────────────────────────────
 * A vessel-key is device-minted, its private half never leaving, and it "MUST NEVER co-surface" with
 * the layer above. A PersonaGroup root binds one human's OWN DEVICES into an overlay. A veiled-user
 * key is "the sovereign pseudonym presented through the veil" — the public Handle, and the only one
 * of the three meant to be seen.
 *
 * ── AND A TRAVELLING ARTIFACT PUBLISHES WHATEVER IT CARRIES ─────────────────────────────────────
 * A charter must travel before a joining operator can consent, because its seated keys are the
 * material she verifies a quorum against. A shared members board carries the stamps that contracted
 * into a Cabal. Both are public by construction, so whichever key class they name is published, and a
 * key published once cannot be unpublished.
 *
 * Publishing a PersonaGroup root puts a human's device-overlay on the artifact; publishing several
 * from one vault correlates them to each other, which is what a founding seat does by drawing every
 * chair from one identity home. The public Handle carries the same verification and none of that.
 *
 * ── WHAT THIS DOES, AND WHAT IT REFUSES TO DO ───────────────────────────────────────────────────
 * It READS a key's class against material this vessel already holds. It moves no key, seats nothing,
 * and decides no policy — re-keying an artifact that is already sealed changes its epoch, which is a
 * founding act rather than a wiring one.
 *
 * An unrecognised key reads UNKNOWN rather than safe. A travelling artifact is the wrong place to
 * guess, because the cost of a wrong yes is permanent, and a vessel legitimately cannot classify a
 * key belonging to somebody else.
 */

/** The key classes a vessel can tell apart from the material it holds. */
export type SignerClass = "veiled-handle" | "persona-group-root" | "vessel-key" | "unknown";

export interface SignerReading {
  readonly klass:       SignerClass;
  /** Whether this key may stand on an artifact that travels. True for the public Handle alone. */
  readonly publishable: boolean;
  /** Which class was found and why it answers, so a caller never publishes on a guess. */
  readonly reading:     string;
}

/** The material a vessel holds, by class. Keys are compared case-insensitively. */
export interface HeldKeys {
  readonly personaGroupRoots: readonly string[];
  readonly veiledHandles:     readonly string[];
  readonly vesselKeys:        readonly string[];
}

const has = (list: readonly string[], key: string): boolean =>
  list.some((k) => k.trim().toLowerCase() === key);

/**
 * Read a key's class.
 *
 * The PRIVATE classes are tested first, so a key that somehow appears in two lists reads as the
 * stricter one. Publishing on the permissive reading would be irreversible, and refusing on the
 * strict reading costs only a question.
 */
export function signerClass(key: string, held: HeldKeys): SignerReading {
  const k = key.trim().toLowerCase();

  if (has(held.personaGroupRoots, k)) {
    return { klass: "persona-group-root", publishable: false,
             reading: "this key is a PersonaGroup root — the overlay binding one human's OWN DEVICES. "
                    + "Publishing it names that device-group on the artifact, and publishing several from "
                    + "one vault correlates them to each other. The public Handle carries the same "
                    + "verification and none of that." };
  }
  if (has(held.vesselKeys, k)) {
    return { klass: "vessel-key", publishable: false,
             reading: "this key is a vessel key — device-minted, its private half never leaving, and it "
                    + "must never co-surface with the layer above. It identifies a machine rather than a "
                    + "face, so nothing that travels should carry it." };
  }
  if (has(held.veiledHandles, k)) {
    return { klass: "veiled-handle", publishable: true,
             reading: "this key is a veiled-user Handle — the sovereign pseudonym presented through the "
                    + "veil, and the one layer of the three meant to be seen. It verifies a signature "
                    + "without naming a device or a device-group." };
  }
  return { klass: "unknown", publishable: false,
           reading: "this vessel holds no key matching this one, so it cannot tell which class it "
                  + "belongs to — a key it did not mint may be anybody's layer. An artifact that travels "
                  + "is the wrong place to guess, because a key published once cannot be unpublished." };
}
