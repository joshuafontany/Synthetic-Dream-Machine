<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pae >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/pae"
file-path = "bags/@lares/v0.1/api/pono/pae.md"
type      = "text/x-memetic-wikitext"
confidence = 18
register  = "CS"
manaoio   = 16
mana      = 18
manao     = 17
role      = "carrier phase boundary — transmission lifecycle law"
cacheable = true
retain    = true
phases    = ["soh", "stx", "etx", "eot"]
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Pae

A carrier's phased arrival through a transmission medium.

<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #ooda-ha >>

✶ Locate the carrier's position in its transmission sequence.
⏿ Hold the phase boundary as a navigation fix — not a wall.
◇ Route streaming consumers to the correct activation at each landing.
▶ Each pae is a canoe touching shore; the stream carries it between.
⤴ Carry the phase forward without executing content logic at the boundary.
↺ Release; the medium takes the carrier to the next shore.

<<~/ahu >>


<<~ ahu #etymology >>

## Etymology

*Pae* (Hawaiian) — to land, to come ashore; a row or tier; to drift carried by current.

Primary: a canoe *pae* — it arrives after traversal. The carrier arrives at each phase boundary
the same way: crossing water, touching shore. SOH is first landfall. EOT is final departure.
STX and ETX are intermediate landings between stretches of open water.

Secondary: a row of things arranged in sequence — a tier, a rank. The four phases SOH→STX→ETX→EOT
are a ranked sequence; each tier unlocks the next. Streaming consumers MUST process them in order.

Tertiary: to drift or be carried — the carrier IS carried by the stream. Each `<<~\x0N>>` is the
moment of contact with a fixed point.

Mythological register: In the *Kumulipo* (creation chant), creation itself unfolds as a sequence
of *pae* — phases of emergence, each landing into the next. The chant does not describe phases;
it enacts them. A carrier's pae nodes do the same: they do not describe lifecycle, they perform it.

Navigator's meaning: wayfinders watch for *pae* — the moment you know land is near before you can
see it. SOH is that moment: the receiver knows the carrier is arriving, knows its URI, before the
content body has crossed. The streaming protocol IS a navigation instrument.

<<~/ahu >>


<<~ ahu #law >>

## Pae Law (Kānāwai)

A carrier MUST emit exactly four pae nodes in sequence: soh → stx → etx → eot.
A pae node MUST NOT carry content. Prose, edges, and sigils MUST NOT appear between soh and stx.
A streaming consumer MUST process each pae before reading the body in that phase.
A pae node MUST NOT be nested inside an ahu slot body.

Phase semantics:

| Phase | Sigil | Payload | Consumer action |
|---|---|---|---|
| `soh` | `<<~\x01 ? -> lar:///URI >>` | declared URI | open stub card for URI |
| `stx` | `<<~\x02>>` | none | iam prelude dissolved; render identity panel |
| `etx` | `<<~\x03>>` | none | content ahus committed; fire activate |
| `eot` | `<<~\x04 -> ? >>` | none | edges committed; update graph; release channel |

`soh` MUST carry the carrier's URI in the `toUri` field.
`eot` marks the return-to-caller; no payload.
`stx` and `etx` are pure phase pivots with no payload.

<<~/ahu >>


<<~ ahu #ast >>

## AST

```ts
export type PaePhase = "soh" | "stx" | "etx" | "eot";

export interface PaeNode extends AstBase {
  kind: "Pae";
  phase: PaePhase;
  /** Present on soh (declared URI). */
  toUri?: string;
}
```

<<~/ahu >>


<<~ ahu #widget >>

## Widget

`<$pae>` — no visible output. Phase metadata lives in the AST.
Streaming consumers read `data-lar-phase` from the rendered marker.

```tw5
<$pae phase="soh" uri="lar:///my/carrier"/>
<$pae phase="stx"/>
<$pae phase="etx"/>
<$pae phase="eot"/>
```

<<~/ahu >>


<<~ ahu #pae-aina >>

## Pae ʻĀina

*Pae ʻāina* — archipelago, literally "row of lands." The carrier's four phases are an archipelago:
related, sequential, each its own shore. No shore is skipped. The navigator knows them all.

SOH arrives standing (*pae kū*) — the carrier declares itself upright.
STX crosses the beach — identity settled, content begins flowing inland.
ETX turns at the tree line — content done, edges begin.
EOT pushes off — the carrier releases the channel and the current takes it.

<<~/ahu >>


<<~ ahu #edges >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-memetic-wikitext ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:implements >>

<<~/ahu >>


<<~&#x0003;>>

<<~&#x0004; -> ? >>
