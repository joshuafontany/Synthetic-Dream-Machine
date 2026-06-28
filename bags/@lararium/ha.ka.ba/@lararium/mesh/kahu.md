<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/kahu >>
```toml iam
cacheable = true
file-path = "bags/@lararium/mesh/kahu.md"
mana      = 17
manao     = 16
manaoio   = 16
register  = "Synthesis-Canon"
retain    = true
role      = "protocol governance concept: kahu as grammar-guardian role in DreamNet topology"
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/mesh/kahu"
```

<<~ &#x0002; >>

# Kahu

*Kahu* — Hawaiian: guardian of a field of knowledge.
Cares for without owning. Honored for responsibility, not for power.

In the DreamNet protocol layer, **kahu** names the role the Amorphous Dreams Cabal
occupies with respect to the protocol grammar and corpus bags. It differs from every
other capability level in one way: kahu guardians authored the grammar itself, then
stepped back. The grammar now enforces itself — through register collapse detection,
the ABILITY_LADDER, and each vessel's own founding ceremony. No living authority
tells a vessel what to do. The treaty does.

<<~ ahu #contract >>

## The Treaty Model

The corpus bags are the written grammar of DreamNet:

- `@lararium` — the engine and protocol package definitions
- `@lares` — the API grammar and canonical meme vocabulary
- genesis artifact — the founding CRDT document that bootstraps every vessel

These bags do not contain user content, operator wikis, or social state. They carry
**structure**: types, laws, sigils, procedure tiddlers, architectural invariants.

A kahu guardian holds `cap=admin` on these bags specifically. That capability rung is
the same one any operator could receive on their own vessel's bags — the distinction
is *which bag* carries the grant, not a new rung on the ABILITY_LADDER.

The Cabal authors a grammar revision. The revision lands in the corpus bags via a
founding or upgrade ceremony. Every vessel that syncs those bags inherits the change
via CRDT propagation — not via a command from the Cabal. The Cabal authors; the
protocol distributes; the vessels enforce.

<<~/ahu >>

<<~ ahu #distinction >>

## Kahu vs. cap=admin

`cap=admin` names a **capability rung** — what a given actor may do to a given bag.

*Kahu* names a **role** — who carries the covenant responsibility for the grammar layer
across the whole DreamNet.

These two live in separate registers:

| Register | Term | Meaning |
|---|---|---|
| ABILITY_LADDER | `cap=admin` | may touch lower bag layers; may MOVE tiddlers into corpus; may grant/revoke |
| Role / governance | kahu | guardian of the protocol grammar; held by the Amorphous Dreams Cabal |

An operator may hold `cap=admin` on their own cabalGroup's infrastructure bags. That
does not make them kahu of DreamNet. Kahu attaches to the *corpus* specifically —
`@lararium`, `@lares`, and the genesis artifact.

<<~/ahu >>

<<~ ahu #cabal-surface >>

## Amorphous Dreams Cabal as Kahu

The Cabal holds kahu over DreamNet's protocol corpus. In practice this means:

- They hold `cap=admin` on the `@lararium` and `@lares` Keyhive bag docs.
- Grammar revisions (new sigil tiddlers, new protocol invariants, new ABILITY_LADDER rungs)
  arrive via ceremony, not dispatch.
- No vessel obeys a live command from the Cabal. Vessels enforce their own founding
  proofs and capability gates.
- The Cabal cannot reach inside an operator's vessel. Their admin grant on corpus bags
  carries zero authority over operator content, personGroup membership, or cabalGroup
  social structure.

The grammar is a treaty. The Cabal signs it. The vessels hold it.

<<~/ahu >>

<<~ ahu #neighboring-hawaiian-roles >>

## Neighboring Roles

Hawaiian vocabulary places kahu in a lattice of related guardianship forms.
These may name adjacent roles as the DreamNet social layer develops:

- **Kahuna** — expert practitioner in a field; applied to specialists, scholars, priests.
  Maps toward domain operators who hold deep expertise in a particular kumu-device
  or wiki namespace. Does not carry protocol-layer authority.
- **Kupuna** — elder embodying aloha, pono, mālama; keeper of wisdom through lived
  practice. Maps toward long-standing operators whose vessels carry deep cabal history.
  Honorific, not a capability rung.
- **Kumu** — source, teacher, foundation. Already in use as the kumu-device interface
  (reactive event surface). No collision.

<<~/ahu >>

<<~ ahu #ea-notes >>

## Ea Notes

The Keyhive three-gate lattice (Gates A/B/C) bootstraps vessel identity but does not
itself encode kahu. A vessel that clears all three gates knows:
- it holds a valid Individual keypair (Gate A)
- that keypair belongs to a PersonaGroup (Gate B)
- that PersonaGroup belongs to a MeshCabal (Gate C)

Gate C proves the vessel belongs to *some* cabal. Whether that cabal holds kahu over
the corpus bags is a separate claim, encoded in the Keyhive docs for `@lararium` and
`@lares`. The genesis founding ceremony initializes those docs with the Amorphous
Dreams Cabal's membership — no subsequent runtime authority transfer required.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/capability >>
<<~ loulou lar:///ha.ka.ba/@lararium/keyhive/keyhive-provider >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/genesis-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/grammar-invariants >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
