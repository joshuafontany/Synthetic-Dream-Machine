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

// Local worker shims — Vite cannot resolve a worker URL into a dependency package
// (vitejs/vite#10837); the URL must be a first-party literal the bundler statically sees.
const workerScriptUrl = new URL("./workers/wiki.worker.ts",  import.meta.url);
const adminWorkerUrl  = new URL("./workers/admin.worker.ts", import.meta.url);

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

async function main(): Promise<void> {
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

  // The @oracle read-face — the node-less anon-read path. Config-supplied via ?oracle=…,
  // default the local dev node; elyncia.app would point this at a public read-face.
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

void main();
