<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/shield-ward >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/modules/powers/shield-ward"
file-path = "bags/@sdm/v0.1/modules/powers/shield-ward.md"
type      = "text/x-memetic-wikitext"

title     = "@sdm/module/shield-ward"
caption   = "Shield Ward"
tags = [
  "@sdm/domain/abjuration",
  "@sdm/function/ward",
  "@sdm/function/barrier",
  "@sdm/hook/imbued",
  "@sdm/mount/trait",
]

tagspace  = "sdm"
register  = "CS"
confidence = 16
mana      = 14
manao     = 17
manaoio   = 15
cacheable = true
retain    = true
invariant = false
role      = "Power module: Shield Ward — a skin-close abjuration barrier that filters incoming attacks"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Shield Ward

<<~ ahu #has >>
## Has

<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/domain/abjuration >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/ward >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/barrier >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/hook/imbued >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
<<~/ahu >>

<<~ ahu #default >>
## Default

```toml default
canonical-name = "Shield Ward"
source-alias = "Shield"
epithet = "Skin-Close Barrier, Missile Filter"
p = 2
range = "self"
target = "operator"
duration = "20 minutes"
default-mount = "trait"
source = "BECMI Shield (MU1)"
```

**P:** 2 · **R:** self · **T:** operator · **D:** 20 minutes

Raise a magical barrier less than an inch from the body. It moves with the operator and filters incoming attacks — strong cover against missiles, modest against everything else. A `Magic Missile`-pattern strike makes a save against the ward per missile; on success it evaporates against the barrier. The paid Life stays `imbued` (locked) while the ward holds.

*(SDM+ reserves the bare name `Shield` for gear and general defense; this Power slot is `Shield Ward`.)*

### Overcharge

- **x2 — P:4.** Extend the ward to one willing adjacent ally, or harden one named channel (missiles, melee, force, spell-missiles).
- **x4 — P:8.** Hold the ward through one breach; after it, the ward flickers and demands a mishap check if maintained.

### Mishaps

On a botched or breached ward, choose one: it flares and reveals the operator; guards the wrong vector; rebounds a missile at a bystander; locks the operator's movement for a breath; imprints a visible sigil; or mistakes a friendly effect for an intrusion.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Missile Filter** — projectile-first: arrows, bullets, rays, force darts. Seats `trait`.
- **Skin Shell** — melee-first: grapples, claws, close blows. Seats `trait`.
- **Armor Spirit** — armour or shield gear carries the ward without collapsing into the gear. Seats `item`.
- **Oath Ward** — holds while an oath remains unbroken; relationship gates the protection. Seats `structure` or `burden`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power family:template role:uses >>
<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/shield-ward family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/shield-ward family:provenance role:witness >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model family:reference role:see >>

<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- SDM+ defense math for the OSR AC 2 / AC 4 language.
- Does the Magic-Missile interaction stay module-specific, or generalise into a `negate`/`#modifies` rule (counterpoint, Sprint 4)?
- A Dispel/anti-magic effect that drops this ward wants a `#modifies` edge, not `#has`.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
