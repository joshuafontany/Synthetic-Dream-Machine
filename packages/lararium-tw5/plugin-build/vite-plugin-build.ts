import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { build } from "vite";
import { discoverModules } from "./discover-modules.js";
import { MODULE_MANIFEST, packagePath, packageRelative, ROOT, TIDDLER_SRC_DIR } from "./paths.js";
import { MODULE_MANIFEST_FORMAT, type ModuleManifestEntry, sha256, writeModuleManifest } from "./module-manifest.js";

export async function buildPluginCjsTiddlers(outDir = TIDDLER_SRC_DIR): Promise<void> {
  const outDirAbs = packagePath(outDir);
  rmSync(outDirAbs, { recursive: true, force: true });
  mkdirSync(outDirAbs, { recursive: true });

  const modules = discoverModules();
  const manifest: ModuleManifestEntry[] = [];

  for (const mod of modules) {
    await build({
      configFile: false,
      logLevel: "warn",
      build: {
        lib: {
          entry: mod.absPath,
          formats: ["cjs"],
          fileName: () => `${mod.name}.js`,
        },
        outDir: outDirAbs,
        emptyOutDir: false,
        sourcemap: false,
        minify: false,
        rollupOptions: {
          external: (id) => {
            if (id.startsWith("$:/") || id === "tiddlywiki" || id.startsWith("tiddlywiki/")) return true;
            // smol-toml ships as its own library tiddler; externalize in all modules except
            // the lib-smol-toml bundle itself (which must inline it).
            if (id === "smol-toml" && mod.name !== "smol-toml") return true;
            // wiki-sense-fold ships ONCE as its own library tiddler; every other module requires
            // it by URI (the smol-toml precedent) — only the fold bundle inlines its own body.
            // The alias below rewrites the relative import to this BARE id first (a bare external
            // emits the paths mapping verbatim; a relative external gets re-relativized by rollup).
            if (id === "lararium-wiki-sense-fold") return true;
            // meme-ast ships ONCE as its own library tiddler (modules/meme-ast) — the same trio:
            // every consumer module requires it by URI instead of inlining its own copy.
            if (id === "lararium-meme-ast") return true;
            return false;
          },
          output: {
            esModule: false,
            exports: "named",
            generatedCode: { symbols: false },
            paths: (id: string) =>
              id === "lararium-wiki-sense-fold"
                ? "lar:///ha.ka.ba/@lararium/tw5/lib/wiki-sense-fold"
                : id === "lararium-meme-ast"
                  ? "lar:///ha.ka.ba/@lararium/tw5/modules/meme-ast"
                  : id === "smol-toml"
                    ? "lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml"
                    : id,
          },
        },
      },
      resolve: {
        alias: [
          // the shared wiki-sense fold rides as ONE library tiddler: rewrite the relative import
          // to a bare id (externalized + paths-mapped above) in every module EXCEPT the fold's own
          // bundle, which must inline its body.
          ...(mod.name !== "wiki-sense-fold"
            ? [{ find: /^(\.\.?\/)+wiki-sense-fold(\.js)?$/, replacement: "lararium-wiki-sense-fold" }]
            : []),
          // meme-ast rides the same law: its runtime submodules (index/parse/fence-mask/ahu-scan)
          // rewrite to ONE bare id in every module except meme-ast's own bundle — the five inlined
          // copies collapse to require() of the one library tiddler. (types.js stays type-only and
          // erases before resolution.)
          ...(mod.name !== "meme-ast"
            ? [{
                find: /^(\.\.?\/)+meme-ast\/(index|parse|fence-mask|ahu-scan)(\.js)?$/,
                replacement: "lararium-meme-ast",
              }]
            : []),
          {
            find: /^@lararium\/mesh\/(.+)$/,
            replacement: `${path.resolve(ROOT, "../lararium-mesh/src")}/$1`,
          },
          {
            find: "@lararium/mesh",
            replacement: path.resolve(ROOT, "../lararium-mesh/src/index.ts"),
          },
        ],
      },
    });

    const outputPath = path.join(outDirAbs, `${mod.name}.js`);
    const raw = readFileSync(outputPath, "utf8");
    const outputText = mod.banner + raw;
    writeFileSync(outputPath, outputText, "utf8");
    manifest.push({
      title: mod.fields["title"]!,
      moduleType: mod.fields["module-type"]!,
      sourcePath: mod.sourcePath,
      outputPath: packageRelative(outputPath),
      sha256: sha256(outputText),
    });
    console.log(`[plugin-build] ${outDir}/${mod.name}.js`);
  }

  const manifestPath = packagePath(MODULE_MANIFEST);
  writeModuleManifest(manifestPath, {
    format: MODULE_MANIFEST_FORMAT,
    generatedBy: "packages/lararium-tw5/vite.plugin.config.ts",
    outDir,
    modules: manifest,
  });
  console.log(`✓ Vite emitted ${modules.length} plugin module bundles to ${outDir}/`);
  console.log(`✓ Vite wrote ${packageRelative(manifestPath)}`);
}
