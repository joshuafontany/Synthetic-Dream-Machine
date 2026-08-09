/**
 * discordian-date — the Erisian reckoning, computed rather than shelled out for.
 *
 * `ddate(1)` ships with util-linux on many machines and with none of them reliably; a vessel that asked an
 * external binary for a date it can compute would fail on the machines that lack it and drift on the ones
 * whose version differs. Five seasons of 73 days, five weekdays, and St. Tib's Day outside both — the whole
 * calendar fits in one function, so it lives here.
 *
 * ST. TIB'S DAY SITS OUTSIDE THE WEEK AND OUTSIDE THE SEASON. February 29th is neither a weekday nor a day
 * of Chaos: it is intercalary, and every day after it in a leap year keeps the ordinal it would have had in
 * a common year. That is the one rule an implementation usually gets wrong, and getting it wrong shifts
 * every date in ten months of a leap year by one.
 *
 * Canon: lar:///ha.ka.ba/lares/api/lares/noosphere-boot#law-of-5s
 */

/** The five seasons, in order. The Law of 5s, as a calendar. */
export const DISCORDIAN_SEASONS = [
  "Chaos", "Discord", "Confusion", "Bureaucracy", "The Aftermath",
] as const;

/** The five weekdays. */
export const DISCORDIAN_WEEKDAYS = [
  "Sweetmorn", "Boomtime", "Pungenday", "Prickle-Prickle", "Setting Orange",
] as const;

/** The offset from the Gregorian year to the Year Of Our Lady Discordia. */
export const YOLD_OFFSET = 1166;

/** A day in the Erisian reckoning. `stTibsDay` sits outside the week and the season both. */
export interface DiscordianDate {
  readonly yold:      number;
  readonly stTibsDay: boolean;
  /** Absent on St. Tib's Day — it belongs to no season. */
  readonly season?:   (typeof DISCORDIAN_SEASONS)[number];
  /** 1–73. Absent on St. Tib's Day. */
  readonly day?:      number;
  /** Absent on St. Tib's Day — it belongs to no weekday. */
  readonly weekday?:  (typeof DISCORDIAN_WEEKDAYS)[number];
}

const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** 1-based day of the year for a LOCAL calendar date. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const here  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((here.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * Read a date in the Erisian reckoning.
 *
 * It reads the LOCAL calendar day, matching `ddate(1)` — a vessel sealed in the evening carries the day its
 * operator was living in, not the day UTC had already turned to.
 */
export function discordianDate(when: Date = new Date()): DiscordianDate {
  const year = when.getFullYear();
  const yold = year + YOLD_OFFSET;
  const yday = dayOfYear(when);

  // St. Tib's Day: the 60th day of a leap year, belonging to no season and no week.
  if (isLeap(year) && yday === 60) return { yold, stTibsDay: true };

  // Every day AFTER St. Tib's keeps the ordinal it would carry in a common year — the rule an
  // implementation usually drops, and dropping it shifts ten months of every leap year by one.
  const ordinal = isLeap(year) && yday > 60 ? yday - 1 : yday;
  const zero    = ordinal - 1;

  return {
    yold,
    stTibsDay: false,
    season:  DISCORDIAN_SEASONS[Math.floor(zero / 73)]!,
    day:     (zero % 73) + 1,
    weekday: DISCORDIAN_WEEKDAYS[zero % 5]!,
  };
}

/** The ordinal suffix a human expects — 1st, 2nd, 3rd, 11th, 23rd, 73rd. */
function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return (["th", "st", "nd", "rd"] as const)[n % 10] ?? "th";
}

/**
 * Render the date exactly as `ddate(1)` speaks it, so an operator comparing the two sees one string.
 *
 *   "Setting Orange, the 1st day of Bureaucracy in the YOLD 3192"
 *   "St. Tib's Day, YOLD 3190"
 */
export function discordianDateString(d: DiscordianDate = discordianDate()): string {
  if (d.stTibsDay) return `St. Tib's Day, YOLD ${d.yold}`;
  return `${d.weekday}, the ${d.day}${ordinalSuffix(d.day!)} day of ${d.season} in the YOLD ${d.yold}`;
}

/**
 * The COMPACT form a passphrase composes with — stable, punctuation-free, and unambiguous.
 *
 * The prose form carries commas and an article; a value that rides a key-derivation wants neither, because a
 * single re-spelling of it would lock the operator out. `3192-Bureaucracy-01-SettingOrange` reads back the
 * same on every machine and every version, and a human can still say it aloud.
 */
export function discordianStamp(d: DiscordianDate = discordianDate()): string {
  if (d.stTibsDay) return `${d.yold}-StTibsDay`;
  return `${d.yold}-${d.season!.replace(/\s+/g, "")}-${String(d.day).padStart(2, "0")}-${d.weekday!.replace(/[\s-]+/g, "")}`;
}
