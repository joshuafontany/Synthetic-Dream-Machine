// The HOST surface of @lararium/mesh — reachable only as `@lararium/mesh/node`, never from the barrel.
//
// Anything here MAY touch a platform: a filesystem, a process, a host clock. The barrel (`index.ts`)
// stays platform-blind so a browser vessel can import it whole, and that blindness holds only while host
// code sits behind THIS door. An `export *` from the barrel is all it takes to pull `node:fs` into the
// browser's module graph — the import never runs there, but it RESOLVES, and the hull breaches at load
// rather than at call. `tests/isomorphic-hull.test.ts` walks the barrel's graph and refuses that.
export { repoRoot } from "./repo-root.js";
