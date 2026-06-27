import {
  DAEMON_BAG_ID,
  LARES_DOC_URI,
  CompositeStore,
  type LarTiddlerRecord,
  type LarTiddlerStore,
  wikiBagUri,
  wikiDraftBagUri,
} from "@lararium/mesh";

export const ACTIVE_WIKI_URI = `${DAEMON_BAG_ID}/active-wiki`;

export type ActiveWikiSelectionSource = "boot-arg" | "admin-marker";

export interface ActiveWikiSlotPlan {
  readonly wikiSlug: string;
  readonly wikiKey: string;
  readonly wikiBagId: string;
  readonly draftBagId: string;
  readonly draftOracleTitle: string;
  readonly vesselId: string;
}

export interface ActiveWikiLayerMount {
  readonly plan: ActiveWikiSlotPlan;
  readonly wikiStore: LarTiddlerStore;
  readonly draftStore: LarTiddlerStore;
}

export function readActiveWikiSlug(record: Pick<LarTiddlerRecord, "tiddler"> | null | undefined): string | null {
  const text = record?.tiddler?.text;
  if (typeof text !== "string") return null;
  const slug = text.trim();
  return slug.length > 0 ? slug : null;
}

export function selectActiveWikiSlug(
  fallbackSlug: string,
  record: Pick<LarTiddlerRecord, "tiddler"> | null | undefined,
): { slug: string; source: ActiveWikiSelectionSource } {
  const selected = readActiveWikiSlug(record);
  return selected
    ? { slug: selected, source: "admin-marker" }
    : { slug: fallbackSlug, source: "boot-arg" };
}

export function buildActiveWikiRecord(
  slug: string,
  authority: string,
  updatedAt = new Date().toISOString(),
): LarTiddlerRecord {
  return {
    tiddler: {
      title: ACTIVE_WIKI_URI,
      text: slug,
      "updated-at": updatedAt,
    },
    meta: { authority },
  };
}

export function planActiveWikiSlot(opts: {
  hostId: string;
  wikiSlug: string;
  identityDid: string;
}): ActiveWikiSlotPlan {
  // The @lares-as-wiki quine: slug "lares" opens the protocol-invariant bag
  // ITSELF as the primary write layer (operator edits the personality at the
  // hearth). Its doc is operator-minted on the invariant plane — the slot key
  // names that bag directly, never a registry-resolved @lararium/wikis/ doc.
  const wikiKey = opts.wikiSlug === "lares" ? LARES_DOC_URI : wikiBagUri(opts.wikiSlug);
  return {
    wikiSlug: opts.wikiSlug,
    wikiKey,
    wikiBagId: wikiKey,
    draftBagId: wikiDraftBagUri(opts.wikiSlug),
    draftOracleTitle: `${wikiBagUri(opts.wikiSlug)}/drafts/${encodeURIComponent(opts.identityDid)}`,
    vesselId: `${opts.hostId}:${opts.wikiSlug}`,
  };
}

export class ActiveWikiLayerSlot {
  private currentPlan: ActiveWikiSlotPlan | null = null;

  constructor(private readonly composite: CompositeStore) {}

  get current(): ActiveWikiSlotPlan | null {
    return this.currentPlan;
  }

  mount(mount: ActiveWikiLayerMount): ActiveWikiSlotPlan {
    if (
      this.currentPlan?.wikiBagId === mount.plan.wikiBagId
      && this.currentPlan?.draftBagId === mount.plan.draftBagId
    ) {
      return mount.plan;
    }

    this.unmount();

    if (this.composite.hasBag(mount.plan.wikiBagId) || this.composite.hasBag(mount.plan.draftBagId)) {
      throw new Error(
        `ActiveWikiLayerSlot: active wiki layers already registered for ${mount.plan.wikiSlug}`,
      );
    }

    this.composite.addLayer({ bagId: mount.plan.wikiBagId, store: mount.wikiStore, writable: true });
    this.composite.addLayer({ bagId: mount.plan.draftBagId, store: mount.draftStore, writable: true });
    this.currentPlan = mount.plan;
    return mount.plan;
  }

  unmount(): void {
    if (!this.currentPlan) return;
    this.composite.removeLayer(this.currentPlan.draftBagId);
    this.composite.removeLayer(this.currentPlan.wikiBagId);
    this.currentPlan = null;
  }
}