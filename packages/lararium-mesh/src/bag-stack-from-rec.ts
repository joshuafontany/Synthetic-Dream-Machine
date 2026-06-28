/**
 * bag-stack-from-rec — extract the bag-stack from a LarTiddlerRecord.
 *
 * Recipe tiddlers carry `bag-stack` as a space-separated string field.
 * `parseBagStack` tolerates undefined, but call sites carry a repeated
 * inline coercion. This helper owns that coercion once.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/bag-stack-from-rec
 */

import { parseBagStack } from "./recipe.js";
import type { LarTiddlerRecord } from "./tiddler-store.js";

export function bagStackFromRec(rec: LarTiddlerRecord): string[] {
  const raw = rec.tiddler["bag-stack"];
  return parseBagStack(typeof raw === "string" ? raw : undefined);
}
