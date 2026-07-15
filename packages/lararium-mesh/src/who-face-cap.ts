/**
 * who-face-cap — the isomorphic vessel cap that wires the WHO plane (identity federation).
 *
 * The identity sibling of meshPalaceCap: where the carriage cap wires the @meshpalace FLOW-map (WHERE to
 * dial), this wires the per-Nexus WHO board (WHO a veiled-user is) — the two-key atom's two planes, two caps.
 * A vessel composing this cap resolves its Nexus's WHO board through @crossroads (the public plane),
 * self-announces its own handle-card onto it, and layers the board WRITABLE so the relay syncs it. Pulling
 * peers' cards into a HandleBook rides the returned component's `ingest`.
 *
 * Isomorphic and platform-blind, exactly like meshPalaceCap: a browser vessel composes the very same cap a
 * node does. The board carries no write-ACL — the self-certifying card is the trust (who-face), so an
 * openly-synced board stays forgery-proof. Requires the substrate (the composite to layer the board into).
 *
 * Canon: lar:///ha.ka.ba/lararium/docs/crossroads · lar:///ha.ka.ba/lares/api/pono/persona-circle#the-vault
 */
import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import type { CapModule } from "./cap-compose.js";
import { AutomergeDocStore } from "./automerge-doc-store.js";
import { resolveWhoFace, announceToWhoFace } from "./who-face.js";
import { ingestAnnounceDoc } from "./handle-announce.js";
import { materializeSharedLarDoc, whoBoardDocUrl } from "./deterministic-doc.js";
import type { HandleBook } from "./handle-book.js";
import type { HandleCard, CardVerdict } from "./handle-card.js";
import { nexusHandlesUri } from "./lar-uris.js";
import { type LarDoc } from "./base-doc.js";
import type { VesselCoreAssembly } from "./open-vessel-core.js";
import type { BagResidencyManager } from "./bag-residency.js";

/** The WHO-plane cap-id — a vessel's #has-cap-stack names it to wire identity federation. */
export const WHO_FACE_CAP = "who-face" as const;

/** The substrate cap-id this cap layers into — a WIRE-STRING matched by VALUE (mesh can't import CORE_CAP). */
const SUBSTRATE_CAP_ID = "substrate";

/** The WHO board handle + an ingest that pulls its current cards into a recogniser's book. */
export interface WhoFaceComponent {
  readonly handle: DocHandle<LarDoc>;
  readonly ingest: (book: HandleBook, now?: number) => Promise<Map<string, CardVerdict>>;
}

/**
 * whoFaceCap — resolve the Nexus's WHO board through @crossroads, self-announce this vessel's card onto it,
 * layer it writable (so the relay syncs it), and expose an ingest. `crossroadsHandle` is the resolved public
 * plane; `nexusPubkey` scopes the board to one causal island; `card` is the vessel's own announced Handle.
 */
export function whoFaceCap(deps: {
  repo: Repo;
  crossroadsHandle: DocHandle<LarDoc>;
  nexusPubkey: string;
  card: HandleCard;
  residency?: BagResidencyManager;
}): CapModule {
  return {
    id: WHO_FACE_CAP, requires: [SUBSTRATE_CAP_ID],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(SUBSTRATE_CAP_ID);
      // The board rides a DETERMINISTIC per-Nexus id — so a null pointer materializes THE island board (never
      // a random one), the pointer write-back is idempotent across vessels, and no two vessels mint two boards.
      const board = await resolveWhoFace(
        deps.crossroadsHandle, deps.nexusPubkey,
        (url) => (url
          ? deps.repo.find<LarDoc>(url as AutomergeUrl)
          : materializeSharedLarDoc(deps.repo, whoBoardDocUrl(deps.nexusPubkey), "who-board")),
        "who-face-self-announce",
      );
      announceToWhoFace(board, deps.card);   // the vessel announces its own Handle onto the board
      const bagId = nexusHandlesUri(deps.nexusPubkey);
      assembly.composite.addLayer({
        bagId, store: new AutomergeDocStore(board, bagId), writable: true, defaultWritable: true,
      });
      await deps.residency?.pin(bagId, "boot:who-face");
      return {
        handle: board,
        ingest: (book: HandleBook, now?: number) => ingestAnnounceDoc(book, board.doc()!, now),
      };
    },
  };
}
