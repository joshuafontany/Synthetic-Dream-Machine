/**
 * tw5-vm.ts — TW5Engine: clean isomorphic TW5 VM for web3 Lararium.
 *
 * JKD principle: absorb what is useful (boot, render, tiddler mutation,
 * VM-owned ingest, wiki events), discard the carrier/closure/store/syncer web2 cruft.
 *
 * TW5Engine owns the raw VM lifecycle. Store sync: IslandAdaptor.
 * Reaction routing: reaction-router.ts TW5 startup module. No globals.
 */

import type {
  TW5Instance,
  TW5FakeElement,
  TW5FakeDocument,
  TW5ChangeRecord,
  TW5TiddlerInputFields,
  TW5TiddlerFields,
} from "./types/tiddlywiki.js";
import { BOOT_SPLASH_ACTIVE_URI } from "@lararium/mesh/lar-uris";
import type { IslandAccumulator } from "@lararium/mesh";
import type { LarTiddlerRecord } from "@lararium/mesh";
import { toLarTiddlerRecord } from "@lararium/mesh";
import {
  bootWithHostBridge,
  normalizeCoreBootBlob,
  prepareHostBootInstance,
  verifyCoreBootBlob,
} from "./tw5-host-bridge.js";
import { bootTrustedModules } from "./tw5-module-gate.js";
import type { TW5CoreBootBlob, TW5CoreBootInput } from "./tw5-host-bridge.js";

export type { TW5CoreBootBlob } from "./tw5-host-bridge.js";

// ---------------------------------------------------------------------------
// CameraRegistration — multi-view projection surface
// ---------------------------------------------------------------------------

/**
 * One camera = one view frustum over the wiki world-state.
 *
 * Each camera holds its own IslandAccumulator and drives its own drain cycle
 * at its own tick rate.  All cameras share one TW5 wiki (world graph).
 *
 * Inverted control: the accumulator drains into the wiki via wiki.transact().
 * The wiki fires a "change" event.  Each widget tree registered via
 * wiki.addEventListener("change", tree.refresh) reacts independently —
 * trees with no dependency on the changed tiddlers return immediately.
 *
 * The view frustum lives in the widget tree's root filter, not in the
 * accumulator.  The accumulator carries no camera identity.
 *
 * Input + output: cameras that accept user input register outbound handlers
 * (saveTiddler / dispatchEvent) on their widget tree.  Rendering priority
 * flows naturally from tickMs — lower tickMs = higher render priority.
 */
/**
 * Static structure of one camera: the parse→widget→fakeDOM chain.
 * Pairs with CameraRegistration for the full camera contract.
 * Spec: lar:///ha.ka.ba/@lares/api/v0.1/lararium/camera-mount (C-1 through C-5)
 */
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

import { LARES_MEMETIC_WIKITEXT_PLUGIN } from "./plugin-tiddler.generated.js";

// ---------------------------------------------------------------------------
// TW5Engine — clean isomorphic TW5 VM
// ---------------------------------------------------------------------------

export class TW5Engine {
  private _tw: TW5Instance | null = null;
  private _bootPromise: Promise<void> | null = null;

  /**
   * Boot the TW5 wiki. Idempotent — multiple calls return the same promise.
   *
   * Browser: injects the tiddlywikicore blob as a suppressed <script>; then boots.
   * Node:    evaluates the same tiddlywikicore blob with a CommonJS-shaped
   *          wrapper; no node_modules tiddlywiki runtime fallback is allowed.
   */
  boot(coreBlob?: TW5CoreBootInput, preloadedTiddlers?: Array<Record<string, unknown>>): Promise<void> {
    if (this._bootPromise) return this._bootPromise;
    this._bootPromise = (async () => {
      const core = normalizeCoreBootBlob(coreBlob);
      if (core) verifyCoreBootBlob(core);
      const { instance, isBrowser } = await prepareHostBootInstance(core);

      const allPreloads = preloadedTiddlers ?? [];

      instance.preloadTiddlers = instance.preloadTiddlers ?? [];
      // Single plugin tiddler — the lar:// canonical envelope
      // emitted by `pnpm build:plugin`. TW5's standard plugin
      // loader unpacks the JSON envelope, registers each inner
      // module via $tw.modules.define, and materializes the
      // cascade configs / templates / mount as shadow tiddlers.
      // Replaces the imperative widget/parser/wikirule/
      // deserializer registrations that the V.1 boot path used.
      instance.preloadTiddlers.push(LARES_MEMETIC_WIKITEXT_PLUGIN as unknown as Record<string, unknown>);
      for (const t of allPreloads) instance.preloadTiddlers.push(t as Record<string, unknown>);

      await bootWithHostBridge(instance, isBrowser, async () => {
        this._tw = instance;
        await bootTrustedModules(instance);
      });
    })();
    return this._bootPromise;
  }

