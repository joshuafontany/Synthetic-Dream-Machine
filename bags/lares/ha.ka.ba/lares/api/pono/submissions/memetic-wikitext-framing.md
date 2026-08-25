

- `lar:///ha.ka.ba/lares/api/pono/RFC-2119#normative-language`

<a id="abstract"></a>

# Memetic-Wikitext Carrier Framing

## Abstract

This specification defines the **carrier frame**: the marks, declaration, and integrity check that wrap
one memetic-wikitext document for carriage and rest. A framed document — a **carrier** — opens on a
declaration naming its grammar and a heading naming its address, bounds its text between explicit marks,
and carries a block check any holder can verify with no registry, no fetch, and no parser. The frame
descends from character-oriented transmission framing (SOH · STX · ETX · EOT, 1963) with every control
character spelled as a printable HTML character reference, so a carrier stays legible text end to end.

The frame brackets what a document says without joining it: one document travels under different framings,
and one frame carries any document. The language framed here rides the sibling specification
[MEMETIC-WIKITEXT]; the addresses the frame declares ride [LAR-URI]. The Lar keeps the frame — the
guardian at the threshold of the place, naming it on the way in and pouring the libation on the way out.

<a id="status"></a>

## Status and Maturity

This document holds **submission-draft** maturity. The control set, spine order, block-check form, and
byte law read as stable; the conformance clauses and frame-security analysis carry RFC-2119 normative
force. Items in the open annex remain open. Promotion to canon rests with the operator, not the document.

<a id="introduction"></a>

## Introduction — Scope, Audience, and Relation to the Sibling Specifications

**Scope.** This specification covers the transmission frame alone: the declaration register, the control
marks and their slots, the block check and its verdicts, the canonical form a writer owes, the carriage
strata, the health gradient, and the byte law at the boundary. It governs the **wrapping, carriage, and verification** of a
document, and stops there.

