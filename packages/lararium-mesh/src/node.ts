// The HOST surface of @lararium/mesh — reachable only as `@lararium/mesh/node`, never from the barrel.
//
// Everything here touches a platform: a filesystem, a process, a host clock. The barrel (`index.ts`)
// stays platform-blind so a browser vessel can import it whole, and that blindness holds only while the
// host code sits behind THIS door. An `export *` from the barrel is all it takes to pull `node:fs` into
// the browser's module graph — the import never runs there, but it resolves, and the hull is breached at
// load, not at call.
export { repoRoot } from "./repo-root.js";

// The four transcript source adapters. They implement the isomorphic `SourceAdapter` contract (which the
// barrel does export) and read their transcripts off disk, so the CONTRACT crosses to the browser and the
// IMPLEMENTATIONS do not.
export * from "./claude-code-adapter.js";
export * from "./codex-adapter.js";
export * from "./copilot-cli-adapter.js";
export * from "./copilot-chat-adapter.js";
