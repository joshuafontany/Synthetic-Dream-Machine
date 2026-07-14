/**
 * host-ts loader — the artifact loads from RAW BYTES, refuse-loud on the quad.
 *
 * The byte path (Parser.init({wasmBinary}) + Language.load(Uint8Array)) is
 * the SAME no-fetch shape the TW5 plugin's boot-preload law demands and the
 * gate-two witness proved — so this one loader serves Node, the VM, and the
 * browser tiers; only WHERE the bytes come from differs per host.
 *
 * Refuse-loud (the quad law): a runtime that cannot honor the artifact's
 * declared grammar ABI stops, naming both sides — never a silent half-load.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Parser, Language, Query } from "web-tree-sitter";

const PKG_DIR = path.normalize(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

/**
 * Load the artifact from explicit bytes (isomorphic core).
 * @param {Uint8Array} runtimeWasm web-tree-sitter runtime bytes
 * @param {Uint8Array} grammarWasm the grammar wasm bytes
 * @param {string} querySource memeast.scm text
 * @param {{grammarAbi: number}} quad the artifact's declared quad
 */
export async function loadArtifactFromBytes(runtimeWasm, grammarWasm, querySource, quad) {
  await Parser.init({ wasmBinary: runtimeWasm });
  const language = await Language.load(grammarWasm);
  if (language.abiVersion !== quad.grammarAbi) {
    throw new Error(
      `memetic artifact refuses: the loaded grammar carries ABI ${language.abiVersion} `
      + `while the artifact declares ${quad.grammarAbi} — rebuild the wasm with the `
      + `pinned CLI or honor the quad (the pin-pair law).`,
    );
  }
  return { Parser, language, query: new Query(language, querySource) };
}

/** Node convenience: load everything from the package's own tree. */
export async function loadArtifact() {
  const [pkg, runtimeWasm, grammarWasm, querySource] = await Promise.all([
    readFile(path.join(PKG_DIR, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(PKG_DIR, "node_modules", "web-tree-sitter", "web-tree-sitter.wasm")),
    readFile(path.join(PKG_DIR, "tree-sitter-memetic_wikitext.wasm")),
    readFile(path.join(PKG_DIR, "queries", "memeast.scm"), "utf8"),
  ]);
  return loadArtifactFromBytes(runtimeWasm, grammarWasm, querySource, pkg.artifact);
}
