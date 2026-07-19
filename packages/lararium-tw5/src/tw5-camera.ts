/**
 * tw5-camera.ts — camera mount surface (widget tree mount + teardown).
 *
 * Under unified-nalu (yin-collapse law), the per-camera render loop and
 * per-bag accumulator orchestration retired. The nalu engine inside each
 * wiki owns its own frame-aligned drain; cameras attach via mountCamera()
 * and react to wiki "change" events naturally.
 *
 * Future multi-wiki visualization (one TW5 engine per camera) composes by
 * mounting each camera onto its own engine — no shared accumulator surface.
 *
 * Spec: lar:///ha.ka.ba/lararium/api/camera-mount
 */

import type {
  TW5FakeElement,
  TW5FakeDocument,
  TW5ChangeRecord,
} from "./types/tiddlywiki.js";
import type { TW5Engine } from "./tw5-vm.js";

// TW5-core UI tiddler paths the cameras transclude. Named here (not inlined at each
// mount site) so a TW5-core upgrade that relocates them turns ONE line, and every
// camera reads the SAME registry — the paths ride a const, never a scattered literal.
/** TW5 core view-root — the default Story River frustum a camera renders. */
export const TW5_ROOT_TEMPLATE = "$:/core/ui/RootTemplate";
/** TW5 core page stylesheet — the CSS a stylesheet camera reads as textContent. */
export const TW5_PAGE_STYLESHEET = "$:/core/ui/PageStylesheet";

/** Static structure of one camera: the parse→widget→fakeDOM chain. */
export interface CameraMount {
  /** Root tiddler whose wikitext body defines the view frustum. */
  rootTiddler: string;
  /** The document this camera renders into. */
  document: TW5FakeDocument | Document;
  /** The container element this camera renders into. */
  container: TW5FakeElement | HTMLElement;
}

/**
 * Mount a single camera: constructs the parse→widget→fakeDOM chain once,
 * registers a wiki "change" listener that refreshes the widget tree, and
 * returns a teardown function that removes the listener and detaches DOM nodes.
 *
 * The wiki's nalu engine fires "change" once per frame across all bags
 * (unified-nalu). Widgets with no dependency on the changed tiddlers return
 * in O(1) — view frustum lives in the root filter, not the camera surface.
 *
 * Isomorphic — works with window.document (browser), $tw.fakeDocument (Node/SSR),
 * or any fake-DOM implementation.
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
