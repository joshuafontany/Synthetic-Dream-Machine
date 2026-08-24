/**
 * engine-watch — island-side engine-epoch drift detection (isomorphic).
 *
 * The island booted an engine it witnessed (ctx.engine — sha256 the kernel
 * computed over the eval'd core bytes). The lararium doc keeps syncing after
 * boot; when a new genesis merges in (reconcileIslandFromGenesis on a vessel
 * carrying a newer artifact), the blobs[ENGINE_CORE_ID] entry moves under the
 * running island. This watch observes that move and writes an "engine waiting"
 * alert into the island's OWN temp — alert-only, never auto-reboot: the
 * update arrives as an offer; the operator holds the reboot capability, and
 * reboot re-verifies the new engine from genesis the same way the first booted.
 *
 * Hazard handling (engine-epoch design):
 *   - rollback  — a pointer moving to a LOWER version gets named as such in the
 *                 alert body, never silently presented as an upgrade.
 *   - ethics    — "waiting" framing (Service-Worker vocabulary): readiness, not
 *                 coercion. No enforcement lives here.
 *   - authority — deliberately ABSENT (held open until the wiki-mesh lives):
 *                 this watch trusts the lararium doc's write-capability story.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/engine-watch
 */

import {
  BAG_IDS,
  ENGINE_CORE_ID,
  wikiSlotUri,
  type ChangeOrigin,
  type DocHandle,
  type LarDoc,
} from "@lararium/mesh";
import type { IslandContext } from "./island-context.js";

/** The engine-waiting alert tiddler title. Stable title = one coalesced alert;
 *  volatile (temp) → self-clearing on the reboot that adopts the epoch. */
export const ENGINE_WAITING_ALERT_TITLE = "$:/temp/lares/alert/engine-waiting";
/** TW5's built-in alert tag — tiddlers carrying it surface in the alerts area. */
const TW5_ALERT_TAG = "$:/tags/Alert";

/** Numeric-aware version order: negative = a older than b. Empty sorts oldest. */
function compareVersions(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * startEngineWatch — subscribe to the island's @lararium handle; on any change
 * whose core-blob sha256 differs from the booted engine, write the waiting
 * alert. Returns a cleanup (unsubscribe) for onHooAnu, or undefined when the
 * island carries no lararium slot (e.g. bare test recipes).
 */
export function startEngineWatch(ctx: IslandContext): (() => void) | undefined {
  const handle = ctx.handles.get(BAG_IDS.oracle) as DocHandle<LarDoc> | undefined;
  if (!handle) return undefined;

  let lastAlertedSha: string | null = null;

  const check = (): void => {
    const entry = handle.doc()?.blobs?.[ENGINE_CORE_ID];
    if (!entry?.sha256) return;
    if (entry.sha256 === ctx.engine.sha256) return;          // still the booted engine
    if (entry.sha256 === lastAlertedSha) return;             // already alerted this epoch
    // The sha guard advances SYNCHRONOUSLY (coalesces repeat change-events for this epoch to
    // one put), but a FAILED write must NOT stay swallowed: the engine-waiting / rollback notice
    // is an operator-critical alert. On a put rejection we roll the guard back to `prevAlerted`
    // so the NEXT change retries, and surface the failure LOUD — never a silent drop.
    const prevAlerted = lastAlertedSha;
    lastAlertedSha = entry.sha256;

    const incoming  = String(entry.version ?? "");
    const direction = compareVersions(incoming, ctx.engine.version);
    const message = direction < 0
      ? `Engine pointer moved BACKWARD (${ctx.engine.version} → ${incoming}) — possible rollback; verify the source before rebooting.`
      : `Engine ${incoming} waiting — reboot to verify and adopt (running ${ctx.engine.version}).`;

    const origin: ChangeOrigin = { kind: "lares-verb", requestId: `engine-watch-${Date.now()}` };
    void ctx.composite.put(
      {
        tiddler: {
          title:           ENGINE_WAITING_ALERT_TITLE,
          text:            message,
          tags:            TW5_ALERT_TAG,
          "alert-kind":    "engine-waiting",
          "waiting-sha256":  entry.sha256,
          "waiting-version": incoming,
          "booted-sha256":   ctx.engine.sha256,
          "booted-version":  ctx.engine.version,
          ts:              new Date().toISOString(),
        },
      },
      origin,
      { bag: wikiSlotUri(ctx.recipe.wikiSlug, "temp") },
    ).catch((err: unknown) => {
      // The alert write FAILED. Without this leg the notice vanished silently AND stayed
      // suppressed forever (the sha guard already advanced past this epoch). Roll the guard
      // back so the next change retries, and surface the drop LOUD.
      lastAlertedSha = prevAlerted;
      console.warn(
        `[engine-watch] FAILED to write the engine-waiting alert for ${incoming} ` +
        `(sha ${entry.sha256}); rolled back — will retry on the next @oracle change: ${String(err)}`,
      );
    });
  };

  const onChange = (): void => check();
  handle.on("change", onChange);
  check();   // the doc may already carry a waiting epoch at ea (offline boot, late mount)
  return () => handle.off("change", onChange);
}
