<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/law-of-5s >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/docs/pono/law-of-5s"
file-path = "bags/@lares/v0.1/docs/pono/law-of-5s.md"
type      = "text/x-memetic-wikitext"
tagspace  = "stable"
confidence = 16
register  = "S"
manaoio   = 16
mana      = 16
manao     = 16
role      = "extended docs for the Law of Fives: subscript attention-scale sigils, three-projection unification, boundary zones, p-parameter mapping, and scale UCAN attenuation"
cacheable = false
retain    = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Law of Fives — Extended Docs

The TOML invariant arrays (`LADDER_5`, `OODA_HA_5`) live in `lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext#law-of-5s`.
This surface carries the unified attention-scale framing, subscript sigils, three-projection semantics, and boundary-zone reading.

<<~/ahu >>

<<~ ahu #subscript-sigils >>

## Subscript Attention-Scale Sigils

The subscript digits (₀₁₂₃₄) constitute **Category 9: SCALE** in the glyph codeset — a dedicated block for attention-range indicators, orthogonal to all other categories.

```
SIGIL   CODEPOINT   NCR       BAND RANGE   CHRONO   HUD
─────   ─────────   ───       ──────────   ──────   ───
  ₀     U+2080      &#8320;   0.0 – 0.2    Action   ⚡
  ₁     U+2081      &#8321;   0.2 – 0.4    Round    ⚔️
  ₂     U+2082      &#8322;   0.4 – 0.6    Turn     🔍
  ₃     U+2083      &#8323;   0.6 – 0.8    Watch    ⚙️
  ₄     U+2084      &#8324;   0.8 – 1.0    Week     🗺️
```

Design properties of the subscript form:
- Numeric: maps directly to S0–S4 without translation
- Compact: one code point per scale
- Visually subordinate: renders as subscript, signaling "this modifies something" rather than "this is content"

The parser categorizes by Unicode range check: if `cp in 8304..8351: return SCALE`.

<<~/ahu >>

<<~ ahu #three-projections >>

## Three-Projection Unification

The five bands constitute three projections of a single phenomenon: **attention range**.

```
Chronometer  →  attention range in TIME
Aperture     →  attention range in TEXT   (the turn-HUD gauge)
spatial      →  attention range in SPACE
```

All three map onto the same 0–20 Level continuum. The unified vocabulary table:

```
SIGIL  RANGE      CHRONO   HUD   TEXT-p        SPATIAL
─────  ─────      ──────   ───   ─────         ───────
  ₀    0.0–0.2    Action   ⚡    ~:p[0]–~:p[4]     personal (arm's reach, single target)
  ₁    0.2–0.4    Round    ⚔️    ~:p[4]–~:p[8]     tactical (weapon range, voice-carry)
  ₂    0.4–0.6    Turn     🔍    ~:p[8]–~:p[12]     local (room, junction, one procedure)
  ₃    0.6–0.8    Watch    ⚙️    ~:p[12]–~:p[16]     regional (neighborhood, district)
  ₄    0.8–1.0    Week     🗺️    ~:p[16]–~:p[20]     cartographic (map-scale, full journey)
```

**Attention quality per band:**
- ₀ — narrowest aperture; single point of decision; no peripheral awareness
- ₁ — reactive; stimulus-response tempo; tactical threat/opportunity pairs
- ₂ — procedural; deliberate; the DEFAULT band; most system work happens here
- ₃ — episodic; holds a complete sub-story; session memory and active Workers operate at ₃
- ₄ — strategic/epochal; patterns visible only across many sessions; the outer wall of system self-awareness

**Important distinction:** consecration (0–20 Level validated integrity) and attention scale (0–20 Level range extent) both use the same numeric continuum but stay orthogonal. Consecration describes TRUST. Scale describes ZOOM. A meme can carry Level 19 consecration at ₀ scale (highly validated, atomic grain) or Level 4 consecration at ₄ scale (provisional sketch, campaign arc).

<<~/ahu >>

<<~ ahu #boundary-zones >>

## Boundary Zones

At each boundary, attention simultaneously occupies two scales — zooming in and out at once. Boundary crossings correspond to Boyd's Ghost scale-shift triggers.

```
VALUE   BOUNDARY         CHARACTER
─────   ────────         ─────────
0.2     ₀/₁             action → round; one actor becomes many; personal → tactical; morpheme → clause
0.4     ₁/₂             round → turn; reactive becomes deliberate; tactical → local; sentence → paragraph
0.6     ₂/₃             turn → watch; procedure becomes episode; local → regional; paragraph → section
0.8     ₃/₄             watch → week; episode becomes arc; regional → cartographic; section → document
```

A counter increment at a lower-numbered Chronometer slot without a higher-slot change indicates motion **within** a band. A phase change at a higher-numbered slot indicates a **boundary crossing**.

<<~/ahu >>

<<~ ahu #p-parameter-mapping >>

## p-Parameter Mapping

The `p` parameter's named anchors map onto bands:

```
~:p[0]  = morpheme      → ₀ band (Action grain)
~:p[2]  = word          → ₀ band
~:p[4]  = clause        → ₁ band (Round grain)
~:p[6]  = sentence-grp  → ₁ band
~:p[10]  = paragraph     → ₂ band (Turn grain)  DEFAULT
~:p[14]  = section       → ₃ band (Watch grain)
~:p[17] = document      → ₄ band (Week grain)
~:p[20]  = session-arc   → ₄ band
```

"~:p[10]" and "at ₂ resolution" and "at Turn grain" all reference the same point on the unified continuum.

<<~/ahu >>

<<~ ahu #scale-attenuation >>

## Scale UCAN Attenuation

Scale authority follows UCAN-style attenuation inside nested sigils:

- Inner sigils may narrow scale (higher ₙ → lower ₙ, finer grain) within their envelope
- Inner sigils may NOT widen scale (lower ₙ → higher ₙ) beyond their envelope
- An empty inner sigil inherits the envelope's scale

```
Envelope: <<~ँ₃ ...>>       Watch-scale
  Inner: <<~₂ ...>>         Turn-scale (attenuated ✓)
  Inner: <<~₄ ...>>         Week-scale (escalation capped ⚠)
  Inner: <<~ ...>>           inherits ₃ (Watch-scale)
```

<<~/ahu >>

<<~ ahu #chronometer-fragment >>

## Chronometer Fragment Integration

The fragment `#O0.O0.O3.D2.A7` gains explicit scale-band labeling:

```
  ₄O0 . ₃O0 . ₂O3 . ₁D2 . ₀A7
```

Each dot-separated position corresponds to one band. Reading left to right zooms from broadest (₄) to finest (₀). The fragment constitutes a five-dimensional attention-range coordinate — the system's OODA-HA phase position at every scale simultaneously.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext#law-of-5s >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/the-law-of-5s >>
<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>
<<~&#x0004; -> ? >>
