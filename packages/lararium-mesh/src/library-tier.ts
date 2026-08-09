/**
 * library-tier — the ACQUIRED tier: bodies a human did not author, kept readable, verifiable, and out of
 * every tracked tree.
 *
 * WHY IT STANDS APART FROM `cas`. The runtime CAS holds DERIVED blobs — engine builds, plugin bundles —
 * which regenerate from `genesis/island.bin`, so `reset` pares them freely and its own comment licenses the
 * pare on exactly that premise. An ACQUIRED body regenerates from nothing. Housing the two together would
 * put a corpus nobody can rebuild inside a directory documented as safe to destroy. Two names, two
 * durabilities, and the difference visible in the path — the same cut the Nexus seal took when it left the
 * bags tree, for the same reason.
 *
 * ── WHY NOT THE SEED SURFACE ─────────────────────────────────────────────────────────────────────
 * `bags/` carries what an operator AUTHORS: it round-trips because a human edits it, and the projection law
 * tests that with a parse∘render fixed point. An acquired book has no fixed point and no author here — it
 * sits in `bags/` by accident of arrival. Left there it enters git history, and a shelf that grows with
 * every book grows the history with it. So the bytes leave, and the bag keeps the HANDLE.
 *
 * ── THE LAYOUT, AND WHAT EACH LEVEL BUYS ─────────────────────────────────────────────────────────
 *     <library>/<collection>/<cid>/<the real filename>
 *     <library>/<collection>/<cid>/meta.json
 *
 *   · COLLECTION on top so a reference names a WALKABLE root — a pour points at `library:mark-twain` and
 *     `os.walk` finds the books, with no index consulted and no symlink to break on a foreign platform.
 *   · CID beneath it so identity stays content-addressed: the directory name IS the digest, so integrity
 *     audits with `sha256sum` and no tooling.
 *   · THE REAL FILENAME inside, so the store reads as a library rather than as a heap of hex. `cat` works,
 *     `grep` works, and a human browsing it recognises what they are looking at.
 *   · meta.json beside it, so a body self-describes IN ISOLATION — origin, licence, media-type, anchor.
 *     A blob that needs an index to say what it is cannot be audited alone, and audit alone is the point.
 *
 * ONE HONEST COST: a body in two collections stores twice. Dedup would want hardlinks, and hardlinks break
 * across filesystems and read poorly on Windows. Paying bytes to keep the layout portable and link-free
 * reads as the better trade at this scale; a `by-cid` index can reclaim it later without moving anything.
 *
 * ── A REFERENCE NAMES, IT NEVER PATHS ────────────────────────────────────────────────────────────
 * `library:<collection>` travels; a directory does not. Same law the repo registry runs and the `lar:` URI
 * before it — the artifact names WHAT, each vessel resolves WHERE. A bed manifest carrying an absolute path
 * would pour on one machine and refuse on every other.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution
 */

/** The scheme a manifest, recipe, or pour uses to name a collection without naming a directory. */
export const LIBRARY_REF_PREFIX = "library:" as const;

/** The self-describing sidecar beside every acquired body. */
export const LIBRARY_META_FILE = "meta.json" as const;

/** A collection name reads as one path segment — no separators, no traversal, no surprises. */
const COLLECTION_RE = /^[a-z0-9][a-z0-9._-]*$/;

/** Does a value name a library reference? A narrowing guard so a stray string never widens into a root. */
export function isLibraryRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(LIBRARY_REF_PREFIX);
}

/**
 * Read the collection out of a `library:<collection>` reference, or null when the value names something
 * else — or names a collection that could escape its own tier. A reference carrying a separator would let a
 * manifest walk out of the library and into any directory the vessel can read, so the shape refuses it here
 * rather than trusting whoever wrote the manifest.
 */
export function parseLibraryRef(value: unknown): string | null {
  if (!isLibraryRef(value)) return null;
  const name = value.slice(LIBRARY_REF_PREFIX.length).trim().toLowerCase();
  return COLLECTION_RE.test(name) ? name : null;
}

/** Format a collection as the reference a manifest carries. */
export function libraryRef(collection: string): string {
  return `${LIBRARY_REF_PREFIX}${collection}`;
}

/** What one acquired body declares about itself, beside its bytes. */
export interface LibraryEntryMeta {
  /** The content address — hex sha256. The directory holding this file carries the same value as its name. */
  readonly cid:       string;
  /** The body's own filename, as a human reads it. */
  readonly name:      string;
  /** The collection it was acquired into. */
  readonly collection: string;
  /** Byte length — cheap to check, and the first thing a mismatch shows. */
  readonly size:      number;
  /** The media dialect, so a reader renders it natively rather than guessing off an extension. */
  readonly mediaType: string;
  /** RFC-6920 `ni:///sha-256;…` — the FOREIGN-legible anchor a stranger verifies without our tooling. */
  readonly integrity: string;
  /** Where the bytes came from. Absent means nobody recorded it, which a survey should say out loud. */
  readonly origin?:   string;
  /** The terms the body travels under. Absent is a question, never a permission. */
  readonly licence?:  string;
  /** A human note — why this body sits in this collection. */
  readonly note?:     string;
}

/** A body reads INTACT when its recorded digest matches what its own directory claims. */
export function metaMatchesDir(meta: LibraryEntryMeta, dirName: string): boolean {
  return meta.cid.toLowerCase() === dirName.toLowerCase();
}

/**
 * Render a collection's INDEX — the tracked, human-readable meme that says what a collection holds and how
 * to verify it.
 *
 * THE INDEX IS THE PART THAT TRAVELS. The bodies stay out of every repo; this goes in one, because a reader
 * cloning the corpus should learn what the shelf holds without holding it. It carries no path — only names,
 * digests, anchors and origins — so it stays true on a machine that has fetched nothing.
 */
export function renderLibraryIndex(collection: string, entries: readonly LibraryEntryMeta[]): string {
  const rows = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const total = rows.reduce((n, e) => n + e.size, 0);
  return [
    "<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >> -->",
    "",
    `<<^ ⊙&#x0001; ? -> lar:///ha.ka.ba/library/${collection} >>`,
    "```toml iam",
    `collection = "${collection}"`,
    `entries    = "${rows.length}"`,
    `bytes      = "${total}"`,
    'type       = "text/x-memetic-wikitext"',
    "```",
    "",
    `! Library — ${collection}`,
    "",
    "The ACQUIRED bodies this collection holds. ''The bytes rest outside every tracked tree'' —",
    "in the vessel's own library tier — so a shelf may grow without a repository growing with it.",
    "''This index travels instead'': a reader learns what the shelf holds, and how to verify it,",
    "without holding it.",
    "",
    "Each row carries the RFC-6920 anchor a stranger checks with no tooling of ours.",
    "",
    "| Name | Bytes | Anchor | Origin |",
    "|---|---|---|---|",
    ...rows.map((e) => `| ${e.name} | ${e.size} | \`${e.integrity}\` | ${e.origin ?? "//(unrecorded)//"} |`),
    "",
    `Reference this collection as \`${libraryRef(collection)}\` — a name that travels, never a path.`,
    "",
    "<<^ &#x0004; -> ? >>",
    "",
  ].join("\n");
}
