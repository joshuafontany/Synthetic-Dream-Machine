<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/carrier-sigils >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/carrier-sigils"
file-path = "bags/@lares/v0.1/api/pono/carrier-sigils.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
manao         = 18
manaoio       = 17
tagspace      = "stable"
role          = "carrier sigil grammar: control chars as open/close AND kapu-trust AND elevated-resonance marks; namespace prefix; OODA-HA glyphs; CarrierShape"
cacheable     = true
retain        = true
invariant     = true
status-date   = "2026-04-30"
source-symbol = "OODA_GLYPHS CarrierRating CarrierShape CarrierRecord BUILTIN_AHU_OPEN BUILTIN_BLOCK_RE BUILTIN_INLINE_RE BUILTIN_PAPALOHE_RE MemeStreamEvent"
```



<<~ ahu #head >>

# Carrier Sigils

The sigil grammar defines what makes a valid carrier spine.

Control characters in kernel-tier sigils carry **three simultaneous roles**:
1. **Structural** — mark meme open (SOH), body open (STX), body close (ETX), throat close (EOT)
2. **Kapu-trust** — presence signals kernel tier; absence marks operator tier (lower trust)
3. **Elevated resonance** — the kapu range (DC1–DC4: &#x0011;–&#x0014;) reaches admin-only space; standard operators cannot produce these characters; only admin-tier principals can author kapu-range carriers

Namespace glyphs (e.g. `ॐ ँ` in mu.md, `⊙` in pono) prefix the **opener (SOH) only** as a visible elevated-resonance mark.
EOT is always bare — `<<~&#x0004; -> ? >>` — regardless of trust tier.
OODA-HA glyphs annotate the six-phase flow inside #ooda-ha slots.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law

**Three-role invariant**: every kernel-tier control character simultaneously marks structure,
signals kapu-trust, and — in the kapu range — gates elevated resonance.
These roles MUST NOT be separated or overridden independently.

