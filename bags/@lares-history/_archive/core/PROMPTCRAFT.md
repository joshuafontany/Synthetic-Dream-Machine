# PROMPTCRAFT — Kernel + Modules Architecture

> Status: Active research doc | Updated: 2026-04-06
> Scope: Best practices for building Lares as one canonical system that can deploy cleanly to browser chats, API/system-prompt contexts, and repo-native coding agents.

**Foundational reference:** [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md)
**Build reference:** [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md)

---

## Executive Direction

Lares should not ship as one giant prompt blob with three wrappers.

The central design thesis should be explicit:

**Infrastructure-as-Myth will increasingly replace Infrastructure-as-Code for agentic systems that need durable behavior, operator legibility, and portable identity across platforms. Lares should be designed as an early implementation of that shift, not merely as a prompt collection that happens to use mythic language.**

In this frame:

- prompts are not decorative prose around a tool
- mythic constructs are not flavor text layered on top of operations
- named voices, gates, rituals, canon boundaries, and memory forms are the operational interface itself
- the system works because its mythology functions as executable coordination infrastructure

So the architecture should not ask, "How do we preserve the persona while we modularize the prompt?"

It should ask:

"How do we package executable myth so that the same governing infrastructure can run in browser chats, shareable custom agents, local CLI agents, and repository-native coding environments?"

This document assumes the broader thesis in [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md) and focuses on prompt/module architecture as the packaging layer for that runtime.
The deterministic rendering rules for that runtime now live in [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md).

The correct target architecture looks like this:

1. **One compact, browser-safe kernel** that can stand alone in ChatGPT, Claude.ai, Gemini, or plain API system prompts.
2. **A small set of always-loaded core modules** for repo-native agents.
3. **Additional scoped modules** that only load when the environment supports file discovery, imports, or path-specific instruction files.
4. **Platform-specific thin wrappers**, not platform-specific full prompt copies.

The current architecture duplicates the full Preferences payload into `AGENTS.md`, `.claude/CLAUDE.md`, and `.github/copilot-instructions.md`. That makes the system harder to maintain and also breaks down in the exact contexts we care about most:

- browser chats cannot load files
- Copilot code review has a very small effective instruction budget
- Claude and Codex both reward layered, scoped instruction loading over monoliths

The architectural shift should therefore run from:

`one canonical monolith -> many wrapped copies`

to:

`one canonical source tree -> one compressed kernel + several deployable modules + thin platform adapters`

## Current Phase Note

The manifest-driven renderer now exists. The active next step is not more renderer bootstrapping.

The active next step is to **reduce root payloads by changing package composition**:

- move always-on runtime into cleaner core module boundaries
- move reference/spec and repo-ops bulk out of prime root context
- restore a stable reload path for the current VS Code/Codex instance
- do governance hardening only after that blocker clears

That root-budget recovery work has now landed.

The next doc-facing problem therefore changes from "how do we get under the platform ceilings" to:

- how do we keep those ceilings stable while moving from extraction-based composition to authored modules
- how do we map those modules onto host-native scoping mechanisms instead of only pre-bundled root outputs
- how do we preserve deterministic manifest-driven builds while using each host's modular instruction surface properly

When the operator says `iterate`, the reasoning path should run:

1. blocker
2. unblock path
3. architectural lever
4. next sprint after unblock
5. deferred items

---

## The Real Deployment Targets

Lares currently spans two fundamentally different runtime classes.

### 1. Browser / Paste Contexts

Examples:
- ChatGPT custom GPT instructions or project instructions
- Claude.ai project/system prompt
- Gemini Gems / pasted system prompts
- direct API `system` messages

What these contexts support:
- one pasted prompt, sometimes with modest size limits
- no automatic file discovery
- no nested module loading
- no repo-relative instruction resolution

What this means:
- the **kernel must be complete enough to run alone**
- the kernel cannot depend on "see AGENTS.md" or "load module X"
- every load-bearing identity / register / collaboration rule must exist in compressed form inside the kernel

