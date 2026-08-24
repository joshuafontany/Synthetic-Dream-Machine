/**
 * A MIRROR MATCHER MUST ANSWER THE URIs THE MINTERS PRODUCE.
 *
 * These two projections took a prefix that no minted URI could ever carry, so both answered `null` for
 * every input — and `null` is also the honest answer for "this URI names no mirror". A wrong matcher and
 * an absent mirror are indistinguishable from the outside, which is why nothing noticed: the functions
 * have no caller yet, and the shore they publish would have handed its first caller silence.
 *
 * So the claim under test is REACHABILITY, not formatting: feed each matcher a URI built by the repo's own
 * minter and require a non-null answer. A prefix that drifts from the minter fails here loudly.
 */

import { describe, test, expect } from "vitest";
import { laresMirrorRelPath, engineMirrorRelPath } from "../src/mirror-paths.js";
import { LARES_DOC_URI, LARARIUM_DOC_URI } from "../src/lar-uris.js";

describe("the mirror matchers answer minted URIs", () => {
  test("★ the lares projection reaches a URI its own minter produced ★", () => {
    const uri = `${LARES_DOC_URI}/docs/pono/meme.mem`;
    // REACHABILITY IS THE CLAIM. The exact tail formatting is a separate contract this file does not
    // establish, and asserting it here would bind the matcher to a shape nobody has ruled on.
    expect(laresMirrorRelPath(uri)).not.toBeNull();
    expect(laresMirrorRelPath(uri)).toContain("docs/pono/meme");
  });

  test("★ the engine projection reaches a URI its own minter produced ★", () => {
    const uri = `${LARARIUM_DOC_URI}/mesh/base-doc.mem`;
    expect(engineMirrorRelPath(uri)).not.toBeNull();
    expect(engineMirrorRelPath(uri)).toContain("mesh/base-doc");
  });

  test("a URI of the OTHER plane still answers null — the matcher stays specific", () => {
    // The reachability claim must not be bought by matching everything.
    expect(laresMirrorRelPath(`${LARARIUM_DOC_URI}/mesh/base-doc.mem`)).toBeNull();
    expect(engineMirrorRelPath(`${LARES_DOC_URI}/docs/pono/meme.mem`)).toBeNull();
  });

  test("a non-lar string answers null rather than throwing", () => {
    expect(laresMirrorRelPath("bags/lares/x.mem")).toBeNull();
    expect(engineMirrorRelPath("")).toBeNull();
  });
});
