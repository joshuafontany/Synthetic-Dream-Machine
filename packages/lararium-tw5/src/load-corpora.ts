/**
 * load-corpora — the shared catalog-corpus loader, ONE body for both vessels (the node↔browser YIN
 * collapse the saga missed; node + browser carried ~40 byte-identical lines apart from a provenance
 * string + the local-mint factory).
 *
 * Each catalog `corpus:` entry becomes one read-only top-level bag. An entry DECLARING a mesh scale
 * federates via the tideline resolver (`resolveBootDoc` — StillJoining skips its layer, reconciling
 * later, never a blank ghost); an undeclared entry mints local. The per-vessel pieces collapse to a
 * single injected `mintLocalHandle` (node = waitHandleLocal + blankMemeStore; browser = waitHandleLocal
 * + repo.create) plus the provenance `source`. Adopts the browser twin's terser shape.
 *
 * Home = tw5 (it owns `addReadOnlyLayer` and imports the mesh helpers; mesh cannot import tw5).
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/load-corpora
 */

import { addReadOnlyLayer } from "./vessel-steps.js";
import {
  CATALOG_CORPUS_PREFIX, parseMeshScale, resolveBootDoc, isStillJoining,
  corpusBagId, corpusLarUri, catalogCorpusEntryUri, mutableLarRecord, tiddlerText,
  type MeshScale, type Repo, type DocHandle, type LarDoc, type AutomergeUrl, type CompositeStore,
} from "@lararium/mesh";

export interface CorpusLoaderDeps {
  readonly repo: Repo;
  readonly catalogHandle: DocHandle<LarDoc>;
  /** Per-vessel local mint: each vessel's `waitHandleLocal` bound to its blank-doc factory. */
  readonly mintLocalHandle: (docUrl: string) => Promise<DocHandle<LarDoc>>;
  /** Provenance stamped on the corpus + registry records (`"lararium-seed"` / `"browser-boot"`). */
  readonly source: string;
}

/** Load every catalog `corpus:` entry as a read-only layer on the composite. */
export async function loadCatalogCorpora(deps: CorpusLoaderDeps, composite: CompositeStore): Promise<void> {
  const { repo, catalogHandle, mintLocalHandle, source } = deps;

  const entries = Object.entries(catalogHandle.doc()?.tiddlers ?? {})
    .filter(([uri]) => uri.startsWith(CATALOG_CORPUS_PREFIX))
    .map(([uri, t]) => ({
      id:    uri.slice(CATALOG_CORPUS_PREFIX.length),
      docUrl: tiddlerText(t),
      // a corpus entry MAY declare its federation scale (the residency-bag layer); absent → local.
      scale: parseMeshScale((t.tiddler as Record<string, unknown> | undefined)?.["scale"] as string | undefined),
    }))
    .filter((e): e is { id: string; docUrl: string; scale: MeshScale | undefined } => Boolean(e.docUrl));

  await Promise.all(entries.map(async (entry) => {
    let h: DocHandle<LarDoc>;
    if (entry.scale) {
      // declared mesh scale → tideline resolver; StillJoining skips (no blank), reconciles later.
      const resolved = await resolveBootDoc<LarDoc>(repo, entry.docUrl as AutomergeUrl, {
        tideline: "mesh-shared", scale: entry.scale, label: `@${entry.id} (joined corpus)`,
      });
      if (isStillJoining(resolved)) return;
      h = resolved;
    } else {
      h = await mintLocalHandle(entry.docUrl);
    }
    addReadOnlyLayer(composite, corpusBagId(entry.id), h);

    const cu = corpusLarUri(entry.id);
    if (tiddlerText(h.doc()?.tiddlers?.[cu]) !== h.url) {
      h.change((doc) => { doc.tiddlers[cu] = mutableLarRecord(cu, { text: h.url }, source); });
    }
    const ru = catalogCorpusEntryUri(entry.id);
    if (tiddlerText(catalogHandle.doc()?.tiddlers?.[ru]) !== entry.docUrl) {
      catalogHandle.change((doc) => { doc.tiddlers[ru] = mutableLarRecord(ru, { text: entry.docUrl }, source); });
    }
  }));
}