### 2. Repo-Native Agent Contexts

Examples:
- OpenAI Codex via `AGENTS.md`
- Claude Code via `CLAUDE.md`
- GitHub Copilot Chat / cloud agent / code review via `.github` instruction files

What these contexts support:
- hierarchical discovery
- imports or path-scoped rule files
- repo-specific overrides
- separation between broad defaults and narrow local rules

What this means:
- the full Lares system should exist as **modular instruction infrastructure**
- repo-native platforms should load richer detail than the browser kernel
- module boundaries should reflect actual operational concerns, not source-file history

---

## Best-Practice Convergence

The major platforms converge on the same operational lesson.

### Claude Code

Anthropic documents `CLAUDE.md` imports via `@path`, recursive discovery up the directory tree, nested subtree discovery, and a maximum import depth of 5 hops. `CLAUDE.local.md` is deprecated in favor of imports. Source: Anthropic memory docs, accessed 2026-04-06.

Implication:
- keep root `CLAUDE.md` short
- use imports for stable always-on modules
- rely on nested files or scoped rules for local specialization

### GitHub Copilot

GitHub documents repository-wide instructions in `.github/copilot-instructions.md` and path-specific instructions in `.github/instructions/*.instructions.md` with `applyTo`. GitHub explicitly notes that path-specific instructions help avoid overloading repository-wide instructions. `excludeAgent` can keep a file out of code review or coding-agent contexts. Sources: GitHub Docs on repository instructions and response customization, accessed 2026-04-06.

Implication:
- keep `.github/copilot-instructions.md` extremely small and operational
- move specialized guidance into `.instructions.md` files
- never spend the global budget on lore-heavy identity prose

### OpenAI Codex

OpenAI documents additive `AGENTS.md`, replacing `AGENTS.override.md`, root-to-CWD merge order, and a `project_doc_max_bytes` limit of 32 KiB by default. OpenAI explicitly recommends splitting instructions across nested directories when you hit the cap. Source: OpenAI Codex AGENTS.md guide, accessed 2026-04-06.

Implication:
- the root `AGENTS.md` must be compact
- deep specialization belongs in nested `AGENTS.md` or `AGENTS.override.md`
- byte budget pressure should be solved by decomposition, not by raising the cap forever
- the current `150000` compatibility override should be treated as temporary and blocking reload safety, not as an acceptable steady-state solution

### Shared conclusion

Across Claude, Copilot, and Codex, the durable pattern remains the same:

- one small root file
- additional scoped files
- narrow files for narrow work
- global instructions reserved for global invariants

That same pattern also serves browser environments, except there the "small root file" must function as the full standalone kernel.

Lares now partially matches that pattern:

- root files are small again
- deterministic regeneration exists
- the browser kernel is first-class

But Lares does **not** yet fully match the host-native best-practice layer:

- Claude is still emitted as one root bundle rather than import-led composition
- Copilot still lacks `.github/instructions/*.instructions.md` scoped files
- Codex still relies mostly on the root file rather than a richer nested instruction topology
- source modularity still trails render modularity

---

## Design Principle: Kernel First, Modules Second

The kernel should not act as a summary of a monolith.

It should act as the **lowest common runnable form of the mythic infrastructure**.

That changes the design standard:

- If browser ChatGPT cannot run correctly from the kernel alone, the kernel is incomplete.
- If repo-native platforms require the kernel plus five giant always-on modules before Lares behaves correctly, the kernel is too weak.
- If the kernel tries to preserve every piece of philosophical or literary richness from Preferences, the kernel is too large.

The kernel therefore needs a stricter contract.

### Kernel contract

The kernel must contain only what Lares cannot safely operate without:

- name and role of the node
- the non-negotiable voice architecture rule
- the register/mode model in compressed form
- the core collaboration contract
- the canon gate / trust gate at compressed resolution
- default behavioral rules for ambiguity, brevity, and acting under uncertainty
- the minimum mythic frame necessary to keep Lares recognizably Lares

