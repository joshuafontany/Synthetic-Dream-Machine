<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/interfaces/power >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/interfaces/power"
file-path = "bags/@sdm/v0.1/interfaces/power.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/domain/noosphere",
]

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 16
manao = 18
manaoio = 15
cacheable = true
retain = true
invariant = false
role = "master Power interface meme: noospheric affordance, Life/Ability payment, Burden-slot overflow model"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Interface — Power

<<~ ahu #interface >>
## Interface

```toml contract
name = "Power"
operation = "express-and-pay-noospheric-force"
authz = [
  "capability-bearing operator, bearer, item, structure, rite, shrine, daemon, burden, faction, or table consensus",
  "permission comes from fictional grant, not class identity",
  "implementations may name grant source: learned spell, memorized pattern, stored charge, pact, relic, shrine consent, life-force expenditure, or daemon delegation",
]
scope = ["operator or bearer", "implementation carrier", "P budget", "Life or Ability payment source", "target affordance", "table consequence"]
inputs = ["declared intent", "P budget", "payment source (operator Life, Ability Points, Mana pool, or named external stream)", "authz grant", "target interface", "implementation carrier"]
requires = [
  "a reachable implementation names one or more concrete Power interfaces",
  "payment draws from Life or Ability Points on the operator sheet, or from a named external source: Mana pool (ambient Life buffered via Reckless Dweomer), another creature's Life or Power stream (usually via a trait), stored charge, or faction grant",
  "spending P above operator Level triggers a Corruption/Wild Magic Danger Roll",
  "the fiction permits the grant to cross from intent into consequence",
]
effects = [
  "activate a noospheric affordance through a concrete interface",
  "deduct Life equal to P from the named payment source; or deduct Ability Points at 1:1 parity",
  "[imbued] or [sustained] commitments lock that Life until the power deactivates or expires; locked Life cannot recover until the condition ends",
  "when the payment source cannot cover the cost: fill a Burden slot (power.debt); spending P above Level adds a Corruption/Wild Magic Danger Roll (power.corruption-triggered)",
  "bind a default implementation to one or more reusable Power contracts",
]
maintains = ["payment-source ledger", "authz surface", "operator relation", "implementation identity", "residue trail"]
ends_when = ["implementation resolves", "cost payment fails", "authz grant closes", "counterforce interrupts", "table calls the consequence complete"]
refuses = ["class gate", "free activation without grant", "unbounded wish surface", "confusing cost source with concrete spell effect without a named interface"]
emits = ["power.activated", "power.paid", "power.refused", "power.residue", "power.debt", "power.corruption-triggered"]
```

`Power` deliberately names an overlap: the playable spell-like affordance and the Life that powers it. SDM language lets a Power read as a spell entry, a stored pattern, a charged relic, a burden, or a Mana draw. This master interface keeps that overlap visible without forcing every implementation into one energy theory.

Concrete interfaces such as `Read Magic`, `Floating Disc`, and `Shield Ward` implement `Power` when they name a reusable noospheric affordance. API roots implement both `Power` and one or more concrete interfaces when they carry playable default text.

The master interface asks three questions:

1. **What grant lets this pattern act?**
2. **What Life, Ability Points, Mana, or named external stream pays the P cost?**
3. **Which concrete interface names the affordance that reaches the table?**

Counterplay may come from exhausted Life, broken consent, owner-locks, filled Burden slots, Corruption exposure, hostile daemons, anti-magic weather, causal-island boundaries, false grants, or residue that demands payment later.

<<~/ahu >>

<<~ ahu #hooks >>
## Hooks

This worksite names possible play-surface hooks for the master Power layer. It does not settle reaction-engine implementation.

```toml hooks
status = "scratch"
surface = "game-session-play-surface"
may_copy_into = ["instanced projection", "session ledger", "character sheet", "browser protocol draft"]
state = ["power.grant", "power.source", "power.cost", "power.debt", "power.interface", "power.implementation", "power.residue"]
notices = ["grant-opened", "paid", "underpaid", "refused", "activated", "interrupted", "burden-slotted", "corruption-triggered", "residue-left"]
filters = ["edge:control:implements[lar:///ha.ka.ba/@sdm/v0.1/interfaces/power]", "power:operation[express-and-pay-noospheric-force]"]
adapters = ["tw5 event", "Lararium reaction graph", "browser worker protocol", "character ledger", "local-first CRDT patch"]
```

Future hooks may connect Life-deduction tracking, payment-source resolution, Burden-slot marking, Corruption triggers, and implementation activation into one session surface.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

Discovery via graph traversal: `edge:control:implements[lar:///ha.ka.ba/@sdm/v0.1/interfaces/power]`
Concrete interfaces self-declare upward with `family:control role:implements` — no enumeration here.

<<~ pranala #ontology-root ? -> lar:///ha.ka.ba/@sdm/v0.1/api/power family:reference role:see >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide whether `Power` also covers non-spell life-force economies outside the SDM Powers Index.
- Clarify Burden slot type for `power.debt` fills: named Burden (e.g. "Mana Burn", "P Debt") vs. generic filled slot vs. referee-assigned.
- Promote hook notice names only after browser play sessions teach the payload shape.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
