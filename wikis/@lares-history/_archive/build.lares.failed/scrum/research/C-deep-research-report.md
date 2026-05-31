# URI Stamping and Loader Architecture for Claude Agents

**Executive Summary:** We design a **canonical `lar:` URI schema** and **stamping protocol** to anchor agent state and intent in conversations. Every message (user or agent) is decorated with a _start-URI_ and _end-URI_ carrying a `register` (confidence) and `canon` (priority) score. These URIs serve as cache anchors and state tags.  We define an ABNF-like grammar for `lar:` URIs, explain how to canonicalize and hash content, and show TOML manifest examples. We detail where to insert URIs and `@event` markers in the interaction (including quoting user input when confidence <20). Cache-safety rules ensure Anthropic’s prefix cache hits (block exactness and breakpoints). A migration checklist and sample scripts demonstrate stamping existing files. Finally, we give a test plan, sample bootloader, example stamped conversation, register/canon band tables, and a mermaid flowchart of the pipeline. The design relies on Anthropic/Claude documentation (memory/prompt-caching) and industry standards (TOML v1.0 spec, OpenTelemetry spans, event-sourcing patterns).

## 1. lar: URI Specification

We define `lar:` URIs to unambiguously identify modules, prompts, and states. A formal grammar (roughly ABNF-like) is:

```
lar_uri   = "lar://" hier-part [ "?" query ] [ "#" sha256 ]
hier-part   = tier "/" kind "/" name "@" version
tier        = "canon" / "archive" / ("core" / "tool" / "permission" / ...)
kind        = ALPHA *( ALPHA / "-" / "_" )
name        = ALPHA *( ALPHA / "-" / "_" )
version     = DIGIT *( "." (DIGIT | ALPHA | "-" ) )
query       = "confidence=" register (& "canon=" canon-val & "scope=" scope)?
register    = ("C" / "CS" / "S" / "SP" / "P") ":" FLOAT
canon-val   = FLOAT         ; 0.0–10.0
scope       = "hard" / "soft" / "advisory"
sha256      = 64HEXDIG      ; hex characters of SHA-256

FLOAT       = DIGIT [ "." DIGIT* ]
```

**Components:**

- **Scheme**: `lar://`.
- **Tier/Kind**: e.g. `canon/module`, `canon/tool`. `"canon"` tier indicates agentic canonical content.  
- **Name and version**: A module name (e.g. `lares-identity`) and semantic version.  
- **Query params**:
  - `register`: A letter code (`C`=truth, `S`=second, etc) plus a float 0–20 confidence. **~:confidence[C],[20]** means absolute trust.  
  - `canon`: Float 0.0–10.0 for loader priority (10=highest).  
  - `scope`: **hard/soft/advisory** enforcement (cannot/etc).  
- **Fragment**: `#<sha256>` is the hex SHA-256 of the content (described below). Including the hash makes the URI **content-addressed**.

**Canonicalization rules:** To compute the SHA-256:
1. Parse the source content (TOML, Markdown, JSON).
2. **Normalize**:  
   - Remove all comments and non-semantic whitespace (trim lines).  
   - Sort mapping keys (TOML: sort table keys; JSON: sort object keys).  
   - Ensure consistent encoding: UTF-8, LF line endings.  
   - For Markdown, use NFKC normalization (no unstable Unicode).  
3. Serialize this canonical form deterministically.  
4. Compute SHA-256 over the bytes. Use the full hex or an agreed prefix length in the URI (e.g. first 12 chars).  

This ensures *identical content always yields the same digest*. If any bit changes (even a newline), the URI hash changes, which in turn invalidates any cached prefix (Anthropic requires exact matches).

**Examples:**  

- `lar://canon/module/lares-identity@2.0.1?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b5aa7...`  
- `lar://core/faq@0.3.0?confidence=S~15&canon=4.5&scope=soft#sha256=a7c4b2...`  
- `lar://archive/note/todo@0.0.1?confidence=P~0&canon=1.0&scope=advisory#sha256=abcd...`  

