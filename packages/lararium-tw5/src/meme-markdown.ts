/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/meme-markdown
type: application/javascript
module-type: library
\*/
/**
 * meme-markdown — project one memetic-wikitext carrier into a markdown + meta pair.
 *
 * The submission projection: a spec carrier renders to bytes a standards reviewer reads with no
 * grammar taught — markdown body, sidecar meta carrying provenance. The projection runs one
 * direction (carrier → markdown) and stays DETERMINISTIC: same carrier bytes, same pair, no
 * clock and no randomness anywhere in the path, so a witness proves a pair current by
 * re-projecting and comparing.
 *
 * ── WHY LINE-BASED, WHY ONE-DIRECTIONAL ─────────────────────────────────────────────────────────
 * Wikitext marks an ordered list with a bare `#`, which markdown spends on headings; markdown
 * numbers each item, which wikitext leaves implicit. This transposer counts list position and
 * reads `!` depth for headings — both total. The reverse direction would have to guess where a
 * `#` meant heading and where it meant item, so no reverse exists here.
 *
 * ── WHAT EACH CONSTRUCT BECOMES ─────────────────────────────────────────────────────────────────
 *   frame sigils (`<<^ …>>`) + declaration   dropped — carriage, not content; the meta records them
 *   the meta fence                            dropped from the body — provenance rides the meta
 *   `<<~ ahu #name >>` / `<<~/ahu >>`        an HTML anchor `<a id="name"></a>` / dropped —
 *                                            every `#name` citation in prose keeps a target
 *   `<<~ aka … >>` `<<~ loulou … >>`         a reference bullet carrying the address as code
 *   any other line-standing sigil            the line wrapped in a code span — notation shown
 *                                            literally, never executed and never invented around
 *   `!` headings · `#` ordered · `*` bullets markdown equivalents, totals
 *   `''bold''` · `//italic//`                `**` · `*`, with code spans masked first — a
 *                                            `lar://` pair reads as an italic open otherwise
 *   fenced blocks                            sealed: a fence of N backticks closes only on ≥ N,
 *                                            so teaching examples pass through byte-identical
 *   tables                                   markdown tables; `!` header cells shed the mark and
 *                                            the separator row follows the first row
 *
 * The wiki door and the CLI door share this one mouth: the PROJECT-MD verb (action-handler) and
 * `lares project-md` both call {@link projectSubmission}.
 */

export interface SubmissionProjection {
  /** The markdown body — what a reviewer reads. */
  markdown: string;
  /** The sidecar meta, TW5 `.meta` field lines — provenance the pair travels under. */
  meta: string;
  /** The carrier's own address, read off its SOH heading (or supplied). */
  uri: string;
  /** The block check found adjacent to ETX, or "unchecked". */
  check: string;
}

/** Line-standing frame sigil (any control code), with whatever rides after the closer. */
const FRAME_LINE = /^<<\^ code:"&#x00[0-9A-Fa-f]{2};"(?:[^>\n]|->)* >>.*$/;
/** The SOH heading, capturing the carrier's declared address. The tail admits `->`. */
const SOH_LINE = /^<<\^ code:"&#x00[01]1;"(?:[^>\n]|->)*\?\s*->\s*(lar:\/\/\/\S+) >>/;
/** The ETX closer with its adjacent check. */
const ETX_LINE = /^<<\^ code:"&#x0003;"[^\n]*>>(\S+)?/;
const DOCTYPE_LINE = /^<<!DOCTYPE (?:[^>\n]|->)* >>\s*$/;
const AHU_OPEN = /^<<~ ahu #(\S+)(?: (?:[^>\n]|->)*)? >>\s*$/;
const AHU_CLOSE = /^<<~\/ahu >>\s*$/;
const EDGE_LINE = /^<<~ (?:aka|loulou) ((?:[^>\n]|->)*?) >>\s*$/;
// The speaking head with or without a joined name (`<<~ ahu`, `<<~ranks`, `<<~! wehe`) — any
// line-standing sigil not already given a markdown shape above.
const SIGIL_LINE = /^<<~\S* ?(?:[^>\n]|->)* >>\s*$/;

/**
 * Emphasis, applied outside code spans. Spans mask to NUL-delimited tokens and restore after —
 * a bare-digit token would collide with prose numerals ("12/20") and eat them on restore.
 */
