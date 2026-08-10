/**
 * What stands on a crossroads once every cry is folded.
 *
 * The starred tests carry the two authorities. A tombstone that could take down someone else's notice hands
 * every member a delete button over the board; a kāpae that a later cry could outlive makes a Gate a
 * request. Both fail silently — the board still reads, it just reads wrong.
 */
import { describe, expect, test } from "vitest";

import { standingNotices, subjectRefused, type CrossroadsCry } from "../src/crossroads-cry.js";

const notice = (cryId: string, subject: string, author: string): CrossroadsCry =>
  ({ kind: "notice", cryId, subject, author });
const tomb = (cryId: string, withdraws: string, author: string): CrossroadsCry =>
  ({ kind: "tombstone", cryId, withdraws, author });
const kapae = (cryId: string, subject: string): CrossroadsCry => ({ kind: "kapae", cryId, subject });

describe("the ordinary board", () => {
  test("a cry stands until something takes it down", () => {
    const stood = standingNotices([notice("c1", "twain/huck", "mara")]);
    expect(stood.map((n) => n.subject)).toEqual(["twain/huck"]);
  });

  test("an author's own tombstone takes their cry down — withdrawal is as public as posting", () => {
    expect(standingNotices([notice("c1", "x", "mara"), tomb("t1", "c1", "mara")])).toEqual([]);
  });
});

describe("★ two authorities, never blurred ★", () => {
  test("★ a tombstone over ANOTHER author's cry does nothing at all ★", () => {
    // Otherwise every member holds a delete button over the whole board, and the board still reads —
    // it just reads without whatever someone else decided to remove.
    const stood = standingNotices([notice("c1", "x", "mara"), tomb("t1", "c1", "kai")]);
    expect(stood.map((n) => n.cryId)).toEqual(["c1"]);
  });

  test("★ a Nexus kāpae outranks the author — the Gate governs the board ★", () => {
    expect(standingNotices([notice("c1", "x", "mara"), kapae("k1", "x")])).toEqual([]);
  });
});

describe("★ remove-wins, or a Gate is only a request ★", () => {
  test("★ a kāpae defeats a LATER cry on the same subject — re-pinning resurrects nothing ★", () => {
    // Two islands with no shared now cannot agree which act came first. If a later cry could outlive a
    // refusal, anyone refused at the Gate re-pins from a partition and stands again.
    const stood = standingNotices([kapae("k1", "x"), notice("c9", "x", "mara")]);
    expect(stood).toEqual([]);
  });

  test("the fold is order-independent — same cries, any order, one reading", () => {
    const cries = [notice("c1", "x", "mara"), kapae("k1", "x"), notice("c2", "y", "kai"), tomb("t1", "c2", "kai")];
    const a = standingNotices(cries).map((n) => n.cryId);
    const b = standingNotices([...cries].reverse()).map((n) => n.cryId);
    expect(a).toEqual(b);
    expect(a).toEqual([]);
  });

  test("a kāpae shadows the SUBJECT, not one cry — a second author crying it also stands refused", () => {
    const stood = standingNotices([kapae("k1", "x"), notice("c1", "x", "mara"), notice("c2", "x", "kai")]);
    expect(stood).toEqual([]);
  });

  test("refusal reads before crying, so a refused cry need not be wasted", () => {
    expect(subjectRefused([kapae("k1", "x")], "x")).toBe(true);
    expect(subjectRefused([kapae("k1", "x")], "y")).toBe(false);
  });
});

describe("nothing ever leaves the board", () => {
  test("a withdrawn cry stops STANDING without the record losing it", () => {
    // The board grows only. A reader who wants the history still has every cry; the fold reports what
    // stands now, which is a different question from what was ever said.
    const cries = [notice("c1", "x", "mara"), tomb("t1", "c1", "mara")];
    expect(standingNotices(cries)).toEqual([]);
    expect(cries).toHaveLength(2);
  });
});
