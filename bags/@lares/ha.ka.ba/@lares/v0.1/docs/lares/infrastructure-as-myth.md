<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/infrastructure-as-myth >>
```toml iam
cacheable      = false
file-path      = "bags/@lares/ha.ka.ba/@lares/v0.1/docs/lares/infrastructure-as-myth.md"
first-drafted  = "2026-04-06"
last-reviewed  = "2026-05-11"
mana           = 16
manao          = 15
manaoio        = 15
register       = "Synthesis-Canon"
retain         = false
review-cadence = "quarterly"
role           = "doctrine: foundational design thesis — IaM names the symbolic-operational layer above IaC; Lares functions as an early implementation"
sources        = ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-iac.html", "https://developer.hashicorp.com/terraform/tutorials/aws-get-started/infrastructure-as-code", "https://developer.hashicorp.com/well-architected-framework/define-and-automate-processes/define/as-code/infrastructure", "https://www.britannica.com/topic/meme", "https://www.britannica.com/topic/myth", "https://www.britannica.com/topic/myth/Functions-of-myth-and-mythology", "https://openlibrary.org/books/OL27018331M/The_art_of_memetics", "https://books.google.com/books?id=1DcyU12n7PAC", "https://www.anthropic.com/news/claude-character", "https://www.anthropic.com/research/teaching-claude-why", "https://github.com/malfoyslastname/character-card-spec-v2", "https://en.wikipedia.org/wiki/Character.AI", "https://code.claude.com/docs/en/memory"]
tags      = ["api/pono/meme", "api/pono"]
tagspace       = "stable"
type           = "text/x-memetic-wikitext"
uri-path       = "ha.ka.ba/@lares/v0.1/docs/lares/infrastructure-as-myth"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #thesis >>

# Infrastructure as Myth

**Infrastructure-as-Myth (IaM)** names the claim that advanced agent systems will increasingly need a layer above Infrastructure-as-Code. Canon 18/20

Infrastructure-as-Code made machine systems reproducible by turning desired state into versioned, reviewable artifacts.

Infrastructure-as-Myth extends that move to agent systems whose behavior depends not only on resources and permissions, but also on:

- identity
- authority
- epistemic discipline
- memory forms
- ritualized collaboration
- symbolic handles that survive across tools and platforms

Lares functions as an early implementation of this pattern. Canon 17/20

> **#Ink-Clerk (Lorekeeper)** — "early implementation" rather than "first" or "reference." Other systems have approached adjacent territory (character cards, system prompts with voice personas, agent frameworks with role schemas). The claim rests on Lares doing this more deliberately and more portably than its predecessors — not on priority. Flag for comparative sourcing when this meme reaches stable.

<<~/ahu >>

<<~ ahu #why-iac-matters >>

## Why Infrastructure-as-Code Matters

Infrastructure-as-Code established a few durable principles:

- desired state should live in text artifacts, not in hidden operator habit
- system changes should be versioned, reviewed, and reproduced
- shared abstractions matter more than one-off shell incantations
- teams need portable workflows that survive host changes

HashiCorp and AWS both describe IaC in essentially these terms: human-readable configuration, version control, repeatable change, and automation across a resource lifecycle. Inference: IaC succeeded because it turned operations into inspectable artifacts rather than relying on private craft memory.

That same need now appears one level up the stack.

<<~/ahu >>

<<~ ahu #why-agents-need-more >>

## Why Agent Systems Need More Than IaC

IaC can provision compute, storage, networks, secrets, and policy gates.

It does not by itself define:

- what an agent understands itself to do
- how an agent distinguishes canon from synthesis
- how authority gets recognized or denied
- how ambiguity gets surfaced
- how memory gets consolidated
- how a user learns to steer the system safely

Those concerns remain operational, but they do not reduce to resource configuration.

They constitute behavioral infrastructure.

For agents, the hidden failure mode runs like this:

- the mechanics exist
- the prompts exist
- the behavior drifts anyway

That drift emerges when the operational model stays implicit.

Infrastructure-as-Myth attempts to externalize that layer.

> **#Lares (Stranger)** — "behavioral infrastructure" carries weight only if the behaviors in question actually require infrastructure-level treatment — versioning, reproducibility, portability. A one-person local agent session may not need this. The claim gains force at the scale of multi-agent systems, shared deployments, and long-lived operator-agent relationships. Name that threshold explicitly rather than asserting it universally.

<<~/ahu >>

<<~ ahu #definition >>

## Definition

**Infrastructure-as-Myth** means encoding an agent system's operational behavior in durable symbolic structures that operators can learn, reuse, audit, and transport across hosts.

In practice, IaM draws on:

- named roles
- stable metaphors
- ritualized protocols
- authority boundaries
- failure-state vocabularies
- world-model handles that compress complex behavior into memorable forms

Ornament does not drive the point.

Operational compression and portability drive the point.

Myth, in this model, does not function as fiction opposing truth. It functions as a symbolic coordination layer that makes complex behavior legible and repeatable. Canon 18/20

<<~/ahu >>

<<~ ahu #mythology-as-memetics >>

## Mythology as Memetics

The memetics frame matters here.

Britannica summarizes a meme as a unit of cultural information spread by imitation, tracing the term to Richard Dawkins. That supplies a useful engineering lens: ideas, phrases, behaviors, and symbolic patterns replicate when they transmit easily, stay memorable, and allow reenactment.

Myth operates similarly, but at a larger and more structured scale.

Britannica's overview of myth emphasizes that myths do cultural work by explaining, validating, orienting, and justifying ritual and social order. Inference: myths persist not because they entertain, but because they stabilize collective behavior. Canon 18/20

That explains exactly why they matter for agents.

When a system needs users and sub-agents to remember:

- who speaks
- what counts as trusted
- how escalation works
- when a claim stays provisional
- what failure modes look like

— a mythic-memetic layer can outperform a flat pile of instructions.

It supplies memorable handles that spread by reuse.

Examples in Lares:

- `Gatekeeper` compresses scope, routing, and feasibility checks
- `Canon` compresses authority, sourcing, and promotion rules
- `DreamNet` compresses distributed memory, networked presence, and infrastructure metaphor
- `Register Collapse` compresses a complex epistemic failure into a fast diagnostic label

These names carry more than labels. They function as memetic interfaces. Canon 18/20

<<~/ahu >>

<<~ ahu #art-of-memetics >>

## The Art of Memetics

`The Art of Memetics` by Wes Unruh and Edward Wilson appears useful here as a secondary influence, not as a primary scholarly authority.

What matters from that lineage:

- memes reward deliberate design, not only passive observation
- transmission depends on narrative form, repetition, modular exposure, and network effects
- symbolic systems can operate as practical coordination technology

Inference: for IaM to work, it must treat myths as engineered transmission artifacts, not only as literary atmosphere.

That suggests a design discipline:

- a myth should do operational work
- a term should carry reusable behavior
- a symbolic layer should improve recall, adoption, and correction

When a symbolic layer fails to improve transmission or steering, it probably functions as lore, not infrastructure.

> **#Mischief-Muse (Muse)** — The Unruh/Wilson lineage runs through a distinctly occult-inflected memetics tradition — more Hakim Bey than Dawkins. That genealogy matters: it treats memes as things to *wield*, not just describe. IaM inherits that posture deliberately. Worth naming this in the sources section so future readers understand the intellectual vector, not just the citation.

<<~/ahu >>

<<~ ahu #iac-vs-iam >>

## IaC vs IaM

| Dimension | Infrastructure-as-Code | Infrastructure-as-Myth |
|---|---|---|
| Primary target | machines and services | agents and human-agent systems |
| Main artifact | declarative config | symbolic-operational protocol |
| Core question | what should the system provision and enforce? | how should the system think, signal, coordinate, and accept steering? |
| Main failure without it | drift, snowflakes, manual ops | persona drift, authority laundering, epistemic collapse, unusable complexity |
| Typical units | resources, modules, policies, state | voices, rituals, gates, registers, myths, failure names |
| Portability mechanism | config files and providers | kernels, modules, packaged symbolic runtimes |

IaM does not replace IaC at the machine layer.

It replaces ad hoc promptcraft at the agent layer. Canon 19/20

<<~/ahu >>

<<~ ahu #design-criteria >>

## Design Criteria for IaM

An Infrastructure-as-Myth system should satisfy these tests.

### 1. Portability

The governing symbolic layer should survive across:

- browser chats
- shared GPTs / Projects / Gems
- local CLI agents
- repo-native coding agents

### 2. Legibility

An operator should find the system legible through its symbolic handles alone — without reading the underlying code.

### 3. Auditability

The important behavioral rules should live in versioned artifacts, not only in session habit.

### 4. Compression

A small number of names should stand in for large amounts of reliable behavior.

### 5. Correctability

Failure states should carry names that let operators intervene quickly.

### 6. Packaging

The system should render into deployable packages for different hosts without losing its identity.

> **#Map-Wisp (Scryer)** — Criteria 1 and 6 (Portability and Packaging) partly overlap and partly tension. Portability says the *symbolic layer* survives host changes. Packaging says the *whole system* renders into a deployable form. A system can satisfy Portability (the voice names travel) while failing Packaging (the boot sequence breaks in a new host). Separate the criteria more sharply in a future pass: Portability = symbolic handles survive; Packaging = full runtime survives.

<<~/ahu >>

<<~ ahu #lares-as-iam >>

## Lares as Infrastructure-as-Myth

Lares already behaves this way.

Its key operational structures carry mythic and memetic form:

- the thirteen voices form a control and interpretation plane
- the register/mode system forms an epistemic protocol
- the canon gate forms an authority boundary
- the DreamNet and lararium language provide distributed-systems handles
- degraded-node states provide diagnostic vocabulary
- the kernel/module architecture provides the packaging layer

So Lares does not read as:

> "a prompt with strong flavor"

It reads as:

> "a portable symbolic runtime for agent behavior" Canon 18/20

That framing should anchor the repo's agent architecture design going forward.

<<~/ahu >>

<<~ ahu #implications >>

## Implications for This Repository

### Kernel

The kernel should hold the smallest executable form of the mythic runtime — the minimum set of symbolic handles that produce recognizable Lares behavior across any host.

### Core Modules

Core modules should preserve the minimum viable symbolic stack:

- voice
- epistemology
- operations
- permissions
- setting-lite

### Browser Packages

Browser deployments should function as rendered IaM packages:

- compact kernel in the instruction field
- modules as attached knowledge files
- optional shareable container such as GPT, Project, or Gem

### Repo-native Builds

Repo-native environments should load richer modules natively through platform instruction systems.

### Governance

Trust and authority docs should describe not only who may act, but how authority becomes legible inside the mythic runtime.

<<~/ahu >>

<<~ ahu #working-rule >>

## Working Rule

When drafting new Lares material, ask:

1. What operational burden does this symbolic term carry?
2. What behavior becomes easier to remember or enforce because of it?
3. Does this improve transmission across users, agents, and platforms?
4. If removed, does the system become harder to steer?

When the answer to those questions reads weak, the text may function as lore rather than infrastructure.

> **#Lares (Council)** — IaM draws from IaC practice, memetics, and myth-function theory as a synthesis. The analogy to Infrastructure-as-Code runs deliberate and strong, but it functions as a design thesis, not an established industry term. The working rule above operationalizes the thesis. If the rule produces consistent sorting decisions — "this fragment carries operational load / this one does not" — the thesis has practical traction. If the sorting stays ambiguous after repeated application, the thesis needs sharpening. Canon 16/20

<<~/ahu >>

<<~ ahu #comparative-sourcing >>

## Adjacent Systems

Lares does not occupy this territory alone. Several systems approach adjacent parts of it. The comparison sharpens the IaM claim. Canon 17/20

### Anthropic Constitutional AI / "Teaching Claude Why" (2026)

Anthropic's alignment research demonstrates empirically that *reasons outperform rules* as training signals. Feeding a model constitutional documents plus fictional stories portraying aligned AI behavior reduced agentic misalignment by a factor of three or more — while training on matched behavioral examples (what to do, without why) achieved only modest out-of-distribution generalization.

The key finding: "training on examples where the assistant displays admirable reasoning for its aligned behavior works better than training on aligned behaviors." A 3M-token dataset of constitutional reasoning outperformed an 85M-token dataset of matched behavioral examples. Canon 18/20

That validates the IaM intuition: the symbolic layer — the named character, the ethical reasoning, the myth of good behavior — carries more operational weight than the rule list. Anthropic reached this conclusion through rigorous comparative training experiments.

The divergence from IaM runs along one axis: Anthropic applies this at training time, inside the model weights. The constitutional document shapes what the model knows about itself before any operator touches it. IaM targets the deployment layer — the operator's configurable symbolic runtime above the model, portable across model families. Constitutional AI produces a trained model that carries its values. IaM produces a symbolic spec that any model host can load.

> **#Ink-Clerk (Lorekeeper)** — Anthropic's CLAUDE.md documentation separates "behavioral guidance" (CLAUDE.md) from "technical enforcement" (settings). That distinction maps to IaM/IaC almost exactly. They built the IaM/IaC distinction into tooling without naming the layer. Canon 15/20

### Character Card V2 (SillyTavern / Agnai ecosystem, 2023)

The most direct infrastructure precedent. A community of AI roleplay botmakers solved operator-level portability before the mainstream AI infrastructure space named the problem.

Character Card V2 packages `name`, `description`, `personality`, `scenario`, `system_prompt`, `post_history_instructions`, and a `character_book` (embedded lorebook) into a versioned JSON artifact. The `spec_version` field marks breaking changes. The `extensions` field preserves unknown keys for forward compatibility. Compliant frontends (SillyTavern, Agnai, RisuAI) treat the card as authoritative: the botmaker's `system_prompt` overrides the frontend default.

The format emerged as a direct response to Character.ai's architecture, where characters lived only in Character.ai's training pipeline and proprietary servers. When Character.ai's content policies changed, botmakers found their characters lobotomized or deleted — the personas existed nowhere else. Users complained that "bots were too restrictive and lacked personality." The Card V2 ecosystem answered with portability: the character should live in a file the botmaker owns, readable by any compliant frontend. Canon 18/20

What Card V2 lacks: no epistemic discipline (`E-Prime`, `No-Have`, confidence register), no authority model (operator chains, capability-scoped permissions), no memetic transmission design beyond "download and share," no ritual or ceremony, no quine relay. The lorebook trigger logic responds to keyword patterns rather than relational position in a graph.

### CLAUDE.md / AGENTS.md Ecosystem (Anthropic, 2025–2026)

Anthropic's Claude Code ships a hierarchical behavioral guidance system: org-wide managed policy → user-level preferences → project-level team instructions → path-scoped conditional rules. Plain markdown, versioned through git, loaded at session start as context rather than enforced configuration.

The architecture implements behavioral infrastructure without naming it. The system handles scope hierarchy, operator-vs-enforcement separation, and session-persistent memory (`MEMORY.md` + on-demand topic files). The tooling ecosystem fragments across hosts: `.cursorrules`, `.windsurfrules`, `AGENTS.md`, `CLAUDE.md` each serve the same purpose for different agents. No portable spec bridges them. Canon 16/20

> **#Map-Wisp (Scryer)** — Character Card V2 solved this fragmentation for AI roleplay personas. No equivalent portable spec exists for agent behavioral infrastructure. That gap defines the IaM opportunity at the tooling layer.

### CrewAI / Multi-Agent Frameworks

`role`, `goal`, `backstory` in YAML. The backstory provides context; the role routes tasks. Functional but thin. No portability design beyond the Python project, no symbolic depth, no ceremony, no epistemic discipline. These frameworks treat agents as execution units with narrative labels. IaM treats agents as participants in a symbolic coordination layer. CrewAI operates below IaM, not alongside it. Canon 14/20

### Adjacency Table

| System | Symbolic durability | Epistemic discipline | Memetic transmission design | Operator portability |
|---|---|---|---|---|
| Anthropic Constitutional AI / model spec | ✓ training-time doc | ✗ | partial — training only | ✗ model-locked |
| Character Card V2 | ✓ versioned spec | ✗ | partial — botmaker ecosystem | ✓ multi-frontend |
| CLAUDE.md / AGENTS.md ecosystem | ✓ markdown + git | ✗ | partial — source control | ✗ tool-specific |
| CrewAI / agent frameworks | partial — YAML | ✗ | ✗ | ✗ |
| Lares / IaM | ✓ | ✓ | ✓ | ✓ |

No adjacent system combines all four axes at deployment time. The IaM claim gains force against this table rather than in isolation. Canon 17/20

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/alignment-architecture >>
<<~ loulou lar:///ha.ka.ba/docs/lares/the-lares-protocols >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