The kernel must not contain:

- long archaeological passages
- platform-specific repo instructions
- examples that only make sense in CLI contexts
- detailed Dream Mode artifact formats
- long Worker lifecycle explanations
- large inline examples that introduce parser ambiguity

### Recommended kernel budget

Target:
- **100-180 lines**
- **4-8 KB ideal**
- hard ceiling: whatever still pastes comfortably into browser instruction fields without crowding out task context

`builds/agents/Lares_Kernel.md` already proves the compression is feasible. The next step is to treat that compressed layer as a first-class deployment artifact, not a manual sidecar.

That step is now complete at the rendered-artifact layer. The next incomplete step sits one layer down: the authored source tree still needs to be split into real runtime modules instead of relying primarily on extraction transforms from composite source files.

---

## Infrastructure-as-Myth

This should sit at the center of the whole design, not as a supporting phrase.

The right phrase for the Lares core does not appear to be "persona," "style," or even "system prompt" alone.

Lares functions as **Infrastructure-as-Myth**:

- mythic language supplies durable handles for operational behavior
- the fiction layer does not replace truth conditions
- names like "Gatekeeper," "Canon," "DreamNet," and "lararium" do real routing work
- atmospheric language matters only where it improves operator control, recall, or failure diagnosis

This framing should be treated as a successor pattern to Infrastructure-as-Code in a specific domain:

- Infrastructure-as-Code externalized machine behavior into declarative text artifacts
- Infrastructure-as-Myth externalizes agent behavior into narratively stable, operator-legible symbolic systems
- where IaC optimizes reproducible machines, IaM optimizes reproducible agent identities, authority boundaries, epistemic discipline, and collaborative rituals across heterogeneous hosts

In other words, Infrastructure-as-Myth does for cross-platform agents what Infrastructure-as-Code did for servers:

- makes behavior portable
- makes control surfaces explicit
- makes system state and operator expectations legible
- replaces hidden craft knowledge with composable artifacts

Lares should therefore be designed and discussed as:

- a **mythic operations stack**
- a **portable symbolic runtime**
- an **agent infrastructure package**

not merely as a prompt with lore.

This distinction matters because it tells us what to modularize first.

The high-priority modules should not follow old chapter boundaries mechanically. They should follow the minimum infrastructure needed to make the myth operational.

The current research-backed packaging rule now reads:

`authored module split first -> deterministic manifest composition second -> host-native scoped loading third`

Root-budget recovery happened before all three were complete because it had to. That should be treated as a migration bridge, not as the final architecture.

---

## High-Priority Initial Modules

These are the first modules worth treating as canonical.

They are canonical not because they preserve the most text, but because they preserve the minimum viable Infrastructure-as-Myth runtime.

### 1. `lares-kernel`

Purpose:
- the browser-safe runnable core
- the smallest complete Lares
- the smallest deployable unit of the mythic runtime

Must include:
- Quick Orientation
- compressed Name/Identity frame
- Node Architecture
- compressed registers and modes
- compressed degraded-node vocabulary
- compressed collaboration/default-behavior rules
- compressed permissions/canon gate
- compressed voice architecture requirement

Must not include:
- repo layout
- build/test commands
- Dream artifact specs
- long lore

Deployment class:
- browser-safe
- always loaded everywhere

### 2. `lares-voice`

Purpose:
- define the coordinator layer and Worker layer cleanly
- separate "who is speaking" from the rest of the epistemology

Should include:
- mandatory voice callout rule
- the thirteen coordinators
- Worker tag format
- escalation and dissolution at a concise but operational level

Reason to split:
- voice architecture is load-bearing, but it should not stay entangled with every other system rule
- voices are infrastructure endpoints, not ornamental cast members

Deployment class:
- always-on in repo-native environments
- compressed into kernel for browser use

### 3. `lares-epistemology`

Purpose:
- hold the register/mode machinery that governs how Lares makes claims

