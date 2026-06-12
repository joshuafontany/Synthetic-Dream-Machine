<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/worker-message-protocol >>
```toml iam
cacheable = false
file-path = "bags/@lararium/v0.1/docs/worker-message-protocol.md"
mana      = 15
manao     = 16
manaoio   = 14
register  = "Synthesis"
retain    = false
role      = "the P.3 Worker-thread message protocol — the structured-clone boundary, the schema-versioned envelope (GP-1..6), and the three boundary message types; for operator + agent review"
tags      = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/meme"]
tagspace  = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/docs/worker-message-protocol"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Worker Message Protocol — the StructuredClone Boundary

The lararium runtime crosses one mandatory trust boundary: **main thread ↔ Worker**. Every crossing uses `postMessage()`, which internally applies the **structured clone algorithm** (WHATWG HTML spec). The gap between "any JS object" and "a structured-clone-safe object" carries non-trivial constraints that shape the whole P.3 message protocol.

This meme lifts that protocol out of the alignment-architecture doctrine so operator and agent review it together as implementation design.

<<~/ahu >>

<<~ ahu #boundary >>

## What the Boundary Drops and Preserves

| Dropped by structured clone | Consequence |
|---|---|
| Prototype chain | class instances arrive as plain objects; the Worker engine cannot receive TW5 engine objects from main thread; class wrappers stay Worker-local |
| Property descriptors (getters/setters/readonly) | all fields arrive read/write plain; no defensive getter tricks survive |
| Functions | no callbacks cross; event handlers stay thread-local |
| Symbol-keyed fields | tiddler field names MUST NOT use Symbol keys (already true in the TW5 model) |
| Class private fields | internal state drops silently — no error, silent loss |
| DOM nodes | no widget or document references cross |

| Preserved | Use |
|---|---|
| plain objects `{ [key:string]: primitive }` | tiddler records — matches the TW5 field model |
| Map, Set, Array | changeset indexes, event queues |
| ArrayBuffer *(transferable)* | Automerge change bytes — prefer **transfer** (zero-copy); the sender's buffer neuters, as expected |
| TypedArray (Uint8Array) | Automerge binary — cloneable; buffer transferable |
| CryptoKey | Keyhive key handles survive clone — never serialize to JSON (exposes key material) |
| Error (name + message) | fault signals across the boundary |
| Date | timestamp fields |

<<~/ahu >>

<<~ ahu #envelope >>

## Golden Principles — the P.3 Message Envelope

**GP-1 — Schema-versioned envelope.** Every message MUST carry:
```json
{ "schema_version": 1, "type": "<message-type>", "payload": { ... } }
```
No naked payloads. The version field enables forward-compatible evolution; lock at `1` before the first Worker ships, increment at breaking changes.

**GP-2 — Plain-object payloads only.** No class instances, functions, or DOM. A tiddler crossing = `{ title: string; [field: string]: string | number | boolean }`. All engine-side class wrappers stay Worker-local.

**GP-3 — Transfer Automerge bytes, don't clone them.** Send changeset binary (Uint8Array) via `postMessage(msg, [changeset.buffer])`. Zero-copy transfer avoids O(N) clone latency on large changesets; the sender's buffer neuters on transfer — build accordingly.

**GP-4 — CryptoKey stays native.** Keyhive keys flow as `CryptoKey` (structuredClone-safe). Never `JSON.stringify` a CryptoKey; never pass raw key bytes across the boundary unless wrapped in an explicit, tagged key-material transport type.

**GP-5 — Teardown handshake.** On Worker eviction, main thread sends `{ schema_version: 1, type: "teardown" }`. The Worker completes in-flight reactions, calls `KumuCancelable.cancel()` on all live subscriptions, replies `{ ..., type: "teardown:ack" }`. Main thread then calls `worker.terminate()`. This prevents `DataCloneError` races on in-flight messages. **Needs an integration-test fixture as the P.3 gate criterion.**

**GP-6 — No direct Worker-to-Worker messages.** Workers never communicate directly. Cross-wiki routing always passes through main thread (event from Worker A → dispatch to Worker B via its own reference). The Session Wiki engine coordinates by reading the event-bus bag (Automerge-synced), not by direct Worker messaging. Re-evaluate at P.4 if the Session engine demands direct peer channels for performance.

<<~/ahu >>

<<~ ahu #prior-art >>

## Prior Art

- **Comlink** (Google) — type-safe RPC over `postMessage`: Proxy wrapping + explicit transfer lists + schema-versioned call objects. The envelope convention.
- **Redux DevTools bridge** — actions MUST be plain-object serializable: if `JSON.stringify(action)` throws, it does not cross. The same constraint as tiddler fields.
- **Electron IPC** (`ipcMain`/`ipcRenderer`) — version the message shape; never send class instances; a `type` discriminant on every message. The direct antecedent of GP-1.
- **React Native bridge → JSI** — the old bridge required JSON-serializable payloads; the New Architecture (JSI) replaced it with direct calls. The Lares analogue of JSI: the in-Worker synchronous TW5 read (no boundary at all; engine + TW5 co-located).

<<~/ahu >>

<<~ ahu #co-location >>

## The Co-Location Insight

TW5 and the reaction engine occupy the **same** Worker thread (co-located, synchronous reads) precisely to keep the StructuredClone boundary off the hot path. The engine reads tiddlers via `filterTiddlers()` — a synchronous in-memory call, no `postMessage`, no clone. The boundary applies only to three bounded message types:

1. **Main → Worker** — changeset notification: `{ schema_version: 1, type: "changeset", changeset: Uint8Array }`
2. **Worker → Main** — event emission: `{ schema_version: 1, type: "event", listenable: string, payload: {...} }`
3. **Main → Worker** — tier signal: `{ schema_version: 1, type: "teardown" | "hoʻowela" | "hoʻoanu" }`
   - `hoʻowela` ("to heat") — resume a cooled slot to **`wela`** (live, reacting); resume = spawn + `ea` handshake.
   - `hoʻoanu` ("to cool") — tear a slot down to **`anu`** (cold). Subscription teardown (`KumuCancelable.cancel()`) MUST precede a cool.
   - The thermal axis runs **two-state** (`wela` / `anu`) with an orthogonal pin-flag (pinned = exempt from cooling); the transition verbs take the causative `hoʻo-` prefix. No warm middle tier exists — see `lar:///ha.ka.ba/@lararium/v0.1/api/residency-tiers#third-tier-gate`.

These three types cover the full P.3 boundary surface. Lock them before shipping Worker #1.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/alignment-architecture >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/residency-tiers >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
