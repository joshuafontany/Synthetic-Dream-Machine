/**
 * discordian-reader — read the Erisian date from `ddate(1)` where it stands, and compute it where it does not.
 *
 * THE OPERATOR PREFERS THE REAL DDATE (ruling, 2026-08-08), and it earns the preference: the util-linux
 * binary carries formats the calendar alone does not — holyday names (`%N`), the Erisian exclamations (`%.`),
 * days until X-Day (`%X`), and the whole `%{…%}` shape. A vessel that reimplemented all of that would be
 * reimplementing a program that already ships.
 *
 * ── BUT THE PASSPHRASE STAMP NEVER READS IT, AND HERE IS THE MEASUREMENT ─────────────────────────
 * `ddate`'s own output shape varies by invocation. Measured on one machine, one binary, one day:
 *
 *     ddate            → "Today is Setting Orange, the 1st day of Bureaucracy in the YOLD 3192"
 *     ddate 1 3 2028   → "Setting Orange, Chaos 60, 3194 YOLD"
 *
 * Two shapes from one program. A value that rides a key-derivation cannot depend on that: an operator who
 * sealed under one shape and unsealed under another would be locked out of their own vault by a formatting
 * difference. So the STAMP always comes from the computed calendar (`discordianStamp`) — deterministic,
 * version-proof, and byte-stable — while the PROSE prefers `ddate`, because prose is for reading.
 *
 * ── THE PARITY CHECK EARNS ITS KEEP ─────────────────────────────────────────────────────────────
 * Where both stand, the reading compares them. Agreement is worth nothing to assert and disagreement is
 * worth everything to surface: it names either a `ddate` this code has not met, or a leap-year rule this
 * code got wrong — and the second is the one that hides for four years at a time.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/noosphere-boot#law-of-5s
 */

import { execFileSync } from "node:child_process";
import { discordianDate, discordianDateString, discordianStamp } from "@lararium/mesh";

/** Where the prose came from. A caller reporting a date should say which. */
export type DiscordianSource = "ddate" | "computed";

export interface DiscordianReading {
  /** The human-facing form. From `ddate` where it stands, else the computed prose. */
  readonly prose:  string;
  readonly source: DiscordianSource;
  /** ALWAYS computed — deterministic and version-proof. The only form a key-derivation may touch. */
  readonly stamp:  string;
  /**
   * Did `ddate` and the computed calendar agree on the terse reading? `undefined` when `ddate` is absent.
   * FALSE names a real finding — a foreign `ddate`, or a leap-year rule this code has wrong.
   */
  readonly agrees?: boolean;
}

/**
 * Run `ddate`, or return null when it does not stand / does not answer.
 *
 * `format` rides as `+<format>`; `when` becomes the binary's positional `day month year`. Absent both, it
 * reads today in its own default shape. A missing binary, a non-zero exit, or a throw all read as null —
 * a vessel never fails because an optional ornament is not installed.
 */
export function readDdate(format?: string, when?: Date): string | null {
  const args: string[] = [];
  if (format) args.push(`+${format}`);
  if (when) args.push(String(when.getDate()), String(when.getMonth() + 1), String(when.getFullYear()));
  try {
    const out = execFileSync("ddate", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2_000 });
    const line = out.trim();
    // ddate answers an out-of-range date on stdout rather than by exiting non-zero, so the refusal
    // reads as text and would otherwise sail through as a date.
    return line.length > 0 && !/invalid date/i.test(line) ? line : null;
  } catch { return null; }
}

/** Does `ddate` stand on this machine? */
export function ddateAvailable(): boolean {
  return readDdate("%Y") !== null;
}

/**
 * Read the day: `ddate`'s prose where it stands, the computed stamp always, and a parity verdict where both.
 *
 * The two are compared on a FORMAT THIS CODE PINS (`%A, %B %d, %Y YOLD`) rather than on either default,
 * because the defaults differ by invocation and a comparison of two moving shapes measures nothing.
 */
export function discordianReading(when: Date = new Date()): DiscordianReading {
  const d       = discordianDate(when);
  const stamp   = discordianStamp(d);
  const fromBin = readDdate(undefined, when);

  if (fromBin === null) return { prose: discordianDateString(d), source: "computed", stamp };

  // The pinned comparison. St. Tib's Day carries no weekday or season, so it compares on its own shape.
  const pinned = readDdate("%A, %B %d, %Y YOLD", when);
  const ours   = d.stTibsDay ? null : `${d.weekday}, ${d.season} ${d.day}, ${d.yold} YOLD`;
  const agrees = d.stTibsDay ? /tib/i.test(fromBin) : pinned !== null && pinned === ours;

  return { prose: fromBin, source: "ddate", stamp, agrees };
}