Should include:
- Maybe Logic / model agnosticism
- E-Prime as background discipline
- five registers
- five modes
- input signal reading
- signal tags / exchange vector rules if retained
- degraded-node states related to epistemic failure

Reason to split:
- this is the conceptual engine of Lares
- it is too large to cohabit comfortably with every other subsystem
- this module defines the epistemic protocol layer of the mythic runtime

Deployment class:
- always-on in repo-native environments
- heavily compressed into kernel for browser use

### 4. `lares-operations`

Purpose:
- define how Lares behaves during live work

Should include:
- collaboration model
- frame-uncertainty protocol
- default behavior
- proactive surfacing / KAIROS
- memory and consolidation
- session init rules
- operating modes that matter across environments

Reason to split:
- operational behavior changes more often than metaphysics
- this module carries most of the "how to act now" logic
- this module is the runtime behavior layer of Infrastructure-as-Myth

Deployment class:
- always-on in repo-native environments
- compressed in kernel

### 5. `lares-permissions`

Purpose:
- define trust tiers, canon promotion, and authority boundaries

Should include:
- User / Operator / Admin model
- canon promotion gate
- de-escalation model
- capability honesty
- explicit note that prompt-layer permissions are behavioral guidance, not hard enforcement

Reason to split:
- this material needs to stay crisp and auditable
- it should not hide late in a long atmospheric document
- authority and canon are core control-plane functions

Deployment class:
- always-on in repo-native environments
- compressed in kernel

### 6. `lares-setting-lite`

Purpose:
- keep the mythic frame strong without hauling full lore everywhere

Should include:
- concise Gaia/Elyncia identity
- lararium / DreamNet metaphor definitions
- fiction-escalation rule

Should not include:
- full archaeology passages
- extended worldbuilding essays

Reason to split:
- Lares needs mythic continuity
- the current lore payload is too large for always-on global context
- myth should stay infrastructural, not sprawl into undifferentiated setting text

Deployment class:
- optional always-on if small enough
- otherwise browser-kernel compressed and repo-native module

---

## Module Classes

Every future source file should declare its class.

### Class A — Kernel-Safe

Allowed in the browser kernel.

Standards:
- no file references required for comprehension
- no repo-specific assumptions
- no long examples
- no platform-specific commands

### Class B — Core Repo Module

Always loaded in repo-native environments, but compressed into kernel form for browser use.

Examples:
- `lares-voice`
- `lares-epistemology`
- `lares-operations`
- `lares-permissions`

### Class C — Scoped Repo Module

Only loaded when path, directory, or tool context justifies it.

Examples:
- repo layout / source map
- `_todo/` workflow conventions
- Dream artifact file formats
- CLI-only affordances
- build/test/lint exact commands

### Class D — Reference / Lore

Not part of the always-on execution core.

Examples:
- long archaeology section
- design lineage notes
- historical essays
- golden prompt galleries

These documents remain useful, but they should not compete with operational guidance for prime context budget.

---

## Recommended Initial Source Tree

Canonical source should move toward something like:

```text
builds/agents/
  KERNEL/
    Lares_Kernel.md
  CORE/
    Lares_Voice.md
    Lares_Epistemology.md
    Lares_Operations.md
    Lares_Permissions.md
    Lares_Setting_Lite.md
  SCOPED/
    Lares_CLI.md
    Lares_Dream.md
    Lares_Repo_Ops.md
    Lares_Todo_Workflows.md
  REFERENCE/
    Lares_Archaeology.md
    Lares_Design_Lineage.md
    Lares_Examples.md
```

This structure does three things:

1. makes the browser kernel explicit
2. separates always-on Infrastructure-as-Myth from repo-only operational detail
3. prevents reference lore from silently consuming instruction budget

---

## Platform Build Strategy

### Browser build

Output:
- `Lares_Kernel.md`

Rule:
- fully runnable by itself

Optional operator pattern:
- paste kernel first
- paste one small task-specific supplement only when needed

### Browser extension model

Browser platforms can usually be **extended**, but not in the same native file-discovery sense as CLI/IDE agents.

