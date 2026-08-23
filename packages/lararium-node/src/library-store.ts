/**
 * library-store — the node-fs shore for the ACQUIRED tier: take a body in, keep it readable, verify it back.
 *
 * The pure half (the layout law, the reference grammar, the index) lives in `@lararium/mesh`'s library-tier.
 * This is the disk: where the tier stands, how a body enters it, and what a verify actually reads.
 *
 * ── IT BELONGS TO THE HOUSE, AND THAT IS THE WHOLE POINT ─────────────────────────────────────────
 * A shelf is the LARARIUM's, never any Lar's — a family's books outlast whoever reads them. So it homes in
 * `<lararium>`, and everything else follows: the runtime CAS under `<lares>/vessel` is licensed for the wipe by
 * one premise, that its blobs rebuild from the bags carriers on each seed, and that premise holds for
 * DERIVED blobs while failing completely for acquired ones — a book regenerates from nothing. Standing in
 * its own house rather than one directory aside from a house every rite pares is what makes that structural.
 *
 * ── ACQUIRING MOVES, IT DOES NOT COPY (by default) ───────────────────────────────────────────────
 * The point of the act is to get a body OUT of a tracked tree. A copy leaves the original exactly where it
 * was doing the harm, so `acquire` MOVES and says so; `--keep` exists for a source the operator does not own.
 *
 * ── VERIFY READS BYTES, NEVER RECORDS ────────────────────────────────────────────────────────────
 * A verify that trusted `meta.json` would certify its own bookkeeping. This re-digests the body and checks
 * it against the DIRECTORY name — the one value nothing but a re-write can move — so a tampered sidecar
 * reads as a mismatch rather than as agreement.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  LIBRARY_META_FILE, parseLibraryRef, metaMatchesDir, renderLibraryIndex,
  mediaTypeFromExt, niUriSha256FromHex, type LibraryEntryMeta,
} from "@lararium/mesh";
import { larariumDataHome } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";

/**
 * The acquired tier's home — `<lararium>/library`, which reads `~/.local/share/lararium/library`
 * loose and `<root>/data/lararium/library` under LAR_ROOT. `LAR_LIBRARY` overrides both.
 *
 * BOTH ISOLATION ARMS MATTER. A rehearsal that set only `LAR_LIBRARY` and a rehearsal that set only
 * `LAR_ROOT` are equally isolated; a comment naming one would send a reader to reach the operator's
 * real shelf while believing otherwise.
 *
 * IT STANDS IN THE SHRINE, NOT THE SPIRIT. `lares/vessel` is the substrate `reset` and `regenesis`
 * reforge, and an acquired body survives neither on its own merits: it has no author in any tracked tree
 * and no parse∘render fixed point, so nothing re-derives it and a wipe that reached it would end it.
 * Standing it under `lararium/` makes that structural — the tier survives because it lives in another
 * house, never because a directory stayed off somebody's list.
 *
 * The env override exists because a shelf grows without bound and an operator may want it on another
 * disk — the one resource here likely to outgrow its default.
 */
export function larLibraryHome(): string {
  return process.env["LAR_LIBRARY"] ?? join(larariumDataHome(), "library");
}

/** Where one collection's bodies stand. Resolution of a `library:<name>` reference, and the only mapping. */
export function libraryCollectionDir(collection: string): string {
  return join(larLibraryHome(), collection);
}

/**
 * Resolve a `library:<collection>` reference to a directory, or null when the value names something else.
 * A caller that resolves nothing MUST NOT fall back to a path of its own — that fallback is how a corpus
 * ends up somewhere nobody chose.
 */
export function resolveLibraryRef(ref: string): string | null {
  const collection = parseLibraryRef(ref);
  return collection === null ? null : libraryCollectionDir(collection);
}

const sha256Hex = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/** What an acquire did. `moved` names whether the source left its old home — the reason to run this at all. */
export interface AcquireOutcome {
  readonly meta:  LibraryEntryMeta;
  readonly dir:   string;
  readonly path:  string;
  /** True when the body already stood in the tier — a re-acquire is a no-op the caller should see, not a write. */
  readonly held:  boolean;
  readonly moved: boolean;
}

export interface AcquireOptions {
  readonly collection: string;
  readonly origin?:    string | undefined;
  readonly licence?:   string | undefined;
  readonly note?:      string | undefined;
  /** Leave the source where it stands. Default MOVES, because moving is the point. */
  readonly keep?:      boolean;
}

/**
 * Take one body into the tier: digest it, site it under `<collection>/<cid>/<name>`, and write its sidecar.
 *
 * IDEMPOTENT BY CONTENT. Acquiring the same bytes twice lands the same directory and rewrites nothing — the
 * content address decides identity, so a repeated run costs a digest and no disk. A body whose bytes already
 * stand there still has its SOURCE removed under a move, because the source's continued existence is the
 * condition being cured.
 */
