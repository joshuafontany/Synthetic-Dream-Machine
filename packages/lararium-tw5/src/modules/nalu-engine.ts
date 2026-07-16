/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/nalu-engine
type: application/javascript
module-type: startup
\*/
/**
 * nalu-engine — TW5 startup module owning the unified nalu (changeset wave).
 *
 * The wiki is the reactive engine (yin-collapse law, nalu.md).
 * This module lives inside the wiki and owns:
 *   - one unified accumulator queue across ALL CRDT bags (single shared rail)
 *   - the per-frame drain scheduler
 *   - the one `wiki.transact()` per nalu wrapping the entire batch
 *   - the apply-time echo guard (suppresses outbound writes during drain)
 *
 * Prior-art alignment (DriftWatch [PriorArt]):
 *   Vue 3 scheduler · MobX transaction · Yjs transact · React 18 auto-batch ·
 *   Solid batch · S.js tick · DREAM glitch-freedom.
 *
 *   Every mature reactive scheduler collapses heterogeneous-source writes into
 *   ONE flush. Per-source transacts produce cascade-refresh and FRP glitches.
 *   We follow the field: one transact per frame across N bags.
 *
 * Position in the stack:
 *
 *   TS membrane (irreducible — Automerge, network, crypto, storage)
 *     AutomergeDocStore.handle.on("change") → MemeProvider → projection bus
 *     bridge projection forwards LarTiddlerChange → $tw.lares.enqueueNalu()
 *   ───────────────────────────────────────────────────────────────────────
 *   TW5 startup module (this file)
 *     enqueueNalu(change) — queue
 *     scheduleFrame()     — rAF or setTimeout(16)
 *     drain(budget)       — one wiki.transact() per frame
 *     isApplyingNalu()    — echo guard for IslandAdaptor.saveTiddler
 *
 * Initial replay path:
 *   AutomergeDocStore.emitInitialReplay() fires fireImmediate per existing
 *   tiddler → projection bus → bridge → enqueueNalu(change). Next frame
 *   drains the lot in one transact. No special pre-sync buffer needed.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/modules/nalu-engine
 */

import type { TW5Instance, TW5Wiki } from "../types/tiddlywiki.js";
import type { LarTiddlerChange, TW5TiddlerInputFieldsWithTitle } from "@lararium/mesh";
import type { LaresTw5Extension } from "../types/lares-globals.js";
import { expandMemeRefs } from "../deserializer.js";
import type { TiddlerFields } from "../deserializer.js";

// ---------------------------------------------------------------------------
// TW5 startup lifecycle
// ---------------------------------------------------------------------------

export const name        = "lararium-nalu-engine";
export const after       = ["startup"];
export const synchronous = true;

// TW5's evalGlobal injects $tw as a direct function parameter.
declare const $tw: (Partial<TW5Instance> & LaresTw5Extension) | undefined;

// ---------------------------------------------------------------------------
// Module-level state (one engine per wiki — singleton)
// ---------------------------------------------------------------------------

const FRAME_MS      = 16;
const DEFAULT_BUDGET = 200;

let _queue:     LarTiddlerChange[] = [];
let _scheduled                     = false;
let _applying                      = false;
let _wiki:      TW5Wiki | null     = null;

// Progressive-boot hydration checkpoint — the seed drains on the SAME paced rail as live
// edits (no synchronous unbounded flush); `_seedDrained` resolves the first frame the queue
// empties after `beginHydration()`, the checkpoint the island awaits before arming behavior.
let _hydrating                          = false;
let _seedDrained:        Promise<void> | null = null;
let _seedDrainedResolve: (() => void)  | null = null;

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

function _scheduleFrame(): void {
  if (_scheduled) return;
  _scheduled = true;
  const tick = (): void => {
    _scheduled = false;
    _drain(DEFAULT_BUDGET);
  };
  const g = globalThis as { requestAnimationFrame?: (cb: () => void) => number };
  if (typeof g.requestAnimationFrame === "function") g.requestAnimationFrame(tick);
  else setTimeout(tick, FRAME_MS);
}

// ---------------------------------------------------------------------------
// Drain — one wiki.transact() per frame, regardless of bag count
// ---------------------------------------------------------------------------

