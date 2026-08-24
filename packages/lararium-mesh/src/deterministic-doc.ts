/**
 * deterministic-doc — per-Nexus doc addresses every island member computes ALIKE, so a shared board needs no
 * advertisement and no mint-race.
 *
 * The oracle plane already proves the shape (genesis-doc: oracleGenesisDocUrl derives an automerge: URL from
 * a well-known seed, so every vessel materializes the SAME doc under one stable id). The WHO plane reuses it:
 * a Nexus's crossroads doc and its WHO board each derive a deterministic URL from the nexus-pubkey, so two
 * browsers on one island resolve the identical board WITHOUT any node advertising its URL — and because the
 * board's id is a pure function of the nexus, no two vessels ever mint two competing boards (the pointer
 * write-back becomes idempotent: every vessel writes the same URL).
 *
 * Pure address derivation + a find-or-materialize helper. No key, no HTTP. The rare cross-version residual is
 * the same one @oracle carries (genesis-doc): a peer SYNCS an existing board far more often than it
 * re-materializes, and a blank board merges trivially.
 */
import type { Repo, DocHandle, DocumentId } from "@automerge/automerge-repo";
import { interpretAsDocumentId, stringifyAutomergeUrl, type AutomergeUrl, type BinaryDocumentId } from "@automerge/automerge-repo";
import { save as automergeSave } from "@automerge/automerge";
import { pinnedDoc } from "./pinned-doc.js";
import { sha256BytesSync, utf8Bytes } from "./crypto.js";
import { resolveBootDoc } from "./boot-resolver.js";
import { CROSSROADS_DOC_URI, nexusHandlesUri, nexusRegistryUri } from "./lar-uris.js";
import { emptyLarDoc, type LarDoc } from "./base-doc.js";

/** Derive a deterministic automerge: URL from a seed string — the first 16 bytes of its sha256 as the doc-id. */
export function deterministicDocUrl(seed: string): AutomergeUrl {
  const binId = sha256BytesSync(utf8Bytes(seed)).slice(0, 16) as BinaryDocumentId;
  return stringifyAutomergeUrl({ documentId: binId });
}

/** The Nexus's crossroads doc URL — the public plane's per-island address (deterministic). */
export function crossroadsDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${CROSSROADS_DOC_URI}#${nexusPubkey}`);
}

/** The Nexus's WHO board URL — deterministic, so every island member resolves the one board with no mint-race. */
export function whoBoardDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusHandlesUri(nexusPubkey)}#board`);
}

/**
 * The Nexus's Kapae-ANTIGEN board URL — deterministic, so the quorum-signed immune antigen rides the
 * always-carried public plane every island member resolves alike (carry-contract MANDATORY tier). The
 * federation gate federates this board like @crossroads + WHO, so the antigen propagates to every honest
 * carrier by contract — the immune system saturates the connected mesh (bounded by sync-latency, never
 * instant; siege-resilience #the-honest-edges).
 */
export function kapaeAntigenDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusRegistryUri(nexusPubkey)}#kapae-antigen`);
}

/**
 * The Nexus's operator MEMBERS-registry board URL — deterministic, so the quorum-signed members{} ALLOW-set
 * rides the always-carried public plane every island member resolves alike (carry-contract MANDATORY tier).
 * The ALLOW-twin of `kapaeAntigenDocUrl` (members{} ⊥ blocked{}), a sibling under the same `nexusRegistryUri`.
 * The federation gate federates this board like @crossroads + WHO + the antigen, so an admit propagates to
 * every honest carrier and the carry-split's member gate reads a live set — bounded by sync-latency, never a
 * global now. It carries operator CONTRACTS only (pubkey + charter-epoch + accepts-carriage), never a user.
 */
export function carriageDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusRegistryUri(nexusPubkey)}#carriage`);
}

