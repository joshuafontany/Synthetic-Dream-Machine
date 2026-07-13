/**
 * persistence-palace — the TS op-surface for a PersistencePalace instance: the cap ANY sensorium
 * composes to persist its readings as Testimony atoms. It BRIDGES the two halves that must never
 * fuse — the DUMB python store (persistence_io.py: put/get/witness/neighbors, no logic) and the
 * SOVEREIGN TS keel (persistence-keel.ts: the standing law, the admit gate, mode=halfLife). The
 * store persists; the keel decides; this surface wires them over the shared holder transport.
 *
 * THE CAP-STACK: persistence-palace = the SHARED palace transport ({@link PalaceHolder} +
 * {@link PalaceHolderRegistry}, palace-holder.ts) composed with its OWN op-surface over the python
 * `persistence_io.py serve` holder. It owns NONE of the transport machinery (that lives once in the
 * shared cap) and NONE of the lifecycle law (that lives once in the mesh keel) — a thin bridge only.
 *
 * The atom's id is CONTENT-ADDRESSED (sha256 of {signer, frontier, assertion}) — pure-TS, computed
 * here, so an identical testimony collides idempotently and neither side waits on the other's id.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persistence-keel · lar:///ha.ka.ba/lares/api/pono/has-stack
 */

import {
  canonicalJsonBytes, defaultCryptoProvider, sha256Hex,
  reentryPrior, admit as keelAdmit, storeCodeFrom, observeClaim,
  type Testimony, type Witness, type PersistencePolicy, type StoreCode,
  WITNESS_POLICY,
} from "@lararium/mesh";
import { resolvePersistencePalaceSpawn } from "@lararium/mempalace";

import {
  composePalace, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn,
} from "./palace-holder.js";

/** the palace label — the transport registry key. */
const LABEL = "persistence";

/** A testimony's provenance as the caller presents it (attribution + causal position). */
export interface RecordProvenance {
  readonly signer: string;
  readonly frontier: string;
}

export interface PersistencePalace {
  /**
   * Record a reading as a Testimony (born silent). Content-addressed by {signer, frontier,
   * assertion} — an identical re-record collides idempotently. `document` is the OPTIONAL text
   * projection (the "past text" slot). Returns the testimony id. THROWS if the store did not persist.
   */
  record(kind: string, assertion: readonly number[], provenance: RecordProvenance, pubinfo?: Record<string, unknown>, document?: string): Promise<{ claimCid: string }>;
  /** Load a Testimony by id, or null if absent. */
  get(claimCid: string): Promise<Testimony | null>;
  /** Append a witness edge (corroboration polarity +1 / defeat −1) — the store persists it (move-not-delete). */
  witness(claimCid: string, edge: Witness): Promise<{ ok: boolean; witnesses: number }>;
  /**
   * The FEP re-entry read THROUGH the keel: load the testimony, derive standing+voice under the
   * policy (mode = policy.halfLife), return the low-standing prior. Null if the testimony is absent.
   */
  reentry(claimCid: string, policy?: PersistencePolicy, now?: number): Promise<{ value: readonly number[]; standing: number; voice: "silent" | "spoken" } | null>;
  /**
   * The admit gate THROUGH the keel: score the candidate against the store's OWN code — the diagonal
   * predictive against its pooled-scale sibling — and admit iff the store's code cannot beat ignorance
   * on it. The write-time decision the caller enacts before {@link record}. Carries no threshold.
   */
  admit(candidate: readonly number[], policy?: PersistencePolicy): Promise<{ admit: boolean; score: number; bitsSaved: number }>;
  /** Release this reference to the shared holder; the process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Default holder spawn: the venv-aware python running `persistence_io.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolvePersistencePalaceSpawn);

export interface PersistencePalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: PalaceHolderSpawn;
}

/**
 * Open a PersistencePalace instance rooted at `dir`. Composes the shared transport cap (ref-counted
 * ONE holder per canonical dir) with the persistence op-surface + the mesh keel; `close()` releases
 * this reference. Each sensorium composes its OWN instance — persistence is a cap, not a singleton.
 */
export function makePersistencePalace(dir: string, opts: PersistencePalaceOptions = {}): PersistencePalace {
  // Compose the SHARED transport cap; layer the persistence op-surface + the mesh keel below.
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 30_000);

  const claimCidOf = (kind: string, assertion: readonly number[], prov: RecordProvenance): Promise<string> =>
    sha256Hex(canonicalJsonBytes({ signer: prov.signer, frontier: prov.frontier, assertion }), defaultCryptoProvider);

  // The store's CODE, held here and updated in O(d) per record. The keel's gate reads sufficient statistics
  // over the ADMITTED store — never a neighbourhood, never a per-candidate refit — so one cold seed from a
  // uniform draw of the store, then Welford forever after. A candidate cannot steer this.
  let code: StoreCode | null = null;
  const seedCode = async (dims: number): Promise<StoreCode> => {
    if (code !== null && code.dims === dims) return code;
    const r = (await p.send("sample", { k: 4096, seed: 4241 })) as { population?: number[][] } | null;
    code = storeCodeFrom(r?.population ?? [], dims);
    return code;
  };

  return {
    async record(kind, assertion, provenance, pubinfo = {}, document = ""): Promise<{ claimCid: string }> {
      const claimCid = await claimCidOf(kind, assertion, provenance);
      await p.send("put", {
        claim_cid: claimCid, kind, assertion, signer: provenance.signer, frontier: provenance.frontier, pubinfo, document,
      });
      // The code follows what the store actually holds; a recorded claim joins it, and only then.
      if (code !== null && code.dims === assertion.length) code = observeClaim(code, assertion);
      return { claimCid };
    },

    async get(claimCid: string): Promise<Testimony | null> {
      return (await p.send("get", { claim_cid: claimCid })) as Testimony | null;
    },

    async witness(claimCid: string, edge: Witness): Promise<{ ok: boolean; witnesses: number }> {
      const r = (await p.send("witness", {
        claim_cid: claimCid, signer: edge.signer, frontier: edge.frontier, polarity: edge.polarity,
        ...(edge.tick !== undefined ? { tick: edge.tick } : {}),
      })) as { ok?: boolean; witnesses?: number } | null;
      return { ok: r?.ok ?? false, witnesses: r?.witnesses ?? 0 };
    },

    async reentry(claimCid, policy = WITNESS_POLICY, now?): Promise<{ value: readonly number[]; standing: number; voice: "silent" | "spoken" } | null> {
      const t = (await p.send("get", { claim_cid: claimCid })) as Testimony | null;
      if (t === null) return null;
      return reentryPrior(t, policy, now);   // the keel derives standing+voice — the store never does
    },

    async admit(candidate, policy = WITNESS_POLICY): Promise<{ admit: boolean; score: number; bitsSaved: number }> {
      // A code the candidate cannot select. The `neighbors` op stays available for RECALL, and it must never
      // feed this gate: a k-nearest population makes the model a function of the candidate (so it normalizes
      // to nothing and stops being a code at all), and in high dimension the k-NN list skews toward hubs near
      // the centroid anyway, which admits antihubs on geometry rather than on novelty.
      const c = await seedCode(candidate.length);
      const v = keelAdmit(candidate, c, policy);   // the keel prices — the store only ever supplied the statistics
      return { admit: v.admit, score: v.score, bitsSaved: v.bitsSaved };
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _livePersistenceHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
