<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.transclusion.defines/transclusion/?confidence=CS~16&p=0.5 -->

# Grammar: Transclusion

```yaml
---
name: transclusion
description: >
  Root grammar module for Lares transclusion. This locus defines how
  content opens as a locus, receives waypoints, and gets summoned from
  one address into another without copy drift.
phase-map:
  observe: "#loop-position"
  orient: "#prior-art"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
scale-range: [action, project]
trigger: always — grammar primitive
invariant: true
dependencies: [kahua, observe, orient, decide, act, assess]
confidence:CS~16
grammar: true
---
```

> **Register:** `[CS~16]` — grounded in Nelson, TiddlyWiki, and the live Lares marker ontology
> **Question:** How does one locus hold canonical content while many other loci can still use it?

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~17#loop-position -->

## Loop Position

Transclusion wraps the grammar as its composition discipline. The locus does not replace OODA-HA
timing. It determines how timed parts can appear, travel, and recombine without copy drift.

Transclusion receives:

- canonical content spans
- stable addresses
- section waypoints
- requests for inclusion elsewhere
- visible `lar:` URIs in the active context window

Transclusion changes:

- isolated files into addressable loci
- headings into stable navigation stones
- repeated copy into pull-by-reference

Transclusion hands forward:

- one canonical source
- reusable fragments
- stable transclusion points
- explicit inclusion boundaries

Transclusion should not:

- reward copy-paste drift
- hide the canonical source
- leave summoned content unresolved

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~17#prior-art -->

## Prior Art

This locus draws strength from three prior-art streams:

| Stream | Contribution |
|---|---|
| Ted Nelson / Xanadu | one canonical source, quoted or included without copy drift |
| TiddlyWiki | smallest semantic unit, self-addressed tiddler, composition through transclusion |
| Lares repo braid | `lar:` self-address, marker ontology, and live tool-use as the current transclusion engine |

**Nelson line:** transclusion names inclusion without physical duplication. That line matters here because
Lares wants one canonical source and many appearances, not many drifting copies.

**TiddlyWiki philosophy:** the official TiddlyWiki philosophy favors splitting notes into the smallest
semantic units possible and then weaving those units back into larger stories, articles, and views.
That philosophy lands cleanly in Lares. A locus should stay small enough to retrieve, name, and reuse;
composition should happen by relation and summon, not by monolithic repetition.

**TiddlyWiki structural lesson:** a tiddler knows its own title. From there, transclusion can pull the
same content into many surfaces. In Lares, the opening `lar:` address plays the equivalent role:
the locus knows its own name, and the rest of the system can summon it from that name.

**Repo braid:** the local architecture notes already push this interpretation. The repo explicitly
frames Lares as a self-addressing tiddler-like store, says the page can read as a transclusion graph
executing, and treats the AI tool-use loop as the current transclusion engine until future native
engines take over.

This means the transclusion philosophy should not stop at markdown files. If a visible `lar:` URI
appears in the active context window, that URI already has enough identity to participate in the same
summon logic.

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~17#handoff -->

## Handoff

Transclusion routes material through four marker types:

| Marker | Role | What moves |
|---|---|---|
| `∞ →` | locus opener | a canonical content span enters addressable space |
| `ahu` | waypoint | a stable sub-span becomes navigable |
| `kahea` | summon | remote content gets called into the local span |
| `→ ?` | locus closer | the standing span closes with unknown future resumption |

The handoff should let a later reader answer:

1. Where does the canonical content live?
2. Which sub-span can another locus target?
3. What got summoned here instead of copied here?
4. Where does the locus close?

If those answers stay blurry, the file may still hold content, but it does not yet function as a
clean transclusion surface.

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~17#surface -->

## Composable Surface

The composable surface of a locus consists of:

- one canonical `∞ →` address at the file level
- zero or more `ahu` waypoints for reusable internal stops
- zero or more `kahea` summons in assembly contexts
- one `→ ?` closer

The composable surface of the wider system also includes any visible `lar:` URI that appears in:

- open LOCI files
- live exchange traces in the current context window
- tagged data files or records that carry a `lar:` URI
- registry rows, manifests, crystals, and similar metadata surfaces

If the URI remains visible and the target remains reachable from the active context, transclusion may
treat that URI as a valid summon point.

