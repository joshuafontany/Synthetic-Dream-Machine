<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@sdm/templates/projections/powers/ftls-card >>
```toml iam
cacheable = true
file-path = "bags/@sdm/ha.ka.ba/@sdm/templates/projections/powers/ftls-card.md"
mana      = 14
manao     = 17
manaoio   = 15
register  = "Synthesis-Canon"
retain    = true
role      = "root template meme for FTLS Power card projection memes — playable surface with clickable component pills"
l-space   = "sdm"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@sdm/templates/projections/powers/ftls-card"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

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
#components  one kahea call; pills come from the card's lar: URI tags
#edges       #projects back to module, #template
```

**Composition is declared once, as tags.** The card's `toml iam` carries a `tags` field that mirrors the module's `#has` — the full lar: URI of each component and mount-point (every meme's title is its lar URI; tags reference titles). The `#components` section then holds a single call:

`<<~ kahea lar:///ha.ka.ba/@lararium/lists/components >>`

That procedure reads the current tiddler's `@`-prefixed tags and renders each as a clickable `tag-pill`. No hand-listing — add or drop a tag in `iam` and the pill row follows. On screen each pill clicks through to its component tiddler and a filter of every module that shares it.

**Live, never fenced.** The kahea call is live wikitext so it renders; a fenced call renders as dead literal text and the doorway never opens. (Any code fences in *this template* are illustrative only.)

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

<<~ loulou lar:///ha.ka.ba/@sdm/templates/modules/power >>
<<~ loulou lar:///ha.ka.ba/@sdm/procedures/tag-pill >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
