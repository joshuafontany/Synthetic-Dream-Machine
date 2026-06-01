<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/projections/powers/ftls-card >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/templates/projections/powers/ftls-card"
file-path = "bags/@sdm/v0.1/templates/projections/powers/ftls-card.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 15
mana      = 14
manao     = 17
manaoio   = 15
cacheable = true
retain    = true
invariant = false
role      = "root template meme for FTLS Power card projection memes — playable surface with clickable component pills"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Template — FTLS Power Card Projection

<<~ ahu #intent >>
## Intent

An FTLS card projection renders a Power module as one table-facing game surface. It reads like something a player or referee uses now. It carries no ontology notes, conversion audit, or source history. The card MAY churn freely while the module stays stable.
<<~/ahu >>

<<~ ahu #card-shape >>
## Card Shape

```text
#card        heading = Power name (see heading law); epithet, P/R/T/D, effect, counterplay
#overcharge  x2/x4/x8 escalations
#pills       (visible heading "Components") component + mount-point pills, via <<tag-pill>>
#edges       #projects back to module, #template
```

The component section renders pills with the `<<tag-pill>>` procedure. On paper the pills read as keywords; on screen each clicks through to its component tiddler and a filter of every module that shares it. On paper they read like `[ecm-scan] [magic-decode] [archive] [divination]` · `[trait] [item] [structure]`.

**Live, never fenced.** In a card body the procedure call is live wikitext so TW5 renders it — `<<tag-pill "@sdm/function/ecm-scan">>` standing on its own, never inside a code fence. A fenced call renders as dead literal text and the doorway never opens. (Any code fences in *this template* are illustrative only.)
<<~/ahu >>

<<~ ahu #writing-law >>
## Writing Law

- **Heading-naming law.** A visible heading carries the *name of the thing*, never the structural ahu id. The `#card` section's heading renders the **Power-Instance name** — the projected module's `caption`, or the instance's own name when the card projects an instance — never a label like "Card". The ahu id stays `#card`; the heading carries the name.
- **Generative target.** Author the heading to pull the name, so any Power auto-titles its own card. The TW5 form transcludes the projected module's caption with an instance-name override:

```text
## <$transclude $tiddler=<<instance>> $field="name"><$transclude $tiddler=<<module>> $field="caption"/></$transclude>
```

  In file-first authoring today, write the literal Power name as the `#card` heading; the transclusion form is the render target the surface grows into.
- **Render-fence law.** Anything meant to render — `<<tag-pill>>`, transclusions, widgets — stays live wikitext, never inside a code fence. Reserve fences for things shown *as text* (TOML data, literal source quotes, illustrative examples).
- Use imperative, playable wording. Keep reminders short.
- Do not duplicate witness text. Do not explain projection architecture.
- If the card needs more than one screen during play, push detail back to the module or a variant.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power family:template role:see >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/procedures/tag-pill >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
