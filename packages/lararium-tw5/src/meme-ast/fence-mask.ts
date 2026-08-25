/**
 * fence-mask — quoted-code spans for structural sigil scans.
 *
 * The shore's structural scanners (carrier framing, ahu blocks, kahea
 * refs) MUST NOT match sigils the operator merely QUOTES: a teaching doc
 * that shows `<<^ code:"&#x0003;" >>` inside a code fence does not close its own
 * body, and a fenced `<<~ ahu #example >>` opens no child. Before this
 * mask landed, a fenced ETX mention truncated everything
 * after it at ingest — silent content loss on real corpus files.
 *
 * Two span kinds, CommonMark-shaped, conservative:
 *   - fenced code blocks: a line opening with 0–3 spaces then 3+ backticks
 *     closes at the next line with the same-or-longer backtick run (or
 *     end-of-text when unclosed — the open tail stays masked);
 *   - inline code spans: equal-length backtick runs paired within a line,
 *     outside fenced blocks.
 *
 * Isomorphic; no TW5/fs/DOM dependencies — same law in every caller.
 */

export interface MaskSpan { readonly start: number; readonly end: number }

const FENCE_LINE_RE = /^ {0,3}(`{3,})/;

/** All quoted-code spans of `text`, ordered, non-overlapping. */
export function fencedSpans(text: string): MaskSpan[] {
  const spans: MaskSpan[] = [];
  let open: { len: number; start: number } | null = null;
  let lineStart = 0;
  const flushLine = (lineEnd: number, nextStart: number) => {
    const line = text.slice(lineStart, lineEnd);
    const m = FENCE_LINE_RE.exec(line);
    if (open) {
      // closing fence: same-or-longer run, nothing but the run on the line
      if (m && m[1]!.length >= open.len && line.slice(line.indexOf("`") + m[1]!.length).trim() === "") {
        spans.push({ start: open.start, end: nextStart });
        open = null;
      }
    } else if (m) {
      open = { len: m[1]!.length, start: lineStart };
    } else {
      // inline code spans on a non-fence line
      let i = 0;
      while (i < line.length) {
        if (line[i] !== "`") { i++; continue; }
        let runLen = 1;
        while (line[i + runLen] === "`") runLen++;
        // find a matching equal-length run further on
        let j = i + runLen;
        let closed = -1;
        while (j < line.length) {
          if (line[j] !== "`") { j++; continue; }
          let r = 1;
          while (line[j + r] === "`") r++;
          if (r === runLen) { closed = j + r; break; }
          j += r;
        }
        if (closed >= 0) {
          spans.push({ start: lineStart + i, end: lineStart + closed });
          i = closed;
        } else {
          i += runLen;
        }
      }
    }
    lineStart = nextStart;
  };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") flushLine(i, i + 1);
  }
  flushLine(text.length, text.length);
  if (open !== null) spans.push({ start: (open as { start: number }).start, end: text.length });
  return spans;
}

/** True when index `i` falls inside any span. Spans stay ordered — binary search. */
export function inMask(spans: readonly MaskSpan[], i: number): boolean {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid]!;
    if (i < s.start) hi = mid - 1;
    else if (i >= s.end) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * True when `i` sits strictly INSIDE a span — past its opening character.
 * A fence opener itself starts its own span; a scanner looking for real
 * fence openers (the meta finder) accepts span-start matches and rejects
 * interior ones (a ````-quoted ```toml meta example).
 */
export function inMaskInterior(spans: readonly MaskSpan[], i: number): boolean {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid]!;
    if (i < s.start) hi = mid - 1;
    else if (i >= s.end) lo = mid + 1;
    else return i > s.start;
  }
  return false;
}

/**
 * First match of `re` in `text` whose start index falls OUTSIDE the mask.
 * `re` may carry the /g flag or not; lastIndex resets either way.
 * `allowSpanStart` admits matches that begin exactly at a span's opening
 * character — for scanners whose target IS a fence opener.
 */
export function maskedExec(text: string, re: RegExp, spans?: readonly MaskSpan[], allowSpanStart = false): RegExpExecArray | null {
  const mask = spans ?? fencedSpans(text);
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    const blocked = allowSpanStart ? inMaskInterior(mask, m.index) : inMask(mask, m.index);
    if (!blocked) return m;
    // A masked match may have swallowed text containing a real later match
    // (greedy patterns) — re-seek from just past the masked START, never
    // past the whole match.
    g.lastIndex = m.index + 1;
  }
  return null;
}

/** Every unmasked match of `re` in `text`. */
export function maskedExecAll(text: string, re: RegExp, spans?: readonly MaskSpan[]): RegExpExecArray[] {
  const mask = spans ?? fencedSpans(text);
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    if (!inMask(mask, m.index)) {
      out.push(m);
      if (g.lastIndex === m.index) g.lastIndex++;   // zero-width guard
    } else {
      g.lastIndex = m.index + 1;                    // masked: re-seek, don't overshoot
    }
  }
  return out;
}
