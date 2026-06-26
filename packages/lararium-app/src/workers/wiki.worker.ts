// Local worker shim — Vite cannot resolve a worker URL that points INTO a dependency
// package (vitejs/vite#10837, closed not-planned). The fix is a first-party file the
// bundler statically sees; it just runs @lararium/browser's wiki-worker body.
import "@lararium/browser/browser-wiki-worker";
