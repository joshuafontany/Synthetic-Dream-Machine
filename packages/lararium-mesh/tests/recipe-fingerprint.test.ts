import { describe, expect, test } from "vitest";
import { computeRecipeFingerprint, type RecipeFingerprintInput } from "../src/wiki-recipe.js";
import { canonicalJsonBytes, defaultCryptoProvider, sha256Hex } from "../src/crypto.js";

const WIKI_A = "automerge:abc123";
const WIKI_B = "automerge:def456";
const CANON_X = "automerge:canon-x";
const CANON_Y = "automerge:canon-y";
const CANON_Z = "automerge:canon-z";

describe("computeRecipeFingerprint", () => {
  test("produces a 64-char lowercase hex digest", async () => {
    const fp = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [] });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  test("deterministic — same input produces same digest across calls", async () => {
    const input: RecipeFingerprintInput = {
      wikiDocId:      WIKI_A,
      libraryBagDocIds: [CANON_X, CANON_Y],
    };
    const fp1 = await computeRecipeFingerprint(input);
    const fp2 = await computeRecipeFingerprint(input);
    expect(fp1).toBe(fp2);
  });

  test("sort-stable — libraryBagDocIds input order does NOT affect digest", async () => {
    const ordered  = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_X, CANON_Y, CANON_Z] });
    const reversed = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_Z, CANON_Y, CANON_X] });
    const shuffled = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_Y, CANON_X, CANON_Z] });
    expect(ordered).toBe(reversed);
    expect(ordered).toBe(shuffled);
  });

  test("different wikiDocId → different fingerprint", async () => {
    const fpA = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_X] });
    const fpB = await computeRecipeFingerprint({ wikiDocId: WIKI_B, libraryBagDocIds: [CANON_X] });
    expect(fpA).not.toBe(fpB);
  });

  test("different canon set → different fingerprint", async () => {
    const fpEmpty = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [] });
    const fpOne   = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_X] });
    const fpTwo   = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_X, CANON_Y] });
    expect(new Set([fpEmpty, fpOne, fpTwo]).size).toBe(3);
  });

  test("empty canon bags → valid digest (no exception)", async () => {
    const fp = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [] });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  test("documented encoding — SHA-256 over canonicalJson with the FROZEN v1 wire key canonBagDocIds", async () => {
    const input: RecipeFingerprintInput = {
      wikiDocId:      WIKI_A,
      libraryBagDocIds: [CANON_Y, CANON_X],
    };
    const fp       = await computeRecipeFingerprint(input);
    // The API field renamed to libraryBagDocIds; the hashed JSON key stays
    // canonBagDocIds so stored @personal bindings never silently re-key.
    const expected = await sha256Hex(
      canonicalJsonBytes({
        wikiDocId:      WIKI_A,
        canonBagDocIds: [CANON_X, CANON_Y],
      }),
      defaultCryptoProvider,
    );
    expect(fp).toBe(expected);
  });

  test("caller mutation of input array after call does not affect future calls", async () => {
    const libraryBagDocIds = [CANON_X, CANON_Y];
    const fp1 = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds });
    libraryBagDocIds.push(CANON_Z);
    const fp2 = await computeRecipeFingerprint({ wikiDocId: WIKI_A, libraryBagDocIds: [CANON_X, CANON_Y] });
    expect(fp1).toBe(fp2);
  });
});
