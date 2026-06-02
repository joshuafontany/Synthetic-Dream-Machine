# Research Brief — Lararium MCP

Research cut date: **April 23, 2026**
Purpose: support the tightened roadmap with both external platform guidance and local repo truth.

---

## Executive synthesis

The first expansion pass produced a broad, platform-aware program.
The contraction pass sharpens that program around four statements:

1. one hydration compiler should sit at the center
2. all current git submodules should enter as core pieces
3. TiddlyWiki Filter Language should enter directly, while full TiddlyWiki runtime should stay outside v1 constitutional scope
4. tools should remain the portability floor across divergent clients

---

## External findings that survive the crucible

### 1. MCP resources fit a `lar:///` graph well

The MCP resources spec supports URI-identified resources, templates, subscriptions, and annotations such as `audience`, `priority`, and `lastModified`.
Custom URI schemes fit the spec when they follow RFC 3986.
That supports direct `lar:///...` exposure.

Source:
- Model Context Protocol — Resources spec, revision **2025-06-18**  
  https://modelcontextprotocol.io/specification/2025-06-18/server/resources

### 2. MCP prompts fit explicit hydration workflows

MCP prompts support discoverable templates with arguments and embedded resources.
That supports slash-command style hydration entry points such as `hydrate_full` or `inspect_submodule`.

Source:
- Model Context Protocol — Prompts spec, revision **2025-06-18**  
  https://modelcontextprotocol.io/specification/2025-06-18/server/prompts

### 3. VS Code currently exposes the richest IDE MCP surface

As of **April 22, 2026**, VS Code docs describe support for MCP tools, resources, prompts, and apps, alongside workspace `mcp.json`, discovery, trust prompts, and sandboxing for local stdio servers on macOS/Linux.

Source:
- VS Code — Add and manage MCP servers, updated **2026-04-22**  
  https://code.visualstudio.com/docs/copilot/customization/mcp-servers

### 4. Anthropic remote MCP support currently centers on tools

Anthropic’s MCP connector docs currently frame remote support around tool calls.
That keeps tools in the minimum viable cross-client layer.

Source:
- Anthropic / Claude API — MCP connector, accessed **2026-04-23**  
  https://platform.claude.com/docs/en/agents-and-tools/mcp-connector

### 5. OpenAI guidance currently emphasizes tool design, approvals, and filtering

OpenAI’s developer mode and MCP/connectors docs currently emphasize tool naming, “Use this when...” descriptions, parameter descriptions, read-only hints, approvals for write actions, and `allowed_tools` filtering.

Sources:
- OpenAI — ChatGPT Developer Mode guide, accessed **2026-04-23**  
  https://developers.openai.com/api/docs/guides/developer-mode
- OpenAI — MCP and Connectors guide, accessed **2026-04-23**  
  https://developers.openai.com/api/docs/guides/tools-connectors-mcp

### 6. Security guidance favors least privilege, sandboxing, and consent

Current MCP security docs support explicit consent for local execution, sandboxing where possible, restricted filesystem/network privileges, and scope minimization.

Source:
- Model Context Protocol — Security Best Practices, accessed **2026-04-23**  
  https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices

---

## Local repo findings that now outrank generic best-practice language

### A. Current git submodules already define the practical integration surface

`.gitmodules` currently names six submodules:
- `mempalace`
- `kowloon`
- `kowloon-client`
- `kowloon-frontend`
- `tldraw`
- `tiddlywiki5`

The MCP plan should therefore compile around real repo holdings, not around abstract future connectors.

### B. Existing Lararium docs already treat MemPalace, Kowloon, tldraw, and TiddlyWiki as architectural neighbors

Local docs already link:
- MemPalace to storage / crystal substrate
- Kowloon to feed / DreamDeck / social layers
- tldraw to render targets and sprint / session maps
- TiddlyWiki to self-booting graph and filter-language import pressure

That gives the MCP program a native local rationale for integration.

### C. The TiddlyWiki import boundary already leans toward Filter Language, not runtime takeover

`packages/lares-core/memes/api/v0.1/grammars/tiddlywiki-filter.md` already names `x-tiddlywiki-filter` as an imported guest grammar, bounded through `hana`, with a defined boot-preserved feature family.
That local law strongly supports direct Filter Language import while keeping the host graph and host metaphysics in charge.

---

## Design implications for this repo

1. Build one hydration core, not one prompt stack per client.
2. Treat all current submodules as first-class MCP program scope.
3. Keep TiddlyWiki runtime out of v1 constitutional center.
4. Pull Filter Language directly into the adapter and fixture plan.
5. Keep v1 read-only.
6. Let tools carry portability; let resources and prompts enrich clients that support them.
