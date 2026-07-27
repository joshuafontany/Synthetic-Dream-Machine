/**
 * tag-blobs — the CAS opt-in writer behind `lares ingest --tag-blobs`.
 *
 * `lares ingest` already scans a bag and weighs every carrier's size + media
 * family (exactly the knowledge a blob-readiness verdict needs). This shore turns
 * that verdict into a WRITE: for each carrier that would hit the ungated-large-inline
 * wall at regenesis (a verb rides a reference, never a body), it stamps the opt-in
 * `_lar_cas` flag so the body externalizes to CAS on the next INGEST.
 *
 * Two carrier shapes carry the flag differently (mirror Tagwright's verified shape,
 * commit 32e087c5):
 *   - a STANDALONE file (`.txt`, image, raw shard) gains a `<file>.meta` sidecar —
 *     a bare TW5 field-block `_lar_cas: yes` + `type: <media-type>`.
 *   - a MEME (`.mem`) with a SINGLE dominant blob-worthy ahu gains `_lar_cas = "yes"`
 *     on THAT ahu's own `toml iam` fence.
 *
 * A meme whose body chunks across many small ahus (a MIND-BUNDLE, no single blob-ahu)
 * — or one whose blob-ahu carries no `toml iam` fence to stamp, or whose largeness
 * splits across more than one ahu — REPORTS rather than mutates. When the shape reads
 * ambiguous the shore reports and leaves the canon untouched, never guess-and-mutate.
 *
 * Detection reuses the in-tree readiness law verbatim (never re-derives it):
 * `carrierCasFlagged` (already opted in?), `casBackstopFires` + `isOversizedBody` +
 * `mediaTypeFromExt` (would it fault or backstop?), `CAS_BACKSTOP_SIZE` (the per-ahu
 * blob floor). It writes ONLY under the explicit `--tag-blobs` gesture — a normal
 * ingest mutates no source.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/cas-stage
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { utf8Bytes, casBackstopFires, isOversizedBody, mediaTypeFromExt, CAS_BACKSTOP_SIZE } from "@lararium/mesh";
import { findTopLevelAhuBlocks } from "@lararium/tw5/meme-ast";
import { carrierCasFlagged } from "./cas-stage.js";

/** The minimal carrier view the writer reads — a subset of `ScanRow`. */
export interface TagCarrier {
  readonly file:    string;
  readonly text:    string;
  readonly ext:     string;
  readonly binary?: boolean;
  readonly meta?:   string;
}

export type TagKind =
  | "meta-written"          // standalone: a fresh `.meta` sidecar now flags it
  | "ahu-tagged"            // meme: the dominant blob-ahu's iam fence now flags it
  | "mind-bundle"           // meme: body chunked across small ahus, no single blob-ahu — left inline
  | "ambiguous-meme"        // meme: largeness splits across >1 ahu — reported, not mutated
  | "meme-no-iam"           // meme: the blob-ahu carries no `toml iam` fence to stamp — reported
  | "meta-exists-unflagged"; // standalone: a `.meta` sits beside it without the flag — reported

export interface TagOutcome {
  readonly file:   string;
  readonly kind:   TagKind;
  readonly detail: string;
  /** A write landed on disk (`meta-written` / `ahu-tagged`); a report is `false`. */
  readonly wrote:  boolean;
}

/**
 * Would this carrier hit the ungated-large-inline wall (or ride the un-flagged
 * backstop) at regenesis, and NOT already carry the opt-in flag? Reuses the exact
 * in-tree readiness law — the flag decides first (already opted in → no tag), then
 * the backstop-non-text family OR the oversized-text fault elects it. A small
 * un-flagged text body inlines pono and needs no tag.
 */
export function carrierNeedsTag(c: TagCarrier): boolean {
  if (carrierCasFlagged(c.text, c.meta)) return false;
  const size = utf8Bytes(c.text).length;
  const mediaType = mediaTypeFromExt(c.ext, c.binary ?? false);
  return casBackstopFires(size, mediaType) || isOversizedBody(size);
}

/** Find the `toml iam` fence inside an absolute `[start, end)` span; returns the
 *  offset of its closing fence (the ``` line) so a field inserts just above it, or
 *  null when the span carries no iam fence. */
