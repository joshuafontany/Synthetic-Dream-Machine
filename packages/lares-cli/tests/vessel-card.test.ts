/**
 * vessel card — the handoff artifact, finally reachable by the hand that has to hand it over.
 *
 * ── WHAT THIS DOOR IS FOR ───────────────────────────────────────────────────────────────────────
 * A second operator cannot enter a relation with this vessel until she holds its ContactCard: the
 * self-certifying peer identifier `receiveContactCard` consumes, and the artifact the two-human
 * crossing runs on. Every founding already mints one and writes it to the identity home at 0600.
 *
 * Nothing read it back out. `vessel read` does not show it, and `receiveContactCard` is reachable
 * only inside the daemon's auth gate — so the artifact existed on disk, in the operator's own house,
 * with no door that would hand it to them.
 *
 * ── PUBLIC BY DESIGN, PRIVATE BY SITING ─────────────────────────────────────────────────────────
 * The card carries prekeys and a signature — public material, self-authenticating, meant to cross a
 * channel that needs INTEGRITY and not confidentiality. It sits at 0600 because it lives in the
 * identity home beside things that are secret, never because the card is one. A door that printed a
 * secret would be a different kind of mistake, so this test pins what the card must NOT contain.
 */
import { describe, it, expect } from "vitest";
import { cardHandoff } from "../src/commands/vessel-card.js";

describe("vessel card — the artifact, and what it must never carry", () => {
  it("★ an absent card names the rite that mints one ★", () => {
    const r = cardHandoff(null, "/nowhere/.vessel-card.json");
    expect(r.ok).toBe(false);
    expect(r.why).toMatch(/vessel found|rite founding/);
  });

  it("★ a card hands over whole, and says it may cross an open channel ★", () => {
    const card = JSON.stringify({ Rotate: { payload: { old: [1, 2], new: [3, 4] }, issuer: [5, 6] } });
    const r = cardHandoff(card, "/x/.vessel-card.json");
    expect(r.ok).toBe(true);
    expect(r.card).toBe(card);
    // A person handing this over needs to know which channel is safe. Integrity, not secrecy.
    expect(r.why).toMatch(/integrity|tamper|substitut/i);
  });

  it("★ a card carrying a PRIVATE key refuses rather than printing it ★", () => {
    // The card is public material by design. If a future keyhive shape ever folded a secret in, this
    // door must not be the thing that leaks it — so the refusal is structural, not a comment.
    for (const key of ["signingKey", "secret", "privateKey", "seed"]) {
      const bad = JSON.stringify({ Rotate: { payload: {} }, [key]: [1, 2, 3] });
      const r = cardHandoff(bad, "/x/.vessel-card.json");
      expect(r.ok).toBe(false);
      expect(r.why).toMatch(/private|secret|refus/i);
    }
  });

  it("★ unreadable bytes refuse — a card nobody can parse is not a card ★", () => {
    expect(cardHandoff("{ not json", "/x/c.json").ok).toBe(false);
  });

  it("the path rides back, because a person may prefer to send the file", () => {
    const r = cardHandoff(JSON.stringify({ Rotate: {} }), "/home/x/.vessel-card.json");
    expect(r.path).toBe("/home/x/.vessel-card.json");
  });
});
