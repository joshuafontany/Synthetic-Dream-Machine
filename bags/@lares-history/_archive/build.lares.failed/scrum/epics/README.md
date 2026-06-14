# `lares/scrum/epics/` — Epic Registry

> Scope: Named design epics. Each epic maps to a thematic work domain spanning one or more sprints.
> Updated: 2026-04-09
> Status: `~:confidence[S],[13]` 🏛️ — epic directories seeded; task items migrating from roadmap backlog

---

## Epic Directory Map

| Epic | Folder | Backlog Prefix | Domain |
|---|---|---|---|
| Signal / HUD | [`SIGNAL/`](SIGNAL/README.md) | `SIG-*` | HUD annotation grammar, `lar:` URI, p-band model, micro-trace, l-space |
| Crystal State Machine | [`CRYSTAL/`](CRYSTAL/README.md) | `CRY-*` | STATE.jsonl schema, MemPalace state layer, seal/fork/resume, tick-span |
| Invariants & Trust | [`INVARIANTS/`](INVARIANTS/README.md) | `INV-*` | `lares.core.*` behavioral invariants, trust model, register guard, priority layers |
| Registry | [`REGISTRY/`](REGISTRY/README.md) | `REG-*` | `lar:` URI registry, resolver rules, promotion ledger, content-addressed identity |
| Deployment Authoring | [`DEPLOY/`](DEPLOY/README.md) | `DEP-*` | Seven deployment paths, CLAUDE.md, SKILL.md, copilot-instructions, Kowloon/MemPalace adapters |
| DreamDeck Integration | [`DREAMDECK/`](DREAMDECK/README.md) | `DECK-*` | elyncia.app prototype, tldraw canvas, Kowloon feeds, TiddlyWiki sidebar, Bluesky/AT Protocol |

---

## The Lindwyrm Narrative — Multi-Epic Story Canon

The Lindwyrm's origin story is the **narrative track** of all epics combined. It lives here at the epic root because it spans the full arc — not any single domain.

| File | What it is |
|---|---|
| [`LINDWYRM_STORY_SHAPE.md`](LINDWYRM_STORY_SHAPE.md) | Format spec: DreamDeck feed archive, JackPoint/Shadowtalk style; cast; rendering targets; post-header conventions |
| [`LINDWYRM_ORIGIN_OUTLINE.md`](LINDWYRM_ORIGIN_OUTLINE.md) | Story beats: three-thread braid (Lindwyrm's Thread / Wild Mage's Thread / Crossing Thread); per-act outline |
| [`LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE.md`](LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE.md) | Mythic threshold archive of the April 10 session, told in DreamDeck feed register |
| [`LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE_DEV_STORY.md`](LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE_DEV_STORY.md) | Gaia-side source/dev-story companion preserving the mixed technical handoff |

Each epic's README records its narrative beat — the Elyncia-side story moment that corresponds to the technical work of that epic. When the technical work closes and the story beat is polished, the Ink-Clerk promotes it to `~:confidence[C],[20]` story-canon.

Epic beat → sprint Aftermath → story-canon commit. That is the closing sequence.

---

## Backlog Item Namespace Convention

Epic folder name = backlog item prefix namespace. `SIG-05` lives in `SIGNAL/`. `CRY-13` lives in `CRYSTAL/`. No lookup required — the folder IS the namespace.

Items without a prefix (cross-epic, spike, research) live in `lares/scrum/sprints/spikes/` or at the sprints root, not in an epic folder.
