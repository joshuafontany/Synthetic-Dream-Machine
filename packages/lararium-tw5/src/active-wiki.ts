import {
  DAEMON_BAG_ID,
  type LarTiddlerRecord,
} from "@lararium/mesh";

export const ACTIVE_WIKI_URI = `${DAEMON_BAG_ID}/active-wiki`;

export type ActiveWikiSelectionSource = "boot-arg" | "daemon-marker";

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
    ? { slug: selected, source: "daemon-marker" }
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
