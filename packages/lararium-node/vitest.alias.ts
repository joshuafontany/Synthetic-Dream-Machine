/** Workspace source aliases, DERIVED from each package's `src/` tree.
 *
 * Both vitest configs here resolve `@lararium/*` to sibling SOURCE rather than to built `dist`, so a
 * suite reads the tree as it stands. Vite matches `resolve.alias` entries in array order by string
 * PREFIX, which makes a bare `@lararium/tw5` entry swallow every subpath under it — `.../tw5/form-layer`
 * becomes `src/index.ts/form-layer`, and the loader reports ENOTDIR from inside a barrel three imports
 * deep, naming neither the alias nor the config.
 *
 * So order matters absolutely: directory barrels, then the subpath regex, then the bare entry LAST.
 *
 * Reading the barrels off the filesystem keeps one list instead of one per config: a new subpath module
 * resolves the day it lands, and a moved one stops resolving the day it moves, with no config to edit
 * in step. A second hand-kept copy drifts silently — the e2e config carried an alias for a `meme-ast`
 * that had already moved packages, and lacked one for a module that had arrived.
 */

import fs from "node:fs";
import path from "node:path";

const packagesDir = path.resolve(new URL(".", import.meta.url).pathname, "..");

/** Barrels first (a dir with `index.ts`), then `<sub>.ts`, then the bare package. */
function aliasesFor(scopedName: string, dirName: string) {
  const src = path.join(packagesDir, dirName, "src");
  const barrels = fs
    .readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(src, e.name, "index.ts")))
    .map((e) => ({
      find: `@lararium/${scopedName}/${e.name}`,
      replacement: path.join(src, e.name, "index.ts"),
    }));

  return [
    ...barrels,
    { find: new RegExp(`^@lararium/${scopedName}/(.+)$`), replacement: path.join(src, "$1.ts") },
    { find: `@lararium/${scopedName}`, replacement: path.join(src, "index.ts") },
  ];
}

export const alias = [
  ...aliasesFor("tw5", "lararium-tw5"),
  ...aliasesFor("mesh", "lararium-mesh"),
  ...aliasesFor("keyhive", "lararium-keyhive"),
];
