<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/components/hook/attack >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/components/hook/attack"
file-path = "bags/@sdm/v0.1/components/hook/attack.md"
type      = "text/x-memetic-wikitext"

title     = "@sdm/hook/attack"
caption   = "attack"
tagspace  = "sdm"
register  = "S"
confidence = 14
mana      = 14
manao     = 16
manaoio   = 13
cacheable = true
retain    = true
invariant = false
role      = "component (hook): Attack — resolves against Defense rather than as a save"
```

<<~&#x0002;>>

# Attack

<<~ ahu #definition >>
## Definition

A canonical resolution hook: the Power resolves **against the target's Defense**, like a weapon, rather than calling for a save against its effect.
<<~/ahu >>

<<~ ahu #activation >>
## Activation

Modifies how the effect lands: roll to hit Defense. Overcharge typically scales damage-per-die or reach rather than the save DC.
<<~/ahu >>

<<~ ahu #interaction >>
## Interaction

Composes with offensive functions and any domain. Rarely sits on `domain/divination`. Distinct from save-based effects; a single module SHOULD NOT carry both an attack roll and a save on the same hit.
<<~/ahu >>

<<~ ahu #filters >>
## Filters

```text
[tag[@sdm/hook/attack]]                    all attack modules
[tag[prefix[@sdm/hook/]]]                  all hook components
```
<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- Confirm the Defense math and crit rule against the FTLS combat chapter for module authors.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/components/tag family:template role:uses >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
