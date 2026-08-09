/**
 * bearing-ast — the lar: URI bearing-vector AST (the form-layer's RED parser).
 * Meme: lar:///ha.ka.ba/lares/api/noosphere-boot#lar-uri
 *
 * The aim/yield `lar://` URI rides the classifier channel — it STEERS (the red),
 * it is not prose (the black). bearing-harvest (mesh) holds it OPAQUE: it reads
 * only the head + a session-form boolean and collapses the rest. This module is
 * OUR-OWN LICENSED parser (Tennison: opaque ≠ unreadable — a `lar:`-aware agent
 * MAY parse the slots; only a foreign agent must treat it as an opaque name).
 * It descends the URI into a queryable bearing-vector AST.
 *
 * Four research shores shape it:
 *  - Tennison (opaque ≠ unreadable) — the licence to parse our own scheme's slots.
 *  - Ranganathan PMEST — the 3 root-terms are a FIXED-ORDER facet notation; each
 *    (w1/heading · w2/angle · w3/dynamic) is its own queryable axis.
 *  - GF abstract/concrete — the URI is ONE linearization of a bearing-vector term;
 *    parse → AST → {@link linearizeBearing} round-trips back to the canonical string.
 *  - Ranta embedded-CNL — recognize the WHOLE host language, GRADE conformance,
 *    NEVER reject (the house graceful-parsing stance): any root parses; a
 *    non-3-term root grades DOWN, it never throws.
 *
 * PURE + ISOMORPHIC: string in, AST out — no fs/path/DOM/node imports, no store.
 * It runs in node, the browser, and the @daemon sovereign-island TW5 worker VM
 * alike (the same guarantee constructicon-basis + move-skeleton carry). The
 * @daemon VM is where the form-capture runs; this parser rides inside it.
 *
 * The 5 URI chunks (noosphere-boot#lar-uri):
 *   scheme · authority(session-only: alias:grant@host) · root(w1.w2.w3) ·
 *   path(0–4 segments) · #fragment
 */

// ---------------------------------------------------------------------------
// The AST shapes
// ---------------------------------------------------------------------------

/** The session-form authority `alias:grant@host` — present only on a live exchange URI. */
export interface BearingAuthority {
  readonly alias: string;
  /** the grant token after `:`, or null for the `alias@host` short session form. */
  readonly grant: string | null;
  readonly host: string;
}

/**
 * The three-term root `w1.w2.w3` (heading.angle.dynamic) — the PMEST facet
 * notation. `w1`/`w2`/`w3` carry the first three terms (null when absent);
 * `terms` carries EVERY dot-term verbatim, so a drifted 2- or 4-term root stays
 * fully readable (graceful — the arity rides `arity` + the grade, never a throw).
 */
export interface BearingRoot {
  /** Ha — the heading (territory faced); terms[0], or null. */
  readonly w1: string | null;
  /** Ka — the angle of approach (quality met); terms[1], or null. */
  readonly w2: string | null;
  /** Ba — the carried dynamic (motion underway); terms[2], or null. */
  readonly w3: string | null;
  /** Every dot-separated term, verbatim — the full root for a non-3-term read. */
  readonly terms: readonly string[];
}

/** Conformance grade — the Ranta CNL grading: recognize all, grade, never reject. */
export type BearingGrade =
  | "canon" // a clean 3-term root parsed
  | "degraded" // a parseable root, but the 3-term arity law broke (2- or 4-term, …)
  | "unparsed"; // no parseable `lar:` URI / no root at all

/** The parsed bearing-vector AST — one `lar:` URI descended into its 5 chunks. */
export interface BearingVector {
  /** the URI verbatim (trimmed; trailing `>>`/whitespace stripped). */
  readonly raw: string;
  /** the URI scheme (`lar`), or "" when no `://` appeared. */
  readonly scheme: string;
  /** true for the session form `lar://alias:grant@host/…` (authority present). */
  readonly sessionForm: boolean;
  /** the session authority, or null for the authority-less local form `lar:///…`. */
  readonly authority: BearingAuthority | null;
  /** the three-term root (heading.angle.dynamic). */
  readonly root: BearingRoot;
  /** the 0–4 ordered path segments after the root (root excluded). */
  readonly path: readonly string[];
  /** the `#fragment` (section), or null. */
  readonly fragment: string | null;
  /** root.terms.length — 3 conforms; anything else is arity-drift. */
  readonly arity: number;
  /** the conformance grade. */
  readonly grade: BearingGrade;
  /** 0..20 drift gauge the parse EARNS backward (low = drifted), mirroring bearing-harvest's BEARING_STANDING seeds. */
  readonly standing: number;
  /** drift flags, in the bearing-harvest vocabulary (`arity:N`, `session-form`, `root:unparsed`). */
  readonly driftFlags: readonly string[];
}

