/**
 * tw5-camera.ts — camera mount + render loop surface, split from TW5Engine.
 *
 * Moved from tw5-vm.ts (was TW5Engine#mountCamera, #startRenderLoop).
 * TW5Engine stays isomorphic core; this sidecar owns the camera/drain contract.
 *
 * Isomorphic: works in Node (setInterval path) and browser (rAF path).
 * Browser vessel (S9) and dreamdeck-app import from here, not from TW5Engine.
 *
 * Spec: lar:///ha.ka.ba/@lares/v0.1/api/lararium/camera-mount (C-1 through C-5)
 */

import type {
  TW5FakeElement,
  TW5FakeDocument,
  TW5ChangeRecord,
} from "./types/tiddlywiki.js";
import type { IslandAccumulator } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Static structure of one camera: the parse→widget→fakeDOM chain. */
export interface CameraMount {
  /** Root tiddler whose wikitext body defines the view frustum. */
  rootTiddler: string;
  /** The document this camera renders into. */
  document: TW5FakeDocument | Document;
  /** The container element this camera renders into. */
  container: TW5FakeElement | HTMLElement;
}

export interface CameraRegistration {
  /** The accumulator this camera drains each tick. */
  accumulator: IslandAccumulator;
  /**
   * Tick interval in milliseconds.
   *   0 (default) = requestAnimationFrame (~60fps, browser-only)
   *   N > 0        = setInterval(N) — use for background or non-browser cameras
   */
  tickMs?: number;
  /** Maximum patches to drain per tick. Default: 200. */
  budget?: number;
}

// ---------------------------------------------------------------------------
// mountCamera
// ---------------------------------------------------------------------------

/**
 * Mount a single camera: constructs the parse→widget→fakeDOM chain once,
 * registers a wiki "change" listener that refreshes the widget tree, and
 * returns a teardown function that removes the listener and detaches DOM nodes.
 *
 * Isomorphic — works with window.document (browser), $tw.fakeDocument (Node/SSR),
 * or any fake-DOM implementation. Pair with startRenderLoop() to drive the
 * drain→transact→change→refresh cycle.
 */
export function mountCamera(engine: TW5Engine, mount: CameraMount): () => void {
  const tw = engine.$tw;

  const widget = tw.wiki.makeTranscludeWidget(mount.rootTiddler, {
    document:     mount.document as TW5FakeDocument,
    parentWidget: tw.rootWidget,
  });
  widget.render(mount.container as TW5FakeElement, null);

  const handler = (changes: Record<string, TW5ChangeRecord>) => {
    widget.refresh(changes);
  };
  tw.wiki.addEventListener("change", handler);

  return () => {
    tw.wiki.removeEventListener("change", handler);
    widget.domNodes?.forEach((n) =>
      (n as unknown as Node).parentNode?.removeChild(n as unknown as Node)
    );
  };
}

// ---------------------------------------------------------------------------
// startRenderLoop
// ---------------------------------------------------------------------------

/**
 * Multi-camera render loop.
 *
 * Each CameraRegistration drives its own drain cycle:
 *   - tickMs = 0 (default): requestAnimationFrame at ~60fps (browser-only)
 *   - tickMs > 0: setInterval at that interval (browser + node)
 *
 * On each camera tick:
 *   1. rAF cameras write $:/temp/volatile/lararium/tick — arms TW5's
 *      volatile-refresh throttle for 60fps repaint.
 *   2. adaptor.flushAll([camera.accumulator], camera.budget) drains the
 *      accumulator and applies the batch via wiki.transact().
 *   3. wiki fires "change" event. Every widget tree reacts — trees with
 *      no dependency on the changed tiddlers return immediately (O(1)).
 *
 * Inverted control: the view frustum lives in each widget tree's root
 * filter, not in the accumulator. Cameras at different tick rates drain
 * independently; the single wiki is the synchronization point.
 *
 * Returns a teardown fn that cancels all timers.
 *
 * Node callers: use tickMs > 0 (setInterval). rAF is browser-only.
 */
export function startRenderLoop(
  engine:  TW5Engine,
  cameras: CameraRegistration[],
  adaptor: { flushAll(accs: IslandAccumulator[], budget?: number): void },
): () => void {
  const tw = engine.$tw;
  const teardowns: Array<() => void> = [];

  for (const cam of cameras) {
    const budget = cam.budget ?? 200;
    const acc    = cam.accumulator;
    const tickMs = cam.tickMs ?? 0;

    if (tickMs === 0) {
      let rafId   = 0;
      let running = true;
      const tick  = (timestamp: number) => {
        if (!running) return;
        tw.wiki.addTiddler(
          new tw.Tiddler({
            title: "$:/temp/volatile/lararium/tick",
            text:  String(Math.floor(timestamp)),
          }),
        );
        adaptor.flushAll([acc], budget);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      teardowns.push(() => { running = false; cancelAnimationFrame(rafId); });
    } else {
      const id = setInterval(() => adaptor.flushAll([acc], budget), tickMs);
      teardowns.push(() => clearInterval(id));
    }
  }

  return () => teardowns.forEach((fn) => fn());
}
