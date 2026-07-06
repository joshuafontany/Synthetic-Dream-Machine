/**
 * Browser stub for Node's `path` module.
 *
 * Mirrors {@link file://./fs-stub.ts}: the `@lararium/mesh` source adapters
 * carry top-level `import { basename, dirname } from "node:path"`, which
 * externalizes in a browser substrate. `basename`/`dirname` reduce to pure
 * POSIX string arithmetic, so the stub implements them faithfully — the hull
 * loads and any real call still returns a correct value.
 */

export function basename(p: string, ext?: string): string {
  const parts = p.split("/");
  let base = parts[parts.length - 1] ?? "";
  if (ext && base.endsWith(ext) && base !== ext) {
    base = base.slice(0, base.length - ext.length);
  }
  return base;
}

export function dirname(p: string): string {
  const idx = p.lastIndexOf("/");
  if (idx < 0) return ".";
  if (idx === 0) return "/";
  return p.slice(0, idx);
}
