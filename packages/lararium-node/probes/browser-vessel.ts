/**
 * browser-vessel — a REAL browser vessel in the mesh, standing at the floor with a veiled persona.
 *
 * ── WHY A REAL ENGINE, AND WHY localhost ────────────────────────────────────────────────────────
 * A browser vessel mints its identity through `crypto.subtle`, which a browser withholds off a
 * SECURE CONTEXT. Node never grants one: it defines no `isSecureContext`, so a Node probe reads
 * `undefined` and the gate refuses — the localhost exemption is a browser behaviour, and only a
 * browser has it. Measured: Chromium at `http://localhost` reads `isSecureContext=true`, holds
 * `crypto.subtle`, and mints Ed25519.
 *
 * So this probe serves the app from 127.0.0.1 and drives Chromium at it. In the mesh the container
 * shares its operator's network namespace, which is what makes `localhost` name the operator's own
 * vessel — no certificate, and no stub standing where the wall is.
 *
 * ── WHAT STAYS UNWALKED, NAMED ──────────────────────────────────────────────────────────────────
 * The localhost exemption is not TLS. A household reaching a vessel from another device crosses a
 * real origin and needs a real certificate — the DNS-01 path. This probe proves the browser half of
 * the ceremony; it proves nothing about a browser that is not co-located.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/founding-runbook
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const APP_DIR   = process.env["LAR_APP_DIR"]  ?? resolve("packages/lararium-app/dist");
const APP_PORT  = Number.parseInt(process.env["LAR_APP_PORT"] ?? "5173", 10);
/** The operator's vessel this browser belongs to — reached over the shared namespace. */
const VESSEL_WS = process.env["LAR_VESSEL_WS"] ?? "ws://localhost:8080/ws";
const LABEL     = process.env["LAR_BROWSER_LABEL"] ?? "browser";

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
};

/** Serve the built app on the loopback — the ORIGIN is the whole point, so it never binds outward. */
function serveApp(): Promise<() => void> {
  const handler = (q: IncomingMessage, s: ServerResponse): void => {
    const rel = (q.url ?? "/").split("?")[0]!;
    const file = rel === "/" || rel === "" ? "index.html" : rel.replace(/^\//, "");
    const path = join(APP_DIR, file);
    // A single-page app answers its own routes; anything unfound falls back to the shell.
    const served = existsSync(path) && !path.endsWith("/") ? path : join(APP_DIR, "index.html");
    try {
      s.writeHead(200, { "content-type": MIME[extname(served)] ?? "application/octet-stream" });
      s.end(readFileSync(served));
    } catch {
      s.writeHead(404); s.end("not found");
    }
  };
  const srv = createServer(handler);
  return new Promise((ok) => srv.listen(APP_PORT, "127.0.0.1", () => ok(() => srv.close())));
}

interface Reading {
  readonly secureContext: boolean;
  readonly subtle: boolean;
  readonly ed25519: string;
  /**
   * The minted vessel's PUBLIC verifying key, hex — the value a `device-admit` needs.
   *
   * A browser vessel that mints and cannot say WHAT it minted leaves the admit unwalkable: the
   * operator's node has nothing to name. Public material by construction, and the private half never
   * leaves the page.
   */
  readonly verifyingKey: string;
  readonly origin: string;
}

/** What the page reports about its own ability to hold a key. The gate reads exactly these. */
async function readContext(page: Page): Promise<Reading> {
  return await page.evaluate(async () => {
    let ed25519 = "absent";
    let verifyingKey = "";
    try {
      const k = await crypto.subtle.generateKey({ name: "Ed25519" } as EcKeyGenParams, true, ["sign", "verify"]);
      ed25519 = ((await crypto.subtle.exportKey("jwk", k.publicKey)) as JsonWebKey).crv ?? "unnamed";
      // THE RAW PUBLIC HALF, so the operator's node can name this vessel in an admit. `raw` is the
      // 32 Ed25519 bytes; the private half stays in the page and is never exported.
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
      verifyingKey = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { ed25519 = `refused: ${(e as Error).message}`; }
    return {
      secureContext: globalThis.isSecureContext === true,
      subtle: typeof globalThis.crypto?.subtle === "object",
      ed25519,
      verifyingKey,
      origin: location.origin,
    };
  });
}

async function main(): Promise<number> {
  if (!existsSync(join(APP_DIR, "index.html"))) {
    console.error(`[browser-vessel] no app at ${APP_DIR} — run \`pnpm --filter @lararium/app build\``);
    return 2;
  }
  const stop = await serveApp();
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox"] });   // container: no user namespace
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error(`[browser-vessel] page: ${e.message}`));
    await page.goto(`http://localhost:${APP_PORT}/`, { waitUntil: "domcontentloaded" });

    const r = await readContext(page);
    console.log(`[browser-vessel:${LABEL}] origin ${r.origin}`);
    console.log(`[browser-vessel:${LABEL}] secure-context=${r.secureContext} subtle=${r.subtle} ed25519=${r.ed25519}`);
    console.log(`[browser-vessel:${LABEL}] operator vessel: ${VESSEL_WS}`);

    // THE FLOOR IS THE POINT. A browser vessel that cannot mint holds no veiled persona and can never
    // be admitted into anyone's PersonaGroup, so this refuses here rather than failing later wearing
    // some other name.
    if (!r.secureContext || !r.subtle || !r.ed25519.startsWith("Ed25519")) {
      console.error(`[browser-vessel:${LABEL}] REFUSED at the floor — this origin cannot mint an identity.`);
      return 1;
    }
    // THE KEY THE ADMIT NAMES. Printed on its own line so a harness can lift it without parsing prose.
    console.log(`[browser-vessel:${LABEL}] verifying-key ${r.verifyingKey}`);
    console.log(`[browser-vessel:${LABEL}] stands at the floor, veiled — ready for a PersonaGroup admit.`);
    return 0;
  } finally {
    await browser?.close();
    stop();
  }
}

main().then((c) => process.exit(c)).catch((e) => { console.error(e); process.exit(1); });