/**
 * The Nexus's VOUCH board URL — deterministic, so every vessel folds the lineage from the SAME issued
 * invites. Sibling to the carriage + antigen boards under one nexus-pubkey: carriage says who carries,
 * antigen says who stands banned, and this says WHO VOUCHED FOR WHOM — the seed-rooted DAG the admission
 * price walks. A vouch is board-tracked precisely because it is attributable (cabal-invite names its
 * voucher in the clear); the TRACELESS boot-invite has no board and must never gain one.
 */
export function vouchBoardDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusRegistryUri(nexusPubkey)}#vouch`);
}

/**
 * The Nexus's EDGE-KĀPAE board URL — deterministic, so every vessel folds the same shadows. The fifth
 * sibling under one nexus-pubkey: carriage says who carries, antigen who stands banned, vouch who vouched
 * for whom, KEL who a persona is over time — and this one says WHICH RELATIONSHIPS STAND SET ASIDE.
 *
 * A shadow federates precisely because a raised marker must reach the peers who would otherwise re-admit;
 * unlike a revocation LIST it carries no negative fact about any party, only a mark over one edge.
 */
export function edgeKapaeBoardDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusRegistryUri(nexusPubkey)}#edge-kapae`);
}

/**
 * The Nexus's PERSONA-KEL board URL — deterministic, so the per-Nexus key-event-log board (every persona's
 * PUBLIC KEL head/events) rides the always-carried plane every island member resolves alike. A sibling of the
 * WHO board (both derive from `nexusHandlesUri` — the public WHO face), because the KEL PUBLICLY advertises
 * which op-key currently heads each identifier; the PRIVATE keys / recovery-commit stay in the persona bag.
 * The federation gate federates this board like @crossroads + WHO, so a rotation propagates to every honest
 * carrier and a stranger walks the identifier→head mapping cold — bounded by sync-latency, never a global now.
 */
export function personaKelBoardDocUrl(nexusPubkey: string): AutomergeUrl {
  return deterministicDocUrl(`${nexusHandlesUri(nexusPubkey)}#persona-kel`);
}

/**
 * Find the shared doc if it's already present (a prior boot or a synced peer), else materialize a blank one
 * UNDER the deterministic id. Uses hearth-private patience (the @oracle materialize path's choice): a missing
 * doc is the legitimate first boot — the anchor materializes rather than waiting a long mesh-delivery window.
 * Two vessels racing to be first both import the SAME ambient-free blank bytes (`pinnedDoc` pins the actor AND
 * the clock — an unpinned clock alone splits one actor's seq 1 in two and automerge refuses the merge), so they
 * converge byte-identical and diverge only as each writes its own card, under the fresh actor its own handle
 * mints (the benign blank-merge the @oracle path also accepts).
 */
/**
 * `label` names the board for a HUMAN — it rides into the boot-resolver's failure text and its
 * still-joining record, and reaches no gate, no registry and no capability check.
 *
 * It therefore MUST NOT wear `@slug` clothing. In this house `@name` means a BAG: a thing that is seeded,
 * mounted, registered, cap-checked and reachable by that exact string. A board is none of those — it stands
 * at a deterministic doc url derived from a Nexus key, and its identity IS that url. A diagnostic dressed as
 * a bag id invites a reader to treat it as one, and the two kinds then sit one character apart in a grep.
 *
 * So boards read `board:<what-it-carries>`, and the sigil stays honest: `@` names a bag, everywhere.
 */
export async function materializeSharedLarDoc(
  repo: Repo,
  url: AutomergeUrl,
  label: string,
): Promise<DocHandle<LarDoc>> {
  try {
    const existing = await resolveBootDoc<LarDoc>(repo, url, { tideline: "hearth-private", label });
    return existing;   // present (persisted or synced) → use it
  } catch {
    // unavailable → this vessel is first: materialize a blank board under the deterministic id
  }
  const bytes  = automergeSave(pinnedDoc(emptyLarDoc() as unknown as Record<string, unknown>));
  const handle = repo.import<LarDoc>(bytes, { docId: interpretAsDocumentId(url) as DocumentId });
  await handle.whenReady();
  return handle;
}
