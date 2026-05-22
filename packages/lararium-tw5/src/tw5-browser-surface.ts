/**
 * tw5-browser-surface.ts — browser-only HUD surface, split from TW5Engine.
 *
 * Moved from tw5-vm.ts (was TW5Engine#mountPanel, #setPalette, #setBootSplash).
 * TW5Engine stays isomorphic; this sidecar carries all HTMLElement / shadowRoot
 * / window.document references.
 *
 * Browser vessel (S9) and dreamdeck-app import from here.
 * Node workers must never import this file.
 *
 * mountCamera lives in tw5-camera.ts (isomorphic); mountPanel calls it here
 * via the engine instance.
 */

import type {
  TW5FakeDocument,
  TW5FakeElement,
  TW5ChangeRecord,
} from "./types/tiddlywiki.js";
import { BOOT_SPLASH_ACTIVE_URI } from "@lararium/mesh/lar-uris";
import type { TW5Engine } from "./tw5-vm.js";

// ---------------------------------------------------------------------------
// mountPanel
// ---------------------------------------------------------------------------

/**
 * Mount the TW5 Story River as a floating HUD layer over the infinite canvas.
 *
 * The shadow root isolates TW5 stylesheet from the canvas surface behind it.
 * Uses window.document intentionally — the story river renders real HTML into
 * the shadow pane; canvas cameras below it use their own fake-DOM documents.
 * The stylesheet camera (fakeDocument) and the story-river camera (window.document)
 * stay separate by design: CSS side-effects are not a view frustum.
 *
 * Returns a teardown fn. Call before engine.dispose().
 */
export function mountPanel(engine: TW5Engine, container: HTMLElement): () => void {
  const tw = engine.$tw;

  const shadow = container.shadowRoot ?? container.attachShadow({ mode: "open" });

  // Stylesheet camera — renders into fakeDocument, syncs CSS text to shadow DOM.
  const styleWidget = tw.wiki.makeTranscludeWidget("$:/core/ui/PageStylesheet", {
    document:     tw.fakeDocument,
    parentWidget: tw.rootWidget,
  });
  const styleContainer = tw.fakeDocument.createElement("style");
  styleWidget.render(styleContainer, null);

  const styleEl = shadow.querySelector("#lar-tw5-styles") as HTMLStyleElement | null
    ?? (() => {
      const el = document.createElement("style");
      el.id = "lar-tw5-styles";
      shadow.insertBefore(el, shadow.firstChild);
      return el;
    })();
  styleEl.textContent = styleContainer.textContent ?? "";

  const styleHandler = (changes: Record<string, TW5ChangeRecord>) => {
    if (styleWidget.refresh(changes, styleContainer, null)) {
      styleEl.textContent = styleContainer.textContent ?? "";
    }
  };
  tw.wiki.addEventListener("change", styleHandler);

  const inner = shadow.querySelector(".tc-page-container-wrapper") as HTMLElement | null
    ?? (() => {
      const el = document.createElement("div");
      el.className = "tc-page-container-wrapper";
      shadow.appendChild(el);
      return el;
    })();

  // Story river camera — the default TW5 view frustum.
  const storyWidget = tw.wiki.makeTranscludeWidget("$:/core/ui/RootTemplate", {
    document:     document as unknown as TW5FakeDocument,
    parentWidget: tw.rootWidget,
  });
  storyWidget.render(inner as unknown as TW5FakeElement, null);

  const storyHandler = (changes: Record<string, TW5ChangeRecord>) => {
    storyWidget.refresh(changes);
  };
  tw.wiki.addEventListener("change", storyHandler);

  // Wire rootWidget domNodes so TW5's internal event dispatch traverses the tree.
  tw.rootWidget.domNodes = [inner as unknown as TW5FakeElement];

  return () => {
    tw.wiki.removeEventListener("change", styleHandler);
    tw.wiki.removeEventListener("change", storyHandler);
    storyWidget.domNodes?.forEach((n) =>
      (n as unknown as Node).parentNode?.removeChild(n as unknown as Node)
    );
  };
}

// ---------------------------------------------------------------------------
// setPalette
// ---------------------------------------------------------------------------

/** Switch the active TW5 palette. Triggers stylesheet recompile. */
export function setPalette(engine: TW5Engine, paletteName: string): void {
  engine.$tw.wiki.addTiddler(
    new engine.$tw.Tiddler({ title: "$:/palette", text: paletteName, tags: [] }),
  );
}

// ---------------------------------------------------------------------------
// setBootSplash
// ---------------------------------------------------------------------------

/** Set or clear the boot-splash signal tiddler. */
export function setBootSplash(engine: TW5Engine, active: boolean): void {
  if (active) {
    engine.$tw.wiki.addTiddler(
      new engine.$tw.Tiddler({ title: BOOT_SPLASH_ACTIVE_URI, text: "yes" }),
    );
  } else {
    engine.$tw.wiki.deleteTiddler(BOOT_SPLASH_ACTIVE_URI);
  }
}
