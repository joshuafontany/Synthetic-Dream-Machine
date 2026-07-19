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
 * The body round-trips byte-exact: the carrier `text` string (utf8 for a text filetype,
 * base64 for a binary one) stages as `utf8Bytes(text)`; the worker utf8-decodes the
 * resolved bytes back to the same string. So the CID keys the STRING form, and the
 * decode reproduces it verbatim regardless of the underlying filetype.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/cas-stage
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256HexBytesSync, utf8Bytes } from "@lararium/mesh";
import { larCasDir } from "./env.js";

/**
 * Stage a carrier body to the corpus CAS and return its content-address (hex sha256).
 * Idempotent (content-addressed, immutable → skip if present). The verb carries the
 * returned cid, never the body. Keyed by the SAME hex-sha256 convention the worker's
 * `readCasBlobFromFs` reads back (a bare cid filename), so a staged body resolves off
 * the process-shared filesystem with no IPC.
 */
export function stageBodyToCas(text: string): string {
  const bytes = utf8Bytes(text);
  const cid = sha256HexBytesSync(bytes);
  const dir = larCasDir();
  mkdirSync(dir, { recursive: true });
  const path = join(dir, cid);
  if (!existsSync(path)) writeFileSync(path, bytes);
  return cid;
}
