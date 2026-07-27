/**
 * vessel-residency-wiring — the ONE residency/vessel-wiring factory both vessels compose.
 *
 * The pool-collapse already made the island POOL platform-blind (VesselIslandPoolCore + a
 * per-vessel VesselIslandHost). This collapses the WIRING that stood around the pool twice —
 * near byte-identical in open-node-vessel.ts and open-browser-vessel.ts:
 *
 *   A. the BagStowage construction (onHydrate → ensureWiki; onEvict → unmountWiki),
 *   B. resolveWikiSpec (the UNKNOWN-grain branch: read a wiki's canon-doc off @catalog),
 *   C. makeWikiActivationCap (activation-on-reference, the vessel's grant point),
 *   D. the sovereign-worker residency binding (daemon onEvictRequest / onResidencyOp),
 *   E. wiki-alert delivery (the single-flight ensureActive → placeWikiVerb orchestration).
 *
 * Everything genuinely vessel-specific rides a HOOK or a CONFIG value, never a copy-pasted block:
 *   - the live-wiki cap + pin budget (node runs the full grant, browser the minimal one) → config,
 *   - the onEvict LOG (node narrates the cool; browser stays silent) → hooks.onWikiCooled/onBagCooled,
 *   - the undeliverable-alert TAIL (node PARKS in the durable mailbox; browser WARNS + drops
 *     best-effort) → hooks.onUndeliverableAlert,
 *   - the system-alert arg augmentation (node stamps `kind`; browser stamps nothing) → hooks.alertArgs.
 *
 * A THIRD vessel type adds zero duplication: it supplies its own VesselIslandHost (pool) + this
 * config + these hooks, and the shared body wires the rest. Isomorphism-by-composition.
 *
 * Home: tw5 (not mesh) — resolveWikiSpec calls buildWikiMountSpec, which lives in tw5; the layer
 * law forbids mesh importing tw5. Both vessels already import tw5, so this shore sits below both.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/vessel-residency-wiring
 */

import {
  BagStowage,
  makeWikiActivationCap,
  slugFromUri, wikiBagUri, tiddlerText,
  DEFAULT_HOT_CAP, DEFAULT_IDLE_MS, DEFAULT_SWEEP_INTERVAL_MS,
} from "@lararium/mesh";
import type {
  ActivationPool, WikiActivationCap, ResolveWikiSpec,
  LarDoc, DocHandle,
} from "@lararium/mesh";
import { buildWikiMountSpec } from "./vessel-steps.js";
import type { DaemonVmCore } from "./daemon-vm-core.js";

/** The pool surface the residency HYDRATE/EVICT hooks drive — a wiki grain heats by re-mounting,
 *  cools by unmounting. Both vessel pools (extending VesselIslandPoolCore) satisfy it. */
export interface VesselResidencyPool {
  ensureWiki(wikiId: string): Promise<boolean>;
  unmountWiki(wikiId: string): Promise<void>;
}

/** A system-alert job placed into a wiki island (the daemon's operator-facing alert). */
export interface VesselAlertVerbOpts {
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
}

/** Why a wiki-alert could not land on a live island — passed to the vessel's undeliverable hook.
 *  node ignores the reason (it parks regardless); browser maps it to a distinct warn line. */
export type AlertDropReason = "raced-cold" | "unmounted-no-mailbox" | "not-activatable";

/** The per-vessel divergences the shared body delegates — never a copy-pasted block. */
export interface VesselResidencyHooks {
  /** A wiki grain cooled (after the island unmounted). node narrates it; browser stays silent. */
  onWikiCooled?: (wikiId: string) => void;
  /** A non-wiki bag grain cooled. node narrates the repo#358 reserve; browser stays silent. */
  onBagCooled?: (bagId: string) => void;
  /** Extra system-alert args this vessel folds into the delivery (node stamps `kind`; browser none). */
  alertArgs?: (kind: string | undefined) => Record<string, unknown>;
  /** An alert that could NOT reach a live island. node PARKS it durably (the mailbox, reason-blind);
   *  browser WARNS + drops (best-effort — a browser holds no durable mailbox). */
  onUndeliverableAlert: (wikiId: string, verbOpts: VesselAlertVerbOpts, reason: AlertDropReason) => void;
}

