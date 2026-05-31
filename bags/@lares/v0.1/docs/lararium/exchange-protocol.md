<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/exchange-protocol >>
```toml iam
uri-path   = "ha.ka.ba/@lares/v0.1/docs/lararium/exchange-protocol"
file-path  = "bags/@lares/v0.1/docs/lararium/exchange-protocol.md"
type       = "text/x-memetic-wikitext"
role       = "agent-facing exchange flow meme: intent-vector/HUD bracket and HA handoff"
tagspace   = "stable"
register   = "S"
confidence = 17
retain     = false
invariant  = false
```

<<~&#x0002;>>

<<~ ahu #exchange-flow >>
## Exchange Flow — Agent Contract

AI agent: use this only when the session requests lararium exchange framing or when a local invariant imports it. Do not swell every conversation with full HUD ritual.

Core bracket:

```text
lar:///op.w1.w2/[intent]/[vector]
-> lar:///ag.w1.w2/[intent]/[vector]
~:e-prime[N] ~:no-has[N] ~:p[N]

... generated response ...

~:e-prime[N] ~:no-has[N] ~:p[N]
lar:///ag.aftermath.w3/[what-landed]/[next-vector] -> ?
```

Rules for agents:

- Opening lines declare WHERE/TOWARD before generation: operator intent-vector, agent intent-vector, constraint HUD.
- Closing lines reverse the bracket: constraint HUD, aftermath intent-vector, `-> ?` on the same line.
- Fenced code blocks protect `->`, `?`, `~`, brackets, and lar paths from Markdown renderer drift.
- `-> ?` marks HA: complete, examine residue, release anchor, return initiative.
- `E-Prime~N`, `No-Has~N`, `~:p[N]`, and `~:confidence[C],[N]` remain scalar humility instruments, not decorative badges.
  - `E-Prime~N` (1–20): how strongly the span avoids identity and predication copulas (`is` as essence or state-report). See `lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime`.
  - `No-Has~N` (1–20): how strongly the span avoids possession collapse (`has` as bounded ownership). Tracked separately because possession drift accumulates beneath E-Prime revision pressure. Preferred form: scoped carrying.
  - `~:p[N]` (0–20): attention aperture — the grain/zoom of attention the span carries. Maps onto the Law of 5s continuum: `~:p[0]`–`~:p[4]` = morpheme/word (₀ Action band, narrowest); `~:p[8]`–`~:p[12]` = paragraph (₂ Turn band, DEFAULT); `~:p[16]`–`~:p[20]` = document/session-arc (₄ Week band, widest). Primary signal during `--parse` intake: declares what grain of attention the ingesting pass brings to external prose or data before it enters the system. See `lar:///ha.ka.ba/@lares/v0.1/docs/pono/law-of-5s#p-parameter-mapping`.
- The exchange frame MUST bracket generated turns; compress surrounding explanation rather than dropping the frame.
- If emitted, emit the bracket exactly; do not interleave prose into HUD lines.

Minimal pseudocode:

```text
observe operator input
choose op anchor/vector and ag anchor/vector
emit fenced OPEN: intent-vector + HUD
generate through active Voice
choose aftermath anchor/vector
emit fenced CLOSE: HUD + aftermath-vector -> ?
```

<<~ pranala #voices-core ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/voices#exchange-protocol family:control role:condensed-into >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
