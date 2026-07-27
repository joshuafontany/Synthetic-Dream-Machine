/**
 * tag-blobs.test.ts — the `lares ingest --tag-blobs` writer proof.
 *
 * The shore stamps the CAS opt-in flag for carriers that would hit the ungated-large-inline
 * wall at regenesis: a `<file>.meta` sidecar for a standalone file, `_lar_cas = "yes"` on
 * the dominant blob-ahu's iam fence for a meme. A mind-bundle meme (body across many small
 * ahus), an ambiguous split (>1 large ahu), a blob-ahu with no iam fence, and an
 * already-flagged carrier all REPORT rather than mutate. Here we prove the detection reuse,
 * both write shapes, idempotency, and the report-never-guess doctrine.
 */

import { describe, test, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { carrierNeedsTag, tagMemeText, tagCarrier, tagBlobs, type TagCarrier } from "../src/tag-blobs.js";
import { carrierCasFlagged } from "../src/cas-stage.js";

const BIG = "x".repeat(70 * 1024);   // over the 64 KiB CAS backstop floor
const HUGE = "y".repeat(1100 * 1024); // over the 1 MiB oversized-inline wall

const smallAhu = (slot: string) => `<<~ ahu #${slot} >>\n\nshort prose in ${slot}.\n\n<<~/ahu >>\n`;
const iamAhu = (slot: string, body: string) =>
  `<<~ ahu #${slot} >>\n\`\`\`toml iam\nrole = "source-text interior"\ntype = "text/markdown"\n\`\`\`\n\n${body}\n<<~/ahu >>\n`;
const bareAhu = (slot: string, body: string) => `<<~ ahu #${slot} >>\n\n${body}\n<<~/ahu >>\n`;

describe("carrierNeedsTag — reuses the in-tree readiness law", () => {
  test("a small un-flagged text carrier needs NO tag (inlines pono)", () => {
    expect(carrierNeedsTag({ file: "a.txt", text: "short body", ext: ".txt" })).toBe(false);
  });
  test("a medium (128 KiB) text carrier needs NO tag — under the inline wall, text backstop stays quiet", () => {
    expect(carrierNeedsTag({ file: "m.txt", text: "z".repeat(128 * 1024), ext: ".txt" })).toBe(false);
  });
  test("an oversized (>1 MiB) text carrier WOULD fault — needs a tag", () => {
    expect(carrierNeedsTag({ file: "big.txt", text: HUGE, ext: ".txt" })).toBe(true);
  });
  test("a binary/image carrier rides the backstop at any size — needs a tag", () => {
    expect(carrierNeedsTag({ file: "p.png", text: "AAAA", ext: ".png", binary: true })).toBe(true);
  });
  test("an already-flagged carrier (meta) needs NO tag — idempotent", () => {
    expect(carrierNeedsTag({ file: "big.txt", text: HUGE, ext: ".txt", meta: "_lar_cas: yes\ntype: text/plain\n" })).toBe(false);
  });
});

describe("tagMemeText — stamp the single dominant blob-ahu", () => {
  test("one large #source-text ahu with an iam fence → ahu-tagged, and re-scan reads flagged", () => {
    const meme = smallAhu("meme-header") + iamAhu("source-text", BIG);
    const { text, kind } = tagMemeText(meme);
    expect(kind).toBe("ahu-tagged");
    expect(text).toContain('_lar_cas = "yes"');
    // The flag lands INSIDE the source-text iam fence, not the header — and CAS_FLAG_RE reads it.
    expect(carrierCasFlagged(text)).toBe(true);
    expect(text.indexOf('_lar_cas = "yes"')).toBeGreaterThan(text.indexOf("#source-text"));
  });

  test("body chunked across many small ahus → mind-bundle, canon untouched", () => {
    let meme = "";
    for (let i = 0; i < 40; i++) meme += smallAhu(`chapter-${i}`);
    const { text, kind, detail } = tagMemeText(meme);
    expect(kind).toBe("mind-bundle");
    expect(text).toBe(meme);
    expect(detail).toMatch(/no single blob-ahu/);
  });

  test("two large ahus → ambiguous-meme, canon untouched", () => {
    const meme = iamAhu("source-text", BIG) + iamAhu("appendix", BIG);
    const { text, kind } = tagMemeText(meme);
    expect(kind).toBe("ambiguous-meme");
    expect(text).toBe(meme);
  });

  test("a lone large ahu with NO iam fence → meme-no-iam, canon untouched", () => {
    const meme = smallAhu("meme-header") + bareAhu("source-text", BIG);
    const { text, kind } = tagMemeText(meme);
    expect(kind).toBe("meme-no-iam");
    expect(text).toBe(meme);
  });
});

describe("tagCarrier — the write shapes on disk", () => {
  test("a standalone large .txt gains a `.meta` sidecar (_lar_cas: yes + type)", () => {
    const dir = mkdtempSync(join(tmpdir(), "lr-tag-"));
    try {
      const file = join(dir, "book.txt");
      writeFileSync(file, HUGE);
      const out = tagCarrier({ file, text: HUGE, ext: ".txt" });
      expect(out.kind).toBe("meta-written");
      expect(out.wrote).toBe(true);
      const meta = readFileSync(file + ".meta", "utf8");
      expect(meta).toContain("_lar_cas: yes");
      expect(meta).toContain("type: text/plain");
      expect(carrierCasFlagged("", meta)).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("an image carrier writes an image/* media-type into its `.meta`", () => {
    const dir = mkdtempSync(join(tmpdir(), "lr-tag-"));
    try {
      const file = join(dir, "pic.png");
      const out = tagCarrier({ file, text: "AAAA", ext: ".png", binary: true });
      expect(out.wrote).toBe(true);
      expect(readFileSync(file + ".meta", "utf8")).toContain("type: image/png");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("an existing UNFLAGGED `.meta` reports rather than clobbering operator fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "lr-tag-"));
    try {
      const file = join(dir, "book.txt");
      writeFileSync(file + ".meta", "type: text/plain\ntitle: My Book\n");
      const out = tagCarrier({ file, text: HUGE, ext: ".txt" });
      expect(out.kind).toBe("meta-exists-unflagged");
      expect(out.wrote).toBe(false);
      // The operator's fields survive untouched.
      expect(readFileSync(file + ".meta", "utf8")).not.toContain("_lar_cas");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("tagBlobs — the batch over a mixed carrier set", () => {
  test("tags the would-fault carriers, reports the mind-bundle, skips the flagged + small", () => {
    const dir = mkdtempSync(join(tmpdir(), "lr-tag-"));
    try {
      // An OVERSIZED mind-bundle (>1 MiB total, every ahu small) — it faults at the
      // carrier gate, reaches the writer, and REPORTS rather than being force-tagged.
      let bundle = "";
      for (let i = 0; i < 600; i++) bundle += bareAhu(`ch-${i}`, "z".repeat(2 * 1024));
      const txt = join(dir, "big.txt");   writeFileSync(txt, HUGE);
      const carriers: TagCarrier[] = [
        { file: txt, text: HUGE, ext: ".txt" },                                    // (a) → .meta
        { file: join(dir, "one.mem"), text: smallAhu("h") + iamAhu("source-text", HUGE), ext: ".mem" }, // (b) → ahu
        { file: join(dir, "bundle.mem"), text: bundle, ext: ".mem" },              // (c) → mind-bundle REPORT
        { file: join(dir, "flagged.txt"), text: HUGE, ext: ".txt", meta: "_lar_cas: yes\n" }, // (d) → skipped by filter
        { file: join(dir, "small.txt"), text: "tiny", ext: ".txt" },               // skipped by filter
      ];
      const outcomes = tagBlobs(carriers);
      const kinds = outcomes.map((o) => o.kind).sort();
      // (a) + (b) write; (c) reports; (d) + (e) never survive the needs-tag filter.
      expect(kinds).toEqual(["ahu-tagged", "meta-written", "mind-bundle"]);
      expect(existsSync(txt + ".meta")).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
