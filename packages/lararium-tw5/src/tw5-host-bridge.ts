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
    if (priorTw === undefined) delete (globalThis as Record<string, unknown>)["$tw"];
    else (globalThis as Record<string, unknown>)["$tw"] = priorTw;
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

async function ensureBrowserCoreLoaded(coreBlob?: TW5CoreBootBlob): Promise<void> {
  if (coreBlob && !globalThis.$tw?.modules?.titles) {
    globalThis.$tw ??= {} as TW5Instance;
    globalThis.$tw.boot ??= {} as TW5Instance["boot"];
    globalThis.$tw.boot.suppressBoot = true;

    await new Promise<void>((resolve, reject) => {
      const blob = new Blob([new Uint8Array(coreBlob.bytes)], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      const script = document.createElement("script");
      script.src = blobUrl;
      script.onload = () => { URL.revokeObjectURL(blobUrl); resolve(); };
      script.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("TW5Engine: blob script load failed")); };
      document.head.appendChild(script);
    });
  }

  if (!globalThis.$tw?.modules?.titles) {
    throw new Error("TW5Engine: no TW5 core. Pass coreBlob from LarariumDoc to boot().");
  }
}

function neutralizeNodeBootAuthority(instance: TW5Instance): void {
  instance.boot.argv = [];
  (instance as unknown as { node: null; browser: null }).node = null;
  (instance as unknown as { node: null; browser: null }).browser = null;
  (instance as unknown as { loadTiddlersNode?: () => void }).loadTiddlersNode = () => {};
}

export async function prepareHostBootInstance(
  coreBlob?: TW5CoreBootBlob,
): Promise<{ instance: TW5Instance; isBrowser: boolean }> {
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  if (isBrowser) {
    await ensureBrowserCoreLoaded(coreBlob);
    globalThis.$tw!.boot.suppressBoot = true;
    globalThis.$tw!.boot.argv = globalThis.$tw!.boot.argv ?? [];
    return { instance: globalThis.$tw as unknown as TW5Instance, isBrowser };
  }

  const instance = (await loadNodeTiddlyWiki(coreBlob)).TiddlyWiki() as unknown as TW5Instance;
  neutralizeNodeBootAuthority(instance);
  return { instance, isBrowser };
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
    const savedModule = hostGlobal["module"];
    const nodeRequireShim = !isBrowser ? (instance as unknown as Record<string, unknown>)["__larariumRequireShim"] : undefined;
    const nodeModuleShim = !isBrowser ? (instance as unknown as Record<string, unknown>)["__larariumModuleShim"] : undefined;
    if (!isBrowser) {
      if (nodeRequireShim) hostGlobal["require"] = nodeRequireShim;
      if (nodeModuleShim) hostGlobal["module"] = nodeModuleShim;
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