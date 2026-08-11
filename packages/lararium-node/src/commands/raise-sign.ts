/**
 * raise-sign — the RECOGNISER's half of the raise ceremony, and the only half that runs off-vessel.
 *
 * ── WHY THIS HALF NEEDS NO DAEMON AT ALL ────────────────────────────────────────────────────────
 * The vessel being raised emits a challenge; a recognised operator signs it on THEIR OWN machine, with
 * THEIR OWN persona root, and hands the grant back. Nothing about that touches the asking vessel — which
 * is precisely the property the design wants: the caps that arrive ride the recogniser's key, and no key
 * of theirs ever rests on the vessel they raise.
 *
 * So this reads a challenge, signs it, and returns a grant. It holds no vessel state, opens no board, and
 * writes nothing anywhere.
 *
 * ── IT REFUSES A CHALLENGE IT CANNOT READ, RATHER THAN SIGNING A SHAPE ──────────────────────────
 * The challenge crosses from another machine as text, so it arrives untrusted. A signer that accepted a
 * partial shape would put a recogniser's signature on fields they never saw — and the signature is the
 * whole consent. Every field must be present and well-typed, or this refuses and signs nothing.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor
 */

import {
  signRaiseGrant, ed25519SignerFromSeed,
  type RaiseChallenge, type RaiseGrant,
} from "@lararium/mesh";

import { generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed } from "../node-vessel-identity.js";
import { larDataDir } from "../vessel-paths.js";

export class RaiseSignError extends Error {}

/**
 * Read a challenge from untrusted text. Returns `null` on ANY departure from the exact shape — a signer
 * that guessed at a missing field would sign a claim its holder never made.
 */
export function readRaiseChallenge(text: string): RaiseChallenge | null {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p["vesselId"] !== "string" || p["vesselId"].length === 0) return null;
  if (typeof p["nexus"]    !== "string" || p["nexus"].length    === 0) return null;
  if (typeof p["nonce"]    !== "string" || p["nonce"].length    === 0) return null;
  if (typeof p["epoch"]    !== "number" || !Number.isInteger(p["epoch"]) || p["epoch"] < 0) return null;
  return {
    vesselId: p["vesselId"], nexus: p["nexus"], epoch: p["epoch"], nonce: p["nonce"],
  };
}

/**
 * Sign a challenge with one of this operator's own persona roots.
 *
 * `handleIndex` names WHICH compartment answers. A human holds several, and the one that signs is the one
 * whose nym the asking vessel's membership fold admits — so the choice belongs to the operator, never to a
 * default this code picks for them.
 */
export async function runRaiseSign(opts: {
  challengeText: string;
  handleIndex:   number;
  storageDir?:   string;
}): Promise<RaiseGrant> {
  const challenge = readRaiseChallenge(opts.challengeText);
  if (!challenge) {
    throw new RaiseSignError(
      "that challenge does not read as one — a raise challenge carries vesselId, nexus, epoch and nonce, " +
      "and this signs nothing it cannot read whole.",
    );
  }
  const storageDir = opts.storageDir ?? larDataDir();
  const root = await generateOrLoadPersonaGroupRoot(storageDir, opts.handleIndex);
  const sign = ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, opts.handleIndex));
  return signRaiseGrant({
    challenge,
    byNym: root.verifyingKey.toLowerCase(),
    sign,
  });
}