  /**
   * Mount a single camera: constructs the parse→widget→fakeDOM chain once,
   * registers a wiki "change" listener that refreshes the widget tree, and
   * returns a teardown function that removes the listener and detaches DOM nodes.
   *
   * Isomorphic — works with window.document (browser), $tw.fakeDocument (Node/SSR),
   * or any fake-DOM implementation.  The caller pairs this with startRenderLoop()
   * to drive the drain→transact→change→refresh cycle.
   *
   * Spec: lar:///ha.ka.ba/@lares/api/v0.1/lararium/camera-mount (C-1 through C-5)
   */
  mountCamera(mount: CameraMount): () => void {
    if (!this._tw) throw new Error("TW5Engine: call boot() before mountCamera()");
    const tw = this._tw;

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

  /**
   * Mount the TW5 Story River as a floating HUD layer over the infinite canvas.
   *
   * The shadow root isolates TW5 stylesheet from the canvas surface behind it.
   * Uses window.document intentionally — the story river renders real HTML into
   * the shadow pane; canvas cameras below it use their own fake-DOM documents.
   * The stylesheet camera (fakeDocument) and the story-river camera (window.document)
   * stay separate by design: CSS side-effects are not a view frustum.
   *
   * @browser-only
   * ╔══════════════════════════════════════════════════════════════════════════╗
   * ║  Browser HUD overlay — extract to BrowserTW5Engine when dreamdeck-app  ║
   * ║  arrives and needs to import TW5Engine without pulling browser APIs.    ║
   * ╚══════════════════════════════════════════════════════════════════════════╝
   */
  mountPanel(container: HTMLElement): () => void {
    if (!this._tw) throw new Error("TW5Engine: call boot() before mountPanel()");
    const tw = this._tw;

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
    const teardownCamera = this.mountCamera({
      rootTiddler: "$:/core/ui/RootTemplate",
      document:    document as unknown as TW5FakeDocument,
      container:   inner as unknown as TW5FakeElement,
    });

    // Wire rootWidget domNodes so TW5's internal event dispatch traverses the tree.
    tw.rootWidget.domNodes = [inner as unknown as TW5FakeElement];

    return () => {
      tw.wiki.removeEventListener("change", styleHandler);
      teardownCamera();
    };
  }

  /** Switch the active TW5 palette. Triggers stylesheet recompile. @browser-only */
  setPalette(paletteName: string): void {
    if (!this._tw) return;
    this._tw.wiki.addTiddler(new this._tw.Tiddler({ title: "$:/palette", text: paletteName, tags: [] }));
  }

  /** Set/clear the boot-splash signal tiddler (lar:///ha.ka.ba/state/boot-splash/active). @browser-only */
  setBootSplash(active: boolean): void {
    if (!this._tw) return;
    if (active) {
      this._tw.wiki.addTiddler(new this._tw.Tiddler({ title: BOOT_SPLASH_ACTIVE_URI, text: "yes" }));
    } else {
      this._tw.wiki.deleteTiddler(BOOT_SPLASH_ACTIVE_URI);
    }
  }

  private runCarrierDeserializer(
    uri:         string,
    text:        string,
    extraFields?: Record<string, string | string[]>,
    opts?:       { realmOrigin?: string },
  ): TW5TiddlerInputFields[] {
    if (!this._tw) throw new Error("TW5Engine: call boot() before ingestCarrier()");
    const base: TW5TiddlerInputFields = { title: uri, ...extraFields };
    let tiddlers = (
      this._tw.wiki.deserializeTiddlers("text/x-memetic-wikitext", text, base) ?? []
    ) as TW5TiddlerInputFields[];
    if (opts?.realmOrigin) {
      const ro = opts.realmOrigin;
      tiddlers = tiddlers.map((t) => ({ ...t, "realm-origin": ro }));
    }
    return tiddlers;
  }

  /**
   * Ingest a memetic-wikitext carrier through the target TW5 wiki's normal
   * deserializer path, then materialize the resulting tiddlers in that same VM.
   *
   * This is the disk→VM half of the decompose from disk carrier codeflow: callers hand the meme
   * text to the target wiki and let registered TW5 deserializers do the
   * decomposition. Host code may route the returned tiddlers onward to an
   * IslandAdaptor, but it does not decompose the carrier itself.
   */
  ingestCarrier(
    uri:         string,
    text:        string,
    extraFields?: Record<string, string | string[]>,
    opts?:       { realmOrigin?: string },
  ): LarTiddlerRecord[] {
    if (!this._tw) throw new Error("TW5Engine: call boot() before ingestCarrier()");
    const fields = this.runCarrierDeserializer(uri, text, extraFields, opts)
      .filter((t) => typeof t.title === "string" && !t.title.startsWith("$:/"));
    const wiki = this._tw.wiki;
    const Tiddler = this._tw.Tiddler;
    const apply = () => {
      for (const f of fields) wiki.addTiddler(new Tiddler(f as Record<string, unknown>));
    };
    if (typeof wiki.transact === "function") wiki.transact(apply); else apply();

    return fields
      .map((f) => wiki.getTiddler(String(f.title))?.fields)
      .filter((f): f is TW5TiddlerFields => f !== undefined)
      .map((f) => {
        const { title, tags, list, ...rest } = f;
        return toLarTiddlerRecord({
          ...rest,
          title,
          ...(tags !== undefined ? { tags: [...tags] } : {}),
          ...(list !== undefined ? { list: [...list] } : {}),
        });
      });
  }

  /**
   * Wire a VerseEventConsumer to this VM's wiki event bus.
   * KukaliWidget fires "tm-verse-event"; the consumer handles it.
   * Returns a teardown function (Verse cancelable equivalent).
   */
  onVerseEvent(consumer: { handleVerseEvent(uri: string, listenable: string): void }): () => void {
    if (!this._tw) return () => {};
    const handler = (...args: unknown[]) => {
      const event = args[0] as { uri?: string; listenable?: string } | undefined;
      if (event?.uri && event.listenable) {
        consumer.handleVerseEvent(event.uri, event.listenable);
      }
    };
    this._tw.wiki.addEventListener("tm-verse-event", handler);
    return () => this._tw?.wiki.removeEventListener("tm-verse-event", handler);
  }


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
   *   3. wiki fires "change" event. Every widget tree registered via
   *      wiki.addEventListener("change", tree.refresh) reacts — trees with
   *      no dependency on the changed tiddlers return immediately (O(1)).
   *
   * Inverted control: the view frustum lives in each widget tree's root
   * filter, not in the accumulator.  Cameras at different tick rates drain
   * independently; the single wiki is the synchronization point.
   *
   * Returns a teardown fn that cancels all timers.
   */
  startRenderLoop(
    cameras: CameraRegistration[],
    adaptor: { flushAll(accs: IslandAccumulator[], budget?: number): void },
  ): () => void {
    if (!this._tw) throw new Error("TW5Engine: call boot() before startRenderLoop()");
    const teardowns: Array<() => void> = [];

    for (const cam of cameras) {
      const budget = cam.budget ?? 200;
      const acc    = cam.accumulator;
      const tickMs = cam.tickMs ?? 0;

      if (tickMs === 0) {
        let rafId  = 0;
        let running = true;
        const tick = (timestamp: number) => {
          if (!running) return;
          this._tw!.wiki.addTiddler(
            new this._tw!.Tiddler({
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

  /** Returns true after boot() resolves. */
  get ready(): boolean { return this._tw !== null; }

  /**
   * Exposes the full TW5Instance ($tw) — wiki, modules, utils, Tiddler constructor,
   * filterOperators, config, etc. Fully typed via TW5Instance from tiddlywiki.d.ts.
   * Accessible after boot(). Prefer the typed facade methods above for common ops;
   * use this when you need TW5 internals the facade doesn't expose.
   */
  get $tw(): TW5Instance {
    if (!this._tw) throw new Error("TW5Engine: call boot() before accessing $tw");
    return this._tw;
  }

  /** Direct access to $tw.wiki after boot. */
  get wiki(): TW5Instance["wiki"] {
    if (!this._tw) throw new Error("TW5Engine: call boot() before accessing wiki");
    return this._tw.wiki;
  }

  /**
   * Render a wikitext string to HTML using TW5's server-side renderer.
   * The text parses as `text/vnd.tiddlywiki` in an anonymous tiddler context.
   */
  renderText(text: string, type = "text/vnd.tiddlywiki"): string {
    if (!this._tw) throw new Error("TW5Engine: call boot() before renderText()");
    return this._tw.wiki.renderText("text/html", type, text);
  }

  /** Add or replace a tiddler by field map. */
  setTiddler(fields: Record<string, string | string[]>): void {
    if (!this._tw) throw new Error("TW5Engine: call boot() before setTiddler()");
    this._tw.wiki.addTiddler(new this._tw.Tiddler(fields as Record<string, unknown>));
  }

  /**
   * Dispose this VM — clear internal refs so GC can collect.
   * Caller must invoke any mountPanel cleanup fn first.
   */
  dispose(): void {
    this._tw          = null;
    this._bootPromise = null;
  }
}