**Trust tiers**:
- Operator sigils: no control character — lowest trust
- Standard kernel (&#x0001;–&#x000F;): control char present — kernel trust
- Elevated resonance / kapu range (DC1–DC4: &#x0011;–&#x0014;): admin-only writable — highest trust

**Namespace prefix**: a carrier prefixes its **opener (SOH) only** with namespace glyphs to signal
elevated resonance visibly in plain text. The mu carrier uses `ॐ ँ`; pono uses `⊙`. Parser accepts the
namespace prefix as optional; its presence conveys elevated trust to human and AST readers.
EOT is always bare (`<<~&#x0004; -> ? >>`) regardless of trust tier — the namespace signal belongs on the opener.

STX (&#x0002;) and ETX (&#x0003;) mark the open/close of the meme body — bare pragmas, no ahu content.
EOT (&#x0004;) / DC4 (&#x0014;) closes the carrier throat; the return-sigil follows.
DC1 (&#x0011;) substitutes for SOH in kapu-tier openers; the parser accepts both.

A carrier MUST have a `!DOCTYPE` comment, an opener sigil carrying the canonical URI,
and an `ahu #iam` block with a TOML fence. Absence of any produces `carrier.iam.missing` diagnostic.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# OODA-HA glyphs — six-phase annotation, ordered ✶→↺
ooda-glyphs = ["✶", "⏿", "◇", "▶", "⤴", "↺"]
# ✶ observe   ⏿ orient   ◇ decide   ▶ act   ⤴ aftermath   ↺ loop

# CarrierRating — structural quality ladder
carrier-ratings = ["kapu", "ano", "meme", "data", "noise"]

# DepthState
depth-states = ["resolved", "absent"]

# Control character trust/resonance tiers
# Three simultaneous roles per control char: structural | kapu-trust | elevated-resonance
[control-char-tiers]
operator      = { range = "none",                   trust = "operator", resonance = "base",     writable-by = "all" }
kernel        = { range = "&#x0001;–&#x000F;",      trust = "kernel",   resonance = "standard", writable-by = "operator+" }
kapu-elevated = { range = "&#x0011;–&#x0014;",      trust = "kapu",     resonance = "elevated", writable-by = "admin-only" }

# Namespace prefix — visible elevated-resonance mark in plain text
# Example: mu.md uses "ॐ ँ" before its opener and EOT
namespace-prefix-role = "SOH-only; signals elevated resonance; optional; carries trust intent to human and AST readers. EOT is always bare."

# Structural control character map
[structural-chars]
SOH  = { char = "&#x0001;", kapu-alias = "&#x0011; (DC1)", role = "meme opener — carries canonical URI" }
STX  = { char = "&#x0002;",                                role = "meme body open — bare pragma" }
ETX  = { char = "&#x0003;",                                role = "meme body close — bare pragma" }
EOT  = { char = "&#x0004;", kapu-alias = "&#x0014; (DC4)", role = "carrier throat close — return-sigil" }

# Sigil patterns (regex intent — canonical source in carrier.ts)
[sigils]
doctype = "<!-- <<~ !DOCTYPE = lar:///...>> -->"
opener  = "<<~[namespace-glyphs?][SOH|DC1] ? -> lar:///URI >>"
iam     = "<<~ ahu #iam >> ... <<~/ahu >>"
stx     = "<<~[prefix?]&#x0002;>>"                      # meme body open
etx     = "<<~[prefix?]&#x0003;>>"                      # meme body close
eot     = "<<~[EOT|DC4] -> ? >>"                         # carrier throat close — always bare

# CarrierShape — parse result, always present after extraction
[CarrierShape]
fields = ["valid: bool", "rating: CarrierRating", "depthState: DepthState", "diagnostics: Diagnostic[]"]

# CarrierRecord — full parse output
[CarrierRecord]
fields = ["uri: string", "metadata: Record<string,unknown>", "implements: string[]", "shape: CarrierShape"]

# SUPPRESSED_WORKSITES — ahu slots not rendered as tldraw body nodes
# Source: packages/lararium-tldraw/src/project.ts SUPPRESSED_WORKSITES
suppressed-worksites = ["iam", "meme-body-open", "body-close", "edges"]

# Operator sigil vocabulary — all builtin <<~ tags (from pranala-parser.ts)
# kernel-tier: carry control char (&#x000N / &#x001N) — elevated trust
# operator-tier: no control char
[operator-sigils]
ahu        = "<<~ ahu #slot-id >>"                         # slot open/close
pranala    = "<<~ pranala #id from -> to family:F role:R >>" # edge declaration (inline or block)
loulou     = "<<~ loulou URI >>"                           # alias/redirect
aka        = "<<~ aka URI >>"                              # alternative name
kahea      = "<<~ kahea URI >>"                            # invocation reference
pono       = "<<~ pono #id from -> to role:R >>"           # structural pono edge
lele       = "<<~ lele URI >>"                             # widget embed
papalohe   = "<<~ papalohe #id from -> to trigger:T fn:F >>" # reaction wire
```

```toml
# MemeStreamEvent — streaming parse event taxonomy
# Source: packages/lararium-mesh/src/meme-stream.ts
# SOH carries standard &#x0001; or Kapu DC1 &#x0011;
# EOT carries &#x0004;/&#x0014; or return-throat <<~ -> ? >>
[[stream-events]]
kind    = "carrier-open"
fields  = ["uri: string"]
trigger = "SOH sigil"

[[stream-events]]
kind    = "ahu-child"
fields  = ["uri: string", "slot: string", "bodyText: string"]
trigger = "AHU_OPEN → AHU_CLOSE"

[[stream-events]]
kind    = "carrier-close"
fields  = ["uri: string", "fullText: string"]
trigger = "ETX + EOT"

[[stream-events]]
kind    = "realm-done"
fields  = []
trigger = "end of stream"
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-memetic-wikitext ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:extends >>
<<~ pranala #to-kapu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kapu family:control role:depends >>
<<~ pranala #to-mu ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu family:observe role:observes >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