function iamFenceCloseOffset(text: string, start: number, end: number): number | null {
  const span = text.slice(start, end);
  const m = /```toml\s+iam\b[^\n]*\n[\s\S]*?\n```/.exec(span);
  if (!m) return null;
  // m[0] ends with "\n```" — the closing backticks sit at the last three chars.
  return start + m.index + m[0].length - 3;
}

/**
 * Stamp a meme body: locate the single dominant blob-worthy ahu (its body over the
 * CAS backstop floor) and insert `_lar_cas = "yes"` into that ahu's iam fence.
 * Reports (mutates nothing) for a mind-bundle (zero large ahus), an ambiguous split
 * (more than one), or a blob-ahu with no iam fence.
 */
export function tagMemeText(text: string): { text: string; kind: TagKind; detail: string } {
  const blocks = findTopLevelAhuBlocks(text);
  const large = blocks
    .map((b) => ({ b, size: utf8Bytes(text.slice(b.bodyStart, b.bodyEnd)).length }))
    .filter((x) => x.size > CAS_BACKSTOP_SIZE);
  if (large.length === 0) {
    return { text, kind: "mind-bundle", detail: "no single blob-ahu, left inline — tag manually if intended" };
  }
  if (large.length > 1) {
    const slots = large.map((x) => x.b.slot).join(", ");
    return { text, kind: "ambiguous-meme", detail: `${large.length} large ahus (${slots}) — reported, not tagged` };
  }
  const ahu = large[0]!.b;
  const closeAt = iamFenceCloseOffset(text, ahu.bodyStart, ahu.bodyEnd);
  if (closeAt === null) {
    return { text, kind: "meme-no-iam", detail: `blob-ahu ${ahu.slot} carries no toml iam fence — reported, not tagged` };
  }
  const stamped = text.slice(0, closeAt) + '_lar_cas = "yes"\n' + text.slice(closeAt);
  return { text: stamped, kind: "ahu-tagged", detail: `flagged ahu ${ahu.slot}` };
}

/**
 * Write the CAS opt-in flag for ONE carrier that needs it. Standalone files gain a
 * `<file>.meta` sidecar; memes gain the ahu iam flag. Idempotent by construction —
 * an already-flagged carrier never reaches here (the caller filters on
 * `carrierNeedsTag`), and an existing-but-unflagged `.meta` reports rather than
 * clobbering the operator's fields.
 */
export function tagCarrier(c: TagCarrier): TagOutcome {
  if (c.ext === ".mem") {
    const { text: stamped, kind, detail } = tagMemeText(c.text);
    if (kind !== "ahu-tagged") return { file: c.file, kind, detail, wrote: false };
    writeFileSync(c.file, stamped);
    return { file: c.file, kind, detail, wrote: true };
  }
  // Standalone file — the `.meta` sidecar carries the flag. A sidecar already
  // sitting beside the file WITHOUT the flag holds live operator fields; report it
  // rather than overwrite (the carrier reaches here only un-flagged, so an existing
  // sidecar means unflagged fields the operator wrote by hand).
  const metaPath = c.file + ".meta";
  if (existsSync(metaPath)) {
    const existing = readFileSync(metaPath, "utf8");
    if (carrierCasFlagged("", existing)) return { file: c.file, kind: "meta-written", detail: "sidecar already flags it", wrote: false };
    return { file: c.file, kind: "meta-exists-unflagged", detail: `${metaPath} holds fields but no flag — tag manually if intended`, wrote: false };
  }
  const mediaType = mediaTypeFromExt(c.ext, c.binary ?? false);
  writeFileSync(metaPath, `_lar_cas: yes\ntype: ${mediaType}\n`);
  return { file: c.file, kind: "meta-written", detail: `wrote ${metaPath} (type: ${mediaType})`, wrote: true };
}

/** Tag every carrier that needs it; return the outcome per carrier (writes + reports). */
export function tagBlobs(carriers: readonly TagCarrier[]): TagOutcome[] {
  return carriers.filter(carrierNeedsTag).map(tagCarrier);
}
