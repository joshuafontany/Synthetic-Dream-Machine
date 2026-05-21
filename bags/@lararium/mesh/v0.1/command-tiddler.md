<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/command-tiddler >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/command-tiddler"
file-path    = "bags/@lararium/mesh/v0.1/command-tiddler.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.82
mana         = 0.80
role         = "contract for command records that carry ceremony intent through the mesh"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# Command Tiddler

Mesh-native command record for operator ceremonies.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

A command tiddler carries durable operator intent through the admin lane and across the causal mesh.
It gives CLI, browser UX, and other local tools one shared ceremony vocabulary.

Command tiddlers should carry enough structure to support:

- local capability intake
- VM-local planning and apply
- durable receipt linkage
- replay protection and audit

<<~/ahu >>

<<~ ahu #fields >>

## Minimum Fields

- `id`: command `lar:` URI
- `kind`: ceremony path such as `/canon/promote`
- `issuer`: peer or device `lar:` URI that authored the command
- `audience`: intended executor surface or lane
- `target`: one or more `lar:` URIs that the command names
- `nonce`: replay guard
- `status`: draft, queued, running, applied, rejected, or superseded

Recommended fields when authority or ordering matters:

- `proofs`
- `nbf`
- `exp`
- `epoch`
- `offset`
- `session`
- `text`

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### CT-1 — Commands stay records, not transport payloads

Transport envelopes may carry command tiddlers. Transport does not replace the command record as the durable ceremony artifact.

### CT-2 — One command vocabulary across UX surfaces

CLI, browser UX, and other operator tools should author the same command shapes.
Presentation may differ. Record law does not.

### CT-3 — Command intake happens in the admin lane

The admin VM lane should receive, validate, and route command records before wiki-lane or edge work begins.

### CT-4 — Commands link forward to receipts

Every command path should allow durable receipt linkage for accept, reject, apply, partial, or deferred outcomes.

### CT-5 — Commands name intent, not implementation trivia

Command records should say what ceremony the operator requested and what targets it names.
They should avoid baking transport or runtime-specific implementation details into the command meaning.

<<~/ahu >>

<<~ ahu #example >>

## Example Shape

```json
{
	"id": "lar:///ha.ka.ba/@lares/commands/promote/2026-05-19/request-001",
	"kind": "/canon/promote",
	"issuer": "lar:///ha.ka.ba/@operators/joshu/device/local-cli",
	"audience": "lar:///ha.ka.ba/@operators/joshu/admin-lane",
	"target": ["lar:///ha.ka.ba/docs/lares/the-lares-protocols"],
	"proofs": ["lar:///ha.ka.ba/@operators/joshu/proofs/promote-001"],
	"nonce": "nonce-001",
	"status": "queued",
	"text": "Promote protocols into canonical @lares bag"
}
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lares/api/v0.1/lararium/save-path >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
<<~/ahu >>
