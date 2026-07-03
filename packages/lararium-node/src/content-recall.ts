/**
 * content-recall — the owned-plane RECALL: query-text → semantic hits over the lararium's content
 * palace. Composes the two consumed caps (the embed cap — text→vector via the vendored embedder;
 * the content palace — caller-vector search over the chroma engine), so recall runs on the OWNED
 * plane with NO vendored `mine`/search process. The orchestration (embed → search) is lares; the
 * engine + embedder are consumed behind the causal-island boundary.
 *
 * This is the recall the `/mcp lares` surface + the `lares` CLI expose over the sovereign store.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu
 */

import type { EmbedCap } from "./embed-cap.js";
import type { ContentMatch, ContentPalace } from "./content-palace.js";

/**
 * Recall the nearest content to `query` — embed the query (same model as the store, so the vector is
 * comparable), then vector-search the owned content palace. Returns the hits (each carrying its
 * document, distance, and where-filterable metadata). An empty/blank query returns []. `where`
 * narrows by metadata (the structured recall path).
 */
export async function recallContent(
  embed: EmbedCap,
  content: ContentPalace,
  query: string,
  opts: { k?: number; where?: Record<string, unknown> } = {},
): Promise<ContentMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const { vectors } = await embed.embed([trimmed]);
  const qv = vectors[0];
  if (!qv || qv.length === 0) return [];
  return content.search(qv, {
    k: opts.k ?? 8,
    ...(opts.where !== undefined ? { where: opts.where } : {}),
  });
}
