/**
 * astpalace — the memory-ast-unfolding: a LOCAL, content-addressed store for the per-turn
 * parse-tree AST. It NEVER federates on the mesh (the pattern integrity, twin to .meshpalace's
 * "code, no content, ever" — here it is ".astpalace: the unfolding, local, never the wire").
 *
 * It mirrors the mempalace's LOCAL model (a sibling store on disk), NOT mesh-palace.ts (that is
 * the federated Automerge layer). NO CRDT, NO Automerge, NO sync surface — by construction: this
 * module touches only the local filesystem, holds no Repo, opens no session.
 *
 * Each entry is content-addressed by a STRUCTURAL HASH — sha256 of the canonical-JSON of the parse
 * tree. Recurrence (the SAME structure parsed again) lands the SAME hash = the SAME file: the
 * frequency signal (Unison-style), tallied as `count`. Each entry is BOUND to its verbatim — it
 * carries provenance back toward the mempalace drawer (source_file + a verbatim digest) and forward
 * to the grammar sigils it instantiates (the stored tree contains them). Movement between this store
 * and the palaces / Wikis stays operator-curated and MANUAL — this module only holds the unfoldings.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  canonicalJson,
  canonicalJsonBytes,
  defaultCryptoProvider,
  sha256Hex,
  utf8Bytes,
} from "@lararium/mesh";

/** A provenance link back to a verbatim turn (the drawer this AST unfolded from). */
export interface AstProvenance {
  /** the capture source_file (the session-drawer locator in the mempalace) */
  readonly source_file: string;
  /** sha256 of the verbatim turn text — the join key to the drawer's content */
  readonly verbatim_sha: string;
}

/** One stored AST unfolding, content-addressed by {@link AstEntry.hash}. */
export interface AstEntry {
  /** the structural hash — sha256(canonicalJson(ast)); THE content address + the recurrence key */
  readonly hash: string;
  /** the parse tree (canonical-key-ordered) — invariant for a given hash; holds the sigils */
  readonly ast: unknown;
  /** recurrence tally — how many turns have unfolded to this exact structure (the frequency signal) */
  count: number;
  /** ISO timestamp of first sighting */
  readonly first_seen: string;
  /** ISO timestamp of most-recent sighting */
  last_seen: string;
  /** the verbatim turns this structure unfolded from (deduped, capped) — the bound-to-verbatim link */
  provenance: AstProvenance[];
}

/** Cap the provenance list so a hot recurring structure cannot grow a file without bound. */
const PROVENANCE_CAP = 64;

export interface AstPalace {
  /**
   * Store an AST tree, keyed by its structural hash, bound to its verbatim. Idempotent on the
   * STRUCTURE: an identical tree collides to the same hash/file and bumps `count` (recurrence),
   * accreting distinct provenance. Returns the structural hash (the drawer keeps it as `lar_ast_hash`).
   */
  put(astTree: unknown, verbatim: { source_file: string; content: string }): Promise<string>;
  /** Read an entry back by its structural hash, or null if absent. */
  get(hash: string): Promise<AstEntry | null>;
  /** The structural hash of a tree WITHOUT storing it (the content address). */
  hashOf(astTree: unknown): Promise<string>;
}

const HEX64 = /^[0-9a-f]{64}$/;

/** Open a local `.astpalace` content-addressed store rooted at `dir`. Creates files lazily. */
export function makeAstPalace(dir: string): AstPalace {
  // Shard by the hash's first 2 chars so one flat directory never holds the whole corpus.
  const pathFor = (hash: string): { shardDir: string; file: string } => {
    const shardDir = join(dir, hash.slice(0, 2));
    return { shardDir, file: join(shardDir, `${hash}.json`) };
  };

  const hashOf = (astTree: unknown): Promise<string> =>
    sha256Hex(canonicalJsonBytes(astTree), defaultCryptoProvider);

  const readEntry = async (file: string): Promise<AstEntry | null> => {
    try {
      return JSON.parse(await readFile(file, "utf-8")) as AstEntry;
    } catch {
      return null; // absent or unreadable — treat as not-present (caller writes fresh)
    }
  };

  return {
    hashOf,

    async get(hash: string): Promise<AstEntry | null> {
      if (!HEX64.test(hash)) return null;
      return readEntry(pathFor(hash).file);
    },

    async put(astTree, verbatim): Promise<string> {
      const hash = await hashOf(astTree);
      const verbatim_sha = await sha256Hex(utf8Bytes(verbatim.content), defaultCryptoProvider);
      const link: AstProvenance = { source_file: verbatim.source_file, verbatim_sha };
      const now = new Date().toISOString();
      const { shardDir, file } = pathFor(hash);
      await mkdir(shardDir, { recursive: true });

      const existing = await readEntry(file);
      let entry: AstEntry;
      if (existing) {
        // Recurrence: same structure, same hash, same file. Bump the tally, accrete provenance.
        const seen = existing.provenance.some(
          (p) => p.source_file === link.source_file && p.verbatim_sha === link.verbatim_sha,
        );
        entry = {
          ...existing,
          count: existing.count + 1,
          last_seen: now,
          provenance:
            seen || existing.provenance.length >= PROVENANCE_CAP
              ? existing.provenance
              : [...existing.provenance, link],
        };
      } else {
        // First sighting — the ast core is stored canonical-key-ordered (invariant for this hash).
        entry = {
          hash,
          ast: JSON.parse(canonicalJson(astTree)),
          count: 1,
          first_seen: now,
          last_seen: now,
          provenance: [link],
        };
      }

      // Atomic write (temp + rename) so a crash mid-write never leaves a torn entry.
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(entry), "utf-8");
      await rename(tmp, file);
      return hash;
    },
  };
}
