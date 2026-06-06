import { createHash } from "crypto";

import type { TW5Instance } from "./types/tiddlywiki.js";

export interface TW5CoreBootBlob {
  bytes: Uint8Array;
  /** Hex-encoded SHA-256 expected for these exact bytes. */
  sha256?: string;
  /** Human/debug provenance only; never treated as authority. */
  source?: string;
}

export type TW5CoreBootInput = Uint8Array | TW5CoreBootBlob;

const TW5_NODE_BOOT_BUILTINS = new Set([
  "crypto", "node:crypto",
  "path",   "node:path",
  "vm",     "node:vm",
  "os",     "node:os",
  "url",    "node:url",
]);

export function normalizeCoreBootBlob(input?: TW5CoreBootInput): TW5CoreBootBlob | undefined {
  if (!input) return undefined;
  return input instanceof Uint8Array ? { bytes: input } : input;
}

export function verifyCoreBootBlob(core: TW5CoreBootBlob): void {
  if (!core.sha256) return;
  const actual = createHash("sha256").update(core.bytes).digest("hex");
  if (actual.toLowerCase() !== core.sha256.toLowerCase()) {
    throw new Error(
      `TW5Engine: coreBlob sha256 mismatch` +
      ` expected=${core.sha256}` +
      ` actual=${actual}` +
      (core.source ? ` source=${core.source}` : ""),
    );
  }
}

function makeBrowserVmShim(): Record<string, unknown> {
  function runInCtx(code: string, ctx: Record<string, unknown> | undefined): unknown {
    const c = ctx ?? (Object.create(null) as Record<string, unknown>);
    const keys = Object.keys(c);
    const vals = keys.map((k) => c[k]);
    try {
      return (new Function(...keys, code) as (...args: unknown[]) => unknown)(...vals);
    } catch { return undefined; }
  }
  class BrowserVmScript {
    private readonly code: string;
    constructor(code: string, _options?: unknown) { this.code = code; }
    runInContext(ctx: Record<string, unknown>): unknown { return runInCtx(this.code, ctx); }
    runInNewContext(ctx?: Record<string, unknown>): unknown { return runInCtx(this.code, ctx); }
    runInThisContext(): unknown { try { return new Function(this.code)(); } catch { return undefined; } }
  }
  return {
    Script: BrowserVmScript,
    createContext(ctx: Record<string, unknown>): Record<string, unknown> {
      return ctx ?? (Object.create(null) as Record<string, unknown>);
    },
    runInContext(code: string, ctx: Record<string, unknown>): unknown { return runInCtx(code, ctx); },
    runInNewContext(code: string, ctx?: Record<string, unknown>): unknown { return runInCtx(code, ctx); },
    runInThisContext(code: string): unknown { try { return new Function(code)(); } catch { return undefined; } },
  };
}

function makeBrowserPathShim(): Record<string, unknown> {
  const sep = "/";
  const normalize = (p: string) => p.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  const dirname  = (p: string) => { const i = p.lastIndexOf("/"); return i < 1 ? (i === 0 ? "/" : ".") : p.slice(0, i); };
  const basename = (p: string, ext?: string) => { const b = p.slice(p.lastIndexOf("/") + 1); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; };
  const extname  = (p: string) => { const b = basename(p); const i = b.lastIndexOf("."); return i > 0 ? b.slice(i) : ""; };
  const join     = (...parts: string[]) => normalize(parts.filter(Boolean).join("/"));
  const resolve  = (...parts: string[]) => {
    let acc = "/";
    for (const p of parts) { acc = p.startsWith("/") ? p : join(acc, p); }
    return normalize(acc);
  };
  return { sep, dirname, basename, extname, join, resolve, normalize };
}

function makeDeniedFsShim(): Record<string, unknown> {
  return new Proxy(Object.create(null) as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === "promises") return makeDeniedFsShim();
      if (typeof prop === "symbol") return undefined;
      return () => {
        throw new Error(`TW5Engine: filesystem access denied during content-addressed TW5 boot (fs.${prop})`);
      };
    },
  });
}