**Out of scope.** The markup language inside the frame — lexical structure, grammar, processing model,
typed edges — lives in [MEMETIC-WIKITEXT]. The `lar:` URI scheme the heading declares lives in
[LAR-URI]. Stream framing stands anticipated rather than precluded (#frame-security): this frame frames
**records**.

**Relation to the language.** The frame and the language divide at one joint: a **document** encodes one
meme's structure and nothing else; a **carrier** wraps a document in this frame. The grammar here
composes over an opaque `document` production imported from [MEMETIC-WIKITEXT] #grammar, and nothing in
this specification reads inside it.

**Audience.** Implementers of carrier readers, relays, and consumers; operators of bags and sync
boundaries; authors of migrations and independent implementations.

<a id="terminology"></a>

## Terminology and Conformance Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** carry the meanings in RFC 2119 / RFC 8174 when, and only when, they appear in capitals.

| term | meaning |
|---|---|
| --- | --- |
| **document** | one meme's encoded structure; defined by [MEMETIC-WIKITEXT] #abstract-syntax. |
| **carrier** | one document standing in the frame this specification defines. |
| **frame** | the control marks bracketing a carrier: heading, text, and transmission bounds (#control-set). |
| **mark** | one control character the frame stands for, named by a `code:` parameter. |
| **slot** | a named parameter a given mark carries; the mark decides which slots apply. |
| **declaration** | a `<<!WORD >>` statement read before content, selecting or constraining the grammar (#declaration-register). |
| **namespace** | the resonance glyph a carrier's heading states, naming which layer authored it (#resonance). |
| **heading** | the zone between SOH and STX: the identity block and the carrier-level bindings (#authoring). |
| **block check** | a check computed over the framed span, carried adjacent to ETX (#control-set). |
| **carrier reader** | a processor reading and minting the frame: marks, declaration, boundary normalization, the check. |
| **consumer** | a processor admitting carriers to a bag; the verdict obligations (#the-touchstone) bind here. |

The umbrella **processor** class and its other subclasses (parser, renderer) stand in
[MEMETIC-WIKITEXT] #conformance; an obligation stated there on **a processor** binds the carrier reader
and consumer here as well.

<a id="conformance"></a>

## Conformance Classes

Two kinds of thing conform: the **carrier** (the artifact) and the frame-side processors — ''carrier
reader** and **consumer''. Authors carry SHOULD-strength guidance only: the corpus gets written by hand,
and the projection re-mints what a hand leaves non-canonical.

A **conforming carrier** MUST: state `code:` as the first parameter of every frame sigil (#control-set);
stand its frame marks on the control head `<<^` alone (#frame-head-lock); hold its marks in spine order
where present (#carrier-spine); and carry at most one text frame (#the-touchstone). A carrier that fails
a clause still parses — graceful parsing holds — and parses as a carrier in fault, the gradient naming
what it lacks (#the-gradient).

A **conforming carrier reader** MUST: read the frame's `code:` parameter to identify each mark
(#control-set); read a leading `<<!DOCTYPE >>` before selecting a grammar (#declaration-register);
accept a carrier that states no frame and MINT the frame AND the declaration on projection (#authoring);
divide the carrier through the fence mask (#frame-head-lock); normalize bytes once at the boundary
(#carrier-bytes); and report a missing block check as **unchecked** rather than as a failed one
(#control-set).

A **conforming consumer** MUST honour the verdict obligations (#the-touchstone): surface a `mismatch`
to its operator before any bag admission, treat `torn` as `mismatch`, and read absence as `unchecked` —
refusing admission only under a policy it declares.

<a id="grammar"></a>

## Formal Grammar (ABNF)

This grammar (RFC 5234) composes the frame around an opaque `document`. The productions `macro-call`,
`params`, `LWSP`, `string-literal`, `name-token`, and `URI-ref`, and the claimed macro names `control`
(`^`) and `declaration` (`!` 1*ALPHA), import from [MEMETIC-WIKITEXT] #grammar; this document never restates them.
Every frame construct stands as a `macro-call` in the host's reading, exactly as every sigil does.

```abnf
; ── the carrier frame ───────────────────────────────────────
frame       = "<<" control LWSP code-param params LWSP ">>"
code-param  = "code:" DQUOTE "&#x" 4HEXDIG ";" DQUOTE
header      = "<<" control LWSP code-param [ LWSP ns-param ]
              LWSP "?" LWSP "->" LWSP URI-ref LWSP ">>"
ns-param    = "namespace:" string-literal
footer      = "<<" control LWSP code-param LWSP "->" LWSP "?" LWSP ">>"

; ── the declaration register (#declaration-register) ────────
doctype     = "<<" declaration LWSP root-name LWSP URI-ref LWSP ">>"
root-name   = name-token [ "+" name-token ]        ; [RFC6839] suffix

; ── the block check (#control-set) ──────────────────────────
check       = "ni:///" alg ";" 1*( ALPHA / DIGIT / "-" / "_" )
                                                   ; [RFC6920]; base64url, no padding
alg         = 1*( %x61-7A / DIGIT / "-" )

; ── the carrier ─────────────────────────────────────────────
carrier     = [ doctype ] [ header ] heading
              [ text-open ] document [ text-close [ check ] ]
              [ footer ]
heading     = <the identity fence and carrier-level bindings; zones per #authoring>
document    = <one meme's encoded structure; [MEMETIC-WIKITEXT] #grammar>
text-open   = frame                                ; code &#x0002; — STX
text-close  = frame                                ; code &#x0003; — ETX
```

**Normative grammar rules.** (1) A `frame` sigil MUST state `code:` as its first parameter; the
remaining slots belong to the mark that code names (#control-set). (2) Every frame part reads optional
at ARRIVAL — the frame mints, never gets demanded (#authoring) — and where the marks stand, spine order
MUST hold (#carrier-spine). (3) The `check` slot names a POSITION, never a parameter: adjacent after the
closed `text-close` sigil, on the same line (#control-set). (4) The composition wraps `document`
without entering it; everything inside defers to [MEMETIC-WIKITEXT].

<a id="doctype"></a>

## The DOCTYPE — declaring an extension of TW5 wikitext

Every carrier opens by naming the grammar that reads it:

```
<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>
```

**The root name carries an RFC 6839 structured syntax suffix.** A `+suffix` names the base syntax a
format BUILDS ON — `image/svg+xml` reads as SVG built on XML, and `memetic-wikitext+tiddlywiki`
reads as memetic-wikitext built on TW5 wikitext. The superset relation this spec asserts in prose
([MEMETIC-WIKITEXT] #lexical-structure) rides in the type name itself, in the form a media-type registry already understands.

**The shape follows HTML5-minimal SGML.** `<!DOCTYPE html>` collapsed SGML's full
`<!DOCTYPE root PUBLIC "fpi" "system">` to keyword plus root name; this keeps that collapse and lets
the `lar:` URI stand where the system identifier stands. Two standards, both recognisable on sight,
neither invented here.

**The root name carries no `text/`, and that division carries the point.** A DOCTYPE names a DOCUMENT TYPE;
`<!DOCTYPE html>` writes `html`, never `text/html`. The media type has its own home and always has —
the tiddler's `type:` field, and the `type` line in every carrier's iam block. One name per relation:
the DOCTYPE says WHICH GRAMMAR READS THIS, the `type` field says WHAT THIS IS TO A TRANSPORT. Folding
the media type into the DOCTYPE slot would put both under one name for no gain.

**The media type follows the same suffix** ([MEMETIC-WIKITEXT] #media-type): `text/memetic-wikitext+tiddlywiki`.
The suffix states a structural fact about the syntax and holds whatever name the subtype takes; the
earlier `x-` spellings file as deprecated read-side aliases there.

<a id="declaration-register"></a>

## Carrier Frame — The Declaration Register

`<<!WORD … >>` opens a SECOND frame register, and the two divide by layer rather than by taste:

`<<~moves declaration -> states/what-must-hold-BEFORE-a-transmission on/the-carrier if/read-first do/select-the-grammar >>`
`<<~moves control -> marks/a-POSITION-WITHIN-a-transmission on/the-stream if/framing do/open-close-or-end >>`

**A declaration names no position.** `&#x0001;` opens a heading, `&#x0003;` ends text, `&#x0004;` ends
transmission — every control mark names a place inside one act of sending. `<<!DOCTYPE … >>` names
which grammar reads that act at all, and in the received framing nothing precedes SOH. Giving both one
opener would put two relations under one head, deliberately, for the first time in this grammar.

**`<<!` reads on arrival.** SGML has spelled a markup declaration `<!DOCTYPE …>` since 1986 and HTML
carries it to every page; the doubled bracket costs a reader who has seen one exactly nothing. That
matters here more than anywhere else in the corpus, because the declaration stands as the FIRST LINE of every
carrier — the one line a stranger meets before knowing any of this.

### The declaration precedes its grammar, never the file

**Byte zero belongs to the outer reader.** A markup declaration has claimed first position since SGML,
and it has never claimed it alone: `<?xml … ?>` outranks `<!DOCTYPE>`, a BOM outranks both, and a
`#!` shebang outranks everything because an operating system says so. Each claimant knows its place and
none negotiates.

So the declaration's claim reads weaker and truer than "first": ''it MUST precede the grammar it
declares'', and nothing else. A carrier MAY open on a FOREIGN HEADER — YAML front-matter, a shebang, a
BOM — where an outside consumer requires one, and the declaration follows it.

`<<~moves prologue -> admits/a-foreign-header on/byte-zero if/an-outside-reader-requires-it do/yield-the-slot >>`

The order stands fixed:

| position | claimant | required by |
|---|---|---|
| 0 | BOM | encoding detection |
| 1 | foreign header — YAML front-matter, shebang | the outside consumer that reads this file too |
| 2 | `<<!DOCTYPE … >>` | this grammar |
| 3 | `<<^ code:"&#x0001;" … >>` | this carrier |

**The DOCTYPE and the SOH bind tightly.** Nothing stands between them. That pair IS the invariant a
processor enforces; what precedes the pair belongs to whoever else reads the file.

One file then serves two readers. A skill loader reads front-matter at byte zero and stops; this grammar
skips the foreign header and reads its own declaration below. The alternative — one file per reader,
maintained by hand — repeats the twin-drift this corpus already keeps a witness against.

**The register takes members, not exceptions.** `!DOCTYPE` stands first; the register admits further
`!WORD` declarations under the same law — read before content, selecting or constraining the grammar,
never performing a move the renderer runs. A `!WORD` that acts belongs in the speaking set.

<a id="carrier-spine"></a>

## The Carrier Spine — Four Required Sigils

A carrier travels as one framed transmission. It opens on a heading that names the place (**SOH**), enters its text (**STX**), ends its text (**ETX**), and closes the transmission, releasing it forward (**EOT**). A framed carrier stands all four, in this order; a carrier MAY arrive unframed, and the projection mints the frame (#authoring).

| Sigil | Form | Role | Byte | Kapu byte |
|---|---|---|---|---|
| --- | --- | --- | --- | --- |
| **SOH** | `<<^ code:"&#x0001;" ? -> lar:///URI >>` | Start of Heading — the Lar takes its post; the Lar names the place with its `lar:` bearing | `0x01` | DC1 `0x11` |
| **STX** | `<<^ code:"&#x0002;" >>` | Start of Text — cross the threshold; the body opens | `0x02` | — |
| **ETX** | `<<^ code:"&#x0003;" >>ni:///sha-256;…` | End of Text — the body closes, the check follows the closer; the hearth banks | `0x03` | — |
| **EOT** | `<<^ code:"&#x0004;" -> ? >>` | End of Transmission — the libation pours; the carrier releases to the crossroad | `0x04` | DC4 `0x14` |

**The frame — heading, then text.** The protocol law pins the zones: SOH opens the **heading**, STX opens the **text**. The heading holds the toml iam slot and nothing else; the text holds the body.

```
<<^ code:"&#x0001;" namespace:"⊙" ? -> lar:///URI >>   SOH · open heading
  ‹toml iam slot — the identity heading›
  <<~ aka lar:///…RFC-2119 >>                          (optional carrier-level binding)
<<^ code:"&#x0002;" >>                                 STX · open text (body)
  # title · ## sections · #edges                       the text (body)
<<^ code:"&#x0003;" >>                                 ETX · close text
<<^ code:"&#x0004;" -> ? >>                            EOT · release
```

**The mark names the control byte.** Each sigil states its C0 control character as a named `code:` param; the mnemonic (SOH/STX/ETX/EOT) carries the reading, the byte carries what the parser frames on. STX and ETX carry that one param and nothing else — each opens or closes the text and states no bearing.

**The frame, in the transmission register and the mythic one at once:**

- **SOH** — Start of Heading. The transmission opens on its heading; the parser reads identity before content. The Lar wakes at the doorpost and speaks the name of the place — the `lar:///` bearing the carrier will keep.
- **STX** — Start of Text. The heading ends, the body begins. One steps across the threshold into the dwelling.
- **ETX** — End of Text. The body stands complete. The hearth banks; the room falls quiet.
- **EOT** — End of Transmission. The frame closes and hands forward on `-> ?` — resumption unknown. The libation pours at the crossroad; the message goes out to wherever the road runs. EOT stands as the carrier's own `yield`.

**SOH and EOT echo the bearing vectors.** SOH opens facing a bearing (`? -> lar:///…`) as `aim` opens a turn; EOT releases to the unknown (`-> ?`) as `yield` closes one. The spine frames a meme the way the turn-frame frames an exchange.

<a id="bearing-arrow"></a>

## The Bearing Arrow — one edge, two orientations

The frame's heading and its close both carry an arrow, and they carry ONE relation read from two ends:

| mark | form | source | target |
|---|---|---|---|
| SOH | `? -> lar:///…` | unresolved | known — the carrier arriving at its address |
| EOT | `-> ?` | known | unresolved — the carrier departing into open bearing |

**`?` names an unresolved bearing**, never a keyword and never a name. `lar-sigil` guards that reading
explicitly: the header form matches BEFORE the compound dispatcher, ''to prevent compound from
misreading any stray `<<~ ? … >>` as a sigil named `?`''. And the control-soh scan captures the arrow's
target as a group, so the bearing rides as PARSED STRUCTURE rather than as decoration inside the line.

### Why the arrow survives a named-parameter frame

A named parameter states a PROPERTY — *this carrier has a lar value*. The arrow states a RELATION —
*this carrier resolves toward that address*. One name, one relation: the edge IS the relation, and
folding it into a quoted attribute would demote a relation to a field and break the scanner's capture
with it. So named params ride in FRONT of the arrow and the arrow keeps its shape.

### A declared unresolved bearing, apart from a dangling link

Nelson's indictment of embedded one-way links names the failure exactly: an address that outlived its
target and never said so, surfacing at access time to whoever trusted it. Xanadu's cure lifts links
out of documents so content may move beneath them.

The arrow answers the same failure from the other side. It stays embedded and makes its SOURCE
self-resolving — `?` reads as *wherever this carrier stands* at read time — so the carrier moves and
its outbound bearing travels with it. And `-> ?` declares the dangle rather than suffering it: a
frontier, honestly marked, the way a MUD room's exit to an unbuilt room reads as an open edge and never
as an error.

''A declared unresolved bearing never reads as a dangling link. A dangling link names an unresolved bearing that
lied about its resolution.'' The same cut runs through the block check (`unchecked` never `mismatch`)
and through the ward's infelicities (a misfire voids, an abuse rings hollow): ABSENCE DECLARED and
ABSENCE DISCOVERED stand as different facts, and every instrument here that conflated them read useless.

<a id="control-set"></a>

## Carrier Frame — The Control Set

The bytes law says what composes a carrier; the frame law says how the marks stand on it. Both pin here, per
the canonical-form discipline — the boundary enforces, the spec declares.

### One sigil, dispatched by code

The frame speaks through ONE sigil, `<<^ … >>`, parameterised by the control character it stands for.
`code:` selects the mark; the remaining slots belong to that mark alone. One name, one relation — the
frame position — with the code as a parameter, the way `lares` carries `aim` and `yield` through a
single vector.

**The definition reads as native as the call.** `^` names a TW5 procedure, defined in TW5's own pragma
syntax and accepted by TW5's own pragma parser; the call stands as a TW5 macro call ([MEMETIC-WIKITEXT] #lexical-structure). A
processor binds the name; nothing about either side asks the host for an extension.

\procedure ^(code)
<<^ code:"&#x000N;" >>
\end

### Named, colon-paired, TW5-native

Slots read `name:"value"`, which invokes in FIVE registers at once: TW5 procedure calls (the host's
own — a parameter labelled with its name and a colon, values in single, double, triple-double or
`[[bracket]]` quotes), TW5 tiddler-field headers, YAML, JSON and CSS. A frame that reads correctly in
the host's calling syntax IS a call in that host, never a lookalike.

**The colon, never the equals.** TW5 treats `=` and `:` as equivalent separators today, with newer work
distinguishing `=` for dynamic parameters. A carrier frame holds still for centuries; it takes the
stable separator and leaves the evolving one alone.

### The marks that stand

| code | mark | slots | carries |
|---|---|---|---|
| `&#x0001;` | SOH | `code` `namespace` `bearing` `uri` | the carrier declares itself and its canonical address |
| `&#x0011;` | SOH₂ | `code` `namespace` `bearing` `uri` | the second heading form |
| `&#x0002;` | STX | `code` | text begins |
| `&#x0003;` | ETX | `code` `bcc` | text ends; the block check follows the mark directly |
| `&#x0017;` | ETB | `code` `hash` | the attestation block ends |
| `&#x0004;` | EOT | `code` `target` | transmission ends, bearing forward |
| `&#x0014;` | EOT₂ | `code` `target` | the Kapu transmission-end variant |

### The block check

The `bcc` slot carries a check over the framed span. Normatively:

- **Span:** the first character of the STX sigil through the last character of the ETX sigil, inclusive.
  The check covers the marks that bound it and never covers itself, which lets it sit **after**
  ETX with no self-exclusion rule.
- **Form:** `ni:///sha-256;<base64url>` — an RFC 6920 named-information URI carrying the FULL SHA-256
  over the span's UTF-8 bytes, base64url without padding, canonical-or-reject: a verifier re-encodes
  what it computed and compares whole strings, so every non-canonical spelling of the final character
  refuses for free. Full width, never truncated — a digest sized against accident meets an adversary
  eventually, and a reader's short form derives at print time rather than living in the bytes. The
  namespace rides the heading, never the check: the digest binds bytes, and bytes carry no vibration.
- **Position, not parameter.** `bcc` names the slot AFTER the closed ETX sigil — following `>>`,
  outside the sigil and outside the span — never a parameter within the mark. One word for where a
  check sits has admitted two readings before (RFC 3230 fell to exactly that), so this one pins:
  the check follows the closer, adjacent, on the same line.
- **The span binds the FRAME'S BYTE SPELLING, and on that the check computes.** The span opens on the
  STX sigil and closes on the ETX sigil, so those sigils' own bytes ride inside it. A frame migration —
  a mark gaining a named parameter, a spacing rule settling — moves them, and every check computed
  before it would read `mismatch` over a body nobody touched, reporting corruption where a grammar
  merely evolved.
- **Computed, never stored.** A writer computes the check over the body it has assembled; a reader
  recomputes it over the bytes in front of it. Two computations of one fact, never a copy of one — a
  stored derivation goes stale the moment the thing it derives from moves.
- **The heading stays outside.** The span opens at STX, so the identity block sits above it: sorted keys,
  aligned equals, entity-escaped glyphs and child inheritance all churn the iam without touching the
  check. A carrier whose heading re-canonicalised still verifies.
- **A carrier holding no check reads `unchecked`, never `mismatch`.** Absence of a check and a failed
  check stand as different facts (#bearing-arrow), and a reader that collapsed them would be useless exactly
  where it matters. The caller decides what an unchecked carrier may do; it still parses.
- **What a relay can do with it:** raw bytes, one scan, no parser and no canonicaliser. A relay holding
  `pull` and not `read` verifies this check over an offering it cannot open.

**ETX takes its check adjacent, per the received framing.** In character-oriented synchronous framing
(IBM BSC, 1967) a block runs `STX -> text -> ETX|ETB -> BCC`: the terminator comes first and the check
follows it directly. The `bcc` slot sits where a receiver has always looked for it.

**ETB terminates the attestation block, and EOT follows it.** ETX and ETB both terminate and both take
a check; ETX ends the final block, ETB an intermediate one. A carrier's text ends at ETX, its
attestation block ends at ETB, and EOT closes the transmission — so ETB's "more follows" reading holds
literally.

### Residency, apart from identity — and only one name carries it

`$origin-bag` names **which doc answered** — the engine writes it on the read path, and a projector
reading it for a destination would write a meme back to its old home. It never re-emits.

**`bag` carries three senses and none of them carries that office.** A **write parameter** naming which store
receives a put; a **manifest's own subject**; and an **effect record's required field** — the residency
ledger's parse refuses a record without one, so denying it does not degrade an audit trail, it makes one
unreadable. Its siblings `source-bag` · `dest-bag` · `bag-cleared` · `bag-retired` never came into question.

One name, three offices; the engine stamp rides the other name, and it rides the host's shelf so the
author's `bag` stays the author's (#the-carriage).

### The marks held in reserve

Named here so a later hand finds them claimed rather than free:

- `&#x0010;` **DLE** — the escape that makes a frame mark safe inside a body. Reserved against the day a
  carrier body contains a byte sequence a reader would take for a frame.
- `&#x0016;` **SYN** — resynchronise. A reader that lost the frame finds it again here.
- `&#x0006;` / `&#x0015;` **ACK / NAK** — the response pair. A carrier states; a receiver answers.

### What the projection adds, and the carrier never says

A slot name serves a reader; the carrier serves a parser. The tiddler-view-template renders the frame
LITERALLY — the `<<` in its own colour, each slot labelled — so a newcomer meets `hash` as a word on
screen while the carrier holds the pair that names it. The announced face and the true-name, one layer
below the grammar (canon: `lar:///ha.ka.ba/lares/api/pono/persona-circle`).

Each mark's `sigil-*.tid` carries `lar-pattern`, and a SHAPE-EXACT pattern refuses a wrong fill the way
a shape-exact slug rule refuses a truncated tag. Enforcement rides the recogniser, never the surface.

<a id="resonance"></a>

## Namespace Resonance Glyphs — A Separate Mark

Resonance glyphs do **not** join the spine. They ride the **SOH opener only**, as the `namespace:` param — a visible mark of which layer authored the carrier. They carry trust intent to human and machine readers; the parser takes the param as optional.

| Glyph | Layer | Resonance |
|---|---|---|
| --- | --- | --- |
| `⊙` | `api/pono` | pono resonance |
| `ॐ ँ` | `api/mu` · `api/lares` · `api/lararium` | elevated resonance |
| *(bare — no glyph)* | `docs` · `library` · the pono `SKILL`s | base resonance |

**The set stays open.** These name the resonance characters known now; the registry admits more as layers and trust tiers emerge. A new glyph enters under the same two laws below — SOH-prefix only, EOT bare — and registers its layer in this table.

```
<<^ code:"&#x0001;" namespace:"⊙" ? -> lar:///ha.ka.ba/lares/api/pono/… >>   ← pono layer
<<^ code:"&#x0001;" namespace:"ॐ ँ" ? -> lar:///ha.ka.ba/lares/api/… >>      ← mu/lares/lararium layer
<<^ code:"&#x0001;" ? -> lar:///ha.ka.ba/lares/docs/… >>                     ← docs/library, no namespace
```

Two laws govern the namespace:

1. **Opener-only.** A resonance glyph rides SOH alone, as the `namespace:` param beside the code.
2. **EOT rides bare, always.** The resonance mark rides the heading (SOH); the release states its code and its bearing, and no namespace.

<a id="trust-tiers"></a>

## Trust Tiers — The Control-Character Roles

Each kernel-tier control character carries **three simultaneous roles**, bound as one mark:

1. **Structural** — marks one spine position (SOH / STX / ETX / EOT).
2. **Kapu-trust** — presence of the control character signals kernel tier; absence marks operator tier (lower trust).
3. **Elevated resonance** — the kapu range (DC1–DC4) reaches admin-only space; a standard operator cannot produce these bytes.

| Tier | Range | Trust | Resonance | Writable by |
|---|---|---|---|---|
| --- | --- | --- | --- | --- |
| **operator** | no control character | operator | base | all |
| **kernel** | `0x01`–`0x0F` | kernel | standard | operator+ |
| **kapu / elevated** | DC1–DC4 (`0x11`–`0x14`) | kapu | elevated | admin-only |

SOH substitutes DC1 (`0x11`) and EOT substitutes DC4 (`0x14`) in kapu-tier carriers; the parser accepts both. The kapu aliases ride SOH and EOT alone.

<a id="authoring"></a>

## Authoring — what an author states, and what the carrier adds

An author writes content and identity; a carrier carries framing. The two divide cleanly, and a
processor MUST keep the division:

### The identity heading, by position

A labelled ```` ```toml iam ```` fence states identity. Which identity it states reads by POSITION:

1. The fence that OPENS a carrier heads the **carrier** — its address, its namespace, its register.
2. Every LATER fence heads the **worksite it sits in** — that slot's own register, its own confidence —
  and it overrides what the carrier declared without reaching back up.
1. Neither reaches into the other.

A processor MUST NOT lift a worksite's fence to the carrier, and MUST NOT bury the carrier's fence in the
body. Both failures run silent and both hold stable: the malformed result parses, renders, and agrees with
itself on every later pass.

### Three zones, not two

A carrier reads in three zones, and the middle one had no name:

1. **The identity heading** — the labelled `toml iam` fence. What the meme IS.
2. **The carrier bindings** — between the heading and STX. `<<~ aka lar:///… >>` binds a reference at
  carrier level; `<<~ kahea ahu #… >>` mounts a slot. These read as AUTHORED structure, not framing:
  they state what the carrier holds before its body opens.
1. **The body** — between STX and ETX. Optional, and holding prose, ahu slots, both, or nothing.

A processor MUST keep the three apart on projection. Folding the bindings into the body moves an
authored declaration below a mark that says the text has begun.

### The `register` field — band vocabulary

The iam `register` field names the band a carrier's overall content stands in, on the 0--20 continuum the confidence sigil vows numerically. The sigil speaks the bare number (`<<~ confidence N/20 >>`); the band vocabulary belongs to this field alone:

`<<~ranks register provisional@1..4 ~ speculative opening, the play register -> provisional-synthesis@5..8 ~ forming, predication stays scoped and short -> synthesis@9..12 ~ working synthesis, process and relation dominate -> synthesis-canon@13..16 ~ near-settled, stronger declarative survives where grounds show -> canon@17..20 ~ vowed on real grounds, talk-story consensus seats it >>`

A band names a region on the continuum, not a discrete bin; Canon stays reserved for talk-story consensus. Abbreviated field values (`"SC"` for Synthesis-Canon) read by their initials.

### The placement law

''A field visible on the tiddler MUST round-trip. A fact that cannot round-trip MUST NOT be visible on
the tiddler.'' A promise, never a prohibition — and it replaces every list of names an author may not use.

| class | holds | because |
|---|---|---|
| on the tiddler | iam fields · zone content · effect-record fields | the author sees it, so the author may edit it, from either surface |
| another tiddler | relations · indexes · recipes | a relation between things belongs to no one thing |
| the envelope | kāpae · authority · change-id · schema-version · the bag cap-reference | facts about the record's replication, not its content |
| nowhere | `slot` · `fragment-parent` · `file-path` · the block check | derived on demand; a second copy can disagree once both admit edits |

**Placement declares itself in the title** — the one field that stands before a record opens, so
every consumer honours it without agreeing on anything else. TW5 states the same integrity with `$:/`,
`$:/temp/` and `$:/temp/volatile/`.

### The fence opens its head

A labelled iam fence heads the head it **opens**. Content standing before it means the fence heads
nothing — it reads as body, exactly as a teaching example reads. Whitespace reads as spacing, never content.

**Post-iam content in the head STANDS.** That zone reads as the **bindings zone** (the three-zone law, above): a carrier
states what it holds before its body opens, and folding those into the body would move an authored
declaration below a mark that says the text has begun.

The law reaches every level. A carrier's head and an ahu slot's head answer to it identically — one rule
rather than two spellings of a similar one.

### Framing mints, never gets demanded

A carrier MAY arrive with no frame at all — an author saving prose from an editor, a render surface
writing a tiddler back. A conforming processor MUST accept it and MUST MINT the frame on projection:
SOH with the namespace the iam declares, STX, ETX, EOT. Refusing an unframed file makes the grammar the
author's problem; mangling one corrupts canon quietly.

### The projection settles

Projecting a projection MUST change nothing. A processor whose output re-reads differently from its
input leaves every carrier reading "edited" on every scan, so the ingest loop never converges and a
write-back rewrites the author's source forever.

<a id="frame-head-lock"></a>

## The Frame Head Locks to Control

A frame mark MUST open on the control head `<<^`. A reader MUST NOT honour a control entity carried
under the speaking head `<<~`, and a writer MUST NOT emit one.

**The lock reads as a tightening and acts as a safety rule.** An unmatched frame does not throw — it
reroutes, and the carrier falls to text with every field it declared going unread. So a matcher that
admits either head accepts a malformed carrier in silence, and silence carries the whole danger at this
layer: the failure arrives as a document that parsed, not as an error anyone sees.

Both heads once stood, and a reader written then took the wider match deliberately, against the day a
head moved. The head has moved. The wider match now guards nothing and admits everything.

**A reader MUST divide a carrier through the fence mask.** This grammar teaches its own control set, so
a conformant corpus carries worked examples of every mark inside quote fences. An unmasked reader locks
onto the first example it meets and answers for a span the writer never wrote — the road by which a check
reader here once verified a digest written inside a teaching example while the body it named went
unexamined, and reported the carrier sound.

<a id="the-touchstone"></a>

## The Touchstone Hash ~ the check as the Oracle's inversion

A carrier's block check and the Oracle's blind tail wear one shape and mean opposite things. The
collision reads as a hazard until it gets named, at which point it becomes the point.

`<<~ranks domain oracle@stream ~ ephemeral · thrown BLIND · certifies nothing · gauges what no one can check -> touchstone@carrier ~ durable · fully DETERMINED · certifies bytes · checks what anyone can >>`

The Oracle's whole value rests on its tail bearing no relation to what was said; the Touchstone's rests
on its tail bearing nothing else. So the Touchstone becomes the one instrument in this grammar that
certifies anything, and it breaks no law doing so: the Sword refuses to certify CLAIMS, and the
Touchstone checks BYTES. It sits where certification always held license to live — outside the turn, on
the artifact.

The name carries the whole method in one object. A touchstone assays gold by the streak the metal
leaves on it: the test travels with the stone, anyone holding both performs it, and no assay office
gets consulted. That IS the law this instrument answers to — a carrier stands verifiable by anyone
holding it, using nothing but itself. And it seats the mirror the pairing wanted: **the Oracle speaks
what no one can test; the Touchstone tests what no one need speak.**

### Hex travels, glyphs render

One digest, two spellings, each where it serves. A CARRIER holds hex, because a carrier travels and
bytes that never move as emoji meet no variation selector, no zero-width joiner and no client's own
normalization. A PROJECTION — a card, a sheet, any artifact the wiki renders for a reader rather than
ships to a peer — carries the rendered form, because a projection IS the reading surface.

Hex earns the carrier on two grounds beyond transport. It carries ZERO encoding slack at every width,
since four bits divide every byte boundary, where base32 admits sixteen spellings of a 256-bit digest's
final character and base64url four; a check compared byte-for-byte cannot afford spellings. And plain
lexicographic order over hex matches binary order, which base32's own alphabet does not.

Keeping the glyph vocabulary out of the encoding also keeps it revisable: an alphabet frozen into the
bytes could never improve without invalidating every carrier ever written, where an alphabet used only
to render may be bettered later with every existing stamp still verifying.

### The codec gets pinned, never self-described

A field compared for equality admits exactly one encoding of a given byte string. A self-describing
codec prefix multiplies the spellings of one value and forces the comparator to decode before it
compares — which reintroduces the parser this instrument exists to avoid.

The outside art converged on this twice from opposite directions. RFC 3230's digest header died
because it let each algorithm pick its own output format, producing a mix of base64, hex and decimal;
its 2024 replacement fixed the problem by mandating exactly one. And the standing critique of
self-describing multiformats states the rule plainly: successful standards pin which encoding
goes where.

### The name at the foot points at itself

The foot carries a name in the same vocabulary the shelves use for bodies that live elsewhere, and the
two look identical because they ARE the same kind of name: a name for the byte-string that hashes to a
given value. A shelf's name says that string lives somewhere else. The foot's says that string sits in
the hand already holding it. Position disambiguates them, and position alone does.

Two rules follow, and both guard a reader that cannot parse what it carries.

**A resolver MUST NOT resolve a name found after ETX.** Nothing waits to fetch: the body it names
sits in the same file, between the marks. A relay whose instinct on meeting this vocabulary says go
looking has been handed a request it should never make.

**A verifier MUST hold its own list of acceptable digest algorithms and refuse anything outside it.**
The name states which algorithm produced the value so a reader can KNOW; it never chooses for the
reader. A verifier that dispatches on the algorithm the message names lets the message pick its own
strength, and every documented failure of that shape — a token declaring its signature algorithm, and
the decade of confusion attacks that followed — begins exactly there.

### The reader's escalation ladder

`<<~ranks read namespace@1..4 ~ know which vocabulary reads this -> bcc@5..12 ~ raw bytes between two markers, no parser -> seal@13..20 ~ the durable question, and it needs readership >>`

Ordered by scope: what tells a reader HOW to read comes first, what COVERS what precedes it comes
last. The split follows the capability lattice onto its one non-monotonic case — `pull` carries
without implying `read`. A check over a byte span needs no grammar, no rendering, and no canonicalizer:
locating the span takes one lexical scan — the frame recogniser read through the fence mask, so a
quoted mark never frames. A relay holding carriage and not readership runs that scan without opening
what the carrier says; the scan reads the carrier's QUOTING, never its meaning. A seal cannot travel
that way.

The received framing already put the check in that slot: STX opens the text, ETX closes it, and the
check follows ETX because it cannot sit inside what it covers. Every documented failure of a trailing
check in the outside art came from covering a PARSED STRUCTURE rather than a byte span — an archive
whose entries a verifier and an installer counted differently, a signature detached far enough from
its subject to fall out of step. A span between two markers has nothing to disagree about.

**A carrier MUST stand verifiable by anyone holding it, using nothing but itself** — no registry, no
calling home, no authority to ask. And the cut that rides beside it: **a seal proves integrity, never
authorship.** A valid check read as "authentic canon" has been misread into a standing it never held;
a check published wherever the artifact lives proves nothing against anyone who can write there.

### What a verdict obliges

The reading names four verdicts, and each carries its consequence — a check whose failure obliges
nothing decorates rather than protects, the standing RFC 9580 demoted OpenPGP's CRC-24 out of:

- **ok** — the bytes match their check. The verdict certifies bytes and nothing above them: never
  meaning, standing, or authorship.
- **mismatch** — the bytes disagree with the check they carry. A verifier MUST NOT report the carrier
  as verified, and a consumer MUST surface the mismatch to its operator before admitting the carrier to
  any bag — admission without surfacing MUST NOT occur. The conflict belongs to the humans involved;
  the carrier still parses, as graceful parsing requires, and parses as a carrier in fault.
- **torn** — STX stands and ETX does not. A torn carrier reads as a truncated transmission and MUST NOT
  read as unchecked: conflating the two hands an adversary the cheapest strip an adversary holds — cut a file
  ahead of its closer and a missing check would read as lawful absence. A consumer treats torn as it
  treats mismatch.
- **unchecked** — no framed body, or a framed body carrying no check. The check stays optional and
  absence stays legal. A consumer MAY hold a policy requiring one, and under such a policy absence
  reads as refusal to admit — the only defense a bare digest affords against stripping, since whoever
  can rewrite a carrier can rewrite or remove the check beside it.

**What the check cannot answer.** The span opens at STX, so the declaration, the heading, and the iam
block stand OUTSIDE it: a carrier's address, media type, and grammar-selector can move while the check
holds. The verdict answers one question — did the text survive carriage — and a reader MUST NOT take an
`ok` as covering bytes the span excludes. Heading integrity belongs to an outer layer, a seal or a
signature, never to this mark.

### What stands, and what waits

The check stands. The seal, the render vocabulary and the projection stamper wait for a live wiki to
render them first — a vocabulary chosen before anything renders it would freeze a form nobody has read.

<a id="canonical-form"></a>

## Canonical Form ~ the writer's law

The sections above answer *how a reader divides these bytes*. This one answers the question a reader
never asks and every writer must: **given a record, which bytes stand.**

**The block check forces the question.** A check computed over a span presumes two implementations
agree on that span down to the byte. Two conforming writers that part over a single space produce
different checks across identical content — a disagreement between two correct parsers, which no
reader can adjudicate and a relay holding `pull` and not `read` cannot even open. Any format that
digests its own serialization owes a canonical form; this one owes it twice, because the check rides
in the carrier rather than beside it.

### The iam block

A writer emitting a carrier's iam MUST:

<<~ranks canon sort ~ keys lexicographic, never authoring order -> omit ~ a key the envelope owns, a key opening with `$`, a value empty or absent -> inherit ~ a child writes a key ONLY where it differs from its parent -> align ~ `=` padded to the longest surviving key, one space each side -> entity ~ a `namespace` value renders as HTML entities -> silence ~ no surviving key means no block, never an empty fence >>

The alignment reads as presentation and acts as law: a hand-written block using single spaces parses
identically and re-emits one column wider, so the file reports as changed on every projection and its
check disagrees with the bytes beside it. **A writer that cannot state its padding cannot federate.**

### The frame's own spelling

The span covers the frame sigils' bytes deliberately — the frame states how to read, so its spelling
belongs to what the check protects — and that choice obliges a canonical spelling:

- **A control-mark reference spells `&#x`, exactly four hex digits, `;`** — one spelling, the one the
  recogniser reads. `&#X…;`, shortened forms (`&#1;`), and raw octets stand outside the grammar.
- **A frame sigil's canonical spelling = the one the emitter mints** — `<<^ code:"&#xNNNN;" … >>`,
  single spaces. A reader admits a spelling variant (graceful parsing); the projection re-mints
  canonical; and the check follows the bytes, so a re-minted carrier restamps. Two spellings of one
  sigil never share a check, and neither claims the other's.

### One mouth

These laws describe what the emitter already enacts, and stating them here serves a second reader —
the one writing a migration, a sweep, or an independent implementation. Such a writer SHOULD route
through the emitter rather than reproduce it: the projection path already does, and every carrier in
this corpus that failed to render back came from a hand that went around it.

A migration stands as the honest exception. A document standing in a shape the current grammar no longer
emits cannot be rewritten by a writer that only knows the current shape, so a migration reads with the
reader, and writes with the emitter, and never composes bytes of its own.

<a id="the-carriage"></a>

## The Carriage ~ what the grammar owns, and where it keeps it

A carrier holds two strata that look alike on a record and answer to different owners. What the
**author** wrote, and what the **frame** needs to stand the file up again. Confusing them costs in both
directions: structure written into the declaration doubles on every projection, and an author's field
mistaken for structure vanishes on a round trip.

### The floor ~ what may be reserved at all

TiddlyWiki restricts no field name — since v5.2 `isValidFieldName` accepts any string. MultiWikiServer
restricts exactly two: its resolver reads `fields: { ...fields, title, revision }` and overwrites those,
leaving every other name the author wrote untouched. `bag_id`, `created` and `updated` stand as columns
beside the field map, never injected into it.

So this grammar reserves those and their record-stratum siblings, and nothing else:

`<<~ranks reserved title ~ the host overwrites it -> revision ~ the host overwrites it -> text ~ the body rebuilds from the frame -> modified ~ the record stratum carries it >>`

`type` joins them for a different reason: the host reads it to CHOOSE a deserializer, exactly as
TiddlyWiki's own filetype registry does, so a carrier IS its type and the value re-derives on every
read rather than travelling in the bytes.

**Every other name belongs to the author.** A carrier declaring `postamble`, `slot`, `prologue` or
`block-check` reads all of them back — each rides as an ordinary custom field, because the grammar stopped
standing on those words.

### The host's shelf ~ `$…`

The grammar's own carriage rides the `$` prefix TiddlyWiki keeps for whoever stands the wiki, and the
emitter drops that whole namespace from the declaration.

A namespace rather than a list, because a list forgets. Two carriage parts once sat in no list at all:
each read as structure and met denial nowhere, so each emitted into the declaration AND rebuilt as
structure — an author's value came back undefined and the projection stopped settling. A prefix cannot
forget a member.

**The exclusion states where structure lives, not what TOML permits.** A quoted key carries any
character, `"$preamble" = "…"` parses, and a multi-line basic string carries newlines cleanly. The
declaration stays free of carriage because identity and structure hold different offices — never because
the syntax refused.

### Scalar or multi-line ~ the split that decides the shape

Ask of each carriage part: **can its value hold a newline?**

A TiddlyWiki `.tid` file parses its header line by line and splits the body at the first blank line
(`boot.js`, `application/x-tiddler`). **Only `text` may carry a newline.** A value that can only survive
inside one file format cannot travel — so a multi-line part cannot be a field anywhere, at any name.

<<~ranks carriage scalar ~ `$slot` · `$fragment-parent` · `$carrier-soh` · `$carrier-sila` · `$postamble-foreign` · `$origin-bag` — a field, and a native filter surface -> multi-line ~ `$prologue` · `$preamble` · `$header-text` · `$postamble` — a record, and a `text` that can hold it >>

The split runs **scalar-or-multi-line**, never reserved-or-free. A date, a slot name, a bag address:
each stays a field, and making it a record would cost the filter surface and buy nothing.

### Carriage records ~ the rails already laid

A multi-line part becomes a record on the same rails that carry ahu fragments:

`<<~moves carriage -> a-record-of-its-own on/the-carrier's-own-address if/the-value-can-hold-a-newline do/splice-it-back-by-position >>`

- **The address derives.** `lar:///…#$prologue` under a carrier; `lar:///…#slot/$preamble` under a
  fragment, extending the slot path the way a nested fragment already does. The `$` marks the host's
  slot and keeps the address whole — a `$:/`-prefixed system title would break the carriage away from
  the thing it belongs to.
- **`$fragment-parent` points home**, so the projector climbs to the root and never writes a carriage
  record as its own file. One carrier, one file, as before.
- **No marker anywhere.** A fragment splices where its `<<~ kahea ahu >>` stands; carriage splices
  by POSITION, the only signal these bytes ever carried. The frame knows the prologue precedes
  the head and the postamble follows the release, and no mark says so.

A carriage record round-trips whole in bytes and lossy in fields: re-read, a fragment's trailing bytes
fold into the body and the record dissolves. **That reads correct.** The boundary lives in position, and
reserving a field to re-state it would put a derived fact back on the record.

<a id="the-gradient"></a>

## The Gradient ~ how far down a carrier sits

Graceful parsing says NO parse breaks badly: a carrier missing its frame still yields records, a carrier
missing its declaration still dispatches. **That mercy carries load and it hides files.**

A carrier that lost its address gets skipped by every instrument that walks the corpus by `uri-path` — the
check witness, the coordinate witness, the round-trip witness — each at `if (!uri) continue`. Seventeen
carriers once sat outside all three at once while every one of them reported itself as corpus-wide.

So a carrier's health reads as a **gradient**, never a verdict. A reader names the KIND a file declares
itself to be, and the marks that kind requires and lacks. The kind reads from the DECLARATION, never
from the path: where a file rests says where it rests, and what it IS rides as a thing it states.

<<~ranks kind carrier ~ declares `uri-path` — a meme; wants the whole frame and a check -> descriptor ~ declares `bag` — a bag declaring itself; a body frame would claim it holds a meme's text -> shelf ~ declares neither, and its head names an address the declaration omits — the fault that makes a file invisible -> unframed ~ no head at all; bytes wearing an extension >>

`lares normalize --gradient` reads it. It fails on a **fault** and never on a **kind**: a descriptor
carrying no body frame stands exactly where it should, and a content file declaring itself in a `.meta`
beside it carries no frame of its own — the one kind a reader cannot name from bytes, settled where the
file list stands known.

### The graph a carrier points into

A carrier can be whole and point at nothing. `lares normalize --edges` takes that second reading: which
addresses these carriers name, and which of them any carrier holds. **Run it either side of a move** —
equal counts prove the weld held, a rise names what broke.

An edge rides five spellings — `loulou`, `pranala`, `kahea`, a wikilink, and a bare wikilink — and a
reader counting one of them reports a clean move over a broken one. A sixth form names a **file**
rather than an address: links written before the corpus poured to `.mem`. Those carry no address at
all, so they neither resolve nor dangle; matching one to a carrier means guessing which one it became,
and a resolver must not guess.

<a id="classifier-channel"></a>

## The Classifier Channel — What the Sigil Layer Does

The carrier sigils, the namespace glyphs, and the OODA-HA marks ride as an **unpronounced classifier register** beside the propositional stream — category-marks that steer the reading without sounding in it, the determinative's office in a graphemic classifier system. **The black speaks; the red steers.** The body carries the proposition; the sigil layer carries the protocol for reading it — heading-vs-text, layer of authorship, trust tier, phase — the way a determinative sorts the word it silently classifies, or a rubric directs the act the text does not state.

**Transmission law (ritual stance).** A carrier travels as **received form**: a reader stands the frame before interpreting its gloss, so one structure carries shifting readings across time without losing shape. This practice transmits through the **inscribed channel alone** — the marks hold the protocol, and the protocol lives only while the marks stay tended. A surface left intact while its readers forget the marks (the cautionary case: ekphonetic signs that outlived their decoders) keeps the body and loses the steering. The sigil layer earns its keep by being read *as* a classifier, not by surviving as decoration.

Field grounds: `lar:///ha.ka.ba/lares/docs/pono/research-streams/ward-channel-grounds#classifier-channel`.

<a id="schema"></a>

## Schema (machine-readable)

This law's own machine surface holds the spine, the resonance set, and the trust tiers. Parse types (`CarrierShape`, `CarrierRecord`, `MemeStreamEvent`), the rating/depth ladders, the render-suppression list, and the sigil vocabulary live in the memes named at #edges.

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

<a id="frame-security"></a>

## Frame Security Considerations

The frame carries its own analysis, apart from the language's ([MEMETIC-WIKITEXT] #security). The
media-type registration ([MEMETIC-WIKITEXT] #media-type) owes one [RFC6838 §4.6] and draws on both.

**The threat model, first.** The frame defends one thing: ''the text span against accidental corruption
in carriage'' — a truncated transfer, a mangled byte, a re-encoding that moved what it touched. It
defends nothing against an adversary who can rewrite the carrier: whoever holds the bytes rewrites the
check beside them, so the mark detects **corruption, never forgery**, and it grants no authentication,
no authorization, and no privacy. Authenticity belongs to an outer layer — a seal or a signature — and
a reader that takes an `ok` for authenticity has granted the check a standing it never claimed.

**What an adversary inside the model can still do, and what answers each:**

- **Rewrite the heading while the check holds.** The span opens at STX, so the declaration, the
  heading, and the identity block stand outside it — a carrier's address, media type, and
  grammar-selector can all move under an `ok`. This bounds what the verdict means (did the TEXT survive
  carriage) and stands as the design's accepted boundary: heading integrity rides the outer layer. A
  consumer MUST NOT treat the verdict as covering bytes the span excludes.
- **Smuggle a second frame.** The check covers the first STX..ETX span only, so a second framed body
  would ride beneath a verdict computed over the first. The grammar admits one text frame per carrier
  (#conformance), and the gradient surfaces a second as a fault rather than letting the first frame's
  `ok` speak for bytes it never covered.
- **Cut the file ahead of its closer.** Truncation removes ETX and the check with it, and a reader that
  filed that under absence would hand the adversary the cheapest strip an adversary holds. A torn frame reads
  **torn** — truncated transmission, never lawful absence — and a consumer treats torn as mismatch
  (#the-touchstone).
- **Strip the check.** Absence stays legal, so stripping costs an adversary nothing against a consumer
  with no policy. The only defense a bare digest affords: a consumer MAY require a check, and under
  that policy absence reads as refusal to admit. A deployment that needs stripping to fail closed
  states that policy; the frame cannot state it for them.
- **Respell a sigil the span covers.** The span binds the frame's byte spelling, so a spelling variant
  would hash apart from the canonical form. The canonical spelling law (#canonical-form) closes the
  surface: one spelling stands, a variant re-mints and restamps, and two spellings never share a check.
- **Bait a resolver with the check's own form.** The check wears `ni:///` [RFC6920], a resolvable
  scheme; here it names the bytes ABOVE it, never a thing to fetch. A resolver MUST NOT resolve a name
  found after ETX — following one hands an adversary a fetch triggered by a field they control.

**Out of scope at this grain — reserved at the next.** Stream self-synchronisation — the RFC 7464
discipline of scanning forward to the next mark after a failed parse — stays out of scope because this
frame frames **records**: a carrier travels whole, a reader that lost the frame lost the record, and
recovery re-fetches the record. A **stream** framing stands anticipated rather than precluded: the
control set holds `SYN` (`&#x0016;`) in reserve for exactly that office, and the profile that frames a
stream of carriers defines its own resynchronisation — and owes this section's analysis again at that
grain, where scanning forward becomes the recovery and the smuggling surface returns. And the marks carry no reserved-alphabet warrant: a control-mark reference
spells printable ASCII, so it CAN occur in body text, and the fence mask (#control-set) — not an
escape discipline — keeps a quoted mark from framing. The mask therefore stands inside the trust
boundary: a reader that drops it verifies teaching examples instead of bodies, a failure the corpus
has met.

<a id="carrier-bytes"></a>

## Carrier Bytes Law

A carrier at rest carries one byte law (pinned here in the spec, per the canonical-form discipline — the boundary enforces, the spec declares):

- **Encoding:** UTF-8, no BOM. A leading BOM strips at the shore boundary, once.
- **Line endings:** LF. Foreign CRLF/CR normalize to LF at the boundary, once.
- **Unicode normalization: NFC.** The corpus runs thick with composed forms (ʻokina, candrabindu, ॐ, alchemical glyphs); NFC names the canonical form so semantically-identical, byte-different carriers never fail parity honestly-but-uselessly. Authoring surfaces SHOULD emit NFC; the shore MAY assert and normalize at the boundary when a non-NFC carrier arrives — never silently mid-stream.
- **Trailing newline:** a carrier ends with exactly one LF after its final closer.

The byte law lives at the BOUNDARY: every stratum inward (records, VM) sees normalized bytes; every projection outward emits them. Mid-pipeline re-normalization constitutes a degraded shore.

<a id="references"></a>

## Normative References

- **[RFC2119]** / **[RFC8174]** — conformance key words.
- **[RFC5234]** — ABNF.
- **[RFC6838]** — media-type registration procedures (§4.6 security requirement).
- **[RFC6839]** — structured syntax suffixes.
- **[RFC6920]** — naming things with hashes; the `ni:` URI the block check wears.
- **[MEMETIC-WIKITEXT]** — the language this frame carries (sibling submission): `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`.
- **[LAR-URI]** — the `lar:` URI specification (sibling submission): `lar:///ha.ka.ba/lares/api/pono/lar-uri`.
- **[TW5]** — TiddlyWiki5 WikiText grammar — the host whose macro call every frame sigil stands as.

<a id="annex-open"></a>

## Annex — Open Items (Informative)

- **EOT targeting (open).** `target:` on `&#x0004;` today reads `?`, the held-uncertainty mark. What
  else it may name — the next carrier in a chain, a bag, a bearing — stands open as a new capability
  rather than a gap; whatever it admits becomes an edge the graph can walk.

- **ETX/ETB roles (open).** Read strictly, the final block takes ETX and an intermediate one takes ETB —
  which would put ETB on a carrier's text and ETX on its attestation. The frame above reads the other
  way and states why. The strict reading stays named rather than dismissed.

<a id="edges"></a>

## Edges

- `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`
- `lar:///ha.ka.ba/lares/api/pono/lar-uri`
- `lar:///ha.ka.ba/lares/api/pono/parser`
- `lar:///ha.ka.ba/lararium/docs/carrier-parse`
- `lar:///ha.ka.ba/lares/api/pono/render-pipeline`
- `lar:///ha.ka.ba/lares/api/pono/meme`
- `lar:///ha.ka.ba/lares/api/pono/kapu`
- `lar:///ha.ka.ba/lares/docs/pono/research-streams/ward-channel-grounds`