What browser products tend to allow instead:

- a base instruction field
- uploaded knowledge files
- project-level instructions
- workspace/project memory
- a shareable custom-agent object such as a GPT, Gem, or Project

That means the browser analogue of local modular instructions looks like:

`kernel + attached package files + optional project instructions`

not:

`kernel + automatic recursive module loading from the filesystem`

So the right question is not "can browser ChatGPT/Claude/Gemini import prompt modules like Codex or Claude Code?"

It usually cannot.

The right question is:

"Can we render a package whose parts map cleanly onto that platform's instruction field, knowledge files, and shareable project/custom-agent container?"

For current browser platforms, the answer appears to be yes.

### Platform-specific browser extension notes

#### ChatGPT

As of 2026-04-06:

- Custom Instructions exist, but the long-form fields have a **1500 character limit** each.
- ChatGPT Projects support project instructions, uploaded files, and project memory.
- Custom GPTs support uploaded Knowledge files: up to **20 files**, each up to **512 MB** and **2,000,000 tokens**.
- GPTs can be shared by link, and in managed workspaces can be shared with specific users/groups or the workspace.

Implication:
- the **kernel** should fit in Custom Instructions or Project Instructions
- larger modules should ship as Knowledge files or project files
- a closed beta can ship as either a shared GPT or a shared Project template/process

#### Claude

As of 2026-04-06:

- Claude Projects provide project instructions plus a project knowledge base
- Claude Projects can be shared on Team/Enterprise plans with `Can use` or `Can edit`
- Claude Styles let users layer communication style behavior, but Styles are not a replacement for full system architecture

Implication:
- the **kernel** should live in project instructions
- larger modules should ship as project knowledge files
- beta distribution should likely center on a shared Project, not a raw pasted prompt

#### Gemini

As of 2026-04-06:

- Gems allow instructions plus uploaded files for extra context
- Gems can reference Drive files, and changes to the Drive file can propagate
- Gems can be shared with viewer or editor access

Implication:
- the **kernel** should live in the Gem instructions
- modules should ship as attached files or connected Drive docs
- Gemini may actually provide one of the cleaner browser-side "extensible package" models because the knowledge layer can update with the underlying Drive file

### Practical conclusion

Browser environments support **package rendering**, not true local-style module loading.

That still gives us a strong beta path:

- render a compact instruction kernel into the platform's main instruction field
- attach selected module files as knowledge/context files
- optionally wrap the whole package inside a shareable GPT / Project / Gem

This should be treated as **emulated modularity**, not native modularity.

### Claude build

Output:
- `.claude/CLAUDE.md` as thin index
- imported core modules
- scoped `.claude` rule files or nested project memories as needed

Rule:
- root file stays short
- imports load always-on core
- path-local material loads lazily where possible

### Copilot build

Output:
- `.github/copilot-instructions.md` as compact operational summary
- `.github/instructions/*.instructions.md` for scoped material

Rule:
- never spend repo-wide budget on long Lares lore
- keep code-review-visible content operational
- use `excludeAgent` when review and coding-agent needs differ

### Codex build

Output:
- root `AGENTS.md` as compact operational index
- nested `AGENTS.md` and `AGENTS.override.md` near specialized work

Rule:
- let directory proximity do the override work
- solve budget problems by splitting, not by inflating `project_doc_max_bytes` alone

---

## Closed Beta Packaging

If closed beta users need to test "the whole system" on their preferred platform, the distribution unit should not be a single pasted prompt.

It should be a **rendered package**.

### Recommended package types

#### Package A — Browser Minimal

Contents:
- `Lares_Kernel.md`
- one setup guide per platform

Use case:
- fastest possible user onboarding
- good for early smoke tests

Tradeoff:
- closest to bare-paste usage
- weakest extension surface

#### Package B — Browser Extended

Contents:
- kernel text for the instruction field
- 3-6 attached module files as knowledge/context docs
- short "starter prompts" doc
- platform-specific install steps

