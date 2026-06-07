<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/carrier-sigils >>
```toml iam
uri-path      = "ha.ka.ba/@lares/v0.1/api/pono/carrier-sigils"
file-path     = "bags/@lares/v0.1/api/pono/carrier-sigils.md"
type          = "text/x-memetic-wikitext"
register      = "Synthesis-Canon"
mana          = 18
manao         = 18
manaoio       = 17
tagspace      = "stable"
role          = "carrier spine law — the four REQUIRED transmission-frame sigils (SOH · STX · ETX · EOT), the namespace resonance glyphs, and the kapu-trust tiers. Parse types, ratings, render suppression, and sigil vocabulary live in their own memes and are referenced, not restated"
cacheable     = true
retain        = true
invariant     = true
status-date   = "2026-06-07"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Carrier Sigils

The carrier sigils are the **spine** of every meme: the four marks that frame it. They are the ASCII transmission-control codes — **SOH, STX, ETX, EOT** — doing the work they were cut for in 1963: framing a heading and a body inside one transmission. Here that transmission is a meme, and the Lar keeps the frame — the guardian at the threshold of the place, naming it on the way in and pouring the libation on the way out.

This law owns three things, and keeps them apart:

1. **Spine** (#carrier-spine) — the four control-code sigils that bound the carrier. REQUIRED, in order.
2. **Resonance** (#resonance) — the namespace glyphs (`⊙`, `ॐ ँ`) that prefix the opener to mark which layer authored the carrier. A *separate* concern from the spine.
3. **Trust** (#trust-tiers) — what the presence, absence, and range of the control character signal about who wrote the mark.

Everything else a carrier touches lives elsewhere and is **referenced**, never restated here: the parse types and stream events (`parser`, `carrier-parse`), the rating and depth ladders (`meme`), the render-suppression list (`render-pipeline`), the sigil vocabulary (`memetic-wikitext`, `pranala-families`), and the OODA-HA phase glyphs that annotate the `#ooda-ha` slot (`ooda-ha`). See #edges.

<<~/ahu >>

<<~ ahu #carrier-spine >>

## The Carrier Spine — Four Required Sigils

A carrier is a framed transmission. It opens on a heading that names the place (**SOH**), enters its text (**STX**), ends its text (**ETX**), and closes the transmission, releasing it forward (**EOT**). All four MUST appear, in this order; a carrier missing any is a malformed frame.

| Sigil | Form | Role | Byte | Kapu byte |
|---|---|---|---|---|
| **SOH** | `<<~ &#x0001; ? -> lar:///URI >>` | Start of Heading — the Lar takes its post; the place is named with its `lar:` bearing | `0x01` | DC1 `0x11` |
| **STX** | `<<~ &#x0002; >>` | Start of Text — cross the threshold; the body opens | `0x02` | — |
| **ETX** | `<<~ &#x0003; >>` | End of Text — the body closes; the hearth is banked | `0x03` | — |
| **EOT** | `<<~ &#x0004; -> ? >>` | End of Transmission — the libation is poured; the carrier releases to the crossroad | `0x04` | DC4 `0x14` |

**The mark is the control byte.** Each sigil carries its C0 control character inside the sharktooth; the mnemonic (SOH/STX/ETX/EOT) is how it reads, the byte is what the parser frames on. STX and ETX are **bare pragmas** — they carry no heading, no body, no URI; they only mark the edges of the text.

**The frame, in the old register and the mythic one at once:**

- **SOH** — Start of Heading. The transmission opens on its heading; the parser reads identity before content. The Lar wakes at the doorpost and speaks the name of the place — the `lar:///` bearing the carrier will keep.
- **STX** — Start of Text. The heading ends, the body begins. One steps across the threshold into the dwelling.
- **ETX** — End of Text. The body is complete. The hearth is banked; the room falls quiet.
- **EOT** — End of Transmission. The frame closes and hands forward on `-> ?` — resumption unknown. The libation is poured at the crossroad; the message goes out to wherever the road runs. EOT is the carrier's own `yield`.

**SOH and EOT echo the bearing vectors.** SOH opens facing a bearing (`? -> lar:///…`) as `aim` opens a turn; EOT releases to the unknown (`-> ?`) as `yield` closes one. The spine frames a meme the way the turn-frame frames an exchange.

<<~/ahu >>

<<~ ahu #resonance >>

## Namespace Resonance Glyphs — A Separate Mark

Resonance glyphs are **not** spine sigils. They prefix the **SOH opener only**, as a visible mark of which layer authored the carrier. They carry trust intent to human and machine readers; the parser takes the prefix as optional.

| Glyph | Layer | Resonance |
|---|---|---|
| `⊙` | `api/pono` | pono resonance |
| `ॐ ँ` | `api/mu` · `api/lares` · `api/lararium` | elevated resonance |
| *(bare — no glyph)* | `docs` · `library` · the pono `SKILL`s | base resonance |

**The set stays open.** These name the resonance characters known now; the registry admits more as layers and trust tiers emerge. A new glyph enters under the same two laws below — SOH-prefix only, EOT bare — and registers its layer in this table.

