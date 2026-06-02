> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/adapters`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# OODA-HA Roadmap — MemPalace Sidecar MCP Integration

Status date: **April 23, 2026**

This roadmap keeps MemPalace as a peer MCP server. Lares talks to it across the
MCP protocol boundary rather than importing MemPalace Python modules. The result
keeps both projects independently deployable, testable, and upgradeable.

---

## Observe — Current shape

- MemPalace runs as a standalone MCP server using JSON-RPC over stdin/stdout.
- Its tool surface covers palace operations, drawers, memory search, knowledge graph, navigation, tunnels, agent diary, system status, and hooks.
- MemPalace stores data locally: vector memory in ChromaDB and graph data in SQLite.
- MemPalace configuration travels through its config files and environment variables.
- Lares already exposes a dependency-light MCP server spine and can host adapter code without coupling the two projects directly.
- The integration target is a local sidecar process: Lares launches MemPalace, performs the MCP handshake, calls tools, and tears the process down cleanly.

---

## Orient — Boundary and responsibilities

| Concern | Lares responsibility | MemPalace responsibility |
|---|---|---|
| Process lifecycle | launch, health check, stop, restart policy | run MCP server loop |
| Transport | JSON-RPC client over stdio | JSON-RPC server over stdio |
| Protocol handshake | send `initialize`, send `notifications/initialized`, list/call tools | return capabilities and tool results |
| Memory retrieval | call search/query tools with bounded requests | perform semantic lookup and return results |
| Knowledge graph | request entity, stats, and timeline views | maintain graph and answer graph tools |
| Agent diary | write/read diary entries through tools | persist diary entries |
| Navigation/tunnels | request traversal and tunnel creation | maintain palace navigation state |
| Configuration | pass command, env, palace path, collection, config path, timeouts | interpret MemPalace config and storage settings |
| Logging | redact sensitive payloads and record lifecycle/protocol failures | surface tool and server errors |

Initial integration points:

- memory search/query via `mempalace_search`
- knowledge graph via `mempalace_kg_query`, `mempalace_kg_stats`, `mempalace_kg_timeline`
- agent diary via `mempalace_diary_write`, `mempalace_diary_read`
- navigation and tunnels via `mempalace_traverse`, `mempalace_create_tunnel`

Risk posture:

- **Protocol drift:** guard with handshake tests and tool-list checks.
- **Process failure:** wrap subprocess errors, stdout closure, malformed JSON, and tool-level `isError` responses.
- **Config drift:** keep command/env/palace settings explicit and documented.
- **Privacy leakage:** redact memory and diary payloads from routine logs.
- **Scope creep:** keep v1 on local JSON-RPC stdio; treat HTTP/gRPC as future transport options, not current requirements.

---

## Decide — Integration stance

Use **JSON-RPC over stdio** as the canonical v1 transport.

Build the Lares side as a thin adapter with three layers:

1. **Lifecycle:** start, stop, liveness check, context-manager support.
2. **Protocol:** JSON-RPC request IDs, `initialize`, initialized notification, `tools/list`, `tools/call`, protocol/tool error handling.
3. **Convenience methods:** small typed wrappers for the tool groups Lares needs first.

Configuration must support:

- MemPalace launch command, defaulting to `python -m mempalace.mcp_server`
- environment overrides such as `PALACE_PATH`, `MEMPALACE_COLLECTION`, and `MEMPALACE_CONFIG`
- request timeout and retry policy
- logging/redaction policy
- optional hook-related environment or config values

Acceptance shape for v1:

- no direct MemPalace Python import in Lares adapter code
- subprocess MCP handshake covered by tests
- high-level wrappers covered by unit tests with mocked subprocess I/O
- tool errors and process errors surface as adapter-level exceptions
- docs name the boundary, supported tool groups, and operational expectations

---

## Act — Work plan

1. **Inventory the MemPalace MCP surface**
   - Confirm current tool names, input schemas, and response shapes.
   - Record required initialize protocol version and capability expectations.

2. **Implement `MemPalaceAdapter`**
   - Launch MemPalace as a subprocess.
   - Send and receive newline-delimited JSON-RPC messages over stdio.
   - Perform `initialize` and `notifications/initialized`.
   - Expose `list_tools` and low-level `tools/call` helpers.
   - Add wrappers for search, knowledge graph, diary, navigation, and tunnels.

3. **Add configuration wiring**
   - Support command override and environment override.
   - Document palace path, collection name, and config file variables.
   - Add timeouts, retry posture, and redaction rules as the adapter hardens.

4. **Test the boundary**
   - Mock subprocess I/O for unit tests.
   - Cover lifecycle, handshake, successful tool call, JSON-RPC error, tool-level error, and stdout closure.
   - Add integration tests only when a real MemPalace sidecar can run reliably in the local test environment.

5. **Wire Lares workflows**
   - Route memory lookup through the adapter.
   - Route graph lookup through the adapter.
   - Route diary read/write through the adapter.
   - Keep writes explicit and policy-gated where session safety requires it.

6. **Document operations**
   - Setup and launch command.
   - Required and optional environment variables.
   - Troubleshooting for process crashes, protocol errors, missing tools, storage path errors, and hook failures.

---

## Hoʻoko & Aftermath

- Monitor reliability, latency, and adapter error frequency.
- Track MemPalace protocol and tool changes before upgrading the adapter.
- Keep changelog entries for any supported tool-group changes.
- Review privacy posture before enabling broad diary or memory writes.
- Revisit remote transports only after local stdio integration stays stable.

---

## Appendix — v1 tool group map

| Lares method | MemPalace tool | Purpose |
|---|---|---|
| `search(query, n_results, drawer)` | `mempalace_search` | semantic memory retrieval |
| `kg_query(entity)` | `mempalace_kg_query` | entity relationship lookup |
| `kg_stats()` | `mempalace_kg_stats` | graph health and size summary |
| `kg_timeline(entity)` | `mempalace_kg_timeline` | entity or graph timeline |
| `diary_write(entry, tags)` | `mempalace_diary_write` | append agent diary entry |
| `diary_read(n_entries, tag)` | `mempalace_diary_read` | read recent diary entries |
| `traverse(start, direction)` | `mempalace_traverse` | navigate palace graph |
| `create_tunnel(source, target, label)` | `mempalace_create_tunnel` | create cross-palace link |

Future tool groups can join this table after `tools/list` inventory and adapter tests confirm their schemas.