function _toFields(change: LarTiddlerChange): TW5TiddlerInputFieldsWithTitle {
  // CRDT records store the title as the doc key, not nested in `tiddler` —
  // restore it from `change.title` so the wiki tiddler carries its identity.
  //
  // Residency Model — every inbound write annotates `origin-bag` so the
  // operator can answer "which bag does this come from?" at every read
  // (Anti-pattern #4 defense). The legacy `bag` field stays for outbound
  // write-target override; `origin-bag` carries inbound provenance.
  const fields: TW5TiddlerInputFieldsWithTitle = {
    ...change.record!.tiddler,
    title: change.title,
    ...(change.bag !== undefined ? { bag: change.bag, "origin-bag": change.bag } : {}),
  };
  return fields;
}

function _drain(budget: number): void {
  if (!_wiki || _queue.length === 0) return;

  const batch = _queue.splice(0, budget);
  const Tiddler = $tw?.Tiddler;
  if (!Tiddler) return;

  _applying = true;
  try {
    const apply = (): void => {
      for (const change of batch) {
        if (change.record === null || change.record.meta?.deleted) {
          _wiki!.deleteTiddler(change.title);
        } else {
          _wiki!.addTiddler(new Tiddler(_toFields(change)));
        }
      }
    };
    if (typeof _wiki.transact === "function") _wiki.transact(apply);
    else apply();
  } finally {
    _applying = false;
  }

  // Remainder carries to next frame; an empty queue settles the hydration checkpoint.
  if (_queue.length > 0) _scheduleFrame();
  else _settleHydration();
}

// ---------------------------------------------------------------------------
// Public API — exposed at $tw.lares.*
// ---------------------------------------------------------------------------

function enqueueNalu(change: LarTiddlerChange): void {
  _queue.push(change);
  _scheduleFrame();
}

function flushNalu(budget = DEFAULT_BUDGET): void {
  _drain(budget);
}

/**
 * Begin the seed-hydration wave (progressive-boot contract). The recipe calls this ONCE right
 * after enqueuing the seed replay, INSTEAD of a synchronous unbounded flush: the seed already
 * sits on the paced queue, so this only arms the checkpoint and lets `_drain` empty it frame by
 * frame — no event-loop block. Idempotent; a begin over an already-empty queue settles at once.
 */
function beginHydration(): void {
  if (_seedDrained) return;
  _seedDrained = new Promise<void>((resolve) => { _seedDrainedResolve = resolve; });
  _hydrating = true;
  if (_queue.length === 0) _settleHydration();
  else _scheduleFrame();
}

function _settleHydration(): void {
  if (!_hydrating) return;
  _hydrating = false;
  const resolve = _seedDrainedResolve;
  _seedDrainedResolve = null;
  resolve?.();
}

/**
 * Resolves once the seed replay has fully drained into the wiki VM — the catch-up checkpoint
 * the island awaits before arming live reactive behavior, so onEa still observes a fully-resident
 * seed (the invariant preserved, the synchronous block removed). Resolves immediately when no
 * hydration was begun (a wiki-less path).
 */
function whenSeedDrained(): Promise<void> {
  return _seedDrained ?? Promise.resolve();
}

function isApplyingNalu(): boolean {
  return _applying;
}

function naluPending(): number {
  return _queue.length;
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export function startup(): void {
  const wiki = $tw?.wiki;
  if (!wiki) return;
  _wiki = wiki;

  const lares = ($tw!.lares ?? {}) as Record<string, unknown>;
  lares["enqueueNalu"]     = enqueueNalu;
  lares["flushNalu"]       = flushNalu;
  lares["isApplyingNalu"]  = isApplyingNalu;
  lares["naluPending"]     = naluPending;
  lares["beginHydration"]  = beginHydration;
  lares["whenSeedDrained"] = whenSeedDrained;
  // The recompose inverse, first-class on the VM surface (island law: if it
  // CAN happen in the TW5 Wiki VM causal island, it MUST happen there).
  // Reads the VM's own wiki; one carrier whole, children spliced full-depth.
  lares["expandMemeRefs"] = (memeUri: string): string | null =>
    expandMemeRefs(
      (title: string) => (wiki.getTiddler?.(title) as { fields?: TiddlerFields } | undefined)?.fields,
      memeUri,
    );
  ($tw as { lares?: Record<string, unknown> }).lares = lares;
}