/**
 * Drift-gauge STANDING seeds on the 0..20 Maybe-Logic continuum — a backward-earned
 * gauge, never a forward vow. These MIRROR bearing-harvest's BEARING_STANDING (the
 * arity-drift signal that seeds this AST). Kept LOCAL — bearing-ast stays
 * self-contained and VM-safe, importing no runtime value across the package boundary.
 */
export const BEARING_GRADE_STANDING = {
  /** a clean 3-term root → canon band */
  canon: 18,
  /** the 3-term arity law broke → provisional-synthesis */
  arityDrift: 8,
  /** a frame, but no parseable lar: URI inside → provisional */
  rootUnparsed: 4,
} as const;

// ---------------------------------------------------------------------------
// The facets — the queryable METADATA surface (NOT dense basis axes)
// ---------------------------------------------------------------------------

/**
 * The where-filterable bearing facets — flat scalar strings, the shape a
 * ChromaDB metadata where-clause filters on. This surfaces the bearing as
 * QUERYABLE METADATA alongside the canonical string ("store the facets, compare
 * the canonical string for identity, query the facets"). It deliberately does
 * NOT grow the dense constructicon-basis dimension — the form-collection pins its
 * vector length at first insert (basis.dimension), so bearing slots ride beside
 * the vector as metadata, never inside it (no basis re-pin / P5 hazard).
 */
export interface BearingFacets {
  /** w1 — the heading term. */
  readonly bearing_w1?: string;
  /** w2 — the angle term. */
  readonly bearing_w2?: string;
  /** w3 — the dynamic term. */
  readonly bearing_w3?: string;
  /** the canonical `w1.w2.w3` root string — the identity-compare key. */
  readonly bearing_root?: string;
  /** the joined path segments (`seg/seg`), or "" when the path is empty. */
  readonly bearing_path?: string;
  /** the `#fragment` (without the `#`). */
  readonly bearing_frag?: string;
  /** the conformance grade (canon|degraded|unparsed) — filter clean from drifted. */
  readonly bearing_grade?: string;
}

// ---------------------------------------------------------------------------
// parse — descend a lar: URI into the AST (graceful; never throws)
// ---------------------------------------------------------------------------

const LAR_URI_G = /lar:\/\/\S+/g;

/** Strip a trailing `>>` / `>` / surrounding whitespace a sigil span leaves on a URI. */
function trimUri(raw: string): string {
  return raw.trim().replace(/>+$/, "").trim();
}

function parseAuthority(authorityStr: string): BearingAuthority {
  const at = authorityStr.lastIndexOf("@");
  const userinfo = at === -1 ? authorityStr : authorityStr.slice(0, at);
  const host = at === -1 ? "" : authorityStr.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const alias = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const grant = colon === -1 ? null : userinfo.slice(colon + 1);
  return { alias, grant, host };
}

function unparsed(raw: string): BearingVector {
  return {
    raw,
    scheme: "",
    sessionForm: false,
    authority: null,
    root: { w1: null, w2: null, w3: null, terms: [] },
    path: [],
    fragment: null,
    arity: 0,
    grade: "unparsed",
    standing: BEARING_GRADE_STANDING.rootUnparsed,
    driftFlags: ["root:unparsed"],
  };
}

/**
 * Parse ONE `lar:` URI into a {@link BearingVector}. Graceful — ANY root parses;
 * a non-3-term root grades to `degraded`; an unreadable URI returns an `unparsed`
 * vector. NEVER throws.
 *
 * Handles both forms:
 *  - local   `lar:///w1.w2.w3/seg/#frag`              (authority-less)
 *  - session `lar://alias:grant@host/w1.w2.w3/seg/#frag` (full speaker)
 */
