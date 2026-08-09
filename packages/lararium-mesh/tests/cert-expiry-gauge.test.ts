/**
 * The certificate gauge measures a FRACTION, and that is the whole point.
 *
 * The load-bearing test below is the last one: a threshold written in days-remaining turns into a permanent
 * alarm the moment certificate lifetimes drop beneath it, and lifetimes are dropping on a published
 * schedule. A monitor that always fires stops being read, which is a worse failure than no monitor — so the
 * suite pins the fraction against the day-count on the exact lifetimes the field is heading toward.
 */
import { describe, expect, test } from "vitest";

import {
  readCertExpiry, wantsAttention, offlineServingDays,
  RENEW_ELAPSED, WARN_ELAPSED, URGENT_ELAPSED,
} from "../src/cert-expiry-gauge.js";

const DAY = 86_400_000;
const T0 = 1_760_000_000_000;   // a fixed instant — no clock rides these tests

const lifetime = (days: number) => ({ notBefore: T0, notAfter: T0 + days * DAY });
const at = (days: number, pct: number) => T0 + days * DAY * pct;

describe("the bands read a position in the certificate's own life", () => {
  const cert = lifetime(90);

  test("fresh at the start", () => {
    const r = readCertExpiry(cert, at(90, 0.1));
    expect(r.band).toBe("fresh");
    expect(r.elapsed).toBeCloseTo(0.1, 5);
    expect(wantsAttention(r)).toBe(false);
  });

  test("renew-due at two thirds — early enough to act, quiet enough to ignore once", () => {
    expect(readCertExpiry(cert, at(90, RENEW_ELAPSED + 0.01)).band).toBe("renew-due");
    expect(wantsAttention(readCertExpiry(cert, at(90, RENEW_ELAPSED + 0.01)))).toBe(false);
  });

  test("warn at four fifths — renewal should have landed", () => {
    const r = readCertExpiry(cert, at(90, WARN_ELAPSED + 0.01));
    expect(r.band).toBe("warn");
    expect(wantsAttention(r)).toBe(true);
    expect(r.reason).toMatch(/issuance leg/);
  });

  test("urgent at nine tenths", () => {
    expect(readCertExpiry(cert, at(90, URGENT_ELAPSED + 0.01)).band).toBe("urgent");
  });

  test("expired past the end, and says what it costs a household", () => {
    const r = readCertExpiry(cert, T0 + 95 * DAY);
    expect(r.band).toBe("expired");
    expect(r.daysRemaining).toBe(-5);
    expect(r.reason).toMatch(/cannot mint a key/);
  });
});

describe("a nonsense lifetime reads unknown rather than confident", () => {
  test("an end before its beginning", () => {
    const r = readCertExpiry({ notBefore: T0, notAfter: T0 - DAY }, T0);
    expect(r.band).toBe("unknown");
    expect(r.elapsed).toBeNull();
    // Unknown WANTS attention: a monitor that cannot read its subject is a monitor that is not watching.
    expect(wantsAttention(r)).toBe(true);
  });

  test("a zero-width window divides by nothing", () => {
    expect(readCertExpiry({ notBefore: T0, notAfter: T0 }, T0).band).toBe("unknown");
  });
});

describe("THE REASON THE THRESHOLD IS A FRACTION", () => {
  // Certificate lifetimes step down on a published schedule; a day-count threshold does not survive it.
  const LIFETIMES = [90, 64, 45];
  const LEGACY_DAYS_THRESHOLD = 30;

  test("the SAME 30-day threshold means a different thing at every lifetime", () => {
    // Where in a certificate's life does "30 days remaining" land? The answer moves with the lifetime,
    // which is the whole defect: one number, three meanings, and nobody edits it when validity steps down.
    const firesAt = (days: number) => (days - LEGACY_DAYS_THRESHOLD) / days;
    expect(firesAt(90)).toBeCloseTo(0.667, 2);   // sane — lands right on renew-due
    expect(firesAt(64)).toBeCloseTo(0.531, 2);   // early
    expect(firesAt(45)).toBeCloseTo(0.333, 2);   // a THIRD of the way into a fresh certificate

    // At that same instant on a 45-day certificate the fraction still reads fresh, and stays quiet.
    const fresh = readCertExpiry(lifetime(45), at(45, firesAt(45)));
    expect(fresh.band).toBe("fresh");
    expect(fresh.daysRemaining).toBe(LEGACY_DAYS_THRESHOLD);
    expect(wantsAttention(fresh)).toBe(false);
  });

  test("the fraction stays quiet early and speaks late at EVERY lifetime, unchanged", () => {
    for (const days of LIFETIMES) {
      const cert = lifetime(days);
      expect(readCertExpiry(cert, at(days, 0.1)).band, `${days}d fresh`).toBe("fresh");
      expect(readCertExpiry(cert, at(days, 0.85)).band, `${days}d warn`).toBe("warn");
      expect(readCertExpiry(cert, at(days, 0.95)).band, `${days}d urgent`).toBe("urgent");
    }
  });
});

describe("the offline-serving budget shrinks with the lifetime, and says so", () => {
  test("the window between renewal falling due and the door shutting", () => {
    // Serving needs no internet; only issuance does. These are the budgets a household actually keeps.
    expect(offlineServingDays(lifetime(90))).toBe(29);
    expect(offlineServingDays(lifetime(64))).toBe(21);
    expect(offlineServingDays(lifetime(45))).toBe(14);
  });

  test("a nonsense lifetime budgets nothing", () => {
    expect(offlineServingDays({ notBefore: T0, notAfter: T0 })).toBeNull();
  });
});
