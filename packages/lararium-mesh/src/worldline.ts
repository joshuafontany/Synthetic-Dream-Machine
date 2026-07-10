/**
 * worldline — the PURE worldline-read surface (no Automerge), safe to bundle into a TW5 plugin module.
 *
 * The mesh barrel (`@lararium/mesh`) transitively pulls in Automerge (Repo/resolver), which a TW5
 * plugin build can't bundle (wasm). The IN-VM worldline reads (the sovereign-worker home of the
 * permainan substrate) need only the pure pieces — the ITC registry + compare, the Turn→Trajectory
 * functor, the null shuffle, and the edge-DAG projection — so the in-VM module imports from this
 * subpath (`@lararium/mesh/worldline`), the same pure-subpath idiom `query-derive-vm` uses for
 * `@lararium/mesh/harvest`.
 *
 * Everything re-exported here stays Automerge-free (worldline-clock / -edge / -trajectory /
 * -inject-detect + the itc + ffz-clock primitives they ride). The libs themselves are UNCHANGED —
 * this barrel only re-publishes them on a bundlable subpath.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time
 */

export * from "./itc.js";
export * from "./ffz-clock.js";
export * from "./worldline-clock.js";
export * from "./worldline-edge.js";
export * from "./worldline-trajectory.js";
export * from "./worldline-inject-detect.js";