These URIs can be stamped anywhere we need to refer to a state or content chunk.

---

## 2. TOML Manifest Snippets

Here are examples of using the `lar_uri` field in TOML manifests:

```toml
# Module descriptor example (lares-identity.module.toml)
schema = "lares.module@1"
module_id = "lares-identity"
lar_uri = "lar://canon/module/lares-identity@2.0.1?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b5aa7..."
title = "Agent Identity"
description = "Core protocol and persona."
class = "kernel"
phase = 0
[register] label="C" value=1.0
[canon] value=10.0 scope="hard"
[source] format="markdown" path="sources/lares_identity.md"
```

```toml
# Tool descriptor example (http_request.tool.toml)
schema = "lares.tool@1"
tool_id = "http_request"
lar_uri = "lar://canon/tool/http_request@1.0.0?confidence=C~20&canon=8.5&scope=soft#sha256=a7c4b2..."
title = "HTTP Request"
[register] label="C" value=1.0
[canon] value=8.5 scope="soft"
[claude_api.input_schema]
type = "object"
[claude_api.input_schema.properties.url]
type = "string"
```

```toml
# Permission descriptor example (git-access.permission.toml)
schema = "lares.permission@1"
permission_id = "git-access"
lar_uri = "lar://canon/permission/git-access@1.0.0?confidence=C~20&canon=9.0&scope=hard#sha256=c1e2d3..."
[register] label="C" value=1.0
[canon] value=9.0 scope="hard"
[claude_code.settings]
deny = ["Read(./.env*)", "Bash(git push)"]
allow = ["Bash(git status)", "Bash(git diff)"]
```

```toml
# Registry index example (lares-registry.toml)
schema = "lares.registry@1"
generated_by = "lares-compiler@1.0.0"
generated_at = "2026-04-08T00:00:00Z"
[[entry]]
lar_uri = "lar://canon/module/lares-identity@2.0.1?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b5aa7..."
path = "modules/lares-identity.module.toml"
semantic_sha256 = "5f4dcc3b5aa7..."
status = "canon"
# ...
```

```toml
# Bootloader example (.claude/CLAUDE.toml)
schema = "lares.boot@1"
target_id = "claude-code.vscode"
emit_claude_md = ".claude/CLAUDE.generated.md"
emit_rules_dir = ".claude/rules"
[[load]]
lar_uri = "lar://canon/module/lares-identity@2.0.1?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b..."
required = true
[[load]]
lar_uri = "lar://canon/tool/http_request@1.0.0?confidence=C~20&canon=8.5&scope=soft#sha256=a7c4b2..."
required = false
```

Each manifest includes a fixed `lar_uri` field (often at the top) so tools and modules can reference each other by stable ID.

---

## 3. HUD Stamping Protocol

**Overview:** Before any user or agent content, we insert a *stamped header*. This consists of:

- A `start-URI` (the state of the sender *before* this message).
- A `@event` marker (if transitioning).
- An `end-URI` (the state of the sender *after* this message).

All URIs include `register` (truth) and `canon` fields. The stamping syntax can be done as HTML comments or YAML to keep it invisible to regular text. For example:

```
; LAUNCH_INTENT
# OperatorState = lar://core/user-query@0.1.0?confidence=CS~18&canon=5.0&scope=soft#sha256=1234abcd...
@start_intent
>> USER: Please calculate 2+2.
@end

; ACTION_RESULT
# OperatorState = lar://core/user-query@0.1.0?confidence=CS~18&canon=5.0&scope=soft#sha256=1234abcd...
# AgentState    = lar://canon/module/lares-kernel@4.0.0?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b...
@complete
>> AGENT: The result is 4.
```

- `; LAUNCH_INTENT` is a section header (could be a YAML header).
- Lines starting with `#` define URIs. Here we have `OperatorState` (the user’s intent URI) and `AgentState` (the agent’s new state URI).
- The `@event` marker (e.g. `@start_intent`, `@complete`) tags the transition point where generation happens.
- The `END` sections (`@end`) wrap up. After `@complete`, the agent declares its final state.

