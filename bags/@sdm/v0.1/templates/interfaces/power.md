<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/interfaces/power >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/templates/interfaces/power"
file-path = "bags/@sdm/v0.1/templates/interfaces/power.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 14
manao = 17
manaoio = 15
cacheable = true
retain = true
invariant = false
role = "root template meme for reusable Power interface contracts"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Power Interface Template

<<~ ahu #intent >>
## Intent

A Power interface meme carries the reusable affordance contract that implementations satisfy.

Use this template when a spell, rite, relic, trait, shrine, daemon, burden, or oldtech pattern needs a named primitive separate from one source implementation.
<<~/ahu >>

<<~ ahu #required-shape >>
## Required Shape

A Power interface meme carries these ahu:

```text
#interface          neutral contract for the playable noospheric affordance
#hooks              scratch worksite for session-surface hooks, filters, notices, and adapters
#edges              implementations and related interfaces
#residue            open design questions, not hidden assumptions
```

`#interface` SHOULD begin with a `toml contract` block. Use plain contract vocabulary with local-first, web3 dreamnet flavor: `operation`, `authz`, `scope`, `inputs`, `requires`, `effects`, `maintains`, `ends_when`, `refuses`, and `emits`.

`authz` names capability notes: what grants permission for the pattern to unfold. It MUST NOT class-gate through `caller` or `caster` fields.

Runtime sigil names such as `kahea`, `papalohe`, `kukali`, `lele`, `hui`, `holo`, `puka`, and `hoolele` belong to the reaction engine and causal-island layer, not generic contract keys.

Use `#iam.tags` for ordinary TW5 title-tag membership. Do not mirror ordinary tag membership with Pranala edges. Every concrete Power interface SHOULD implement `lar:///ha.ka.ba/@sdm/v0.1/interfaces/power` with a `family:control role:implements` edge; this replaces the retired `kind/power` tag.
<<~/ahu >>

<<~ ahu #conversion-law >>
## Conversion Law

One OSR spell may implement one interface or several. Keep the OSR name when it already names a stable primitive. Rename the interface when the source name collides with gear, item, broad effect, or multiple bundled primitives.

Examples:

- `Read Magic` can safely name the interface while the primitive remains small.
- `Shield` converts to `Shield Ward` because `Shield` must remain available for gear and general defense-effect language.
- `Floating Disc` can safely name the interface for now; if more implementations arrive, `Stuckforce Platform` may become the deeper operation name.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/interfaces/power family:template role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/api/power family:template role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
