/**
 * tw5-vm.ts — TW5Engine: clean isomorphic TW5 VM for web3 Lararium.
 *
 * JKD principle: absorb what is useful (boot, render, tiddler mutation,
 * VM-owned ingest, wiki events), discard the carrier/closure/store/syncer web2 cruft.
 *
 * TW5Engine owns the raw VM lifecycle. Store sync: IslandAdaptor.
 * Reaction routing: reaction-router.ts TW5 startup module. No globals.
 */

import { CARRIER_TYPE } from "@lararium/mesh/carrier-type";
import type {
  TW5Instance,
  TW5TiddlerInputFields,
  TW5TiddlerFields,
} from "./types/tiddlywiki.js";
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
      for (const t of allPreloads) instance.preloadTiddlers.push(t as Record<string, unknown>);

      await bootWithHostBridge(instance, isBrowser, async () => {
        this._tw = instance;
        await bootTrustedModules(instance);
      });
    })();
    return this._bootPromise;
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
      this._tw.wiki.deserializeTiddlers(CARRIER_TYPE, text, base) ?? []
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
  onVerseEvent(consumer: {
    handleVerseEvent(uri: string, listenable: string, verb?: string, fromUri?: string, args?: Record<string, unknown>): void;
  }): () => void {
    if (!this._tw) return () => {};
    const handler = (...args: unknown[]) => {
      const event = args[0] as { uri?: string; listenable?: string; verb?: string; fromUri?: string; args?: Record<string, unknown> } | undefined;
      if (event?.uri && event.listenable) {
        consumer.handleVerseEvent(event.uri, event.listenable, event.verb, event.fromUri, event.args);
      }
    };
    this._tw.wiki.addEventListener("tm-verse-event", handler);
    return () => this._tw?.wiki.removeEventListener("tm-verse-event", handler);
  }


  // mountCamera    → tw5-camera.ts (sidecar)
  // mountPanel     → tw5-browser-surface.ts (sidecar, browser-only)
  // setPalette     → tw5-browser-surface.ts (sidecar, browser-only)
  // setBootSplash  → tw5-browser-surface.ts (sidecar, browser-only)

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

  /** Dispose this VM — clear internal refs so GC can collect. */
  dispose(): void {
    this._tw          = null;
    this._bootPromise = null;
  }
}
