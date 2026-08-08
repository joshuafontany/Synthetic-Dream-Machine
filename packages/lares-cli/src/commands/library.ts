/**
 * `lares library {list | show | acquire | verify | index | path}` — the ACQUIRED shelf.
 *
 * Bodies a human did not author — books, corpora, anything poured over rather than edited — live here
 * instead of in a bag. `bags/` carries what an operator AUTHORS and round-trips; an acquired book has no
 * author here and no parse∘render fixed point, so it sits on the seed surface by accident of arrival. Left
 * there it enters git history, and a shelf that grows with every book grows the history with it.
 *
 * The tier stands at `<state>/library` (or `LAR_LIBRARY`) — OUTSIDE the wipe zone, because `reset` pares
 * `<data>/vessel` on the documented premise that its blobs rebuild from the bags carriers. That premise holds
 * for derived blobs and fails completely for acquired ones.
 *
 *     <library>/<collection>/<cid>/<the real filename>
 *     <library>/<collection>/<cid>/meta.json
 *
 * Readable (a real filename, `cat`-able), auditable (the directory name IS the digest; the sidecar carries
 * origin and licence), and out of every tracked tree.
 *
 *   list                          the collections, and what each holds
 *   show <collection>             one collection's bodies, with anchors
 *   acquire <file> --to <coll>    take a body in (MOVES by default — moving is the point; --keep copies)
 *   verify [<collection>]         re-digest the BYTES against each directory name
 *   index <collection> --out <p>  write the tracked index — the part that travels
 *   path <collection>             resolve `library:<collection>` for a caller that needs the directory
 *
 * A reference NAMES, it never paths: `library:mark-twain` travels, a directory does not.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution
 */

import {
  larLibraryHome, libraryCollectionDir, acquireIntoLibrary,
  listCollections, listCollection, verifyCollection, writeLibraryIndex,
} from "@lararium/node";
import { libraryRef } from "@lararium/mesh";
import { existsSync } from "node:fs";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

class LibraryUsageError extends Error {}

function usage(): number {
  console.error("usage: lares library <list | show | acquire | verify | index | path>");
  console.error("");
  console.error("  list                            the collections, and what each holds");
  console.error("  show <collection>               one collection's bodies, with their anchors");
  console.error("  acquire <file> --to <coll>      take a body in — MOVES by default (--keep copies)");
  console.error("       [--origin <url>] [--licence <terms>] [--note <text>]");
  console.error("  verify [<collection>]           re-digest the BYTES against each directory name");
  console.error("  index <collection> --out <path> write the tracked index — the part that travels");
  console.error("  path <collection>               resolve library:<collection> to a directory");
  console.error("");
  console.error(`  the shelf stands at ${larLibraryHome()} — outside every tracked tree, outside the wipe zone.`);
  return 2;
}

export async function cmdLibrary(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  try {
    switch (verb) {
      case "list":    return libraryList(args);
      case "show":    return libraryShow(args);
      case "acquire": return libraryAcquire(args);
      case "verify":  return libraryVerify(args);
      case "index":   return libraryIndex(args);
      case "path":    return libraryPath(args);
      default:        return usage();
    }
  } catch (err) {
    const msg  = err instanceof Error ? err.message : String(err);
    const code = err instanceof LibraryUsageError ? "usage" : "error";
    emit(args, { ok: false, error: { code, message: msg }, human: () => console.error(`lares library ${verb ?? ""}: ${msg}`) });
    return exitFor(code);
  }
}

function collectionArg(args: ParsedArgs, verb: string): string {
  const raw = (args.positional[1] ?? "").trim().toLowerCase();
  if (!raw) throw new LibraryUsageError(`\`library ${verb}\` wants a collection name`);
  return raw;
}

function libraryList(args: ParsedArgs): number {
  const rows = listCollections().map((c) => {
    const entries = listCollection(c);
    return { collection: c, entries: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0), ref: libraryRef(c) };
  });
  emit(args, {
    ok: true, data: { home: larLibraryHome(), collections: rows },
    human: () => {
      if (rows.length === 0) { console.log(`the shelf stands empty (${larLibraryHome()})`); return; }
      console.log(`library at ${larLibraryHome()}:`);
      for (const r of rows) console.log(`  ${r.ref.padEnd(28)} ${String(r.entries).padStart(4)} bodies  ${(r.bytes / 1024 / 1024).toFixed(1)} MiB`);
    },
  });
  return 0;
}

