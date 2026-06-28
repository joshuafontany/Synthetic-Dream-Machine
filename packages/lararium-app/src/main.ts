/**
 * @lararium/app — the browser-lararium boot view.
 *
 * A sovereign causal island boots in the browser (its own key, IndexedDB, genesis
 * bytes) and — when a read-face is reachable — reads the public @oracle (the node-less
 * path: an anon browser vessel consuming the read-only substrate, the elyncia.app
 * story). Location-agnostic: served from localhost / LAN / elyncia.app, the vessel
 * always runs here; the origin is a static host, never an authority.
 */
import { openBrowserVessel, generateOrLoadBrowserVesselIdentity } from "@lararium/browser";
import { pullAndVerifyOracle, type GenesisCasManifest } from "@lararium/mesh";
import { Idiomorph } from "idiomorph";
import genesisBytes from "../../../genesis/island.bin?uint8array";
// The genesis CRDT carries blob METADATA only; the engine + plugin BYTES ship as
// content-addressed genesis/cas/<cid> files, indexed by this manifest. First boot fetches
// them over HTTP into the OPFS CAS (the byte SOURCE the merge-conflict-free CRDT dropped).
import genesisCasManifest from "../../../genesis/island.manifest.json";
// `?worker&url` — Vite builds each worker shim through its worker pipeline and yields the built
// bundle's URL (a real /assets file). A standalone `new URL("./x.ts", import.meta.url)` passed
// INDIRECTLY to the vessel got inlined as a `data:` URI, where the worker's dynamic imports
// (keyhive-WASM-first, then the chain) cannot resolve — the daemon/wiki boot's silent death.
import daemonWorkerUrlStr from "./workers/daemon.worker.ts?worker&url";
import wikiWorkerUrlStr  from "./workers/wiki.worker.ts?worker&url";

const daemonWorkerUrl  = new URL(daemonWorkerUrlStr, import.meta.url);
const workerScriptUrl = new URL(wikiWorkerUrlStr,  import.meta.url);

const IDB = "lares:vessel";
const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

function row(parent: HTMLElement, k: string, v: string, cls = ""): void {
  const d = document.createElement("div");
  d.className = "row";
  const ke = document.createElement("span"); ke.className = "k"; ke.textContent = k;
  const ve = document.createElement("span"); ve.className = "v " + cls; ve.textContent = v;
  d.append(ke, ve);
  parent.appendChild(d);
}
function set(id: string, text: string, cls = ""): void {
  const el = $(id); el.textContent = text; el.className = "v " + cls;
}

// The @oracle read-face — the node-less anon-read path. INDEPENDENT of the vessel boot
// (it reads a public read-face; it must not be gated behind the local vessel coming up).
// Config-supplied via ?oracle=…, default the local dev node; elyncia.app → a public one.
async function readOracle(): Promise<void> {
  const readFace = new URLSearchParams(location.search).get("oracle") ?? "http://localhost:8080";
  set("oracle-status", `reading ${readFace} …`);
  try {
    const r = await pullAndVerifyOracle<{ tiddlers?: Record<string, unknown> }>(readFace);
    if (r.ok && r.pointer) {
      const n = r.doc?.tiddlers ? Object.keys(r.doc.tiddlers).length : 0;
      const oracleEl = $("oracle"); oracleEl.replaceChildren();
      row(oracleEl, "status", "✓ verified + loaded", "ok");
      row(oracleEl, "version", `v${r.pointer.version}`);
      row(oracleEl, "tiddlers", String(n));
      row(oracleEl, "cid", r.cid ?? "—");
      row(oracleEl, "publisher", r.pointer.pub.slice(0, 16) + "…");
    } else {
      set("oracle-status", `✗ ${r.reason ?? "unavailable"}`, "warn");
    }
  } catch (e) {
    set("oracle-status", `✗ ${e instanceof Error ? e.message : String(e)}`, "warn");
  }
}

