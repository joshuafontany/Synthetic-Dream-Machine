/**
 * ffz-project — the `lar_ffz` rhythmic address as a NESTED-MEMBERSHIP CONTAINMENT PATH.
 *
 * `lar_ffz` names WHERE a drawer's rhythm sits in a rooted membership tree — it is NOT
 * a projection of wall-time and NOT a clock. The FFZ tree is a meet-semilattice: each
 * band is a containment layer (coarse→fine), an address is a node, and the "distance
 * between two drawers' rhythms" is the co-depth of their lowest common ancestor — the
 * length of their longest common prefix (an ULTRAMETRIC, order-free).
 *
 * The five bands (coarse→fine, FFZ_ADDRESS_ORDER):
 *   - Theme   — thread cluster        (FLUID, deferred to stage two)
 *   - Arc     — the session = source_file (the session-island; given FREE)
 *   - Measure — topic-shift           (FLUID, deferred to stage two)
 *   - Beat    — the turn (a grounding act, per-island; null-graceful where no clean
 *               turn label exists at the call site)
 *   - Pulse   — the drawer / inscription atom (the finest cell)
 *
 * Each segment is a MEMBERSHIP LABEL (a cell id), never a modular phase — so there is
 * NO bound, NO modulo, NO cycling here. The prior wall-time anchor ({capturedTime,
 * sessionPosition}) is REJECTED as un-pono (it imputed a global now); this module reads
 * only the containment labels a drawer already holds.
 *
 * RHYTHM-ONLY (the PATH-B cut): `lar_ffz` carries ZERO causality. Co-depth paces the
 * grain (how near two rhythms sit); it never orders history — causal order rides the
 * edge-DAG / ffzCausalCompare (ffz-clock.ts), which this module does NOT touch.
 *
 * Address shape — `"<profile>/<Theme>.<Arc>.<Measure>.<Beat>.<Pulse>"`, ordered
 * COARSE→FINE so a coarser read drops trailing bands cleanly (prefix-truncatable; see
 * {@link ffzTruncate}). An absent/fluid cell renders as the sentinel {@link FFZ_ABSENT}
 * (`_` — presence-of-the-band acknowledged, the cell unclaimed); trailing absent cells
 * are omitted entirely. A partial address still addresses.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

/** The coarse→fine band order the `lar_ffz` address serializes in (Theme first). */
export const FFZ_ADDRESS_ORDER = ["Theme", "Arc", "Measure", "Beat", "Pulse"] as const;

/** One of the five membership bands. */
export type FfzBand = (typeof FFZ_ADDRESS_ORDER)[number];

/**
 * The sentinel for a fluid/absent band cell — the band exists in the schema but the
 * cell is unclaimed here (Mu's `_`: presence acknowledged, essence unclaimed). It is
 * POROUS in {@link ffzCoDepth}/{@link ffzLca}: it neither counts as a shared cell nor
 * breaks the alignment, so a coarser shared cell still reads through an unknown band.
 * A real membership label is never expected to equal this single character.
 */
export const FFZ_ABSENT = "_";

/**
 * The membership cells a drawer holds — each an optional containment LABEL (a cell id),
 * never a phase. Absent/null cells render as {@link FFZ_ABSENT}. `profile` selects the
 * tree root (a namespace), default "session".
 */
export interface FfzCells {
  /** Theme (L4) — thread cluster. FLUID (stage two); usually absent. */
  readonly theme?: string | number | null;
  /** Arc (L3) — the session = source_file (the session-island). Given free. */
  readonly arc?: string | number | null;
  /** Measure (L2) — topic-shift. FLUID (stage two); usually absent. */
  readonly measure?: string | number | null;
  /** Beat (L1) — the turn (per-island; causally inert). Null-graceful. */
  readonly beat?: string | number | null;
  /** Pulse (L0) — the drawer / inscription atom (the finest cell). */
  readonly pulse?: string | number | null;
  /** The tree root selector (a namespace), default "session". */
  readonly profile?: string;
}

/** Map a band name to its cell value in an {@link FfzCells}. */
function cellOf(cells: FfzCells, band: FfzBand): string | number | null | undefined {
  switch (band) {
    case "Theme":   return cells.theme;
    case "Arc":     return cells.arc;
    case "Measure": return cells.measure;
    case "Beat":    return cells.beat;
    case "Pulse":   return cells.pulse;
  }
}

/**
 * Render a cell value as a delimiter-safe membership label, or {@link FFZ_ABSENT} when
 * absent/empty. `.` and `/` (the address delimiters) and whitespace collapse to `-` so
 * a source_file or content-id label can never split a segment or escape the path.
 */
function cellLabel(v: string | number | null | undefined): string {
  if (v == null) return FFZ_ABSENT;
  const s = String(v).trim().replace(/[./\s]+/g, "-");
  return s === "" ? FFZ_ABSENT : s;
}

const profileOf = (cells: FfzCells): string => {
  const p = cells.profile?.trim();
  return p && p.length ? p : "session";
};

