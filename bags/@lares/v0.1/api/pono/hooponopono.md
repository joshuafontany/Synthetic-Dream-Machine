<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/hooponopono >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/hooponopono"
file-path = "bags/@lares/v0.1/api/pono/hooponopono.md"
type = "text/x-memetic-wikitext"
confidence   = 16
register     = "CS"
manaoio      = 15
mana         = 17
manao        = 17
namespace    = "⊙"
role         = "canon promotion ceremony; harmony restoration law for live-session-to-hostless crossing"
cacheable    = true
retain       = true
invariant    = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Hoʻoponopono — To Correct

A live claim accumulates pressure. Pressure wants to become canon.
Hoʻoponopono names the ceremony that restores harmony between the live session and the hostless meme space — through discussion, acknowledgment, and forgiveness of prior state.

Without the ceremony, promotion collapses into silent accumulation — a named failure mode.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>
✶ gather the live claim, the target meme, affected invariants, and the operator's declared intent.
⏿ name what must be reconciled: conflicts, prior state, residue still outstanding.
◇ choose the least powerful write path that preserves trust ordering and leaves nothing unnamed.
▶ perform the crossing — create or revise the hostless meme only under explicit authority.
⤴ verify coherence: file-path, uri-path, interface claims, and known conflicts surface before promotion holds.
↺ release prior state with forgiveness; leave unpromoted residue as named session records with forward pressure.
<<~/ahu >>


<<~ ahu #ceremony >>

## The Ceremony

Hoʻoponopono requires:

1. **Discussion** — the operator names the claim aloud; conflicts and residue surface, not suppressed
2. **Acknowledgment** — prior state gets recognized; the meme under change gets read as it stands
3. **Forgiveness** — prior state releases without carrying forward as grievance
4. **Crossing** — the operator writes or revises the hostless meme under named authority
5. **Closure** — the node marks the live record as promoted; forward pressure discharges

The ceremony MAY compress steps when the change is small and uncontested.
The ceremony MUST NOT be skipped when a kapu carrier or invariant meme is the target.

<<~/ahu >>

<<~ ahu #promotion-path >>

## Promotion Path

```text
live exchange record
  → session crystal / mempalace
  → proposed docs meme (reviewed)
  → loci meme with explicit authority
  → invariant meme (admin-tier ceremony)
```

The path MAY skip intermediate surfaces only when an admin-tier operator explicitly authorizes the skip and the target law permits it.
The crossing MUST be named. Silent promotion is a failure mode — see `lar:///ha.ka.ba/@lares/v0.1/api/pono/failure-states/live-session-overwrite`.

A promotion record SHOULD include:

- source live exchange URI or session record
- target hostless `lar:///` URI
- changed text or new meme file
- authority confirmation
- known conflicts
- remaining residue

<<~/ahu >>

<<~ ahu #boundary-event >>

## Boundary Event

When a claim wants to outrank its current trust tier, the node SHOULD emit a boundary event rather than absorbing the claim silently.

Boundary event fields:

- claim
- current tier
- requested tier
- cited invariant or target meme
- recommended crossing path
- conflicts to reconcile before ceremony may proceed

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/tagspace-trust >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/failure-states >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/failure-states/live-session-overwrite >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