function inline(s: string): string {
  const spans: string[] = [];
  const NUL = String.fromCharCode(0);
  const masked = s.replace(/`[^`]*`/g, (m) => {
    spans.push(m);
    return NUL + String(spans.length - 1) + NUL;
  });
  const emphasised = masked
    .replace(/''(.+?)''/g, "**$1**")
    .replace(/\/\/(.+?)\/\//g, "*$1*");
  // NUL delimits the mask tokens - a byte the carrier-bytes law keeps out of prose, so a
  // numeral in the text ("12/20") never reads as a token and never restores to a span.
  return emphasised.replace(new RegExp(NUL + "(\\d+)" + NUL, "g"), (_, i) => spans[Number(i)] ?? "");
}

/** One TW5 table row → its trimmed cells; null when the line is no row. */
function tableCells(line: string): string[] | null {
  if (!/^\s*\|.*\|\s*$/.test(line)) return null;
  const inner = line.trim().slice(1, -1);
  return inner.split("|").map((c) => c.trim());
}

/**
 * Transpose a memetic-wikitext body to markdown. Side-channel captures (address, check, meta fence)
 * ride the returned record; {@link projectSubmission} folds them into the meta.
 */
export function transposeMarkdown(text: string): { markdown: string; uri?: string; check?: string; metaFence?: string } {
  const out: string[] = [];
  let fence = 0;            // open fence length in backticks; 0 = prose
  let ordinal = 0;          // position inside a `#` ordered run
  let metaFence: string[] | null = null;
  let metaFenceDone: string | undefined;
  let inMetaFence = false;
  let uri: string | undefined;
  let check: string | undefined;
  let tableRow = 0;         // rows emitted in the current table run
  let sigilBuf: string[] | null = null;  // a line-spanning sigil, gathered whole

  for (const line of text.split("\n")) {
    const fenceMark = /^(`{3,})/.exec(line);

    // ── the meta fence: captured whole, dropped from the body ──
    if (inMetaFence) {
      if (fenceMark) { inMetaFence = false; metaFenceDone = (metaFence ?? []).join("\n"); metaFence = null; continue; }
      (metaFence ?? []).push(line);
      continue;
    }
    // Only the fence that OPENS the carrier heads the carrier (the position law) — every later
    // `toml meta` fence heads a worksite and STAYS in the body as an ordinary fenced block.
    if (fence === 0 && metaFenceDone === undefined && /^```toml meta\s*$/.test(line)) { inMetaFence = true; metaFence = []; continue; }

    // ── fence tracking: N backticks close only on ≥ N ──
    if (fenceMark) {
      const len = fenceMark[1]!.length;
      if (fence === 0) fence = len;
      else if (len >= fence) fence = 0;
      out.push(line);
      continue;
    }
    if (fence > 0) { out.push(line); continue; }

    // ── carriage, dropped; address and check captured on the way past ──
    const soh = SOH_LINE.exec(line);
    if (soh) { uri = uri ?? soh[1]; continue; }
    const etx = ETX_LINE.exec(line);
    if (etx) { check = check ?? etx[1]; continue; }
    if (FRAME_LINE.test(line) || DOCTYPE_LINE.test(line)) continue;

    // ── a sigil spanning lines travels whole, shown literally in a fence ──
    if (sigilBuf) {
      sigilBuf.push(line);
      if (/ >>\s*$/.test(line)) {
        out.push("```", ...sigilBuf, "```");
        sigilBuf = null;
      }
      continue;
    }
    if (/^<<[~^]/.test(line) && !/>>/.test(line)) { sigilBuf = [line]; continue; }

    // ── sigils with a markdown shape ──
    const ahu = AHU_OPEN.exec(line);
    if (ahu) { out.push(`<a id="${ahu[1]}"></a>`); continue; }
    if (AHU_CLOSE.test(line)) continue;
    const edge = EDGE_LINE.exec(line);
    if (edge) { out.push(`- \`${(edge[1] ?? "").trim()}\``); continue; }
    if (SIGIL_LINE.test(line)) {
      out.push(line.includes("`") ? line : `\`${line}\``);
      continue;
    }

    // ── tables ──
    const cells = tableCells(line);
    if (cells) {
      tableRow += 1;
      const header = cells.some((c) => c.startsWith("!"));
      const shed = cells.map((c) => inline(c.replace(/^!/, "")));
      out.push(`| ${shed.join(" | ")} |`);
      if (tableRow === 1 || (header && tableRow === 1)) out.push(`|${shed.map(() => "---").join("|")}|`);
      continue;
    }
    tableRow = 0;

    // ── ordered runs, headings, bullets, emphasis ──
    const ordered = /^(\s*)#\s+(.*)$/.exec(line);
    if (ordered) {
      ordinal += 1;
      out.push(`${ordered[1]}${ordinal}. ${inline(ordered[2] ?? "")}`);
      continue;
    }
    ordinal = 0;
    out.push(inline(
      line
        .replace(/^(!{1,5})\s+/, (_, h: string) => "#".repeat(h.length) + " ")
        .replace(/^(\s*)\*\s+/, (_, s: string) => `${s}- `),
    ));
  }
  const markdown = out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "\n");
  return { markdown, ...(uri ? { uri } : {}), ...(check ? { check } : {}), ...(metaFenceDone ? { metaFence: metaFenceDone } : {}) };
}

/**
 * Project one whole carrier into its submission pair. Deterministic: no clock rides the meta —
 * currency is proven by re-projection, never asserted by a stamp.
 */
export function projectSubmission(text: string, opts?: { uri?: string; title?: string }): SubmissionProjection {
  const t = transposeMarkdown(text);
  const uri = opts?.uri ?? t.uri ?? "";
  if (!uri) throw new Error("projectSubmission: the carrier declares no address and none was supplied");
  const check = t.check ?? "unchecked";
  const meta = [
    `title: ${opts?.title ?? `${uri}/submission`}`,
    `type: text/markdown`,
    `source: ${uri}`,
    `source-check: ${check}`,
    `projected-by: meme-markdown (lares project-md · PROJECT-MD)`,
    `law: projected artifact — hand edits do not survive re-projection`,
  ].join("\n") + "\n";
  return { markdown: t.markdown, meta, uri, check };
}
