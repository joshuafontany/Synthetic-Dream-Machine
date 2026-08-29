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
 * `lares carrier project-md` both call {@link projectSubmission}.
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
const FRAME_LINE = /^<<\^ code="&#x00[0-9A-Fa-f]{2};"(?:[^>\n]|->)* >>.*$/;
/** The SOH heading, capturing the carrier's declared address. The tail admits `->`. */
const SOH_LINE = /^<<\^ code="&#x00[01]1;"(?:[^>\n]|->)*\?\s*->\s*(lar:\/\/\/\S+) >>/;
/** The ETX closer with its adjacent check. */
const ETX_LINE = /^<<\^ code="&#x0003;"[^\n]*>>(\S+)?/;
const DOCTYPE_LINE = /^<<!DOCTYPE (?:[^>\n]|->)* >>\s*$/;
// The tooth stands at one dispatch position: `<<~` then LWSP then the command word,
// and a close word carries its own slash (`ahu`, `/ahu`). Both spacings reach the same
// word, matching the plain register's `<<fragment …>>` / `<</fragment>>`.
const AHU_OPEN = /^<<~\s*ahu #(\S+)(?: (?:[^>\n]|->)*)? >>\s*$/;
const AHU_CLOSE = /^<<~\s*\/\s*ahu\s*>>\s*$/;
const EDGE_LINE = /^<<~\s*(?:aka|loulou) ((?:[^>\n]|->)*?) >>\s*$/;
// The speaking head with or without a joined name (`<<~ ahu`, `<<~ranks`, `<<~! wehe`) — any
// line-standing sigil not already given a markdown shape above.
const SIGIL_LINE = /^<<~\S* ?(?:[^>\n]|->)* >>\s*$/;

/**
 * Emphasis, applied outside code spans. Spans mask to NUL-delimited tokens and restore after —
 * a bare-digit token would collide with prose numerals ("12/20") and eat them on restore.
 *
 * THE DELIMITERS TRANSPOSE ONE AT A TIME, NEVER AS PAIRS. Markdown opens and closes emphasis with
 * the same characters, so a transposition needs no pairing at all — and pairing is what broke here:
 * this runs a line at a time, a matching regex cannot see past a newline, and every span wrapping a
 * line break silently kept its wikitext marks. The failure landed in prose, mid-sentence, where a
 * reader meets `''` as literal quote characters and cannot tell what the author meant.
 */
function inline(s: string): string {
  const spans: string[] = [];
  const NUL = String.fromCharCode(0);
  const masked = s.replace(/`[^`]*`/g, (m) => {
    spans.push(m);
    return NUL + String(spans.length - 1) + NUL;
  });
  const emphasised = masked
    .replace(/''/g, "**")
    // A scheme separator carries its own double slash — `lar://`, `https://`, `ni:///` — so the
    // italic mark yields wherever a colon or another slash stands immediately before it.
    .replace(/(^|[^:/])\/\//g, "$1*");
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
    `projected-by: meme-markdown (lares carrier project-md · PROJECT-MD)`,
    `law: projected artifact — hand edits do not survive re-projection`,
  ].join("\n") + "\n";
  return { markdown: t.markdown, meta, uri, check };
}

/**
 * THE SEED PROJECTION — a second, deliberately shallower rendering, for the boot seed alone.
 *
 * {@link transposeMarkdown} renders a carrier for a reader who was taught no grammar: it drops the
 * frame, spends `<<~ ahu >>` on an HTML anchor, and turns every other sigil into a shown code span.
 * That is right for a submission and wrong for a seed, because the seed's reader IS the grammar —
 * a harness loads `noosphere-boot.md` and boots the house FROM the sigils. Stripping them would
 * hand the harness a description of a seed instead of a seed.
 *
 * So this projection converts markup and nothing else: headings, ordered runs, bullets, emphasis.
 * Every sigil, the frame, and the meta fence ride through verbatim. The block check is the one
 * carrier artifact dropped — a relay verifies it beside the ETX, and the markdown seed is bytes a
 * harness loads with no relay anywhere in the path.
 *
 * ONE DIRECTION, so the markdown is a projection and never a source. A hand that edits the twin is
 * reconstructing by eye what this function derives, and the line it mistypes reads as authored.
 */