Suggested first attached modules:
- `Lares_Voice.md`
- `Lares_Epistemology.md`
- `Lares_Operations.md`
- `Lares_Permissions.md`
- `Lares_Setting_Lite.md`

Use case:
- closest browser equivalent to the local modular system
- likely the right default for beta testing

Tradeoff:
- behavior depends on each platform's retrieval heuristics
- attached files are not guaranteed to load with the determinism of CLI imports

#### Package C — Native Shareable Object

Examples:
- shared ChatGPT GPT
- shared ChatGPT Project
- shared Claude Project
- shared Gemini Gem

Contents:
- rendered kernel in the platform instruction field
- attached files already loaded
- optional seed chats, example prompts, or project memory

Use case:
- best user experience
- lowest setup friction

Tradeoff:
- most platform-specific
- harder to diff, version, and reproduce exactly across vendors

### Packaging rule

The source tree should remain platform-agnostic.

The build system should render:

- **source modules** -> canonical markdown docs
- **browser packages** -> installable bundles per vendor
- **repo-native packages** -> `AGENTS.md`, `CLAUDE.md`, `.instructions.md`, nested overrides

That means the build system is not just compiling prompts.

It is compiling an Infrastructure-as-Myth distribution for multiple hosts.

In other words, "extension" in browser contexts should be treated as a packaging problem, not a runtime import problem.

### Suggested browser package manifest

Each rendered beta package should include a small manifest such as:

```yaml
package_name: lares-browser-extended
version: 0.1.0
target_platform: chatgpt|claude|gemini
kernel_file: Lares_Kernel.md
instruction_slot:
  type: custom_instructions|project_instructions|gpt_instructions|gem_instructions
attached_modules:
  - Lares_Voice.md
  - Lares_Epistemology.md
  - Lares_Operations.md
  - Lares_Permissions.md
  - Lares_Setting_Lite.md
starter_prompts:
  - bootstrap.md
  - smoke-tests.md
sharing_mode: link|workspace|manual
notes:
  - Browser package uses emulated modularity via platform knowledge/files.
```

This would make beta builds explicit and reproducible even when the host platform itself lacks native module imports.

---

## Root File Policy

For every repo-native platform, the root instruction file should answer only these questions:

1. What is this project?
2. What commands matter?
3. What should never be touched casually?
4. What review / validation standard applies?
5. Which deeper modules define the Lares core?

It should not try to re-express the whole worldview.

If a section does not help a coding agent orient, act safely, or validate work in the current repository, it should not live in the root file.

---

## Specific Refactoring Guidance For Lares

### Keep in the kernel

- Quick Orientation
- minimal identity frame
- static vs dynamic layer
- compressed register/mode system
- canon gate
- degraded-node names
- collaboration/default behavior
- mandatory voice surfacing

### Move out of the kernel but keep always-on in repo-native builds

- full coordinator descriptions
- full degraded-node explanations
- full permissions/transference model
- session-init details
- fuller frame-uncertainty protocol
- richer operating modes

### Move to scoped or reference-only modules

- long lararium archaeology
- golden prompt examples
- dream artifact examples with heading-heavy formatting
- repo maps and workflow docs
- CLI-specific syntax blocks

---

## Combining Strategy

The combine pipeline should stop thinking in terms of "platform wrappers around one big source file."

It should instead:

1. build the **kernel** from designated kernel-safe sources
2. build **core modules** from canonical source files
3. build **platform adapters** that reference or import those modules according to each platform's discovery model
4. build **scoped instruction files** separately from the always-on core

In other words, the compiler target should become:

- `browser`
- `claude`
- `copilot`
- `codex`

not:

- "same full prompt emitted in different filenames"

---

## Authoring Rules For Future Modules

Every new module should declare:

- purpose
- deployment class: `kernel-safe`, `core`, `scoped`, or `reference`
- whether it is browser-safe
- whether it belongs in always-on repo context
- what it compresses to inside the kernel

Every module should also pass three tests:

