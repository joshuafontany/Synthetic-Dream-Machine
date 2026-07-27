/**
 * node-circle-store — the node-fs LOCAL adapters for the IoC follow: the private CIRCLE-membership graph +
 * the recogniser's HANDLE-BOOK, both under the identity home, 0o600, NEVER federated.
 *
 * "Adding to a circle IS the follow; the graph never federates; private to the owning node" (social-seed).
 * This holds the node twins of the browser IDB stores: the follow-graph is a private JSON file, the same
 * local-first posture as the persona-petname store beside it. The never-federates wall is STRUCTURAL — no
 * board write exists in either shore; a future device-fleet adapter wraps the SAME `CircleStore` shape over a
 * PRIVATE bag for cross-vessel sync, and the interface never moves.
 *
 * The three identity stores stay distinct here as everywhere: the handle-book (others' nyms + the
 * recogniser's private labels) ⊥ the persona-petname map (the human's OWN faces) ⊥ the published glamour
 * (the ONE federated surface, deliberately posted). This module holds the first; it touches neither the
 * second nor the wire.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-two-stacks
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { HandleBook, type HandleBookSnapshot, type CircleStore } from "@lararium/mesh";
import { larIdentityDir } from "./vessel-paths.js";

/** The private follow-graph file — one JSON map `{ circleId -> nym[] }`, in the identity home outside every wipe. */
const CIRCLES_FILE     = ".circles-follow.json";
/** The recogniser's serialised handle-book — others' nyms + the private labels the reader keeps for them. */
const HANDLE_BOOK_FILE = ".handle-book.json";

function readCirclesMap(): Record<string, string[]> {
  const file = join(larIdentityDir(), CIRCLES_FILE);
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { circles?: unknown };
    if (raw.circles && typeof raw.circles === "object") return raw.circles as Record<string, string[]>;
  } catch { /* a torn graph reads empty — a re-follow re-records the edges it holds */ }
  return {};
}

function writeCirclesMap(map: Record<string, string[]>): void {
  const idDir = larIdentityDir();
  mkdirSync(idDir, { recursive: true });
  const file = join(idDir, CIRCLES_FILE);
  writeFileSync(file, JSON.stringify({ circles: map }, null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Build the node-fs CircleStore — the private follow-graph. Every op reads/writes only the local file; no
 * board write exists on it, so the graph cannot reach the wire (the never-federates wall, made structural).
 */
export function makeNodeCircleStore(): CircleStore {
  return {
    add(circleId, nym) {
      const map = readCirclesMap();
      const set = new Set(map[circleId] ?? []);
      set.add(nym);
      map[circleId] = [...set].sort();
      writeCirclesMap(map);
    },
    remove(circleId, nym) {
      const map = readCirclesMap();
      const set = new Set(map[circleId] ?? []);
      set.delete(nym);
      map[circleId] = [...set].sort();
      writeCirclesMap(map);
    },
    members(circleId) {
      return [...(readCirclesMap()[circleId] ?? [])].sort();
    },
    circles() {
      return Object.keys(readCirclesMap()).sort();
    },
  };
}

/** Load the recogniser's handle-book from disk (empty when none / a torn file). The caller persists mutations
 *  via {@link saveNodeHandleBook} after a follow — the book itself stays pure + I/O-free. */
export function loadNodeHandleBook(): HandleBook {
  const file = join(larIdentityDir(), HANDLE_BOOK_FILE);
  if (!existsSync(file)) return new HandleBook();
  try {
    const snapshot = JSON.parse(readFileSync(file, "utf8")) as HandleBookSnapshot;
    return new HandleBook(snapshot);
  } catch {
    return new HandleBook();   // a torn book reads empty — re-ingesting a card re-learns the nym
  }
}

/** Persist the handle-book snapshot (0o600) — the recogniser's private memory of others' keys + labels. */
export function saveNodeHandleBook(book: HandleBook): void {
  const idDir = larIdentityDir();
  mkdirSync(idDir, { recursive: true });
  const file = join(idDir, HANDLE_BOOK_FILE);
  writeFileSync(file, JSON.stringify(book.snapshot(), null, 2), { mode: 0o600, encoding: "utf8" });
  try { chmodSync(file, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}
