/**
 * discordian-date — the Erisian reckoning, and the two rules an implementation usually drops.
 *
 * The parity case is measured against the live `ddate(1)` on 2026-08-08 local:
 *   "Setting Orange, the 1st day of Bureaucracy in the YOLD 3192"
 *
 * ST. TIB'S DAY is the interesting one. It sits outside the week AND outside the season, and every day
 * after it in a leap year keeps the ordinal it would carry in a common year. Getting that wrong shifts ten
 * months of every leap year by one — silently, and only every four years.
 */
import { describe, test, expect } from "vitest";
import {
  discordianDate, discordianDateString, discordianStamp,
  DISCORDIAN_SEASONS, DISCORDIAN_WEEKDAYS, YOLD_OFFSET,
} from "../src/discordian-date.js";

/** A LOCAL calendar date — the reckoning reads local, matching ddate. */
const on = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);

describe("★ parity with ddate(1) ★", () => {
  test("the measured case reads back byte-identical", () => {
    expect(discordianDateString(discordianDate(on(2026, 8, 8))))
      .toBe("Setting Orange, the 1st day of Bureaucracy in the YOLD 3192");
  });

  test("the YOLD offset and the two five-fold rings stand", () => {
    expect(YOLD_OFFSET).toBe(1166);
    expect(DISCORDIAN_SEASONS).toHaveLength(5);
    expect(DISCORDIAN_WEEKDAYS).toHaveLength(5);
    expect(discordianDate(on(2026, 1, 1))).toMatchObject({ yold: 3192, season: "Chaos", day: 1, weekday: "Sweetmorn" });
  });

  test("a season runs 73 days, and the fifth closes the year", () => {
    // Chaos runs Jan 1 → Mar 14 in a common year: 31 + 28 + 14 = 73, exactly.
    expect(discordianDate(on(2026, 3, 14))).toMatchObject({ season: "Chaos", day: 73 });
    expect(discordianDate(on(2026, 3, 15))).toMatchObject({ season: "Discord", day: 1 });
    expect(discordianDate(on(2026, 12, 31))).toMatchObject({ season: "The Aftermath", day: 73 });
  });
});

describe("★ St. Tib's Day — outside the week, outside the season ★", () => {
  test("Feb 29 belongs to neither, and says so", () => {
    const tib = discordianDate(on(2028, 2, 29));
    expect(tib).toEqual({ yold: 3194, stTibsDay: true });
    expect(tib.season).toBeUndefined();
    expect(tib.weekday).toBeUndefined();
    expect(discordianDateString(tib)).toBe("St. Tib's Day, YOLD 3194");
  });

  test("★ the day AFTER keeps its common-year ordinal — the rule that shifts ten months when dropped ★", () => {
    // 2028 is a leap year. Feb 28 is the 59th of Chaos; St. Tib's intervenes; Mar 1 is the 60th — NOT the 61st.
    expect(discordianDate(on(2028, 2, 28))).toMatchObject({ season: "Chaos", day: 59 });
    expect(discordianDate(on(2028, 3, 1))).toMatchObject({ season: "Chaos", day: 60 });
    // …and the common year beside it agrees, which is the whole point of the rule.
    expect(discordianDate(on(2026, 3, 1)).day).toBe(discordianDate(on(2028, 3, 1)).day);
  });

  test("the century rule holds — 1900 was no leap year, 2000 was", () => {
    expect(discordianDate(on(2000, 2, 29)).stTibsDay).toBe(true);
    expect(discordianDate(on(1900, 3, 1))).toMatchObject({ season: "Chaos", day: 60 });
  });
});

describe("the compact stamp — what a passphrase may safely compose with", () => {
  test("★ it carries NO whitespace and NO punctuation a re-spelling could vary ★", () => {
    // A value riding a key-derivation must read back identically on every machine: one stray space or a
    // dropped hyphen locks the operator out of their own vault.
    for (const d of [on(2026, 8, 8), on(2026, 1, 4), on(2028, 2, 29), on(2026, 12, 31)]) {
      const stamp = discordianStamp(discordianDate(d));
      expect(stamp, stamp).toMatch(/^[0-9A-Za-z-]+$/);
      expect(stamp).not.toContain(" ");
    }
  });

  test("the two-word weekday and the two-word season both fold", () => {
    expect(discordianStamp(discordianDate(on(2026, 8, 8)))).toBe("3192-Bureaucracy-01-SettingOrange");
    expect(discordianStamp(discordianDate(on(2026, 1, 4)))).toBe("3192-Chaos-04-PricklePrickle");
    expect(discordianStamp(discordianDate(on(2028, 2, 29)))).toBe("3194-StTibsDay");
  });

  test("★ the stamp is STABLE for a day — the property a sealed vault depends on ★", () => {
    // Two reads of the same calendar day must agree, or a vault sealed at dusk refuses at dawn.
    const morning = discordianStamp(discordianDate(new Date(2026, 7, 8, 6, 0, 0)));
    const night   = discordianStamp(discordianDate(new Date(2026, 7, 8, 23, 59, 59)));
    expect(morning).toBe(night);
  });
});