/** The vessel's grant point on the residency spectrum + the shared collector dials. */
export interface VesselResidencyConfig {
  /** Concurrent live-wiki cap — the collector's `wiki` typeCap (node 4, browser 2). */
  wikiActivationCap: number;
  /** Rotatable wiki-pin budget BESIDES @daemon (node 3, browser 1). */
  wikiPinBudget: number;
  /** Bag hot-cap override (default DEFAULT_HOT_CAP). */
  hotCap?: number;
  /** Idle-cool threshold override (default DEFAULT_IDLE_MS). */
  idleMs?: number;
  /** Sweeper tick override (default DEFAULT_SWEEP_INTERVAL_MS). */
  sweepIntervalMs?: number;
}

/** The now-live pieces `wireToPool` composes over — supplied inside the vessel's makePool, once
 *  the pool + daemon + genesis assembly stand. */
export interface WireToPoolArgs {
  /** The sovereign daemon core — carries resolveBinding (for the resolver) + the residency/alert shores. */
  daemon: DaemonVmCore;
  /** The live island pool — the activation cap reads it + the alert delivery places verbs into it. */
  pool: ActivationPool & VesselResidencyPool & {
    placeWikiVerb(wikiId: string, opts: VesselAlertVerbOpts): Promise<Record<string, unknown>>;
  };
  /** The engine core hash (genesis assembly). */
  coreHash: string;
  /** The @oracle island doc url (genesis assembly). */
  islandUrl: string;
  /** The @catalog handle — resolveWikiSpec reads a wiki's canon-doc url off it. */
  catalogHandle: DocHandle<LarDoc>;
}

/** The factory's product: the collector (built now) + the pool-wiring continuation (run in makePool). */
export interface VesselResidency {
  residency: BagStowage;
  /** Wire the activation cap + daemon binding + alert delivery once the pool + daemon stand.
   *  Returns the activation-on-reference cap the vessel's verb plane reads. */
  wireToPool(args: WireToPoolArgs): WikiActivationCap;
}

/**
 * Build the ONE residency + pool-wiring for a vessel.
 *
 * `getPool` reads the pool LAZILY (the forward `let vmManager!` pattern both vessels already run):
 * the collector is built BEFORE the pool (it rides the mesh caps + the boot pins), so its
 * onHydrate/onEvict reach the pool through this getter at call time, never at construction.
 */