**Register <1.0 Fallback:** If the agent’s confidence in directly parsing the user input is low (`register < 1.0`), it should *quote and annotate* the input in segments. For example:

```
; LAUNCH_INTENT
# OperatorState = lar://core/unknown-query@0.0.0?confidence=SP~8&canon=2.0&scope=advisory#sha256=deadbeef...
> "Please open the mystery-file."
@event=parse_start

# AssistantState = lar://core/parse-error@0.0.1?confidence=SP~8&canon=2.0&scope=advisory#sha256=beefdead...
```

Here, the agent quotes the input (prefixed by `>`) and assigns a low-confidence URI to that segment. Then it emits an `AssistantState` URI capturing its interpretation. This gives an “inertia sigil” even under uncertainty. 

**Workflow Example:** Operator input flows as: User text → stamped with `OperatorState URI` → agent processing → agent stamps `AgentState URI` with `@event`. These URIs form the seed for the next step’s prompt.

---

## 4. Deterministic Canonicalization & Hashing

To ensure URIs are repeatable, define a strict canonicalization:

1. **Parsing:** Load the content (TOML/Markdown/JSON).  
2. **Normalization:**  
   - **Encode** text as UTF-8.  
   - **Line endings:** Convert all newlines to `LF`.  
   - **Whitespace:** Trim trailing spaces on each line.  
   - **Sorting:** For TOML or JSON tables, sort keys alphabetically at each level. (TOML spec: key order is not significant, so we enforce an order.)  
   - **Comments:** Remove all comment lines/blocks (they are non-semantic).  
3. **Serialization:** Write out the normalized structure with consistent formatting (no superfluous blank lines).  
4. **Hashing:** Compute `SHA-256` of the normalized bytes. (FIPS-180-4 standard.)  
5. **Digest in URI:** Use e.g. first 12 hex chars of SHA-256 in `#sha256=abcdef...`. This links the URI to exact content. 

Using this ensures any change in content (even a single char) yields a different URI. It also means diffing and integrity checks are trivial. We recommend verifying the digest on each build step.

---

## 5. Register/Categorization & Enforcement

**Register Semantics (0–20):** This is the “truth/confidence” axis. We map it to categories:

| Label | Range         | Meaning           |
|-------|--------------:|:------------------|
| C     | 0.90–1.00     | Canonical truth   |
| CS    | 0.75–0.89     | Secure secondary  |
| S     | 0.50–0.74     | Suspicious/weak   |
| SP    | 0.25–0.49     | Peripheral guess  |
| P     | 0.00–0.24     | Placeholder/fallback |

Files with `confidence=C~20` are in the *Canon hierarchy* (agentic). Others are progressively uncertain. If an input falls below some threshold (e.g. `~:confidence[SP],[8]`), we resort to quoting/decomposition.

**Promotion Workflow:** New or migrated modules start at low canon. A review/promotion step raises:
- **Candidate** (draft, canon ~2–5, scope=advisory)
- **Soft** (trusted default, canon ~8–9, scope=soft)
- **Hard** (invariant, canon ~9.5–10, scope=hard)

**Enforcement:** 
- **Hard-canon (9.5–10):** Must load first; any content conflict (duplicate IDs, inconsistent content) is a build *error*. 
- **Soft-canon (8.0–9.49):** Preferred defaults; conflicts generate a warning and allow overrides from the session or higher-layer rules.
- **Advisory (<8.0):** Can be trimmed or skipped under constraints; conflicts are informational only.

Below is a *combined table* of enforcement:

| Register Band | Canon Band | Scope   | Loader Action on Conflict           |
|-------------:|----------:|:-------|:------------------------------------|
| `~:confidence[C],[20]` (Highest) | 9.5–10.0 | hard    | **Error:** Cannot override or omit. |
| `~:confidence[C],[19]`         | 8.0–9.49  | soft    | Warning: prefer override if needed. |
| `S/CS`           | 5.0–7.99  | advisory| Optional: trim if no space.        |
| `SP/P`           | 0.0–4.99  | advisory| Archive-only; not auto-loaded.     |

