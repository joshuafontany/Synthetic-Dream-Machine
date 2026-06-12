/**
 * vessel-mailbox — the durable mailbox of the lane law (§7), keel-resident
 * and substrate-agnostic: node and browser vessels wire the same mechanism.
 *
 * A verb addressed to an island that isn't live PARKS as a record in
 * @admin keyed by island identity; the island's next `ea` (its own breath
 * declaration) drains it — deliver-to-IDENTITY: the message survives the
 * island and arrives when the identity breathes again. The record's
 * status transition (parked → delivered) makes one artifact serve as
 * idempotency ledger and audit log both.
 *
 * Lane law: this rides the merge seat. Nothing here touches workers or
 * ports — the caller supplies `placeVerb` (its own live-delivery path).
 */

import { ADMIN_BAG_ID } from "./lar-uris.js";
import type { CompositeStore } from "./composite-store.js";

const MAILBOX_PREFIX = "lar:///ha.ka.ba/@admin/mailbox/";

export interface MailboxVerb {
  readonly verb:        string;
  readonly args:        Record<string, unknown>;
  readonly requestedBy: string;
}

export interface DurableMailbox {
  /** Park a verb for a non-live island — durably, visibly, never silently. */
  park(wikiId: string, v: MailboxVerb): Promise<void>;
  /** Deliver every parked verb for this island; failures stay parked. */
  drain(wikiId: string): Promise<void>;
}

export function makeDurableMailbox(
  composite: CompositeStore,
  placeVerb: (wikiId: string, v: MailboxVerb) => Promise<unknown>,
  log: (line: string) => void = () => {},
): DurableMailbox {
  return {
    async park(wikiId, v): Promise<void> {
      const id = crypto.randomUUID();
      await composite.put({
        tiddler: {
          title: `${MAILBOX_PREFIX}${wikiId}/${id}`,
          "wiki-id": wikiId,
          verb: v.verb,
          args: JSON.stringify(v.args),
          "requested-by": v.requestedBy,
          status: "parked",
          "parked-at": new Date().toISOString(),
        },
        meta: {},
      }, { kind: "lares-verb", requestId: id }, { bag: ADMIN_BAG_ID });
      log(`[mailbox] parked ${v.verb} for ${wikiId} (island not live)`);
    },

    async drain(wikiId): Promise<void> {
      const prefix = `${MAILBOX_PREFIX}${wikiId}/`;
      const titles = (await composite.listVisible()).filter((t) => t.startsWith(prefix));
      for (const title of titles) {
        const rec = await composite.get(title);
        const f = rec?.tiddler as Record<string, string> | undefined;
        if (!rec || !f || f["status"] !== "parked") continue;
        try {
          await placeVerb(wikiId, {
            verb: f["verb"]!,
            args: JSON.parse(f["args"] ?? "{}") as Record<string, unknown>,
            requestedBy: f["requested-by"] ?? "mailbox",
          });
          await composite.put({
            tiddler: { ...f, title, status: "delivered", "delivered-at": new Date().toISOString() },
            meta: rec.meta ?? {},
          }, { kind: "lares-verb", requestId: `${title}#delivered` }, { bag: ADMIN_BAG_ID });
          log(`[mailbox] delivered ${f["verb"]} to ${wikiId}`);
        } catch { /* island died mid-drain — record stays parked for the next ea */ }
      }
    },
  };
}