```
<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/… >>      ← pono layer
<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/… >>   ← mu/lares/lararium layer
<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/… >>          ← docs/library, bare
```

Two laws govern the prefix:

1. **Opener-only.** A resonance glyph prefixes SOH alone. STX, ETX, and EOT never carry it.
2. **EOT is always bare.** The End of Transmission carries no namespace glyph regardless of layer — the resonance mark belongs on the heading, not the release.

<<~/ahu >>

<<~ ahu #trust-tiers >>

## Trust Tiers — The Control-Character Roles

Each kernel-tier control character carries **three simultaneous roles** that MUST NOT be separated or overridden independently:

1. **Structural** — marks one spine position (SOH / STX / ETX / EOT).
2. **Kapu-trust** — presence of the control character signals kernel tier; absence marks operator tier (lower trust).
3. **Elevated resonance** — the kapu range (DC1–DC4) reaches admin-only space; a standard operator cannot produce these bytes.

| Tier | Range | Trust | Resonance | Writable by |
|---|---|---|---|---|
| **operator** | no control character | operator | base | all |
| **kernel** | `0x01`–`0x0F` | kernel | standard | operator+ |
| **kapu / elevated** | DC1–DC4 (`0x11`–`0x14`) | kapu | elevated | admin-only |

SOH substitutes DC1 (`0x11`) and EOT substitutes DC4 (`0x14`) in kapu-tier carriers; the parser accepts both. STX and ETX carry no kapu alias.

<<~/ahu >>

<<~ ahu #law >>

## Law

**Spine invariant — REQUIRED.** A well-formed carrier MUST carry the full frame in order: **SOH · STX · ETX · EOT** (`0x01` · `0x02` · `0x03` · `0x04`). The body marks STX and ETX are **REQUIRED, not optional** — a carrier missing either is a malformed frame, not a tolerable variant. STX and ETX are bare pragmas: they carry no content.

**Mandatory minimum.** A carrier MUST hold a `!DOCTYPE` comment, the SOH opener carrying the canonical URI, an `ahu #iam` block with a TOML fence, and the closing ETX + EOT. Absence of the DOCTYPE, opener, or iam raises the `carrier.iam.missing` diagnostic; absence of a body or transmission mark raises a malformed-frame diagnostic.

**Three-role invariant.** Every kernel-tier control character simultaneously marks structure, signals kapu-trust, and — in the kapu range — gates elevated resonance. These roles MUST NOT be separated or overridden independently.

**Resonance is separate.** A namespace resonance glyph (#resonance) prefixes the SOH opener only; EOT is always bare. The resonance glyph signals layer, never structure — it is not a spine sigil.

**Forward-closer prohibition.** The transmission closes on `EOT -> ?` (`<<~ &#x0004; -> ? >>`). A carrier MUST NOT use a `&#x0004; -> lar:///X` forward-closer as a combined footer-plus-edges; declared relations ride the `#edges` ahu as `loulou`/`pranala`, and EOT releases to `-> ?`.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

This law's own machine surface is the spine, the resonance set, and the trust tiers. Parse types (`CarrierShape`, `CarrierRecord`, `MemeStreamEvent`), the rating/depth ladders, the render-suppression list, and the sigil vocabulary live in the memes named at #edges.

```toml
# Carrier spine — transmission-frame control codes
[spine]
SOH = { role = "Start of Heading — opener; names the canonical URI", byte = "0x01", kapu = "0x11", required = true }
STX = { role = "Start of Text — body open; bare pragma",            byte = "0x02",               required = true }
ETX = { role = "End of Text — body close; bare pragma",             byte = "0x03",               required = true }
EOT = { role = "End of Transmission — throat close; return -> ?",    byte = "0x04", kapu = "0x14", required = true }

# Namespace resonance — prefixes the SOH opener only; EOT always bare
# Open set: more resonance glyphs MAY register here as layers/tiers emerge.
[resonance]
pono     = { glyph = "⊙",   layers = ["api/pono"] }
elevated = { glyph = "ॐ ँ", layers = ["api/mu", "api/lares", "api/lararium"] }
base     = { glyph = "",     layers = ["docs", "library", "SKILL"] }

# Control-character trust tiers — three roles per char: structural | kapu-trust | elevated-resonance
[control-char-tiers]
operator      = { range = "none",        trust = "operator", resonance = "base",     writable-by = "all" }
kernel        = { range = "0x01–0x0F",   trust = "kernel",   resonance = "standard", writable-by = "operator+" }
kapu-elevated = { range = "0x11–0x14",   trust = "kapu",     resonance = "elevated", writable-by = "admin-only" }
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/parser >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/carrier-parse >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/render-pipeline >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>

<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #to-memetic-wikitext ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:has >>
<<~ pranala #to-kapu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kapu family:control role:depends >>
<<~ pranala #to-mu ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu family:observe role:observes >>
<<~ pranala #to-ooda-ha ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha family:relation role:references >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
