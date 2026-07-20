/**
 * @lararium/app — the browser-lararium boot view.
 *
 * A sovereign causal island boots in the browser (its own key, IndexedDB, genesis
 * bytes) and — when a read-face is reachable — reads the public @oracle (the node-less
 * path: an anon browser vessel consuming the read-only substrate, the elyncia.app
 * story). Location-agnostic: served from localhost / LAN / elyncia.app, the vessel
 * always runs here; the origin is a static host, never an authority.
 */
import { openBrowserVessel, generateOrLoadBrowserVesselIdentity, parseAdmitCarriage, DAEMON_SURFACE_ID } from "@lararium/browser";
import type { DeviceAdmitPayload } from "@lararium/keyhive";
import { pullAndVerifyOracle, type GenesisCasManifest, type GenesisSeed } from "@lararium/mesh";
import { Idiomorph } from "idiomorph";
// The materialize-fresh boot artifact: the PLAIN-DATA @oracle seed (island.genesis.json).
// The vessel materializes the @oracle CRDT fresh from it under the deterministic doc id
// (node-parity). Boot imports this plain-data seed alone — no Automerge binary.
import genesisSeed from "../../../genesis/island.genesis.json";
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

/**
 * Take a carried `device-admit/v1` payload off `location.hash`, and CLEAR the fragment once taken.
 *
 * The DECODE lives in `@lararium/browser` (parseAdmitCarriage) and is tested there against fixed bytes;
 * this half holds only what needs a browser: reading the fragment, and clearing it. Clearing matters —
 * a URL left holding a delegation leaves it in the address bar, the history, and every screenshot of the
 * tab, and the payload has already reached the vessel by then.
 */
function takeAdmitFromLocation(): DeviceAdmitPayload | null {
  const payload = parseAdmitCarriage(location.hash);
  if (!payload) return null;
  history.replaceState(null, "", location.pathname + location.search);
  console.log("[vessel] ADMIT carried in — this vessel JOINS an existing PersonaGroup rather than founding one.");
  return payload;
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
  // ?gate=<hex> → the RELAY GATE's verifying key. The V3 proof commits to it, and a leaf must hold it
  // out-of-band: the challenge carries it on the wire, but trusting the wire copy would let any relay
  // impersonate the gate. Absent, the leaf binds its proof to its OWN did, the gate recomputes against
  // its own, and the proof fails closed — a correct refusal that looks exactly like a broken socket.
  // The node vessel prints this key in its boot banner.
  const relayGatePubKey = new URLSearchParams(location.search).get("gate") ?? undefined;
  // #admit=<base64url> → a device-admit/v1 payload. It rides the FRAGMENT because a browser never
  // transmits one: the bytes reach this vessel by whatever the human carried them with, and no server —
  // not even the relay — sees them in transit. A signed capability needs no trusted channel; a carrier
  // may withhold it, never forge it. Fetching it instead would make this vessel a client petitioning an
  // authority for its own admission, and would demand that authority be reachable at the moment of asking.
  const admit = takeAdmitFromLocation();
  // A local boot and a CROSSED boot look identical from the outside: both render, both say "ready". So
  // the vessel names which one it just performed. A seam nobody can see is a seam nobody watches, and an
  // absent crossing that reports nothing reads exactly like a crossing that worked.
  if (relayUrl) {
    console.log(`[vessel] CROSSING → ${relayUrl}`);
    if (!relayGatePubKey) {
      console.warn(
        "[vessel] NO GATE KEY — the proof will bind to this vessel's OWN did and the gate will DENY it.\n" +
        "         Add the node vessel's key:  &gate=<hex from the node's boot banner>",
      );
    }
    // The operator cannot admit a stranger it cannot name. This vessel is the only place its own key
    // exists, so it says it — with the command that turns it into an admission.
    console.log(`[vessel] this leaf's key: ${did}`);
    console.log(`[vessel] to admit it, on the node:  lares device-admit --joinee-key ${did}`);
  } else {
    console.log(
      "[vessel] PURE LOCAL BOOT — no node vessel dialled.\n" +
      "         To cross:  ?relay=ws://localhost:8080/ws&gate=<node's gate key>",
    );
  }
  // ?genesis=<base> → where the static host serves genesis/ (manifest + cas/). Default /genesis.
  const genesisCasBaseUrl = new URLSearchParams(location.search).get("genesis") ?? "/genesis";
  // ?mesh=<readface,…> → carry-in as a mesh LEAF, bootstrapping the FLOW-map from peer @oracle
  //   read-faces (opt-in; absent = no carriage / pure local boot). Empty value defaults to the
  //   ?oracle= read-face. The browser is a LEAF (no endpoint — carries-in, not dial-able).
  const meshParam = new URLSearchParams(location.search).get("mesh");
  const meshLeaf = meshParam !== null
    ? {
        coordSeed: location.origin,
        peers: meshParam
          ? meshParam.split(",").map((s) => s.trim()).filter(Boolean)
          : [new URLSearchParams(location.search).get("oracle") ?? "http://localhost:8080"],
      }
    : undefined;
  try {
    const result = await openBrowserVessel({
      hostId: "elyncia-browser",
      wikiId: "lares",
      genesisSeed: genesisSeed as unknown as GenesisSeed,
      genesisCasManifest: genesisCasManifest as GenesisCasManifest,
      genesisCasBaseUrl,
      daemonWorkerUrl,
      workerScriptUrl,
      onPhase: paint,
      onProjection: applyProjection,
      ...(relayUrl ? { relayUrl } : {}),
      ...(relayGatePubKey ? { relayGatePubKey } : {}),
      ...(admit ? { admit } : {}),
      ...(meshLeaf ? { meshLeaf } : {}),
    });
    _sendDomEvent = result.sendDomEvent;        // arm the interactivity RETURN leg
    // The UNIVERSAL summon (the reachability affordance): host chrome overlays EVERY
    // wiki, so this button + chord flips the projection gate to the @daemon from any
    // active surface — a pure gate flip (both surfaces already mounted), no reboot.
    // Distinct from the @daemon-scoped $:/lares/surface toggle inside the widget.
    const summon = (): void => result.setActiveSurface(DAEMON_SURFACE_ID);
    const summonBtn = document.getElementById("summon-daemon") as HTMLButtonElement | null;
    if (summonBtn) { summonBtn.disabled = false; summonBtn.addEventListener("click", summon); }
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) { e.preventDefault(); summon(); }
    });
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
