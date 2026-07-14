/**
 * vocabulary-cid — the vocabulary names ONE cid per effective grammar state.
 *
 * The cid keys downstream MemeAst projections (ground-cid, carrier-version,
 * vocabulary-cid, schema); these tests hold its three load-bearing laws:
 * order-independence, semantic sensitivity, and determinism.
 */
import { describe, expect, test } from "vitest";
import { vocabularyCidOf } from "../src/grammar-cache.js";
import type { GrammarRules, SigilRule, FamilyRule } from "../src/meme-ast/types.js";

const sigil = (name: string, extra: Partial<SigilRule> = {}): SigilRule =>
  ({ name, kind: "worksite", ...extra });
const family = (name: string): FamilyRule =>
  ({ name, dagRequired: false, roleRecommended: false, confidenceBounded: false });

const rules = (sigils: SigilRule[], families: FamilyRule[] = []): GrammarRules =>
  ({ sigils, families });

describe("vocabularyCidOf", () => {
  test("the same vocabulary names the same cid regardless of arrival order", () => {
    const a = vocabularyCidOf(rules([sigil("ahu"), sigil("ranks")], [family("hud")]));
    const b = vocabularyCidOf(rules([sigil("ranks"), sigil("ahu")], [family("hud")]));
    expect(a).toBe(b);
  });

  test("a semantic field moves the cid", () => {
    const base = vocabularyCidOf(rules([sigil("ahu")]));
    const patterned = vocabularyCidOf(rules([sigil("ahu", { pattern: "\\S+" })]));
    expect(patterned).not.toBe(base);
  });

  test("adding one sigil moves the cid; removing it restores it", () => {
    const one = vocabularyCidOf(rules([sigil("ahu")]));
    const two = vocabularyCidOf(rules([sigil("ahu"), sigil("mu")]));
    expect(two).not.toBe(one);
    expect(vocabularyCidOf(rules([sigil("ahu")]))).toBe(one);
  });

  test("the cid reads as 64 hex chars (sha256)", () => {
    expect(vocabularyCidOf(rules([sigil("ahu")]))).toMatch(/^[0-9a-f]{64}$/);
  });
});
