<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/read-magic >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/interfaces/powers/read-magic"
file-path = "bags/@sdm/v0.0/interfaces/powers/read-magic.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/domain/divination",
  "lar:///ha.ka.ba/@sdm/tags/domain/apocrypha",
  "lar:///ha.ka.ba/@sdm/tags/function/archive",
  "lar:///ha.ka.ba/@sdm/tags/function/ecm-scan",
  "lar:///ha.ka.ba/@sdm/tags/function/magic-decode",
]

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 14
manao = 18
manaoio = 16
cacheable = true
retain = true
invariant = false
role = "Power interface meme: decode magical inscriptions and establish recognition across archive surfaces"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Interface — Read Magic

<<~ ahu #interface >>
## Interface

```toml contract
name = "Read Magic"
operation = "decode-magical-inscription"
authz = [
  "capability-bearing operator, item, daemon, shrine, archive service, rite, or burden",
  "permission comes from fictional grant, not class identity",
  "implementations may name grant source: learned script, memorized spell, archive token, lens, pact, lineage, or owner permission",
]
scope = ["operator attention", "symbolic surface", "archive lineage", "recognition mark"]
inputs = ["P budget", "surface or inscription", "operator attention", "known languages or archive grants"]
requires = [
  "surface carries magical, oldtech, noospheric, or warding notation",
  "operator can inspect the surface through sight, touch, signal, dream, or tool",
]
effects = [
  "reveal active magical meaning",
  "identify instruction, warning, command phrase, trigger, lineage, owner trace, or Power pattern",
  "mark surface, rune-family, spell-pattern, or notation as recognized when the implementation permits it",
]
maintains = ["reading window", "operator attention", "recognition context"]
ends_when = ["duration expires", "surface changes", "veil or owner-lock breaks the read", "operator loses attention"]
refuses = ["class gate", "unbounded omniscience", "safe reading of every hostile archive", "automatic permission to activate the decoded pattern"]
emits = ["observable domain facts for hooks; names remain provisional until browser protocols settle"]
```

`Read Magic` names the core primitive because the OSR spell slot already carries strong table recognition. A conversion may implement this interface alone, or combine it with other interfaces such as `detect-magic`, `identify-power`, `archive-handshake`, or `owner-lock-contest` when the source text reaches beyond reading.

The interface asks three questions:

1. **What does this magical writing say or do?**
2. **Can this operator recognize this pattern later?**
3. **What lock, veil, corruption, or owner-trace pushes back?**

Counterplay may come from owner-locks, living grimoires, ECM veils, corrupted notation, false rune bait, incomplete inscriptions, hostile copy-protection, or daemon honeypots.
<<~/ahu >>

<<~ ahu #hooks >>
## Hooks

This worksite names possible play-surface hooks. It does not settle reaction-engine implementation.

```toml hooks
status = "scratch"
surface = "game-session-play-surface"
may_copy_into = ["instanced projection", "session card", "archive UI", "browser protocol draft"]
state = ["surface.uri", "surface.lineage", "operator.recognition", "veil.strength", "owner.trace"]
notices = ["read-clean", "recognized", "veil-pierced", "owner-pinged", "archive-read-back", "false-certainty"]
filters = ["edge:control:implements[lar:///ha.ka.ba/@sdm/v0.0/interfaces/power] tag:@sdm[domain/divination]", "power:operation[decode-magical-inscription]"]
adapters = ["tw5 event", "Lararium reaction graph", "browser worker protocol", "archive index", "local-first CRDT patch"]
```

Future hooks may promote recognition records into operator-local session memory or durable character knowledge.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:control role:implements >>
<<~ pranala #implemented-by ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/read-magic family:control role:implemented-by >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide whether `Read Magic` remains the stable interface name or later narrows to an OSR recognizer alias for `decode-magical-inscription`.
- Decide when one OSR spell implements several interfaces instead of one named interface.
- Decide how recognition records travel between character sheet, wiki session, and browser play surface.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
