// Emit a SELF-CONTAINED posture witness (wasm as base64 — the plugin's exact
// packaging shape, no fetch anywhere): node tools/posture-witness-embed.mjs > /tmp/pw.html
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const b64 = async (p) => (await readFile(p)).toString("base64");
const runtime = await b64(path.join(pkg, "node_modules/web-tree-sitter/web-tree-sitter.wasm"));
const grammar = await b64(path.join(pkg, "tree-sitter-memetic_wikitext.wasm"));
console.log(`<!doctype html><meta charset="utf-8"><title>posture-D witness (embedded)</title>
<h1>posture-D witness — base64 tiddler shape, zero fetch</h1><pre id="o"></pre>
<script>
const o = document.getElementById("o"); const log = s => o.textContent += s + "\\n";
const un64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
let t = performance.now(); const rb = un64("${runtime}");
log("base64 decode runtime: " + (performance.now()-t).toFixed(1) + "ms");
t = performance.now(); new WebAssembly.Module(rb);
log("sync compile runtime: " + (performance.now()-t).toFixed(1) + "ms");
t = performance.now(); new WebAssembly.Module(un64("${grammar}"));
log("sync compile grammar: " + (performance.now()-t).toFixed(1) + "ms");
log("PASS if compiles < 50ms — posture D rules under the plugin's exact packaging.");
</script>`);