async function loadNodeTiddlyWiki(coreBlob?: TW5CoreBootBlob): Promise<{ TiddlyWiki: () => unknown }> {
  if (!coreBlob) {
    throw new Error("TW5Engine: Node boot requires coreBlob from LarariumDoc; refusing node_modules tiddlywiki fallback.");
  }

  const { createRequire } = await import("module");
  const nodeRequire = createRequire(import.meta.url);
  const moduleShim: { exports: Record<string, unknown>; filename: string } = {
    exports: {},
    // TW5's node boot code derives bootPath/corePath from module.filename.
    // Keep this virtual: the executable core arrives from coreBlob, not from an
    // installed tiddlywiki package. Runtime disk reads stay disabled by our
    // preloaded-tiddler boot path below.
    filename: "/virtual/lararium/tiddlywiki/boot/boot.js",
  };
  const exportsShim = moduleShim.exports;
  const requireShim = (id: string): unknown => {
    if (id === "../package.json") {
      return { engines: { node: ">=18.0.0" } };
    }
    if (id === "fs" || id === "node:fs") {
      return makeDeniedFsShim();
    }
    if (TW5_NODE_BOOT_BUILTINS.has(id)) {
      return nodeRequire(id);
    }
    throw new Error(`TW5Engine: coreBlob attempted non-builtin require(${JSON.stringify(id)}) during boot`);
  };
  const priorTw = (globalThis as Record<string, unknown>)["$tw"];
  const priorLoad = (globalThis as Record<string, unknown>)["_load"];
  const priorWindow = (globalThis as Record<string, unknown>)["window"];
  const priorRequire = (globalThis as Record<string, unknown>)["require"];
  let twFromBlob: unknown;
  try {
    // Some bundled TW5 modules use browser-style UMD wrappers that read a
    // global `window` symbol during definition even on Node. Provide a temporary
    // virtual window only while evaluating the content-addressed core blob.
    (globalThis as Record<string, unknown>)["window"] = globalThis;
    (globalThis as Record<string, unknown>)["require"] = requireShim;
    (globalThis as Record<string, unknown>)["$tw"] = { boot: { suppressBoot: true } };
    // The standalone TW5 core blob is the browser/server boot script emitted by
    // TiddlyWiki. Evaluating it with CommonJS-shaped `exports` makes it expose
    // `exports.TiddlyWiki`, while the bytes themselves come from the
    // content-addressed LarariumDoc blob, not from an installed TW5 package.
    const source = new TextDecoder().decode(new Uint8Array(coreBlob.bytes));
    const evaluate = new Function("exports", "module", "require", "window", "process", source);
    evaluate(exportsShim, moduleShim, requireShim, globalThis, process);
    twFromBlob = (globalThis as Record<string, unknown>)["$tw"];
    if (twFromBlob && typeof twFromBlob === "object") {
      const tw = twFromBlob as Record<string, unknown>;
      tw["__larariumRequireShim"] = requireShim;
      tw["__larariumModuleShim"] = moduleShim;
    }
  } finally {
    // Leave $tw on globalThis — the blob evaluation establishes the island's own
    // TW5 instance there. Startup modules (reaction-router, grammar-cache) read
    // $tw.wiki via globalThis.$tw. In a Worker thread, globalThis is the island's
    // isolated scope; the instance stays sovereign. Restore the other shims that
    // were only needed during blob evaluation.
    if (priorTw !== undefined) (globalThis as Record<string, unknown>)["$tw"] = priorTw;
    if (priorLoad === undefined) delete (globalThis as Record<string, unknown>)["_load"];
    else (globalThis as Record<string, unknown>)["_load"] = priorLoad;
    if (priorWindow === undefined) delete (globalThis as Record<string, unknown>)["window"];
    else (globalThis as Record<string, unknown>)["window"] = priorWindow;
    if (priorRequire === undefined) delete (globalThis as Record<string, unknown>)["require"];
    else (globalThis as Record<string, unknown>)["require"] = priorRequire;
  }

  if (typeof exportsShim["TiddlyWiki"] === "function") {
    return exportsShim as { TiddlyWiki: () => unknown };
  }
  if (twFromBlob && typeof twFromBlob === "object") {
    return { TiddlyWiki: () => twFromBlob };
  }
  throw new Error("TW5Engine: coreBlob did not yield a TiddlyWiki instance.");
}