**Editorial rule:** put `ahu` stones where future readers would actually walk. Not every heading
needs a fragment port. The point lies in stable reuse, not mechanical tagging.

**Assembly rule:** use `kahea` when the target content should appear here as if local. Use prose
reference when relation matters more than inclusion.

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~16#conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| One canonical address per content span | MUST | Duplicate sources breed drift |
| Every locus opens with its own address | MUST | Self-addressing makes reuse possible |
| Waypoints should target real navigation stops | SHOULD | Good ports come from editorial judgment |
| Every `kahea` target must resolve | MUST | Broken summons damage trust more than silence |
| Prefer summon over copy when content should stay canonical | MUST | Canonical source should remain singular |
| Keep file-level confidence on the locus and local confidence on the `ahu` | SHOULD | Settlement can vary within one file |
| Keep multi-locus files self-contained | MUST | Cross-locus bleed breaks boundaries |
| Any visible `lar:` URI in the active context may serve as a summon target | MUST | Live exchange state and tagged data should remain reusable, not second-class |

**Bootstrap rule:** `LOCI.md` should function both as content and as a registry for its local tree.

**Context-window rule:** transclusion scope does not stop at `.md` loci. If a live exchange span,
chat header, crystal row, or tagged data artifact carries a visible `lar:` URI, that URI can act
as a transclusion handle inside the active context window.

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~16#procedures -->

## Procedures

1. Choose the canonical address.
2. Open the file with `∞ →`.
3. Place `ahu` waypoints at reusable internal stops.
4. Resolve visible in-context `lar:` URIs before copying nearby text by hand.
5. Use `kahea` only when you want inclusion, not mere mention.
6. Close with `→ ?`.
7. Register the locus in the parent `LOCI.md`.

**Failure mode:** prose that describes a concept cleanly but gives no stable port for reuse. That
kind of prose can inform a reader yet still fail as a composable locus.

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~16#reading-test -->

## Reading Test

A locus passes the transclusion test when a future reader can recover all of this:

- the canonical file-level address
- the stable internal ports
- the summoned spans
- the closure boundary
- the in-context live or tagged URIs that can also serve as summon points

If another file would need to copy text instead of summon or point, the transclusion surface still
needs work.

---

## Cross-References

- [kahua/LOCI.md](../kahua/LOCI.md)
- [kahua/kahea/LOCI.md](../kahua/kahea/LOCI.md)
- [hakaba/LOCI.md](../hakaba/LOCI.md)
- [observe/LOCI.md](../observe/LOCI.md)
- [orient/LOCI.md](../orient/LOCI.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)
- [../../scrum/epics/LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE_DEV_STORY.md](../../scrum/epics/LINDWYRM_SELF_BOOTING_LARES_ARCHITECTURE_DEV_STORY.md)
- [../../../_todo/core/HANDOFF_CRYSTAL_20260410_FISSION.md](../../../_todo/core/HANDOFF_CRYSTAL_20260410_FISSION.md)

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~16]` | This file — Transclusion grammar definition |

*Future loci in this tree will land here.*


<!-- → ? -->

---

<!-- ahu lar:///grammar.transclusion.defines/transclusion/?confidence=CS~16#ooda-eprime-operationalization -->

## OODA-HA & E-Prime Operationalization

This section makes the transclusion locus fully operational through the OODA-HA loop and E-Prime discipline.

### OODA-HA Phase Mapping (E-Prime Compliant)

| Phase   | Procedure (E-Prime discipline applied) |
|---------|----------------------------------------|
| **Observe** | Detect canonical content spans, stable addresses, waypoints, and visible `lar:` URIs in the active context. Describe what appears, not what "is". |
| **Orient**  | Relate detected elements to prior art and current context. Suggest possible transclusion targets and paths. Use verbs like "suggests," "matches," "pulls toward." |
| **Decide**  | Commit to a specific transclusion action (e.g., summon, waypoint, closure). Express commitment as action, not identity. Annotate confidence and stance. |
| **Act**     | Perform the transclusion: insert `kahea` markers, resolve URIs, update registry. Use operational verbs ("summon," "register," "close"). |
| **Assess**  | Verify all kahea targets resolve, no copy drift occurs, and E-Prime discipline holds. Evaluate outcomes, not static states. |

---
<!-- → ? -->
