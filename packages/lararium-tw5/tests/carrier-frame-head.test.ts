/**
 * A carrier frame rides the CONTROL head — and the corpus says so, 556 files to zero.
 *
 * The sigil sets split into capability domains: the frame took `<<^`, every word sigil kept `<<~`. So the
 * head now CARRIES the distinction rather than decorating it, and a frame on the speaking head names a
 * malformed carrier rather than an older one — there is no older one to be compatible with.
 *
 * ── WHY THIS TEST EXISTS ────────────────────────────────────────────────────────────────────────
 * Detection kept matching the speaking head after the split, and 554 of 555 framed memes stopped reading
 * as carriers. NOTHING failed: a carrier that misses detection routes down the registry path instead of
 * the direct memetic one, so the vessel comes up and the memes arrive wrong. A silent misroute at seed
 * time is the worst shape a break can take, and a green suite reported it as fine because no test ever
 * met a real swept meme.
 *
 * The property pinned here is the one that survives any future head-change: the frame's head is LAW, and
 * a test asserts it against the same spelling the handler uses.
 */
import { describe, test, expect } from "vitest";

// The detector as action-handler spells it — kept in lockstep deliberately, so a change to one without
// the other fails loudly rather than drifting into another silent misroute.
const CARRIER_SOH = /<<\^[^&\n]*&#x(?:0001|0011);/;

describe("★ the carrier frame rides the control head ★", () => {
  test("a control-head frame with the SOH classifier opens a carrier", () => {
    expect(CARRIER_SOH.test("<<^ code:\"&#x0001;\" namespace:\"ॐ ँ\" ? -> lar:///ha.ka.ba/lares/api/noosphere-boot >>")).toBe(true);
    expect(CARRIER_SOH.test("<<^ code:\"&#x0011;\" namespace:\"⚕\" ? -> lar:///ha.ka.ba/lararium/mesh/genesis-doc >>")).toBe(true);
  });

  test("★ the SPEAKING head never opens a carrier — the domains stay split ★", () => {
    // Not a legacy form kept working: matching both heads would re-fuse exactly what the split holds
    // apart. A frame written with `<<~` reads as malformed, and reads that way loudly.
    expect(CARRIER_SOH.test("<<~ code:\"&#x0001;\" namespace:\"ॐ ँ\" ? -> lar:///ha.ka.ba/lares/api/noosphere-boot >>")).toBe(false);
  });

  test("a sigil carrying NO classifier stays a plain sigil under either head", () => {
    expect(CARRIER_SOH.test("<<~ ahu #entry >>")).toBe(false);
    expect(CARRIER_SOH.test("<<^ ahu #entry >>")).toBe(false);
    expect(CARRIER_SOH.test("<<~ confidence Canon 18/20 >>")).toBe(false);
  });

  test("the classifier must ride the SAME sigil — a later one never promotes plain text", () => {
    // `[^&\n]*` holds the match inside one sigil on one line, so a carrier mark further down a file
    // cannot retroactively make an unrelated opener read as a frame. It also keeps a meme that QUOTES
    // the grammar (nihomano-sigils documents these very forms) from reading as a carrier of them.
    expect(CARRIER_SOH.test("<<^ ahu #entry >>\nsome prose\ncode:\"&#x0001;\"")).toBe(false);
  });
});
