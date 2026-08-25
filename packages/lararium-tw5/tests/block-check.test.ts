/**
 * THE SLOT BETWEEN ETX AND EOT — the block check, and nothing else.
 *
 * ETX ends the text; the slot below it carries the BCC. Content there reaches no reader, and it used
 * to VANISH: the render simply did not reproduce it. Two `#edges` blocks were lost that way, noticed
 * only by diffing a round-trip. A block check answers a bad block with NAK, never with silence.
 */
import { describe, test, expect } from "vitest";
import { deserializeCarrier } from "../src/deserializer.js";
import { classifyPostamble, checkedSpan } from "../src/block-check.js";
import { bccOfSpan } from "../src/carrier-check.js";

const frame = (slot: string): string =>
  `<<^ code:"&#x0001;" ? -> lar:///t/x >>\n\`\`\`toml meta\nuri-path = "t/x"\n\`\`\`\n\n` +
  `<<^ code:"&#x0002;" >>\n\n<<~ ahu #a >>\n\n! Heading\n\n<<~/ahu >>\n\n<<^ code:"&#x0003;" >>\n${slot}\n<<^ code:"&#x0004;" -> ? >>\n`;

const stranded = (text: string): string[] =>
  deserializeCarrier(text, { title: "lar:///t/x" }).diagnostics
    .filter((d) => d.code === "postamble-content").map((d) => d.severity);

const digestOf = (text: string): string =>
  bccOfSpan(checkedSpan(text) ?? "", "\u2299");

describe("★ content past ETX refuses instead of vanishing ★", () => {
  test("an empty slot is legal — the block check is OPTIONAL", () => {
    expect(stranded(frame(""))).toEqual([]);
  });

  test("★ an ahu block stranded past ETX raises an ERROR the gate refuses on ★", () => {
    // The exact shape that was lost twice: real content, below the close, reproduced by nothing.
    expect(stranded(frame("\n<<~ ahu #edges >>\n\n* a link\n\n<<~/ahu >>\n"))).toEqual(["error"]);
  });

  test("a well-formed block check is legal in that slot", () => {
    const t = frame("");
    expect(stranded(frame("\n" + digestOf(t) + "\n"))).toEqual([]);
  });
});

describe("the checked span follows the frame, not the prose", () => {
  test("★ it runs STX → ETX INCLUSIVE — the terminator is part of what the check attests ★", () => {
    // BSC's BCC covered "all the characters following STX up to the end of the ETX character".
    // A span that stopped short of ETX would attest to a different block than the one transmitted.
    const span = checkedSpan(frame("")) ?? "";
    expect(span.startsWith("<<^ code:\"&#x0002;\" ")).toBe(true);
    expect(span).toContain("&#x0003;");
    expect(span).not.toContain("&#x0004;");     // EOT ends the transmission, never the text
  });

  test("a carrier with no ETX has no block to check, and says so rather than inventing one", () => {
    expect(checkedSpan("no frame here at all")).toBeNull();
  });
});

describe("classifyPostamble", () => {
  test("whitespace and a bare EOT both read as an empty slot", () => {
    expect(classifyPostamble("\n\n").kind).toBe("empty");
    expect(classifyPostamble("\n<<^ code:\"&#x0004;\" -> ? >>\n").kind).toBe("empty");
  });

  test("it counts the stranded lines, so a refusal can name the size of what it refused", () => {
    const v = classifyPostamble("<<~ ahu #edges >>\n\n* a\n\n<<~/ahu >>");
    expect(v.kind).toBe("foreign");
    if (v.kind === "foreign") expect(v.lines).toBe(5);
  });
});
