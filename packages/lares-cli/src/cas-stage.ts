/**
 * cas-stage — the operator gesture's CAS staging seam.
 *
 * A verb NEVER inlines a body. The disk/fetch-holding gesture stages each carrier body
 * to the corpus CAS (content-addressed, hex sha256) and rides the verb with a skinny
 * `textCid` handle. The daemon worker resolves it back via `resolveByCid` from the SAME
 * corpus CAS dir (process-shared filesystem, no IPC) and re-verifies cid==hash(bytes).
 *
 * This keeps an oversized carrier body (a whole book) out of the @daemon command doc, whose
 * automerge scalar-string value overflows past ~2^24 chars — the wall that fells the seed
 * when a giant body inlines into a summons. Bag-agnostic: any carrier whose body would
 * overflow rides a reference, regardless of which bag holds it.
 *
 * The gesture holds the body, so it also DECIDES skinny-ness (content-resolution.mem
 * Scenario B): an oversized RAW shard (no memetic-wikitext wrapper) rides `skinny: true`, and
 * the daemon writes a handle instead of materializing the body as a CRDT text field. A meme
 * (SOH heading) stays whole — its intra-ahu extraction is a later leg (Scenario A). Small
 * bodies inline unchanged.
 *
 * The body round-trips byte-exact: the carrier `text` string (utf8 for a text filetype,
 * base64 for a binary one) stages as `utf8Bytes(text)`; the worker utf8-decodes the resolved
 * bytes back to the same string. So the CID keys the STRING form, and the decode reproduces
 * it verbatim regardless of the underlying filetype.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/cas-stage
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256HexBytesSync, utf8Bytes, isOversizedBody } from "@lararium/mesh";
import { larCasDir } from "./env.js";

/** A memetic-wikitext carrier opens with the SOH classifier — mirrors the island's
 *  CARRIER_SOH. A memetic body stays whole (Scenario A, a later leg); only a raw shard
 *  goes skinny. */
const CARRIER_SOH = /<<~[^&\n]*&#x(?:0001|0011);/;

export interface StagedCarrier {
  /** Content-address (hex sha256) — the CAS key + the verb handle. */
  readonly cid:    string;
  /** The body's byte length. */
  readonly size:   number;
  /** True when this is an oversized RAW shard → the daemon writes a skinny handle. */
  readonly skinny: boolean;
}

/**
 * Stage a carrier body to the corpus CAS and return its content-address + size + the skinny
 * verdict. Idempotent (content-addressed, immutable → skip if present). The verb carries the
 * returned cid, never the body. Keyed by the SAME hex-sha256 convention the worker's
 * `readCasBlobFromFs` reads back (a bare cid filename), so a staged body resolves off the
 * process-shared filesystem with no IPC.
 */
export function stageBodyToCas(text: string): StagedCarrier {
  const bytes = utf8Bytes(text);
  const cid = sha256HexBytesSync(bytes);
  const dir = larCasDir();
  mkdirSync(dir, { recursive: true });
  const path = join(dir, cid);
  if (!existsSync(path)) writeFileSync(path, bytes);
  const size = bytes.length;
  const skinny = isOversizedBody(size) && !CARRIER_SOH.test(text);
  return { cid, size, skinny };
}