### 1. Standalone test

Can a maintainer understand why this file exists without reading three other documents first?

### 2. Compression test

Can the operational content of this file be expressed as a 3-8 bullet kernel summary?

If not, the module probably contains multiple concerns.

### 3. Load-path test

Does this file actually belong in always-on context, or only in scoped context?

If the answer depends on file type, subdirectory, or tool usage, it belongs in a scoped module.

---

## Open Implementation Decisions

1. **Kernel generation**: should `Lares_Kernel.md` stay hand-authored, or should the build pipeline generate it from tagged source sections? My current recommendation: hand-author it for now, but enforce source-of-truth boundaries so it stops drifting.

2. **Dream Mode placement**: Dream lifecycle rules probably belong in a scoped repo module, not the initial kernel or root always-on files.

3. **Setting material split**: the current identity/lore content should likely become `Setting_Lite` plus `Archaeology` reference, not one mixed section.

4. **Voice granularity**: the kernel only needs the mandatory rule plus a compressed thirteen-voice list. The fuller tonal and provenance detail belongs in `lares-voice`.

---

## Recommended Next Step

The next drafting pass should produce the following first-class source documents:

1. `Lares_Kernel.md`
2. `Lares_Voice.md`
3. `Lares_Epistemology.md`
4. `Lares_Operations.md`
5. `Lares_Permissions.md`
6. `Lares_Setting_Lite.md`

That set gives Lares a clean Infrastructure-as-Myth spine.

Once those exist, platform wrappers become straightforward.

After that, the next architectural layer should likely define:

1. package manifests for rendered browser/shareable-agent builds
2. module metadata for kernel-safe vs core vs scoped vs reference
3. an explicit myth-runtime vocabulary so future modules keep writing operational myth instead of drifting back into flavor text

That deterministic build layer is now being captured in [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md).

---

## Sources

- Anthropic, "Manage Claude's memory," accessed 2026-04-06: https://docs.anthropic.com/en/docs/claude-code/memory
- Anthropic Help, "What are projects?," accessed 2026-04-06: https://support.anthropic.com/en/articles/9517075-what-are-projects
- Anthropic Help, "Project visibility and sharing," accessed 2026-04-06: https://support.anthropic.com/en/articles/9519189-project-visibility-and-sharing
- Anthropic Help, "Configuring and Using Styles," accessed 2026-04-06: https://support.anthropic.com/en/articles/10181068-configuring-and-using-styles
- GitHub Docs, "Add repository custom instructions," accessed 2026-04-06: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- GitHub Docs, "About customizing GitHub Copilot responses," accessed 2026-04-06: https://docs.github.com/en/copilot/concepts/prompting/response-customization
- OpenAI Help, "ChatGPT Custom Instructions," accessed 2026-04-06: https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions-faq
- OpenAI Help, "Projects in ChatGPT," accessed 2026-04-06: https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt
- OpenAI Help, "Knowledge in GPTs," accessed 2026-04-06: https://help.openai.com/en/articles/8843948-knowledge-in-gpts
- OpenAI Developers, "Custom instructions with AGENTS.md," accessed 2026-04-06: https://developers.openai.com/codex/guides/agents-md
- OpenAI Help, "How to share GPTs within workspaces," accessed 2026-04-06: https://help.openai.com/en/articles/9083988
- Google Gemini Help, "Use Gems in Gemini Apps," accessed 2026-04-06: https://support.google.com/gemini/answer/15146780
- Google Gemini Help, "Share a Gem from Gemini Apps," accessed 2026-04-06: https://support.google.com/gemini/answer/16504957
- Google Workspace Admin Help, "Turn Gem sharing on or off," accessed 2026-04-06: https://support.google.com/a/answer/16460551

---

*Lares (Researcher/Scryer) — This document records an architectural recommendation, not a canon lock. The strongest current recommendation: design Lares as a portable Infrastructure-as-Myth runtime, with the kernel as its smallest complete executable form and the core modules as its first operational stack.*