// vm polyfill tiddler text — injected into TW5's module registry before boot.
// When $:/boot/boot.js re-executes as a startup module it overwrites
// $tw.boot.commonJsRequire with TW5's internal _load, which cannot resolve Node
// built-ins. Preloading a "vm" tiddler with module-type "library" makes
// _load("vm") find this polyfill instead.
const BROWSER_VM_TIDDLER_TEXT = `\
exports.createContext = function(ctx) { return ctx || Object.create(null); };
exports.Script = function Script(code) { this.code = code; };
exports.Script.prototype.runInContext = function(ctx) {
  var keys = Object.keys(ctx || {}), vals = keys.map(function(k) { return ctx[k]; });
  try { return Function.apply(null, keys.concat([this.code])).apply(null, vals); } catch(e) { return undefined; }
};
exports.Script.prototype.runInNewContext = function(ctx) { return this.runInContext(ctx || Object.create(null)); };
exports.Script.prototype.runInThisContext = function() { try { return Function(this.code)(); } catch(e) { return undefined; } };
exports.runInContext = function(code, ctx) { return new exports.Script(code).runInContext(ctx); };
exports.runInNewContext = function(code, ctx) { return new exports.Script(code).runInNewContext(ctx); };
exports.runInThisContext = function(code) { try { return Function(code)(); } catch(e) { return undefined; } };
`;

// Browser Web Workers have `importScripts` but no `window` or `document`.
// TW5 core must be evaluated via Function() — same as Node path — but without
// Node's `createRequire`. This shim throws on any Node built-in require.
async function loadBrowserWorkerTiddlyWiki(coreBlob?: TW5CoreBootBlob): Promise<{ TiddlyWiki: () => unknown }> {
  if (!coreBlob) {
    throw new Error("TW5Engine: browser Worker boot requires coreBlob from LarariumDoc.");
  }

  const moduleShim: { exports: Record<string, unknown>; filename: string } = {
    exports: {},
    filename: "/virtual/lararium/tiddlywiki/boot/boot.js",
  };
  const exportsShim = moduleShim.exports;
  const requireShim = (id: string): unknown => {
    if (id === "../package.json") return { engines: { node: ">=18.0.0" } };
    if (id === "fs"   || id === "node:fs")   return makeDeniedFsShim();
    if (id === "path" || id === "node:path") return makeBrowserPathShim();
    if (id === "vm"   || id === "node:vm")   return makeBrowserVmShim();
    throw new Error(`TW5Engine: browser Worker coreBlob attempted require(${JSON.stringify(id)}) — Node built-ins unavailable`);
  };

  const g = globalThis as Record<string, unknown>;
  const priorTw      = g["$tw"];
  const priorWindow  = g["window"];
  const priorRequire = g["require"];
  let twFromBlob: unknown;
  try {
    g["window"]  = globalThis;
    g["require"] = requireShim;
    // Pre-seed $tw with node:{} so bootprefix (executed immediately via _load) skips
    // platform detection. Without this, bootprefix detects browser=null (no document)
    // and node=null (no process), so boot.js sets vm.createContext({}) with vm=undefined.
    // With node:{}: vm = require("vm") → makeBrowserVmShim(), vm.createContext({}) → safe.
    // Neutralization (node=null, loadTiddlersNode stub) happens after blob eval, before boot().
    g["$tw"]     = { boot: { suppressBoot: true }, node: {}, browser: null };
    const source   = new TextDecoder().decode(new Uint8Array(coreBlob.bytes));
    const evaluate = new Function("exports", "module", "require", "window", "process", source);
    evaluate(exportsShim, moduleShim, requireShim, globalThis, undefined);
    twFromBlob = g["$tw"];
    if (twFromBlob && typeof twFromBlob === "object") {
      const tw = twFromBlob as Record<string, unknown>;
      tw["__larariumRequireShim"] = requireShim;
      tw["__larariumModuleShim"]  = moduleShim;
    }
  } finally {
    if (priorTw !== undefined) g["$tw"] = priorTw;
    if (priorWindow  === undefined) delete g["window"];
    else g["window"]  = priorWindow;
    if (priorRequire === undefined) delete g["require"];
    else g["require"] = priorRequire;
  }

  if (typeof exportsShim["TiddlyWiki"] === "function") {
    return exportsShim as { TiddlyWiki: () => unknown };
  }
  if (twFromBlob && typeof twFromBlob === "object") {
    return { TiddlyWiki: () => twFromBlob };
  }
  throw new Error("TW5Engine: browser Worker coreBlob did not yield a TiddlyWiki instance.");
}

