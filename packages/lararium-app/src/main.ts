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
import { pullAndVerifyOracle } from "@lararium/mesh";
import genesisBytes from "../../../genesis/island.bin?uint8array";
// `?worker&url` — Vite builds each worker shim through its worker pipeline and yields the built
// bundle's URL (a real /assets file). A standalone `new URL("./x.ts", import.meta.url)` passed
// INDIRECTLY to the vessel got inlined as a `data:` URI, where the worker's dynamic imports
// (keyhive-WASM-first, then the chain) cannot resolve — the admin/wiki boot's silent death.
import adminWorkerUrlStr from "./workers/admin.worker.ts?worker&url";
import wikiWorkerUrlStr  from "./workers/wiki.worker.ts?worker&url";

const adminWorkerUrl  = new URL(adminWorkerUrlStr, import.meta.url);
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
  try {
    const result = await openBrowserVessel({
      hostId: "elyncia-browser",
      wikiId: "lares",
      genesisBytes,
      adminWorkerUrl,
      workerScriptUrl,
      onPhase: paint,
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

// BISECT: automerge-only smoke worker — does automerge WASM instantiate in THIS build?
// (isolates the nested-worker-wasm build from keyhive/TW5). Diagnostic; remove once green.
try {
  const smoke = new Worker(new URL("./workers/smoke.worker.ts", import.meta.url), { type: "module" });
  smoke.addEventListener("message", (e) => console.log("[smoke<-]", JSON.stringify(e.data)));
  smoke.addEventListener("error", (e) => console.error("[smoke ERR]", (e as ErrorEvent).message, (e as ErrorEvent).filename, (e as ErrorEvent).error));
} catch (e) { console.error("[smoke spawn]", e); }

// Run both independently — the @oracle read never waits on the vessel boot.
void readOracle();
void bootVessel();
