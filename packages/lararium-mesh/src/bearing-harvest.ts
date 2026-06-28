/**
 * bearing-harvest — harvest the lar: bearing-vector a turn carried.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/bearing-harvest
 *
 * A live agent↔operator turn opens with `<<~ lares aim <left> -> <right> >>`
 * and closes with `<<~ lares yield <left> -> ? >>`. The `<left>`/`<right>` are
 * `lar:` URIs naming the turn's bearing. This module scans a verbatim message
 * for those sigils and returns a {@link Bearing}.
 *
 * Pure + isomorphic: text in, Bearing out — no I/O, no store, no sidecar. The
 * read leg (mempalace sidecar) and the write leg (composite.put / LOAD) live
 * elsewhere; this is the membrane-crossing parse, and it runs in node or
 * browser alike.
 *
 * Three laws, all load-bearing:
 *  - Graceful degradation: a dropped frame or a drifted (two-/four-term) URI
 *    yields a low-confidence Bearing, never a throw. `harvest` returns null only
 *    when no frame appears at all — that absence is itself signal downstream.
 *  - Verbatim, never normalized: URIs come back exactly as written.
 *    Canonicalization happens only later, at promotion to canon.
 *  - Drift is the keeper's gauge: confidence grades DOWN as the frame drifts,
 *    so the operator can read the node's drift over time. The node cannot read
 *    its own.
 */

export interface Bearing {
  /** Raw aim payload (everything between `aim` and `>>`), or null if no aim frame. */
  aimUri: string | null;
  /** Raw yield payload, or null if no yield frame. */
  yieldUri: string | null;
  /** 0..20 (the house Maybe-Logic continuum), low = drifted. Grades DOWN; a clean frame reads canon-high, a drifted one falls to provisional. */
  confidence: number;
  /** e.g. ["arity:2"], ["session-form"], ["frame:no-yield"], ["root:unparsed"]. */
  driftFlags: string[];
}

/**
 * Confidence bands on the 0..20 Maybe-Logic continuum (low = drifted). The bands
 * land on the house register ladder: clean → canon (17-20), the drift grades →
 * provisional-synthesis / provisional (1-8). Tunable; thresholds deferred to in-flight tuning.
 */
export const BEARING_CONFIDENCE = {
  clean: 18, // both frames, primary root is 3-term → canon band
  arityDrift: 8, // a root broke the 3-term arity law → provisional-synthesis
  partialFrame: 6, // only one of aim/yield present → provisional-synthesis
  rootUnparsed: 4, // a frame, but no parseable lar: URI inside → provisional
} as const;

const AIM_RE = /<<~\s*lares\s+aim\s+([\s\S]*?)>>/i;
const YIELD_RE = /<<~\s*lares\s+yield\s+([\s\S]*?)>>/i;
const LAR_URI_RE = /lar:\/\/\S+/;

export function isDrifted(b: Bearing): boolean {
  return b.confidence < BEARING_CONFIDENCE.clean;
}

/**
 * Read `(root, sessionForm)` from one `lar:` URI. The root is the three-term
 * `w1.w2.w3` heading: the first path segment for the local form
 * `lar:///root/path`, or the first segment after the authority for the session
 * form `lar://alias@host/root/path`. Returns `{ root: null }` when unreadable;
 * never throws.
 */
function splitRoot(uri: string): { root: string | null; sessionForm: boolean } {
  const idx = uri.indexOf("://");
  if (idx === -1) return { root: null, sessionForm: false };
  const afterScheme = uri.slice(idx + 3).replace(/>+$/, "").trim();
  const stripped = afterScheme.replace(/^\/+/, ""); // local form `lar:///` leaves a leading slash
  if (!stripped) return { root: null, sessionForm: false };

  const firstSlash = stripped.indexOf("/");
  const head = firstSlash === -1 ? stripped : stripped.slice(0, firstSlash);
  const sessionForm = head.includes("@");

  let root: string;
  if (sessionForm) {
    const rest = firstSlash === -1 ? "" : stripped.slice(firstSlash + 1);
    root = rest.split("/")[0] ?? "";
  } else {
    root = head;
  }
  return { root: root || null, sessionForm };
}

function primaryUri(payload: string | null): string | null {
  if (!payload) return null;
  const m = LAR_URI_RE.exec(payload);
  if (!m) return null;
  return m[0].replace(/>+$/, "").trim();
}

/**
 * Scan a verbatim message for its lares aim/yield frame. Returns a {@link Bearing},
 * or null when the message carries no frame at all (an unframed turn — its
 * silence is recorded downstream as a gap, never a fabricated bearing).
 */
export function harvest(text: string): Bearing | null {
  if (!text) return null;

  const aimM = AIM_RE.exec(text);
  const yieldM = YIELD_RE.exec(text);
  if (!aimM && !yieldM) return null;

  const aimUri = aimM ? (aimM[1] ?? "").trim() : null;
  const yieldUri = yieldM ? (yieldM[1] ?? "").trim() : null;

  const driftFlags: string[] = [];
  let confidence: number = BEARING_CONFIDENCE.clean;

  if (!aimM) {
    driftFlags.push("frame:no-aim");
    confidence = Math.min(confidence, BEARING_CONFIDENCE.partialFrame);
  }
  if (!yieldM) {
    driftFlags.push("frame:no-yield");
    confidence = Math.min(confidence, BEARING_CONFIDENCE.partialFrame);
  }

  const probe = primaryUri(aimUri) ?? primaryUri(yieldUri);
  if (probe === null) {
    driftFlags.push("root:unparsed");
    confidence = Math.min(confidence, BEARING_CONFIDENCE.rootUnparsed);
  } else {
    const { root, sessionForm } = splitRoot(probe);
    if (sessionForm) driftFlags.push("session-form");
    if (root === null) {
      driftFlags.push("root:unparsed");
      confidence = Math.min(confidence, BEARING_CONFIDENCE.rootUnparsed);
    } else {
      const arity = root.split(".").length;
      if (arity !== 3) {
        driftFlags.push(`arity:${arity}`);
        confidence = Math.min(confidence, BEARING_CONFIDENCE.arityDrift);
      }
    }
  }

  return { aimUri, yieldUri, confidence, driftFlags };
}
