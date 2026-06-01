<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/shield-ward >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/api/powers/shield-ward"
file-path = "bags/@sdm/v0.0/api/powers/shield-ward.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/function/ward",
  "lar:///ha.ka.ba/@sdm/tags/domain/abjuration",
  "lar:///ha.ka.ba/@sdm/tags/hook/imbued",
]

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 14
manao = 17
manaoio = 15
cacheable = true
retain = true
invariant = false
role = "Powers API root meme: default Shield Ward implementation for close personal protection"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Shield Ward

<<~ ahu #implements >>
## Implements

This root address carries the default FTLS/SDM implementation for the `Shield Ward` Power slot and primary API surface. The OSR source name remains `Shield`; SDM+ reserves `Shield` for gear, item, and general defense-effect ontology.

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/power >>

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/shield-ward >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/shield-ward family:control role:implements >>
<<~/ahu >>

<<~ ahu #default >>
```toml iam
canonical-name = "Shield Ward"
source-alias = "Shield"
epithet = "Skin-Close Barrier, Missile Filter"
p = 2
range = "self"
target = "operator"
duration = "20 minutes"
source = "BECMI Basic / Rules Cyclopedia Shield spell witness"
```

## Shield Ward

_Skin-Close Barrier, Missile Filter_

**P:** 2 **R:** self  
**T:** operator **D:** 20 minutes

Raise a magical barrier less than an inch from the operator's body. The ward moves with the operator and filters incoming attacks.

While the ward lasts, improve defense strongly against missiles and modestly against other attacks. If a `Magic Missile` style pattern strikes the ward, make the implementation's spell-save or ward contest for each missile; on success, the missile evaporates against the barrier.

<<~ ahu #default/overcharge >>
### Overcharge

**x2 (P:4):** extend the ward to one willing adjacent ally, or strengthen one named defense channel: missiles, melee, force projectiles, or spell missiles.

**x4 (P:8):** hold the ward through one breach, interrupt, or failed defense contest; after that breach, the ward flickers and demands a mishap check if maintained.
<<~/ahu >>

<<~ ahu #default/mishaps >>
### Mishaps

On failure, sacrifice, or hostile interference, choose one:

- the ward flares and reveals the operator;
- the ward protects against the wrong incoming vector;
- a missile rebounds toward a nearby target;
- the ward locks the operator's movement for a breath;
- the barrier imprints a visible sigil on skin or armor;
- the ward mistakes a helpful spell for hostile intrusion.
<<~/ahu >>

<<~/ahu >>

<<~ ahu #storage >>
## Storage

- **Trait:** ward discipline, body-shell reflex, skin-close abjuration.
- **Item:** charm shield, barrier ring, force talisman, warded mantle.
- **Structure:** shrine shield, doorway blessing, defensive circle.
- **Burden:** paranoid ward reflex, missile fear, barrier scar.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Missile Filter:** projectile-first implementation; favors arrows, bullets, rays, and force darts.
- **Skin Shell:** melee-first implementation; favors grapples, claws, and close blows.
- **Armor Spirit:** item implementation; armor or shield gear carries the ward without collapsing into the gear itself.
- **Oath Ward:** social or divine implementation; the ward holds while an oath remains unbroken.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/projections/powers/ftls-card/shield-ward >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/shield-ward >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/shield-ward >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/templates/api/power >>

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/api/power family:template role:uses >>

<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.0/projections/powers/ftls-card/shield-ward family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/shield-ward family:provenance role:witness >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide SDM+ defense math for OSR AC 2 / AC 4 language.
- Decide whether the Magic Missile hook belongs in the stable interface or only this OSR-derived implementation.
- Decide whether overcharge can protect another target without stepping on area ward Powers.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