/**
 * The provenance a projected seed carries in its own head, as YAML frontmatter.
 *
 * A SIDECAR IS A FILE THAT TRAVELS SEPARATELY AND THEREFORE EVENTUALLY DOES NOT. The submission pair
 * can afford one, landing beside its markdown in a shelf nothing moves; a seed gets copied into a
 * harness, a gist, a chat window, and arrives alone. So a seed's provenance rides INSIDE it.
 *
 * NO CLOCK RIDES IT. Currency gets proven by re-projection and never asserted by a stamp, so the
 * head carries the source address and the source's block check and nothing that ages on its own.
 * `source-check` names the bytes this projection was taken FROM — a reader who re-projects and gets
 * different markdown has found a moved carrier, which is the one thing a stamp could never tell them.
 */
export function seedFields(text: string): Array<[string, string]> {
  const { uri, check } = seedIdentity(text);
  const fields: Array<[string, string]> = [
    ["title", uri ?? ""],
    ["type", "text/markdown"],
    ["source", uri ?? ""],
    ["source-check", check ?? "unchecked"],
    ["projected-by", "meme-markdown (lares carrier project-seed)"],
    ["law", "projected artifact — hand edits do not survive re-projection"],
  ];
  // THE CARRIER'S OWN META RIDES ALONG, renamed only where it would collide. `type` names what a
  // reader is holding, and a reader here holds markdown — so the carrier's type keeps its fact under
  // `source-type`, where it describes the thing this was projected FROM rather than the thing in hand.
  for (const [k, v] of tomlMetaFields(text)) fields.push([k === "type" ? "source-type" : k, v]);
  return fields;
}

/** The carrier's ```toml meta fence, read as flat key/value. Quotes and comments come off. */
export function tomlMetaFields(text: string): Array<[string, string]> {
  const fence = /^```toml meta\n([\s\S]*?)^```/m.exec(text);
  if (!fence) return [];
  const out: Array<[string, string]> = [];
  for (const line of (fence[1] ?? "").split("\n")) {
    const kv = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (!kv) continue;
    out.push([kv[1]!, (kv[2] ?? "").replace(/^"(.*)"$/, "$1")]);
  }
  return out;
}

/** The projection's head, as YAML frontmatter. */
export function seedFrontmatter(text: string): string {
  return ["---", ...seedFields(text).map(([k, v]) => `${k}: ${v}`), "---"].join("\n") + "\n";
}

/**
 * The same fields as a TiddlyWiki sidecar.
 *
 * THE COPY IS DELIBERATE. A markdown reader reads frontmatter and a wiki importer reads a `.meta`,
 * and neither reads the other — so one fact stands twice rather than standing once where half the
 * readers cannot reach it. Both derive from the carrier in the same pass, so they cannot disagree.
 */
export function seedMeta(text: string): string {
  return seedFields(text).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n";
}

/** The toml meta fence, lifted out of a projected body — the frontmatter and sidecar now carry it. */
export function stripTomlMeta(body: string): string {
  return body.replace(/^```toml meta\n[\s\S]*?^```\n/m, "");
}

/** The carrier's declared address and block check, read off its own frame. */
export function seedIdentity(text: string): { uri?: string; check?: string } {
  const uri = /^<<\^ code="&#x00[01]1;"(?:[^>\n]|->)*\?\s*->\s*(lar:\/\/\/\S+) >>/m.exec(text)?.[1];
  const check = /<<\^ code="&#x0003;"[^>\n]*>>(ni:\/\/\/sha-256;[A-Za-z0-9_-]+)/.exec(text)?.[1];
  return { ...(uri ? { uri } : {}), ...(check ? { check } : {}) };
}

export function transposeSeed(body: string): string {
  let fenced = false;
  let ordinal = 0;
  const rendered = body.split("\n").map((line) => {
    if (line.startsWith("```")) { fenced = !fenced; return line; }
    if (fenced) return line;
    const ordered = /^(\s*)#\s+(.*)$/.exec(line);
    if (ordered) {
      ordinal += 1;
      return `${ordered[1]}${ordinal}. ${inline(ordered[2] ?? "")}`;
    }
    ordinal = 0;                                     // any other line closes the run
    return inline(
      line
        .replace(/^(!{1,5})\s+/, (_, h: string) => "#".repeat(h.length) + " ")
        .replace(/^(\s*)\*\s+/, (_, s: string) => `${s}- `),
    );
  }).join("\n");
  return rendered.replace(/(<<\^ code="&#x0003;" >>)[^\n]*/g, "$1");
}