// The projection-nalu sink — apply a rendered wiki frame into an isolated shadow root, MORPHED in
// place (idiomorph) so focus/caret/scroll survive a re-projection. A delegated click relays back to
// the worker's TW5 by render-id (the interactivity RETURN leg): TW5's own handler fires, navigates,
// and re-projects — the widget tree never learns the click crossed a thread.
let _projRev = 0;
let _sendDomEvent: ((renderId: string, eventType: string, fields: Record<string, number | boolean>) => void) | null = null;
let _clickWired = false;
function applyProjection(frame: { html: string; css: string; rev: number }): void {
  if (frame.rev < _projRev) return;            // drop a stale frame (coalesce ordering)
  _projRev = frame.rev;
  const host = $("projection");
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  let style = shadow.querySelector("style");
  if (!style) { style = document.createElement("style"); shadow.appendChild(style); }
  style.textContent = frame.css;
  let pane = shadow.querySelector(".lar-projection") as HTMLElement | null;
  if (!pane) { pane = document.createElement("div"); pane.className = "lar-projection"; shadow.appendChild(pane); }
  // Morph (not innerHTML=) — id-set matching keeps unchanged nodes in place; the in-progress value
  // is preserved (ignoreActiveValue). The render-id attributes ride the HTML untouched.
  Idiomorph.morph(pane, frame.html, { morphStyle: "innerHTML", ignoreActiveValue: true });
  if (!_clickWired) {
    _clickWired = true;
    pane.addEventListener("click", (e) => {
      const el = (e.target as Element)?.closest?.("[data-lar-rid]");
      if (!el || !_sendDomEvent) return;
      e.preventDefault();                        // a projected <a href> must not navigate the host page
      const me = e as MouseEvent;
      _sendDomEvent(el.getAttribute("data-lar-rid")!, "click", {
        metaKey: me.metaKey, ctrlKey: me.ctrlKey, altKey: me.altKey, shiftKey: me.shiftKey, button: me.button,
      });
    });
  }
}

async function bootVessel(): Promise<void> {
  const phasesEl = $("phases");
  const paint = (p: string): void => {
    const d = document.createElement("div"); d.className = "phase"; d.textContent = p;
    phasesEl.appendChild(d);
  };

  // The sovereign identity (born local; the key beneath the veil). Idempotent + same
  // idbName, so this is the very key openBrowserVessel will boot under.
  let did = "—";
  try {
    const id = await generateOrLoadBrowserVesselIdentity(IDB);
    did = "0x" + id.verifyingKey;
  } catch { /* surfaced via boot status if it also fails */ }

  set("status", "booting…");
  // ?relay=ws://host:port/ws → the node↔browser spore crossing (opt-in; absent = pure local boot).
  const relayUrl = new URLSearchParams(location.search).get("relay") ?? undefined;
  // ?genesis=<base> → where the static host serves genesis/ (manifest + cas/). Default /genesis.
  const genesisCasBaseUrl = new URLSearchParams(location.search).get("genesis") ?? "/genesis";
  try {
    const result = await openBrowserVessel({
      hostId: "elyncia-browser",
      wikiId: "lares",
      genesisBytes,
      genesisCasManifest: genesisCasManifest as GenesisCasManifest,
      genesisCasBaseUrl,
      daemonWorkerUrl,
      workerScriptUrl,
      onPhase: paint,
      onProjection: applyProjection,
      ...(relayUrl ? { relayUrl } : {}),
    });
    _sendDomEvent = result.sendDomEvent;        // arm the interactivity RETURN leg
    const vesselEl = $("vessel"); vesselEl.replaceChildren();
    row(vesselEl, "status", "live — sovereign local island", "ok");
    row(vesselEl, "did", did);
    row(vesselEl, "mode", "browser vessel · anon veil · no node attached", "veil");
    row(vesselEl, "wiki", result.activeWikiId);
    row(vesselEl, "oracle doc", result.oracleDocUrl ?? "(local genesis)");
  } catch (e) {
    set("status", `boot failed: ${e instanceof Error ? e.message : String(e)}`, "err");
  }
}

// Run both independently — the @oracle read never waits on the vessel boot.
void readOracle();
void bootVessel();
