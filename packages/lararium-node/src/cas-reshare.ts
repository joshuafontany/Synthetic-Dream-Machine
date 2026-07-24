/**
 * cas-reshare — the RE-SHARE tooth's vessel side: list the sealed bodies this hearth HOLDS and re-announce them.
 *
 * The relay's bag-tracker learns `cid → holder` FROM THE WIRE (carriage-relay sniff), and PRUNES a holder on drop.
 * After a partition / reconnect the relay has forgotten this hearth's bodies — so the hearth RE-ANNOUNCES `cas-have`
 * for every sealed body it still holds, and the tracker (and peers) re-learn them. The `nexus-reshare` verb drives
 * this; the carriage serve-loop's `announce` offers each `cas-have` over the live channel.
 *
 * THE HELD SET = the `@cad` ciphertext tier on disk. Each sealed body writes a `cid`-named file into the cadDir
 * (`installSealedBody` → `writeCasEntriesFs`), so the held cids ARE the cadDir entries whose name is a `blake3:` cid.
 * SECRET-FREE + PLAINTEXT-BLIND: this reads FILE NAMES (cids) only — never a body, never a read-cap. The re-announce
 * carries a HINT (where to ask), never the bytes; a member re-verifies `verifyCiphertextCid` before trusting any.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/cas-reshare
 */

import { readdirSync } from "node:fs";

/** The cid prefix every sealed ciphertext file is named by — the digest scheme the seal + verify both speak. */
const SEALED_CID_PREFIX = "blake3:";

/**
 * List the sealed ciphertext cids this hearth holds — the cadDir file names that ARE `blake3:` cids. Fail-soft:
 * an absent / unreadable cadDir reads as an EMPTY held set (a hearth that never sealed announces nothing), never
 * a throw. Reads names only; opens no body.
 */
export function listSealedCids(cadDir: string): string[] {
  let names: string[];
  try { names = readdirSync(cadDir); } catch { return []; }   // no cad tier yet → nothing held
  return names.filter((n) => n.startsWith(SEALED_CID_PREFIX));
}