Cannonical “hard” modules (confidence=C, scope=hard) must also appear in the `canon/` path of URIs. 

---

## 6. Cache-Safety & Prompt-Caching

Anthropic’s prefix-caching demands **exact block matching**. Thus:

- **Prefix Composition:** Divide the prompt into static blocks, each ending at a forced cache-breakpoint. For example:
  - **Tools block** (all tool definitions in `CLAUDE.md` or imported).
  - **System prompt block** (agent identity + invariants).
  - **Large docs block** (loaded from `@import`).
  - **User conversation block** (grows each turn, up to limit).
- **Breakpoints Placement:** Place a cache-control marker (or simply end the block) right after each static block. Then dynamic parts (current query, chain-of-thought, results) come after. Anthropic allows up to 4 breakpoints and a 20-block lookback. 
- **Block Formatting:** Each block’s text must not change between calls. E.g., don’t include timestamps or conversation-specific tokens in core modules. Reformatting must be consistent. Even leading/trailing spaces can break the prefix. 
- **URI as Anchor:** The stamped URIs serve as **implicit anchors**. Since URIs include hashes of content, they change if the static content changes. That ensures a new cache prefix whenever code changes. 
- **Pricing:** Using prefix caching is cost-effective: writes are 1.25× input token cost, reads are only 0.1×. Frequent reuse (many user turns on same core) amortizes the cost. 
- **TTL Strategy:** Cache entries expire after 5 minutes by default (each hit resets TTL). For critical blocks, you may choose a 1-hour TTL (2× write cost). Set TTL per block according to expected update frequency.

In short, the loader must emit **stable, re-usable URIs and prompt segments** at the top of each request. If anything in those segments ever changes (content or even whitespace), the cache prefix is lost and costs jump dramatically. 

---

## 7. Migration: Stamping Legacy Files

To migrate existing “Stuffed” archives:

1. **Inventory**: List all files (old prompts, modules). Compute SHA-256 of their content (as if they were final). Record original path, size, and hash in a table (e.g. `_todo/migrations/archive_inventory.toml`).
2. **Stamping:** For each module/file, generate its `lar_uri`:  
   - Choose an ID (from mapping or derive from filename).  
   - Calculate semantic SHA after normalization.  
   - Insert (or create) the `lar_uri` field in the TOML manifest.  
3. **Pseudocode Example:** 

   ```python
   def stamp_module(path):
       data = read_file(path)
       norm = normalize_content(data)  # trim, sort keys, etc.
       digest = sha256(norm)
       module_id = infer_id_from(path)
       uri = f"lar://canon/module/{module_id}@0.0.1?confidence=C~20&canon=1.0&scope=advisory#sha256={digest}"
       toml = parse_toml(path)
       toml['lar_uri'] = uri
       write_toml(path, toml)
   ```

4. **Mapping and Splitting:** If old files contained multiple sections, split them into separate new modules. Use headings or explicit markers. Each extracted part becomes its own file with a fresh URI. 
5. **Registry Update:** Add each new URI and path to `registry/lares-registry.toml`, marking initial `status = "candidate"` until reviewed.
6. **Promote/Cleanup:** After verification, raise `scope=soft` or `hard` on confirmed modules. Archive or delete legacy drafts.

The goal is an automated pipeline so that running it regenerates all URIs and checks their consistency. Any mismatches (e.g. wrong hash) indicate a problem.

---

## 8. Verification & Examples

**Test Plan:**
- *Determinism:* Running the compiler twice on the same inputs yields byte-identical outputs (compare SHA-256).  
- *Cache-match:* Use a debug mode (Claude Code `--append-system-prompt`) to confirm the expected prefix blocks match and caching hits occur (e.g. see `cache_read_input_tokens` in logs).  
- *Policy Enforcement:* Modify a hard-canon file and ensure the build fails or warns as expected. Try to override a soft-canon setting.  
- *Round-Trip:* Simulate a conversation: use the stamped conversation format below and replay events from `STATE.jsonl` to confirm final state.
- *Schema Validation:* Automatically validate all TOML manifests against the schema rules (required fields, types).

