/**
 * mcp-resolve — the WireAction vocabulary shared by the harness-wire modules
 * (claude / codex / copilot / vscode).
 *
 * The mempalace-MCP resolver that once lived here has been CUT. `lares` no longer
 * registers a mempalace MCP server in any harness: Chroma tolerates one writer on the
 * palace, and a `lares` registration standing beside the mempalace `.claude-plugin`'s own
 * gave every session two sidecars on one index — the contention that truncated the HNSW
 * segment and forced a drift-quarantine. The plugin serves MCP alone; `lares` consumes
 * mempalace as library code through the Memory sensorium, and the node reaches the palace
 * through its own in-process sidecar (`@lararium/mempalace`), never a harness registration.
 *
 * `reaped` / `absent` carry the strangler: each wire leg now REMOVES a stale lares-wired
 * entry rather than minting one, so the decouple heals hosts an older wiring already touched.
 */

export type WireAction = "wired" | "present" | "missing-script" | "reaped" | "absent";