export function parseBearing(uriRaw: string): BearingVector {
  const raw = trimUri(uriRaw ?? "");
  const schemeIdx = raw.indexOf("://");
  if (schemeIdx === -1) return unparsed(raw);

  const scheme = raw.slice(0, schemeIdx);
  const rest = raw.slice(schemeIdx + 3);

  // Split authority (session form) from the path-part.
  let authority: BearingAuthority | null = null;
  let sessionForm = false;
  let pathPart: string;
  if (rest.startsWith("/")) {
    // local form `lar:///…` — the third slash leaves the authority empty.
    pathPart = rest.replace(/^\/+/, "");
  } else {
    // session form `lar://authority/…` — authority is the chunk before the first `/`.
    const slash = rest.indexOf("/");
    const authorityStr = slash === -1 ? rest : rest.slice(0, slash);
    pathPart = slash === -1 ? "" : rest.slice(slash + 1);
    if (authorityStr) {
      authority = parseAuthority(authorityStr);
      sessionForm = true;
    }
  }

  // Peel the fragment.
  let fragment: string | null = null;
  const hashIdx = pathPart.indexOf("#");
  if (hashIdx !== -1) {
    fragment = pathPart.slice(hashIdx + 1) || null;
    pathPart = pathPart.slice(0, hashIdx);
  }

  // Segment the path; the FIRST segment is the root, the rest are path segments.
  const segments = pathPart.split("/").filter((s) => s.length > 0);
  const rootSeg = segments.length > 0 ? segments[0]! : "";
  const path = segments.slice(1);

  const driftFlags: string[] = [];
  if (sessionForm) driftFlags.push("session-form");

  if (!rootSeg) {
    // A scheme, but no root — unparsed-grade, yet keep what we read (path/frag rare here).
    return {
      raw,
      scheme,
      sessionForm,
      authority,
      root: { w1: null, w2: null, w3: null, terms: [] },
      path,
      fragment,
      arity: 0,
      grade: "unparsed",
      standing: BEARING_GRADE_STANDING.rootUnparsed,
      driftFlags: [...driftFlags, "root:unparsed"],
    };
  }

  const terms = rootSeg.split(".");
  const arity = terms.length;
  const root: BearingRoot = {
    w1: terms[0] ?? null,
    w2: terms[1] ?? null,
    w3: terms[2] ?? null,
    terms,
  };

  let grade: BearingGrade;
  let standing: number;
  if (arity === 3) {
    grade = "canon";
    standing = BEARING_GRADE_STANDING.canon;
  } else {
    grade = "degraded";
    standing = BEARING_GRADE_STANDING.arityDrift;
    driftFlags.push(`arity:${arity}`);
  }

  return {
    raw,
    scheme,
    sessionForm,
    authority,
    root,
    path,
    fragment,
    arity,
    grade,
    standing,
    driftFlags,
  };
}

/**
 * Extract EVERY `lar:` URI from a payload, in left→right order, each parsed.
 * An aim payload `<from> -> <to>` yields two vectors ([from, to]); a yield
 * payload `<resolved> -> ?` yields one (the `?` is not a URI). Returns [] when
 * the payload carries no `lar:` URI (graceful — never throws).
 */
export function parseBearingPayload(payload: string | null | undefined): BearingVector[] {
  if (!payload) return [];
  const out: BearingVector[] = [];
  const matches = payload.match(LAR_URI_G);
  if (!matches) return [];
  for (const m of matches) out.push(parseBearing(m));
  return out;
}

// ---------------------------------------------------------------------------
// linearize — AST → the canonical string (GF concrete syntax; round-trips)
// ---------------------------------------------------------------------------

/**
 * Linearize a {@link BearingVector} back to its canonical `lar:` string — the GF
 * concrete-syntax leg, the inverse of {@link parseBearing}. The result is
 * IDEMPOTENT: parse → linearize → parse → linearize is stable (a raw URI's
 * trailing `>>` / extra slashes canonicalize away on the first pass).
 */
export function linearizeBearing(bv: BearingVector): string {
  const scheme = bv.scheme || "lar";
  const rootStr = bv.root.terms.join(".");
  const pathStr = bv.path.length > 0 ? `/${bv.path.join("/")}` : "";
  const fragStr = bv.fragment ? `#${bv.fragment}` : "";

  if (bv.sessionForm && bv.authority) {
    const { alias, grant, host } = bv.authority;
    const userinfo = grant != null ? `${alias}:${grant}` : alias;
    return `${scheme}://${userinfo}@${host}/${rootStr}${pathStr}${fragStr}`;
  }
  return `${scheme}:///${rootStr}${pathStr}${fragStr}`;
}

// ---------------------------------------------------------------------------
// facets — the queryable metadata surface
// ---------------------------------------------------------------------------

/**
 * Surface a {@link BearingVector} as flat where-filterable {@link BearingFacets}.
 * Only present chunks are emitted (an absent term / empty path / no fragment is
 * omitted, never stamped as ""). The grade always rides, so a recall query can
 * filter clean bearings from drifted ones.
 */
export function bearingFacets(bv: BearingVector): BearingFacets {
  const f: {
    -readonly [K in keyof BearingFacets]: BearingFacets[K];
  } = {};
  if (bv.root.w1) f.bearing_w1 = bv.root.w1;
  if (bv.root.w2) f.bearing_w2 = bv.root.w2;
  if (bv.root.w3) f.bearing_w3 = bv.root.w3;
  if (bv.root.terms.length > 0) f.bearing_root = bv.root.terms.join(".");
  if (bv.path.length > 0) f.bearing_path = bv.path.join("/");
  if (bv.fragment) f.bearing_frag = bv.fragment;
  f.bearing_grade = bv.grade;
  return f;
}