export function acquireIntoLibrary(sourcePath: string, opts: AcquireOptions): AcquireOutcome {
  const bytes = readFileSync(sourcePath);
  const cid   = sha256Hex(bytes);
  const name  = basename(sourcePath);
  const ext   = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const dir   = join(libraryCollectionDir(opts.collection), cid);
  const path  = join(dir, name);

  const meta: LibraryEntryMeta = {
    cid, name, collection: opts.collection, size: bytes.byteLength,
    mediaType: mediaTypeFromExt(ext),
    integrity: niUriSha256FromHex(cid),
    ...(opts.origin  ? { origin:  opts.origin  } : {}),
    ...(opts.licence ? { licence: opts.licence } : {}),
    ...(opts.note    ? { note:    opts.note    } : {}),
  };

  const held = existsSync(path);
  if (!held) {
    mkdirSync(dir, { recursive: true });
    copyFileSync(sourcePath, path);
  }
  atomicWriteFileSync(join(dir, LIBRARY_META_FILE), `${JSON.stringify(meta, null, 2)}\n`);

  // The MOVE completes after the body stands safely in the tier — never before, so a failure mid-act leaves
  // the operator with the original rather than with neither.
  const moved = opts.keep !== true;
  if (moved) rmSync(sourcePath, { force: true });
  return { meta, dir, path, held, moved };
}

/** Read one body's sidecar, or null when it carries none / carries a torn one. */
export function readLibraryMeta(entryDir: string): LibraryEntryMeta | null {
  const path = join(entryDir, LIBRARY_META_FILE);
  if (!existsSync(path)) return null;
  try {
    const m = JSON.parse(readFileSync(path, "utf8")) as LibraryEntryMeta;
    return typeof m?.cid === "string" && typeof m?.name === "string" ? m : null;
  } catch { return null; }
}

/** Every collection standing in the tier, ascending. */
export function listCollections(): string[] {
  const home = larLibraryHome();
  if (!existsSync(home)) return [];
  return readdirSync(home).filter((n) => statSync(join(home, n)).isDirectory()).sort();
}

/** Every body in one collection, ascending by name. A directory with no readable sidecar reads absent. */
export function listCollection(collection: string): LibraryEntryMeta[] {
  const dir = libraryCollectionDir(collection);
  if (!existsSync(dir)) return [];
  const out: LibraryEntryMeta[] = [];
  for (const cidDir of readdirSync(dir).sort()) {
    const meta = readLibraryMeta(join(dir, cidDir));
    if (meta) out.push(meta);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** What a verify found about one body. */
export interface LibraryVerdict {
  readonly collection: string;
  readonly cid:        string;
  readonly name:       string;
  readonly ok:         boolean;
  /** Absent when it verified; otherwise what disagreed. */
  readonly why?:       string;
}

/**
 * Re-digest every body in a collection and check it against its own DIRECTORY name.
 *
 * It reads the bytes rather than the sidecar on purpose: checking `meta.cid` against the directory would
 * compare two records and certify neither. The digest is the only reading nothing but a re-write can move.
 */
export function verifyCollection(collection: string): LibraryVerdict[] {
  const dir = libraryCollectionDir(collection);
  if (!existsSync(dir)) return [];
  const out: LibraryVerdict[] = [];
  for (const cidDir of readdirSync(dir).sort()) {
    const entryDir = join(dir, cidDir);
    const meta = readLibraryMeta(entryDir);
    if (!meta) { out.push({ collection, cid: cidDir, name: "(no sidecar)", ok: false, why: "no readable meta.json — the body cannot describe itself" }); continue; }
    if (!metaMatchesDir(meta, cidDir)) { out.push({ collection, cid: cidDir, name: meta.name, ok: false, why: `sidecar claims ${meta.cid} inside a directory named ${cidDir}` }); continue; }
    const body = join(entryDir, meta.name);
    if (!existsSync(body)) { out.push({ collection, cid: cidDir, name: meta.name, ok: false, why: "the sidecar stands and the body does not" }); continue; }
    const actual = sha256Hex(readFileSync(body));
    out.push(actual === cidDir.toLowerCase()
      ? { collection, cid: cidDir, name: meta.name, ok: true }
      : { collection, cid: cidDir, name: meta.name, ok: false, why: `bytes digest ${actual} — the directory claims ${cidDir}` });
  }
  return out;
}

/** Render a collection's tracked index to a path. The bodies stay out of the repo; this goes in. */
export function writeLibraryIndex(collection: string, indexPath: string): string {
  mkdirSync(join(indexPath, ".."), { recursive: true });
  writeFileSync(indexPath, renderLibraryIndex(collection, listCollection(collection)), "utf8");
  return indexPath;
}