function libraryShow(args: ParsedArgs): number {
  const collection = collectionArg(args, "show");
  const entries = listCollection(collection);
  if (entries.length === 0 && !existsSync(libraryCollectionDir(collection))) {
    throw new LibraryUsageError(`no collection "${collection}" on this shelf`);
  }
  emit(args, {
    ok: true, data: { collection, ref: libraryRef(collection), dir: libraryCollectionDir(collection), entries },
    human: () => {
      console.log(`${libraryRef(collection)}  →  ${libraryCollectionDir(collection)}`);
      for (const e of entries) {
        console.log(`  ${e.name}`);
        console.log(`    ${(e.size / 1024).toFixed(0)} KiB · ${e.mediaType} · ${e.integrity}`);
        console.log(`    origin: ${e.origin ?? "(unrecorded — a survey should say so out loud)"}`);
      }
    },
  });
  return 0;
}

function libraryAcquire(args: ParsedArgs): number {
  const file = args.positional[1];
  const to   = (args.options["to"] ?? "").trim().toLowerCase();
  if (!file) throw new LibraryUsageError("acquire wants a file");
  if (!to)   throw new LibraryUsageError("acquire wants a destination: --to <collection>");
  if (!existsSync(file)) throw new LibraryUsageError(`no such file: ${file}`);

  const out = acquireIntoLibrary(file, {
    collection: to,
    ...(args.options["origin"]  ? { origin:  args.options["origin"]  } : {}),
    ...(args.options["licence"] ?? args.options["license"] ? { licence: (args.options["licence"] ?? args.options["license"])! } : {}),
    ...(args.options["note"]    ? { note:    args.options["note"]    } : {}),
    ...(args.flags["keep"] === true ? { keep: true } : {}),
  });
  emit(args, {
    ok: true, data: { ...out },
    human: () => {
      console.log(`${out.held ? "HELD (same bytes already on the shelf)" : "ACQUIRED"} → ${libraryRef(to)}`);
      console.log(`  ${out.meta.name}  ${(out.meta.size / 1024).toFixed(0)} KiB`);
      console.log(`  anchor: ${out.meta.integrity}`);
      console.log(`  path:   ${out.path}`);
      console.log(out.moved ? `  the source left its old home — which is the point.` : `  --keep: the source stands where it was.`);
    },
  });
  return 0;
}

function libraryVerify(args: ParsedArgs): number {
  const only = (args.positional[1] ?? "").trim().toLowerCase();
  const targets = only ? [only] : listCollections();
  const verdicts = targets.flatMap((c) => verifyCollection(c));
  const bad = verdicts.filter((v) => !v.ok);
  emit(args, {
    ok: bad.length === 0,
    ...(bad.length > 0 ? { error: { code: "error", message: `${bad.length} bodies failed to verify` } } : {}),
    data: { checked: verdicts.length, failed: bad.length, verdicts },
    human: () => {
      console.log(`verified ${verdicts.length} bodies across ${targets.length} collection${targets.length === 1 ? "" : "s"}`);
      for (const v of bad) console.log(`  ✗ ${v.collection}/${v.name}: ${v.why}`);
      if (bad.length === 0) console.log("  every body's bytes digest to the directory that holds them.");
    },
  });
  return bad.length === 0 ? 0 : exitFor("error");
}

function libraryIndex(args: ParsedArgs): number {
  const collection = collectionArg(args, "index");
  const out = args.options["out"];
  if (!out) throw new LibraryUsageError("index wants a destination: --out <path>");
  const path = writeLibraryIndex(collection, out);
  emit(args, {
    ok: true, data: { collection, path, entries: listCollection(collection).length },
    human: () => {
      console.log(`wrote the ${collection} index → ${path}`);
      console.log("  the bodies stay off every tracked tree; this index is the part that travels.");
    },
  });
  return 0;
}

function libraryPath(args: ParsedArgs): number {
  const collection = collectionArg(args, "path");
  const dir = libraryCollectionDir(collection);
  emit(args, { ok: true, data: { ref: libraryRef(collection), dir }, human: () => console.log(dir) });
  return 0;
}
