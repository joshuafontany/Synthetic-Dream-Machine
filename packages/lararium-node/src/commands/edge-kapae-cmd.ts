/**
 * runEdgeKapae — set a relationship aside, or take the marker back down.
 *
 * THE WRITE ASSERTS NOTHING. It signs an act with a named persona root and lands it on the board; whether
 * that root HOLDS the edge gets decided at the fold, by whichever reader consults the shadow. That split runs
 * through this whole codebase for one reason — a write that adjudicated would let the hand doing the writing
 * grade its own authority. So a raise by a root holding no claim over an edge lands, verifies as a signature,
 * and gets dropped by every reader. It costs the writer a tiddler and buys them nothing.
 *
 * VERSION CLIMBS FROM THE BOARD, never from a guess. The act reads the highest version standing for its edge
 * and lands one above, so a fresh act supersedes rather than ties. A caller MAY pin a version deliberately —
 * the way a partitioned peer re-asserts at a version it already knows — and a same-version tie then leaves the
 * shadow UP, exactly as the law demands.
 *
 * RAISING AND LOWERING STAY SYMMETRIC IN SHAPE AND ASYMMETRIC IN FORCE: both write one signed act, and only
 * the fold knows that a raise wins a tie. Nothing here special-cases the gesture, which keeps the asymmetry
 * in ONE place where it can be read.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/kapae
 */

import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import * as ed from "@noble/ed25519";
import {
  signEdgeKapae, writeEdgeKapae, edgeKapaeActsFromBoard, shadowSetFromBoard,
  edgeKapaeBoardDocUrl, materializeSharedLarDoc, ed25519SignerFromSeed, hexToBytes,
} from "@lararium/mesh";
import { larDataDir } from "../vessel-paths.js";
import { readNexusDoc } from "../nexus-doc.js";
import { daemonBagsDir } from "../lares-config.js";
import {
  listPersonaRoots, loadPersonaGroupRootSeed, loadPersonaGroupRootVerifyingKey, loadVesselVerifyingKey,
} from "../node-vessel-identity.js";

export class EdgeKapaeError extends Error {}

export interface EdgeKapaeOptions {
  /** The relationship to act on — a dyad id, a vouch edge id, any content-addressed edge. */
  readonly edgeId:       string;
  /** true → raise the shadow (set aside); false → lower it (a deliberate re-admission). */
  readonly raised:       boolean;
  /** The epochCid this act roots on — an ORDER, never an instant. */
  readonly epochCid:        string;
  /** WHICH held persona root signs. Absent → the first held root. */
  readonly handleIndex?: number;
  /** Pin the version rather than climbing from the board — for a partitioned re-assertion. */
  readonly version?:     number;
  readonly storageDir?:  string;
}

export interface EdgeKapaeResult {
  readonly edgeId:    string;
  readonly raised:    boolean;
  readonly version:   number;
  readonly epochCid:     string;
  readonly signerDid: string;
  readonly boardUrl:  string;
  /** Whether the shadow STANDS after this act, read back through the verifying fold under this signer. */
  readonly shadowStands: boolean;
}

/** Land one kāpae act on the Nexus board. `now` never enters — an act roots on an epochCid, never a clock. */
export async function runEdgeKapae(opts: EdgeKapaeOptions): Promise<EdgeKapaeResult> {
  const storageDir = opts.storageDir ?? larDataDir();
  const edgeId     = opts.edgeId.trim();
  const epochCid      = opts.epochCid.trim();

  if (edgeId.length === 0) throw new EdgeKapaeError("an edge id names the relationship to act on — none given.");
  if (epochCid.length === 0)  throw new EdgeKapaeError("an epochCid roots the act — none given (an act carries an order, never an instant).");

  const held = await listPersonaRoots(storageDir);
  if (held.length === 0) {
    throw new EdgeKapaeError("no persona root held on this vessel — an act carries a signature, and this vessel signs with none.");
  }
  const handleIndex = opts.handleIndex ?? held[0]!;
  if (!held.includes(handleIndex)) {
    throw new EdgeKapaeError(`persona root ${handleIndex} is not held here (held: ${held.join(", ")}).`);
  }

  const signerDid = await loadPersonaGroupRootVerifyingKey(storageDir, handleIndex);
  if (!signerDid) {
    throw new EdgeKapaeError(`persona root ${handleIndex} surfaces no usable verifying key — nothing to sign with.`);
  }

  const nexusPubkey = await loadVesselVerifyingKey(storageDir);
  const boardUrl    = edgeKapaeBoardDocUrl(nexusPubkey);
  const repo        = new Repo({ storage: new NodeFSStorageAdapter(storageDir) });
  const verify      = (bytes: Uint8Array, sigHex: string, did: string) =>
    ed.verifyAsync(hexToBytes(sigHex), bytes, hexToBytes(did)).catch(() => false);
  try {
    const handle = await materializeSharedLarDoc(repo, boardUrl, "board:edge-kapae");

    // Climb from what STANDS, so an act supersedes rather than ties. A pinned version rides as given.
    const standing = edgeKapaeActsFromBoard(handle.doc()).filter((a) => a.edgeId === edgeId);
    const version  = opts.version ?? (standing.reduce((m, a) => Math.max(m, a.version), 0) + 1);
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new EdgeKapaeError(`version ${version} sits below the monotone floor — a counter starts at 1.`);
    }

    const act = await signEdgeKapae(
      { edgeId, raised: opts.raised, version, epochCid },
      ed25519SignerFromSeed(await loadPersonaGroupRootSeed(storageDir, handleIndex)),
    );
    handle.change((d) => writeEdgeKapae(d, act));
    await repo.flush();

    // Read the act BACK through the verifying fold, under this signer as the edge's authority. A caller
    // learns whether the shadow now STANDS rather than merely whether a tiddler landed — and an act that
    // cannot survive its own extraction refuses loudly here instead of sitting on the board doing nothing.
    // The chain that orders the act. A command deciding whether a shadow STANDS holds the chain that
    // orders standing — epochCid outranks version, and nobody runs ahead of an epochCid not yet minted.
    const chain = readNexusDoc(daemonBagsDir())?.sealLineage ?? [];
    const rank  = new Map(chain.map((e) => [e.epochCid, e.epoch]));   // cid → its ORDINAL position in the chain
    const shadowed = await shadowSetFromBoard(
      handle.doc(), () => signerDid, verify, (cid) => rank.get(cid) ?? null,
    );
    return { edgeId, raised: opts.raised, version, epochCid, signerDid, boardUrl, shadowStands: shadowed.has(edgeId) };
  } finally {
    await repo.flush().catch(() => { /* best-effort final flush */ });
  }
}