**Sample `.claude/CLAUDE.toml`:**

```toml
schema = "lares.boot@1"
target = "claude-code.vscode"
emit_claude_md = ".claude/CLAUDE.generated.md"
emit_rules_dir = ".claude/rules"
[[load]]
lar_uri = "lar://canon/module/lares-identity@2.0.1?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc..."
required = true
[[load]]
lar_uri = "lar://canon/module/lares-operations@2.0.0?confidence=C~20&canon=8.0&scope=soft#sha256=a7c4b2..."
required = false
```

**Example Stamped Conversation:**

```
; LAUNCH_INTENT
# OperatorState = lar://core/user-query@0.1.0?confidence=CS~17&canon=5.0&scope=soft#sha256=1234abcd...
# AgentState    = lar://canon/module/lares-kernel@4.0.0?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b...
@start
>> USER: Summarize the article on tokenization.
@end

; GENERATION
# OperatorState = lar://core/user-query@0.1.0?confidence=CS~17&canon=5.0&scope=soft#sha256=1234abcd...
# AssistantState=lar://canon/module/lares-kernel@4.0.0?confidence=C~20&canon=10.0&scope=hard#sha256=5f4dcc3b...
@complete
>> AGENT: The article explains how text is broken into tokens...
```

- The `@start` event brackets the user query insertion, and `@complete` closes the agent’s response. 
- URIs are repeated for clarity: first marking pre-state, then the agent’s final state.  
- If the agent had low confidence, it would insert quoted segments with provisional URIs (not shown here).

---

## Tables: Register and Canon Bands

### Register Bands

| Label | Range    | Interpretation                 |
|------:|---------:|:-------------------------------|
| C     | [0.9–1.0] | Trusted, canonical truth      |
| CS    | [0.75–0.89]| Secondary, secure            |
| S     | [0.50–0.74]| Questionable validity        |
| SP    | [0.25–0.49]| Weak/inferred               |
| P     | [0.0–0.24] | Placeholder/unknown          |

Systems should escalate or fall back when `register` is low (e.g. using quoting heuristics).

### Canon Bands and Enforcement

| Canon Range | Scope     | Default Action                          |
|------------:|:----------|:----------------------------------------|
| **9.5–10.0**  | Hard      | Load first; **errors if violated** (invariant) |
| **8.0–9.49**  | Soft      | Load next; warnings if overridden (default)  |
| **5.0–7.99**  | Advisory  | Load if space allows; ignore if needed (support) |
| **0.0–4.99**  | Advisory  | Not auto-loaded (archive only)         |

---

## 9. Stamping + Loader Pipeline (Mermaid)

```mermaid
flowchart TD
    U[User Input (raw)] -->|Stamp StartURI| V[Prep Stage]
    V --> W{Confidence Check}
    W -->|High (>=0.9)| X[Insert URIs & @event]
    W -->|Low (<0.9)| Y[Quote/Decompose Input]
    Y --> X
    X --> Z[Compile Prompt with URIs]
    Z --> G[Generate Response]
    G --> H[Stamp EndURI]
    H --> OUT[Output to User]
    style X fill:#f9f,stroke:#333,stroke-width:2px
```

**Flow Notes:**  
- *User Input* is tagged with a `StartURI`.  
- If confidence is low, decompose input into quoted segments with provisional URIs, then continue.  
- *Compile* inserts both the start and (placeholder) end URIs plus an `@event` marker in the IR.  
- *Generate* happens (Claude generates text).  
- *Stamp EndURI* replaces the placeholder with the actual agent state URI (including a final `#sha256` of content if needed).  
- The agent’s output is returned along with its state tag.

---

**Sources:** We used Anthropic’s Claude Code memory/caching docs for prefix rules, the TOML v1.0 spec (maps to key-value hash), OpenTelemetry best practices for span events, and event-sourcing literature (immutability, versioning). Details like hash algorithms and encoding follow standard norms. (Any missing source references indicate those points were drawn from established standards not directly retrieved.)