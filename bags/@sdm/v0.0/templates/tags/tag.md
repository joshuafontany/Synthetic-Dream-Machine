<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/tags/tag >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/templates/tags/tag"
file-path = "bags/@sdm/v0.0/templates/tags/tag.md"
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
role = "template meme for addressed SDM tag spirits"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Tag Template

<<~ ahu #intent >>
## Intent

A tag meme gives one TW5 title-tag an address, facet, aliases, and overload warning.

Use native TW5 title links for author-facing tag surfaces:

```text
[[lar:///ha.ka.ba/@sdm/tags/domain/stuckforce]]
```

A filter may query the title directly or use planned sugar:

```text
[tag[lar:///ha.ka.ba/@sdm/tags/domain/stuckforce]]
[tag:@sdm[domain/stuckforce]]
```
<<~/ahu >>

<<~ ahu #shape >>
## Shape

```toml tag
slug = "domain/stuckforce"
facet = "domain"
status = "proposed"
label = "Stuckforce"
aliases = ["stuckforce"]
source_vocab = ["SDM Powers Index", "Appendix Null"]
overload_risk = []
```

Do not mirror ordinary tag membership as Pranala edges. The TW5 `tags` field indexes title-tags. Use Pranala for structural relations such as `control:implements`. If a category begins to behave like an interface, retire the tag alias and promote the relation into an addressed interface meme.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
