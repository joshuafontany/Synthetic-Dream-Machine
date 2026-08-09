/**
 * cert-expiry-gauge — how far through its life is a certificate, and when should someone hear about it?
 *
 * WHY THE MESH CARRIES ITS OWN WITNESS. A browser vessel mints its identity key only in a secure context,
 * so a household's glass depends on a live certificate; when that certificate expires, every phone in the
 * house stops booting its vessel at the same moment. And nothing outside this stack will say so first —
 * Let's Encrypt ended expiration notices in 2025 and deleted the stored subscriber addresses, so a renewal
 * that fails quietly produces no warning from anyone until a browser throws an interstitial at a family.
 * The mesh therefore watches its own certificates or nobody does.
 *
 * ── WHY A FRACTION AND NEVER A DAYS-REMAINING COUNT ──────────────────────────────────────────────
 * The industry's habit is "alert at 30 days left", which was sane while certificates lived 90 days and
 * becomes nonsense as they shorten: at a 45-day lifetime, thirty days remaining means the certificate was
 * issued two weeks ago. A threshold written in days silently turns into a permanent alarm the day validity
 * drops beneath it — the worst failure a monitor has, since a warning that always fires stops being read.
 *
 * So this gauge measures ELAPSED FRACTION of the certificate's own lifetime. That threshold survives a
 * validity change without anyone remembering to revisit it, which matters here because the ground moves
 * on a published schedule: default lifetimes step down, and both day-counts below step down with them —
 * to different places. A fraction reads the same at every step.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────────────────────────
 * No clock of its own and no I/O. `now` arrives as an argument, so a caller in a causal island supplies
 * the reading it actually holds rather than inheriting a global present, and every band below is a pure
 * function a test can pin exactly.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/nexus-topology#the-shrinking-window
 */

/** Fraction of lifetime elapsed at which a renewal SHOULD already have happened, so someone hears early. */
export const RENEW_ELAPSED = 0.667;

/** Fraction elapsed at which a healthy renewal is clearly overdue and a human wants telling. */
export const WARN_ELAPSED = 0.8;

/** Fraction elapsed at which the door is about to shut on every device at once. */
export const URGENT_ELAPSED = 0.9;

export type CertExpiryBand = "fresh" | "renew-due" | "warn" | "urgent" | "expired" | "unknown";

export interface CertLifetime {
  /** Start of validity, epoch milliseconds. */
  readonly notBefore: number;
  /** End of validity, epoch milliseconds. */
  readonly notAfter: number;
}

export interface CertExpiryReading {
  readonly band: CertExpiryBand;
  /** 0 at issuance, 1 at expiry; above 1 once expired. `null` when the lifetime reads incoherent. */
  readonly elapsed: number | null;
  /** Whole days until expiry — reported for a human, never used as the threshold. */
  readonly daysRemaining: number | null;
  /** A sentence naming what holds and what it costs, fit for a status line. */
  readonly reason: string;
}

const DAY_MS = 86_400_000;

/**
 * Read a certificate's position in its own life.
 *
 * A lifetime that ends before it begins, or spans nothing, reads `unknown` rather than dividing by zero and
 * reporting a confident wrong band — an instrument that answers on nonsense teaches a reader to trust it on
 * nonsense.
 */
export function readCertExpiry(cert: CertLifetime, now: number): CertExpiryReading {
  const span = cert.notAfter - cert.notBefore;
  if (!Number.isFinite(span) || span <= 0) {
    return {
      band: "unknown",
      elapsed: null,
      daysRemaining: null,
      reason: "the certificate's validity window reads incoherent — nothing can be said about its age",
    };
  }

  const elapsed = (now - cert.notBefore) / span;
  const daysRemaining = Math.floor((cert.notAfter - now) / DAY_MS);
  const lifetimeDays = Math.round(span / DAY_MS);

  if (elapsed >= 1) {
    return {
      band: "expired",
      elapsed,
      daysRemaining,
      reason:
        `the certificate expired ${Math.abs(daysRemaining)}d ago — every browser vessel under this name ` +
        `has lost its secure context and cannot mint a key`,
    };
  }
  if (elapsed >= URGENT_ELAPSED) {
    return {
      band: "urgent",
      elapsed,
      daysRemaining,
      reason:
        `${Math.round(elapsed * 100)}% through a ${lifetimeDays}d certificate, ${daysRemaining}d left — ` +
        `renewal has failed for a long while and the glass goes dark on expiry`,
    };
  }
  if (elapsed >= WARN_ELAPSED) {
    return {
      band: "warn",
      elapsed,
      daysRemaining,
      reason:
        `${Math.round(elapsed * 100)}% through a ${lifetimeDays}d certificate, ${daysRemaining}d left — ` +
        `renewal should have landed by now; check the issuance leg`,
    };
  }
  if (elapsed >= RENEW_ELAPSED) {
    return {
      band: "renew-due",
      elapsed,
      daysRemaining,
      reason: `${Math.round(elapsed * 100)}% through a ${lifetimeDays}d certificate — renewal is due about now`,
    };
  }
  return {
    band: "fresh",
    elapsed,
    daysRemaining,
    reason: `${Math.round(elapsed * 100)}% through a ${lifetimeDays}d certificate, ${daysRemaining}d left`,
  };
}

/** Does this reading want a human's attention? Everything from `warn` up, and `unknown` too. */
export function wantsAttention(reading: CertExpiryReading): boolean {
  return reading.band === "warn" || reading.band === "urgent" || reading.band === "expired"
    || reading.band === "unknown";
}

/**
 * TWO DIFFERENT DAY-COUNTS LIVE HERE, and conflating them costs a household its drill.
 *
 * Serving needs no network; only issuance does. That single fact yields two quantities, and a design note
 * that names one while meaning the other plans the wrong outage:
 *
 *   · the RENEWAL CADENCE — how often the internet must be reached at all. Renewing at two-thirds of a
 *     90-day certificate means touching the network every 60 days, and a household is fully offline in
 *     between. This is the figure that answers //how connected must we be//.
 *   · the GRACE WINDOW — how long after renewal SHOULD have happened before the door actually shuts. On
 *     that same certificate it runs 30 days. This is the figure that answers //how long do we have once
 *     the alarm sounds//, which is the one the witness above exists to protect.
 *
 * Both shrink as lifetimes shorten, and they shrink to different places. Reporting them separately keeps a
 * reader from budgeting a month of slack that was never there.
 */

/** Days between required internet contacts — the interval a household serves with no network at all. */
export function renewalCadenceDays(cert: CertLifetime): number | null {
  const span = cert.notAfter - cert.notBefore;
  if (!Number.isFinite(span) || span <= 0) return null;
  return Math.floor((span * RENEW_ELAPSED) / DAY_MS);
}

/** Days between a renewal falling due and the certificate expiring — the slack once the alarm sounds. */
export function graceWindowDays(cert: CertLifetime): number | null {
  const span = cert.notAfter - cert.notBefore;
  if (!Number.isFinite(span) || span <= 0) return null;
  return Math.floor((span * (1 - RENEW_ELAPSED)) / DAY_MS);
}