function neutralizeNodeBootAuthority(instance: TW5Instance): void {
  instance.boot.argv = [];
  // Null both platform flags: prevents TW5 from reading filesystem (node path)
  // or DOM (browser path) during blob-boot. Our startup modules (reaction-router,
  // grammar-cache) omit the `platforms` field so they pass globalExclude regardless.
  (instance as unknown as { node: null; browser: null }).node    = null;
  (instance as unknown as { node: null; browser: null }).browser = null;
  (instance as unknown as { loadTiddlersNode?: () => void }).loadTiddlersNode = () => {};
}

export async function prepareHostBootInstance(
  coreBlob?: TW5CoreBootBlob,
): Promise<{ instance: TW5Instance; isBrowser: boolean }> {
  const isBrowserMain = typeof window !== "undefined" && typeof document !== "undefined";
  // ES module Workers lack `importScripts` (only classic Workers have it) and lack
  // `process` (Node global). Use absence of `process` to distinguish browser Workers
  // from Node Worker threads. Vite browser bundles do not inject a process polyfill.
  const isBrowserWorker = !isBrowserMain &&
    typeof (globalThis as Record<string, unknown>)["process"] === "undefined";

  if (isBrowserMain) {
    // §9 sovereignty law: TW5 SHALL NOT instantiate on the main thread.
    // Every TW5Engine lives inside a sovereign Worker. Boot via browser-wiki-worker.ts only.
    throw new Error("TW5Engine: sovereignty violation — TW5 SHALL NOT instantiate on the main thread (§9). Boot TW5 in a Worker only.");
  }

  if (isBrowserWorker) {
    // Headless-island environment contract (the kupono lift): TW5's core UMD +
    // startup modules read Node's `global`. A browser Worker has none — but its
    // globalThis IS the island's sovereign scope, so alias `global` to it,
    // isomorphic with what a Node worker_thread exposes for free. Set permanently
    // (not a restored boot shim): in the headless island `global` legitimately
    // === globalThis. Completes the window/require/vm/path/fs synthetics this
    // module already presents — the last missing Node-ism the browser must supply.
    (globalThis as Record<string, unknown>)["global"] ??= globalThis;

    const instance = (await loadBrowserWorkerTiddlyWiki(coreBlob)).TiddlyWiki() as unknown as TW5Instance;
    // Neutralize node authority AFTER blob eval (which needed $tw.node={} to load vmShim),
    // but BEFORE boot.boot() so Node-specific blocks ($tw.node check) and fs access are skipped.
    instance.boot.argv = [];
    (instance as unknown as { node: null }).node = null;
    (instance as unknown as { loadTiddlersNode?: () => void }).loadTiddlersNode = () => {};

    return { instance, isBrowser: false };
  }

  const instance = (await loadNodeTiddlyWiki(coreBlob)).TiddlyWiki() as unknown as TW5Instance;
  neutralizeNodeBootAuthority(instance);
  return { instance, isBrowser: false };
}

export async function bootWithHostBridge(
  instance: TW5Instance,
  isBrowser: boolean,
  onBoot: () => void | Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve) => {
    let restoreStdout: (() => void) | null = null;
    const proc = (globalThis as Record<string, unknown>).process as (typeof process) | undefined;
    if (proc?.stdout?.write) {
      const orig = proc.stdout.write.bind(proc.stdout);
      proc.stdout.write = () => true;
      restoreStdout = () => { proc.stdout.write = orig; };
    }

    const hostGlobal = globalThis as Record<string, unknown>;
    const savedRequire = hostGlobal["require"];
    const savedModule  = hostGlobal["module"];
    const nodeRequireShim = !isBrowser ? (instance as unknown as Record<string, unknown>)["__larariumRequireShim"] : undefined;
    const nodeModuleShim  = !isBrowser ? (instance as unknown as Record<string, unknown>)["__larariumModuleShim"]  : undefined;
    if (!isBrowser) {
      if (nodeRequireShim) hostGlobal["require"] = nodeRequireShim;
      if (nodeModuleShim)  hostGlobal["module"]  = nodeModuleShim;
    }

    instance.boot.boot(() => {
      restoreStdout?.();
      if (!isBrowser) {
        if (savedRequire === undefined) delete hostGlobal["require"];
        else hostGlobal["require"] = savedRequire;
        if (savedModule === undefined) delete hostGlobal["module"];
        else hostGlobal["module"] = savedModule;
      }
      Promise.resolve(onBoot()).then(() => resolve()).catch(() => resolve());
    });
  });
}