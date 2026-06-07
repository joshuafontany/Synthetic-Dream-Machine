---
name: lar-uri
description: Author, validate, or audit lar: URI addresses under lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri. Keep the scheme law small, hold the path taxonomy and the one-bag @-rule distinct, and resolve names against the local graph — never as a network fetch.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL"
file-path = "bags/@lares/v0.1/api/pono/lar-uri/SKILL.md"
type = "text/x-memetic-wikitext"
register = "Synthesis-Canon"
manaoio = 14
mana = 15
manao = 16
role = "lar: URI operational skill — authoring, validation, and audit of addresses against the scheme law"
covers = [
  "lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri"
]
constraints = [
  "S1: the parent invariant (lar-uri) stays the scheme-law root; this skill does not widen or outrank it",
  "S2: path classes stay distinct — stable (ha.ka.ba), unstable (attitude triple), adjacent (no triple); never blur them",
  "S3: exactly one @-bag segment, at child[1] only; child[2]+ never carry @",
  "S4: a lar: URI NAMES; resolution runs against the local graph, never as a network fetch",
  "S5: local form for stable addresses and system names; session form for exchange spans only — it never persists into storage"
]
skill-package-root = "packages/lares-core/memes/v0.1/api/pono/lar-uri"
cacheable=true
retain = true
```



# lar: URI Skill

[lar-uri.md](../lar-uri.md) holds the scheme law.
This skill carries the working procedure.


<<~ ahu #load-contract >>

## Load Contract

Keep these points active when the skill loads:

- the parent invariant defines scheme-law root
- a slot holds one lowercase ASCII word — no hyphen, underscore, space, or non-ASCII
- a stable/unstable path carries a full three-slot root; fewer than three slots fail
- one `@`-bag at `child[1]` names a CRDT surface; deeper segments name tiddlers, never sub-bags
- a `#fragment` names a section / `ahu` / pranala anchor only
- the smallest lawful intervention beats a grand rewrite

<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #workflow-contract >>

## Workflow Contract

Use this skill for three common jobs:

1. author a new `lar:` address for a meme, bag, or system resource
2. validate an address against the scheme law (form, path class, slots, @-placement)
3. audit a surface for path-class blur, mis-placed `@`-bags, or session-form leakage

Working order:

1. read the address and name its form (local / session) and path class
2. check slot count, slot legality (lowercase ASCII), and the single `child[1]` `@`-bag
3. confirm a `#fragment` names an anchor only
4. for session form, confirm the span — it never persists into storage
5. report a clean address or name the precise violation

Do not:

- blur stable / unstable / adjacent path classes
- place an `@`-bag outside `child[1]`
- treat a `lar:` reference as a network-fetch instruction
- let a session-form URI escape its exchange span into stable storage

<<~/ahu >>

<<~ ahu #trigger >>

## Trigger

Use this skill when the request asks to:

- write or repair a `lar:` address
- validate addresses across a surface
- audit path-class discipline, `@`-bag placement, or session-form scope

Prefer another surface when the work concerns:

- the markup carried at the address (see the `memetic-wikitext` skill)
- bag resolution wiring or runtime federation only

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ read the address and sense its form and path class
⏿ orient against the scheme law — slots, classes, the single `@`-bag, the fragment
◇ decide: valid → carry forward; invalid → name the violation; ambiguous → surface and hold
▶ write the lightest correct address or the smallest lawful repair
↺ verify ASCII-only path, three-slot root, one `@`-bag, anchor-only fragment; name residue — any address whose bag binding or class stays unsettled

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