export function makeVesselResidency(
  getPool: () => VesselResidencyPool,
  config:  VesselResidencyConfig,
  hooks:   VesselResidencyHooks,
): VesselResidency {
  // ── A. The ONE residency collector — bags AND wiki islands, per-grain-type dials. Sole
  //    authority for reachability + eviction (the pool never self-evicts). wiki grains heat by
  //    re-mounting (onHydrate → ensureWiki) and cool by unmounting (onEvict → unmountWiki); the
  //    cool NARRATION rides the vessel hook (node speaks, browser stays silent). ──
  const residency = new BagStowage({
    hotCap:          config.hotCap ?? DEFAULT_HOT_CAP,
    typeCaps:        { wiki: config.wikiActivationCap },
    idleMs:          config.idleMs ?? DEFAULT_IDLE_MS,
    sweepIntervalMs: config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS,
    onHydrate: async (id, grainType) => {
      if (grainType === "wiki") await getPool().ensureWiki(id);
    },
    onEvict: async (id, grainType) => {
      if (grainType === "wiki") {
        await getPool().unmountWiki(id);
        hooks.onWikiCooled?.(id);
      } else {
        hooks.onBagCooled?.(id);
      }
    },
  });

  const wireToPool = ({ daemon, pool, coreHash, islandUrl, catalogHandle }: WireToPoolArgs): WikiActivationCap => {
    // ── B. resolveWikiSpec — the UNKNOWN-grain branch of activation-on-reference (the true
    //    multi-wiki swap). READ-ONLY catalog lookup: a bare reference to a never-opened wiki
    //    resolves its mount spec from the recipe/catalog; a slug with no automerge canon-doc
    //    returns null (the caller parks/drops — never a phantom mint). The island self-resolves
    //    its composition from the grants (buildWikiMountSpec), and the daemon reaches any bag by
    //    ACCESS, so no vessel-composite layer mount is needed here. ──
    const resolveWikiSpec: ResolveWikiSpec = async (wikiId) => {
      const slug    = slugFromUri(wikiId);
      const wikiUrl = tiddlerText(catalogHandle.doc()?.tiddlers?.[wikiBagUri(slug)]) ?? null;
      if (!wikiUrl || !wikiUrl.startsWith("automerge:")) return null;   // unknown → park/drop
      const { spec } = await buildWikiMountSpec(daemon, {
        activeWikiId: wikiId,
        wikiSlug:     slug,
        coreHash,
        islandUrl,
        wikiUrl,
        catalogUrl:   catalogHandle.url,
      });
      return spec;
    };

    // ── C. The activation-on-reference CAP the vessel HOLDS + the resolver READS. Its grant is
    //    this vessel's point on the spectrum (node the full grant, browser the minimal one). ──
    const wikiActivation = makeWikiActivationCap(
      residency,
      pool,
      { activationCap: config.wikiActivationCap, pinBudget: config.wikiPinBudget },
      resolveWikiSpec,
    );

    // ── D. Sovereign-worker residency binding: a daemon evict routes THROUGH the ONE collector
    //    (cool → onEvict → unmountWiki) so the collector stays authoritative — never a direct
    //    unmount that would desync its wela/anu view (and it refuses a pinned grain, correctly).
    //    The daemon's pin/unpin/register-cold ops drive the same collector. ──
    daemon.onEvictRequest(async (bagId) => { await residency.cool(bagId); });
    daemon.onResidencyOp(async (op, bagId, reason) => {
      if (op === "pin")        await residency.pin(bagId, reason);
      else if (op === "unpin") residency.unpin(bagId);
      else                     residency.registerCold(bagId);
    });

    // ── E. Wiki-alert delivery. The worker names an affected wiki; place a system-alert verb into
    //    that wiki's live island. The SHARED part is the resolver-as-activator single-flight
    //    orchestration: a REFERENCE to a cold wiki ACTIVATES it (ensureActive re-mounts a known
    //    grain, or resolves a never-opened grain's spec through resolveWikiSpec, single-flight),
    //    THEN delivers. The per-vessel part is the UNDELIVERABLE tail — node parks the verb durably
    //    (a dropped verb stays observable, never nowhere — the Akka /deadLetters lesson); browser
    //    holds no durable mailbox, so an un-activatable grain is a best-effort drop, warned LOUD.
    //    Every failure path routes to the vessel's undeliverable hook, reason-named. ──
    daemon.onWikiAlert((wikiSlug, message, cause, kind) => {
      const wikiId = wikiSlug;
      const verbOpts: VesselAlertVerbOpts = {
        verb: "system-alert",
        args: { message, cause: cause ?? "", ...(hooks.alertArgs?.(kind) ?? {}) },
        requestedBy: "daemon",
      };
      void wikiActivation.ensureActive(wikiId)
        .then((live) => (live
          ? pool.placeWikiVerb(wikiId, verbOpts).then(() => {}).catch(() => hooks.onUndeliverableAlert(wikiId, verbOpts, "raced-cold"))
          : hooks.onUndeliverableAlert(wikiId, verbOpts, "unmounted-no-mailbox")))
        .catch(() => hooks.onUndeliverableAlert(wikiId, verbOpts, "not-activatable"));
    });

    return wikiActivation;
  };

  return { residency, wireToPool };
}
