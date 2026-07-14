/** host-ts fold — the TS host stays byte-grounded, contained, and refuse-loud. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadArtifact, loadArtifactFromBytes } from "./loader.mjs";
import { fold, canonicalJson, structuralHash } from "./fold.mjs";

const artifact = await loadArtifact();
const enc = (s) => new TextEncoder().encode(s);

function kinds(node, acc = new Map()) {
  acc.set(node.kind, (acc.get(node.kind) ?? 0) + 1);
  for (const c of node.children ?? []) kinds(c, acc);
  return acc;
}

test("ahu block nests its body by containment", () => {
  const ast = fold(enc("<<~ ahu #entry >>\nsome prose line\n<<~ inner sigil >>\n<<~/ahu >>\n"), artifact);
  const ahu = ast.children.find((c) => c.kind === "meme.ahu");
  assert.ok((kinds(ahu).get("meme.sigil") ?? 0) >= 1); // the inner sigil rides UNDER the ahu
  assert.equal(ahu.open?.kind, "meme.ahu.open");
  assert.equal(ahu.close?.kind, "meme.ahu.close");
});

test("spans speak BYTE offsets into the ground, never UTF-16 units", () => {
  // ॐ = 3 bytes / 1 UTF-16 unit; 𝕏 = 4 bytes / 2 units — both before the sigil
  const data = enc("ॐ 𝕏 pre\n<<~ mu >>\n");
  const ast = fold(data, artifact);
  const sigil = ast.children.find((c) => c.kind === "meme.sigil");
  const teeth = new TextDecoder().decode(data.slice(sigil.start, sigil.start + 3));
  assert.equal(teeth, "<<~"); // the span indexes BYTES
  assert.equal(ast.end, data.length);
});

test("the fold runs deterministic and hash-stable", () => {
  const data = enc("<<~ a >>\ntext\n<<~ b >>\n<<~/a >>\n".repeat(3));
  assert.equal(canonicalJson(fold(data, artifact)), canonicalJson(fold(data, artifact)));
  assert.equal(structuralHash(fold(data, artifact)), structuralHash(fold(data, artifact)));
});

test("an unregistered sigil folds cleanly as a plain carrier sigil", () => {
  const k = kinds(fold(enc("<<~ totally-novel-name with args >>\n"), artifact));
  assert.equal(k.get("meme.sigil"), 1);
  assert.ok(!k.has("ERROR"));
});

test("canonical json sorts keys and leaks no host fields", () => {
  const cj = canonicalJson(fold(enc("<<~ x >>\n"), artifact));
  assert.ok(cj.indexOf('"children"') < cj.indexOf('"end"'));
  assert.ok(cj.indexOf('"end"') < cj.indexOf('"kind"'));
  assert.ok(cj.indexOf('"kind"') < cj.indexOf('"start"'));
  assert.ok(!cj.includes('"_')); // no host/internal field enters the parity currency
});

test("the loader refuses loud on an ABI mismatch, naming both sides", async () => {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const pkgDir = path.normalize(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const runtime = await readFile(path.join(pkgDir, "node_modules", "web-tree-sitter", "web-tree-sitter.wasm"));
  const grammar = await readFile(path.join(pkgDir, "tree-sitter-memetic_wikitext.wasm"));
  const query = await readFile(path.join(pkgDir, "queries", "memeast.scm"), "utf8");
  await assert.rejects(
    loadArtifactFromBytes(runtime, grammar, query, { grammarAbi: 14 }),
    /ABI 15.*declares 14/s,
  );
});
