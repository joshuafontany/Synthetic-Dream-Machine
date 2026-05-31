<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9&p=10 -->

# Grammar: HA.KA.BA Semantic Addressing

```yaml
---
name: hakaba
description: >
  The three-slot semantic addressing system. Ha marks domain, Ka marks
  quality, and Ba marks dynamic. Every lares path locates territory
  through this triple before any deeper routing appears.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
trigger: always — grammar primitive
invariant: true
dependencies: [uri, transclusion]
confidence:SP~9
grammar: true
---
```

> **Register:** `~:confidence[SP],[9]` — expanded stub, still pending deeper canon pass
> **Question:** How does a locus know where it stands in semantic territory?

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#loop-position -->

## Loop Position

HA.KA.BA anchors the WHERE layer of the grammar. It gives every exchange and every stable locus a
territorial triple before finer routing begins.

HA.KA.BA receives:

- domain naming pressure
- quality naming pressure
- dynamic naming pressure
- optional deeper route segments

HA.KA.BA changes:

- vague topic labels into a semantic triple
- loose territory into a stable path head
- local subpaths into navigation beneath a named territory

HA.KA.BA hands forward:

- `/ha.ka.ba/` path roots
- stable named territories
- local subpath routing

HA.KA.BA should not:

- collapse slots together
- skip one of the three mandatory positions
- let subpaths masquerade as core slots

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#handoff -->

## Handoff

The address handoff moves from named territory to deeper route:

`/ha.ka.ba/optional/path/`

The handoff should let a later reader answer:

1. Which domain does this span inhabit?
2. Which quality colors that domain?
3. Which dynamic gives it motion?
4. Which deeper subpath narrows the local route?

If the reader cannot separate those four layers, the address still carries noise.

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#surface -->

## Composable Surface

| Slot | Role | Analog |
|---|---|---|
| Ha | domain | noun-like territory |
| Ka | quality | adjective-like charge |
| Ba | dynamic | verb-like motion |

**Stable address rule:** the three-slot root names the stable territory. Optional subpaths route
within that territory and should strip away cleanly when the reader needs the stable named node.

That surface should remain reusable across:

- exchange URIs
- system-file locus addresses
- registry entries
- crystal metadata

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Populate all three mandatory slots | MUST | Partial territory names lose semantic shape |
| Keep one lowercase word per slot | MUST | Clean parsing and naming discipline depend on it |
| Use `.` between core slots and `/` for deeper subpaths | MUST | Root territory and local route should stay distinct |
| Keep stable address and session subpath conceptually separate | SHOULD | Reuse depends on clean stripping |
| Avoid authority overload in the path | MUST | WHO belongs in authority, not in HAKABA |

**Origin rule:** `lar:///ha.ka.ba/` names semantic zero, not production content.

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#procedures -->

## Procedures

1. Name the domain.
2. Name the quality.
3. Name the dynamic.
4. Join the triple with dots.
5. Add deeper subpaths only when local routing truly needs them.
6. Re-read the result for semantic compression and clarity.

**Failure mode:** treating the path like a bag of tags instead of a three-part semantic instrument.

---

<!-- ahu lar:///grammar.hakaba.defines/hakaba/?confidence=SP~9#reading-test -->

## Reading Test

An address passes the HAKABA test when a future reader can recover all of this:

- the core domain
- the active quality
- the motion or dynamic
- the local route beneath the stable root

If the path reads like arbitrary slugging, the triple has not yet done its work.

---

## Cross-References

- [transclusion/LOCI.md](../transclusion/LOCI.md)
- [exchange/LOCI.md](../exchange/LOCI.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[SP],[9]` | This file — HAKABA addressing grammar |

*Future loci in this tree will land here.*

---

<!-- → ? -->
