/**
 * A carrier identifies by its SOH CLASSIFIER, never by which head carries it.
 *
 * The sigil sets split into capability domains: the frame sigils took the control head `<<^` while every
 * word sigil kept the speaking head `<<~`. Carrier detection still matched the speaking head alone, so
 * 554 of the corpus's 555 framed memes stopped reading as carriers — and nothing failed, because the
 * misroute sends them down the registry path instead of the direct memetic one. A silent misroute at
 * seed time is the worst shape a break can take: the vessel comes up, and the memes arrive wrong.
 *
 * Nothing tested detection against a real swept meme, which is why a corpus-wide break passed a green
 * suite. This asserts the property that outlives any future head: the classifier decides.
 */
import { describe, test, expect } from "vitest";

// The detector as action-handler spells it — kept in lockstep here deliberately, so a change to one
// without the other fails loudly rather than drifting into another silent misroute.
const CARRIER_SOH = /<<[~^][^&\n]*&#x(?:0001|0011);/;

describe("★ carrier detection reads the classifier, not the head ★", () => {
  test("both heads open a carrier when the SOH classifier follows", () => {
    expect(CARRIER_SOH.test("<<^ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/lararium/api/action-handler >>")).toBe(true);
    expect(CARRIER_SOH.test("<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/lares/api/noosphere-boot >>")).toBe(true);
    expect(CARRIER_SOH.test("<<^ ⚕&#x0011; ? -> lar:///ha.ka.ba/lararium/mesh/genesis-doc >>")).toBe(true);
  });

  test("a sigil carrying NO classifier stays a plain sigil under either head", () => {
    expect(CARRIER_SOH.test("<<~ ahu #entry >>")).toBe(false);
    expect(CARRIER_SOH.test("<<^ ahu #entry >>")).toBe(false);
    expect(CARRIER_SOH.test("<<~ confidence Canon 18/20 >>")).toBe(false);
  });

  test("the classifier must ride the SAME sigil — a later one never promotes plain text", () => {
    // `[^&\n]*` holds the match inside one sigil on one line, so a carrier mark further down the file
    // cannot retroactively make an unrelated opener read as a carrier head.
    expect(CARRIER_SOH.test("<<~ ahu #entry >>\nsome prose\n&#x0001;")).toBe(false);
  });
});
