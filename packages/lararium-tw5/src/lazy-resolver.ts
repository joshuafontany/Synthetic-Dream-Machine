/**
 * lazy-resolver — the READ side of the skinny handle (content-resolution.mem #tw5-seam).
 *
 * The write side (LOAD → `landSkinnyHandle`) lands a SKINNY HANDLE in the CRDT: an oversized
 * body leaves the doc for the `cid/` CAS tier, and the tiddler that stands in the wiki carries
 * `_is_skinny`, `_canonical_uri`, `_integrity`, `textCid` — and NO `text`. TW5 already built the
 * lazy engine for exactly this shape: `getTiddlerText` sees `_is_skinny !== undefined` + no
 * `text`, fires `dispatchEvent("lazyLoad", title)`, and returns the "loading" default
 * (`wiki.js:1485`). This house owns the syncer, so it answers that ONE event with the resolver —
 * we RIDE TW5's machinery, never fork it.
 *
 * The resolver walks the body home lazily (on render, not eagerly): read the content-address the
 * handle names, pull the bytes from the corpus CAS via `resolveByCid`, re-verify
 * `cid == sha256(bytes)` (Island Sovereignty — trust CONTENT, never the host), then splice the
 * `text` into the VM tiddler. The write rides the GUARDED nalu rail (`$tw.lares.enqueueNalu`)
 * under the `_applying` echo-guard, so the rehydrated body NEVER echoes back out to the CRDT —
 * that would re-inline the body and re-open the #51 overflow the skinny handle exists to close.
 *
 * Source discrimination (`skinnyCid`): a `textCid` names the CAS key directly; a media
 * `_canonical_uri` scheme-discriminates — a `lar:///…/cid/<hash>` resolves by CID, a web2
 * `http(s)://`/`data:` src is left to the native/DOM path (inert in Node) and never resolved
 * here. A PENDING (CAS miss) or an integrity fault leaves the handle skinny — "loading" holds,
 * a later render re-fires and re-tries; the body is never faked.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution#tw5-seam
 */

import { sha256HexBytesSync, cidFromUri } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import type { LaresTw5Extension } from "./types/lares-globals.js";

/** A carrier body resolver over the corpus CAS — the fs-less worker's seam onto the
 *  process-shared byte plane (the kernel's `host.resolveByCid`). */
export type CarrierResolver = (cid: string) => Promise<Uint8Array | null>;

/**
 * Read the CAS content-address a skinny handle points its body at, or null when this record
 * carries no lar-native body to resolve. `textCid` wins (the direct CAS key); else a
 * `_canonical_uri` is scheme-discriminated — a `lar:///…/cid/<hash>` yields its hash, a web2
 * src (or anything non-cid) yields null so the native path keeps it.
 */
export function skinnyCid(fields: Record<string, unknown>): string | null {
  const textCid = fields["textCid"];
  if (typeof textCid === "string" && textCid.length > 0) return textCid;
  const canonical = fields["_canonical_uri"];
  if (typeof canonical === "string") return cidFromUri(canonical);
  return null;
}

/**
 * Install the read-side `lazyLoad` resolver on a booted island's wiki. Returns an unsubscribe fn.
 * A no-op (returns a no-op unsubscribe) when the wiki exposes no event surface.
 */
export function installLazyResolver(tw5: TW5Engine, resolveByCid: CarrierResolver): () => void {
  const wiki = tw5.$tw.wiki as {
    getTiddler?: (t: string) => { fields?: Record<string, unknown> } | undefined;
    addEventListener?: (name: string, fn: (t: string) => void) => void;
    removeEventListener?: (name: string, fn: (t: string) => void) => void;
  };
  if (typeof wiki.addEventListener !== "function") return () => {};

  // A title enters `enqueued` once its body has been handed to the guarded rail — TW5 may
  // re-fire lazyLoad before the drain lands the `text`, and a duplicate resolve would waste a
  // CAS pull. A PENDING / integrity-fault title stays OUT of the set, so a later render re-tries.
  const enqueued = new Set<string>();
  const inflight = new Set<string>();

  const resolveOne = async (title: string): Promise<void> => {
    if (enqueued.has(title) || inflight.has(title)) return;
    const fields = wiki.getTiddler?.(title)?.fields;
    if (!fields) return;
    if (typeof fields["text"] === "string") return;   // already hydrated — nothing to pull
    const cid = skinnyCid(fields);
    if (!cid) return;                                   // web2 media src or a non-skinny miss — native path owns it

    inflight.add(title);
    try {
      const bytes = await resolveByCid(cid);
      if (!bytes) return;                               // PENDING (CAS miss) — leave "loading", a later render re-tries
      const got = sha256HexBytesSync(bytes);
      if (got !== cid) {                                // integrity fault — never splice unverified bytes
        console.error(`[lazy-resolver] CAS integrity fault for ${title}: textCid ${cid} != hash(bytes) ${got}`);
        return;
      }
      const text = new TextDecoder().decode(bytes);
      const { lares } = tw5.$tw as unknown as LaresTw5Extension;
      if (typeof lares?.enqueueNalu !== "function") return;
      // Splice `text` in through the GUARDED rail — applied under `_applying`, so the
      // IslandAdaptor echo-guard suppresses the outbound CRDT save. Every skinny field stays
      // (so the projector still reads the handle at rest, T3); only `text` is added.
      lares.enqueueNalu({
        title,
        record: { tiddler: { ...(fields as Record<string, string>), title, text } },
        origin: { kind: "crdt-remote", edgeIsland: "cas-rehydrate" },
      });
      enqueued.add(title);
    } finally {
      inflight.delete(title);
    }
  };

  const handler = (title: string): void => { void resolveOne(title); };
  wiki.addEventListener("lazyLoad", handler);
  return () => wiki.removeEventListener?.("lazyLoad", handler);
}