/**
 * Build the `lar_ffz` membership address from a drawer's cells — pure, deterministic,
 * STATELESS. Walks FFZ_ADDRESS_ORDER (coarse→fine), renders each present cell as a
 * label and each absent one as {@link FFZ_ABSENT}, then OMITS trailing absent cells.
 * A partial set still addresses (e.g. Arc + Pulse only ⇒ `"session/_.<arc>._._.<pulse>"`;
 * Arc only ⇒ `"session/_.<arc>"`; nothing ⇒ the root `"session/"`).
 *
 * NAME NOTE: not `ffzAddress` — that name is held by the worldline trajectory's
 * clock-level address (worldline-clock.ts), a distinct subsystem. This is the drawer's
 * MEMBERSHIP address (the `lar_ffz` telemetry cell), so it carries the membership name.
 */
export function ffzMembershipAddress(cells: FfzCells): string {
  const segs = FFZ_ADDRESS_ORDER.map((b) => cellLabel(cellOf(cells, b)));
  while (segs.length && segs[segs.length - 1] === FFZ_ABSENT) segs.pop();
  return `${profileOf(cells)}/${segs.join(".")}`;
}

/** True when an address carries at least one real (non-sentinel) membership cell. */
export function ffzHasCell(address: string): boolean {
  const slash = address.indexOf("/");
  const tuple = slash < 0 ? address : address.slice(slash + 1);
  return tuple.split(".").some((s) => s !== "" && s !== FFZ_ABSENT);
}

/** Split an address into its `<profile>` and its coarse→fine segment tuple. */
function parseAddress(address: string): { profile: string; segs: string[] } {
  const slash = address.indexOf("/");
  if (slash < 0) return { profile: "", segs: address ? address.split(".") : [] };
  const profile = address.slice(0, slash);
  const rest = address.slice(slash + 1);
  return { profile, segs: rest ? rest.split(".") : [] };
}

/**
 * Take a coarser rhythmic read by keeping the first `bands` segments (coarse→fine,
 * Theme first) and dropping the trailing finer ones — the prefix-truncation the
 * address shape guarantees. The `<profile>/` prefix is preserved. Clamps to the
 * available band count; `bands <= 0` keeps the profile prefix with no bands.
 */
export function ffzTruncate(address: string, bands: number): string {
  const slash = address.indexOf("/");
  if (slash < 0) {
    // No profile prefix — operate on the bare band tuple.
    return address.split(".").slice(0, Math.max(0, bands)).join(".");
  }
  const prefix = address.slice(0, slash);
  const tuple = address.slice(slash + 1).split(".");
  const kept = tuple.slice(0, Math.max(0, bands));
  return `${prefix}/${kept.join(".")}`;
}

/**
 * The ULTRAMETRIC distance between two rhythms: the CO-DEPTH of their lowest common
 * ancestor = the count of REAL membership cells they share in the leading coarse→fine
 * run. Different `profile` (a different tree) ⇒ 0 (they share only the root). An
 * absent cell ({@link FFZ_ABSENT}) on either side is POROUS — it counts as neither
 * shared nor a divergence, so a coarser shared cell still reads through an unknown
 * band. The run ends at the first band where BOTH carry a real cell and they differ.
 *
 * Two drawers in the same session but different turns share Arc, not Beat (co-depth at
 * the Arc level); two in different sessions share only Theme-or-root (co-depth 0). This
 * is the order-free rhythmic distance — it paces the grain, it never orders history.
 */
export function ffzCoDepth(a: string, b: string): number {
  const A = parseAddress(a);
  const B = parseAddress(b);
  if (A.profile !== B.profile) return 0; // a different tree — share only the root
  let depth = 0;
  const n = Math.max(A.segs.length, B.segs.length);
  for (let i = 0; i < n; i++) {
    const x = A.segs[i] ?? FFZ_ABSENT;
    const y = B.segs[i] ?? FFZ_ABSENT;
    if (x === FFZ_ABSENT || y === FFZ_ABSENT) continue; // a fluid band — porous
    if (x === y) { depth++; continue; }                 // a shared real cell
    break;                                              // first real divergence — LCA found
  }
  return depth;
}

/**
 * The lowest common ancestor address — the deepest membership node both addresses sit
 * under, rendered as a `<profile>/…` prefix (porous absent cells preserved positionally,
 * trailing absents trimmed). Different `profile` ⇒ `""` (no common tree). The count of
 * real shared cells is {@link ffzCoDepth}; this is the node those cells name.
 */
export function ffzLca(a: string, b: string): string {
  const A = parseAddress(a);
  const B = parseAddress(b);
  if (A.profile !== B.profile) return ""; // no common tree
  const out: string[] = [];
  const n = Math.max(A.segs.length, B.segs.length);
  for (let i = 0; i < n; i++) {
    const x = A.segs[i] ?? FFZ_ABSENT;
    const y = B.segs[i] ?? FFZ_ABSENT;
    if (x === FFZ_ABSENT || y === FFZ_ABSENT) { out.push(FFZ_ABSENT); continue; }
    if (x === y) { out.push(x); continue; }
    break;
  }
  while (out.length && out[out.length - 1] === FFZ_ABSENT) out.pop();
  return `${A.profile}/${out.join(".")}`;
}
