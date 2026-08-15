/**
 * block-check — the BCC: what may stand between ETX and EOT, and nothing else.
 *
 * ── THE SLOT IS OCCUPIED, AND BY ONE THING ──────────────────────────────────────────────────────
 * The frame glyphs are ASCII C0 as IBM BSC (1967) and ISO 1745 (1975) used them: SOH opens the
 * heading, STX opens the text, ETX ends the text, EOT ends the transmission. A block reads
 *
 *     [SOH heading] STX text ETX BCC        …        EOT
 *
 * The BCC — block check character — is an integrity trailer, and it sits AFTER ETX for a reason that
 * is not stylistic: it cannot live inside the span it checks. Its coverage runs from STX through the
 * ETX **inclusive**, so the terminator is part of what the check attests.
 *
 * ETX is also where a verdict falls. In BSC it "calls for a reply": the receiver checks the BCC and
 * answers ACK or NAK. That is exactly the ingest gate's boundary — ingest · noop · conflict · refuse —
 * so the trailer belongs to the same moment the gate already decides in.
 *
 * EOT then ends the transmission in BOTH directions: nothing further is expected from or to the far
 * side. Content addressed after that is addressed to nobody.
 *
 * ── SO: NO PAYLOAD BETWEEN ETX AND EOT ──────────────────────────────────────────────────────────
 * A carrier that put content there lost it silently — the render simply did not reproduce it, which
 * is the inverse of a block check: BSC answered a bad block with NAK and a retransmission, never with
 * a quiet drop. `classifyPostamble` makes the slot legible so the deserializer can refuse instead.
 *
 * PARTIAL BLOCKS TAKE ETB, NEVER A SECOND ETX. BSC terminated a non-final block with ETB (0x17) and
 * reserved ETX for the last one. Two ETXs would assert two verdicts on one transmission — which is
 * the shape to reach for if a carrier is ever split, or streamed during a residency move.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

/**
 * The trailer's written form: `<<^ BCC sha256:… >>`.
 *
 * It rides the caret family with the other frame sigils because it IS frame, never body — a reader
 * who meets it should feel the same register as the ETX above it.
 */
// THE CHECK'S LINE FORM LIVES HERE; THE CHECK ITSELF LIVES IN `carrier-check.ts`, which computes it
// over the framed span rather than reading it from a field. Until the stamping sweep runs, this module
// only CLASSIFIES what follows ETX — it never verifies, so a carrier's postamble reads as present or
// absent and never as correct. Naming that gap beats a classifier that looks like a check.
export const BCC_RE = /^<<[~^]\s*BCC\s+(sha256:[0-9a-f]{64})\s*>>$/;

/** Render the trailer for a computed digest. */
export const bccLine = (digest: string): string => `<<^ BCC ${digest} >>`;

/**
 * What a carrier wrote between ETX and EOT.
 *
 *   · `empty`   — whitespace only. The overwhelmingly common case, and legal: the BCC is OPTIONAL,
 *                 exactly as BSC allowed blocks to run without one on a trusted link.
 *   · `bcc`     — a well-formed block check. Legal, and checkable.
 *   · `foreign` — anything else. Payload stranded past the end of text, which no reader will ever
 *                 render. This is the case that used to vanish.
 */
export type Postamble =
  | { readonly kind: "empty" }
  | { readonly kind: "bcc";     readonly digest: string }
  | { readonly kind: "foreign"; readonly text: string; readonly lines: number };

export function classifyPostamble(postamble: string): Postamble {
  if (postamble.trim().length === 0) return { kind: "empty" };

  // EOT and any trailing whitespace belong to the frame, never to the slot — strip them before
  // judging what the operator actually wrote there.
  // `[^>]*` cannot cross the `>` inside `-> ?`, so the EOT sigil's own arrow defeats a naive strip.
  // Match to the line's end instead — a frame sigil never spans lines.
  const body = postamble
    .replace(/<<[~^](?:\s*\S+)?\s*&#x0004;[^\n]*?>>/g, "")
    .trim();
  if (body.length === 0) return { kind: "empty" };

  const m = BCC_RE.exec(body);
  if (m) return { kind: "bcc", digest: m[1] as string };

  return { kind: "foreign", text: body, lines: body.split("\n").length };
}

/**
 * The span a block check covers: STX through ETX INCLUSIVE.
 *
 * Returns null when the frame is absent or malformed — a carrier with no ETX has no block to check,
 * and inventing a span for it would attest to something the frame never delimited.
 */
export function checkedSpan(framed: string): string | null {
  const stx = /<<[~^](?:\s*\S+)?\s*&#x0002;[^>]*>>/.exec(framed);
  if (!stx) return null;
  // The LAST ETX closes the text; an earlier one would belong to an embedded example.
  const etxRe = /<<[~^](?:\s*\S+)?\s*&#x0003;[^>]*>>/g;
  let end = -1;
  for (let m = etxRe.exec(framed); m !== null; m = etxRe.exec(framed)) end = m.index + m[0].length;
  if (end < 0 || end <= stx.index) return null;
  return framed.slice(stx.index, end);
}
