<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/lar-uri >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/lar-uri.md"
grammar   = true
mana      = 18
manao     = 17
manaoio   = 17
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "submission-grade specification for the lar: URI scheme — abstract, ABNF, five-planes reading (Provisional), resolution model, conformance, scheme registration, security; sibling submission to memetic-wikitext"
status    = "submission-draft"
tags      = ["api/pono/meme", "api/pono/loci"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/lar-uri"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ ahu #abstract >>

# The `lar:` URI Scheme — A Naming Scheme for the Meme Graph

## Abstract

The `lar:` URI scheme names an address in a content-addressed meme graph — one parseable address per named unit. Like `tag:` (RFC 4151), a `lar:` URI **names; it does not fetch**: resolution runs against a local world graph alone. The scheme carries two forms — a **local form** for stable graph addresses and system resource names, and a **session form** that names a speaker for exchange spans — and a three-slot attitude root carried by a Ha-Ka-Ba (heading · angle · dynamic) triple.

This specification names the scheme syntax (a formal ABNF grammar), the path taxonomy, the kind-plane surface rule (`@` designates a CRDT surface — `bags/@`, `wikis/@` — while a meme namespace is bare), the resolution model, and the conformance, scheme-registration, and security obligations a processor MUST meet. It forms a **sibling submission** to the memetic-wikitext markup specification, which addresses its content by this scheme.

<<~/ahu >>

<<~ ahu #status >>

## Status and Maturity

This document holds **submission-draft** maturity. The scheme law, path taxonomy, and kind-plane surface rule read as stable. The formal grammar, conformance classes, scheme registration, and security considerations carry RFC-2119 normative force. Items in the Annex remain open. Promotion to canon rests with the operator, not the document.

<<~/ahu >>

<<~ ahu #introduction >>

## Introduction — Scope, Audience, and Relation to memetic-wikitext

**Scope.** This specification covers the syntax of the `lar:` URI scheme, the path taxonomy and slot discipline, the kind-plane surface rule (`@` names a CRDT surface; a bare `child[1]` names a meme namespace), and the resolution model. It governs how an address gets **written and resolved**, and stops at identity; what the named unit **means** beyond its identity lives elsewhere.

**Out of scope.** The content carried at a `lar:` address, and the markup that authors it, ride the sibling `memetic-wikitext` specification (Normative Reference [MWT]). The typed-edge grammar rides [PRANALA]. The operational addressing discipline lives at `lar:///ha.ka.ba/lares/api/pono/lar-uri/SKILL`.

**Relation to the memetic-wikitext specification.** Memetic-wikitext treats a `lar:` URI as an opaque content identity and defers its internal structure here. The two specifications form **one dual submission**: [MWT] names the markup; this document names the address. They SHALL cross-reference normatively.

**Precedent.** The naming-not-fetching posture follows `tag:` (RFC 4151). The syntax builds on the generic URI grammar (RFC 3986). Scheme registration follows RFC 7595.

**Audience.** Implementers of parsers and resolvers; authors and registry maintainers; peers federating CRDT bags.

<<~/ahu >>

<<~ ahu #terminology >>

## Terminology and Conformance Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** carry the meanings in RFC 2119 / RFC 8174 when, and only when, they appear in capitals.

| term | meaning |
|---|---|
| **address** | one resolved `lar:` URI; the identity of a named graph unit. |
| **local form** | `lar:///path` — authority-less; for stable addresses and system resource names. |
| **session form** | `lar://alias:grant@host/path` — names a speaker; exchange spans only. |
| **triple** | the three-slot `w1.w2.w3` attitude root (Ha heading · Ka angle · Ba carried dynamic). |
| **surface** | a CRDT surface (today an Automerge doc); designated by a kind-plane + `@`-tag (`bags/@slug`, `wikis/@slug`). |
| **namespace** | a bare `child[1]` segment naming a meme's minting authority; carries NO `@`. |
| **kind-plane** | the reserved `child[1]` word that names a resolvable surface: `bags`, `wikis`, or `cid`. |
| **slot** | one lowercase term (word or hyphen-compound) in the triple. |
| **fragment** | a `#`-anchor naming a section / `ahu` / pranala within an address. |

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #scheme-syntax >>

## Scheme Syntax (ABNF)

The following grammar uses ABNF (RFC 5234), importing `unreserved`, `pct-encoded`, `host`, and `fragment` from RFC 3986.

```abnf
lar-URI       = "lar:" hier-part [ "#" fragment ]

hier-part     = local-form / session-form
local-form    = "///" path                 ; authority-less
session-form  = "//" authority "/" path    ; speaker named
authority     = alias ":" grant "@" host    ; host per RFC 3986

path          = stable-path / unstable-path / adjacent-path
stable-path   = "ha.ka.ba" [ "/" child1 ] *( "/" segment )
unstable-path = triple [ "/" child1 ] *( "/" segment )
adjacent-path = segment                    ; no triple root, no child1

triple        = word "." word "." word     ; Ha heading . Ka angle . Ba dynamic
child1        = surface / namespace         ; the child[1] fork — the "@" lives in one branch only
surface       = ( "bags" / "wikis" ) "/" "@" name  ; a CRDT surface: bags/@slug · wikis/@slug
              / "cid" "/" hash                     ; an immutable content-addressed artifact
namespace     = name                       ; a bare meme minting namespace — carries NO "@";
                                            ;   MUST NOT equal a kind-plane word (bags / wikis / cid)
segment       = 1*( unreserved / pct-encoded )   ; MUST NOT carry a leading "@"
word          = 1*( %x61-7A )              ; one slot: lowercase only
name          = 1*( unreserved )
hash          = 1*( unreserved )
alias         = 1*( unreserved )
grant         = 1*( unreserved )
```

A `lar:` URI MUST hold ASCII only. A slot MUST hold lowercase ASCII letters alone. A stable or unstable path MUST carry a full three-slot root. An adjacent path MUST carry a non-dotted root. The `@`-tag appears ONLY inside a CRDT `surface` (`bags/@…`, `wikis/@…`); a meme `namespace` carries none. The words `bags`, `wikis`, and `cid` are RESERVED at `child[1]` — a meme namespace MUST NOT equal one.

<<~/ahu >>

<<~ ahu #path-taxonomy >>

## Path Taxonomy

**Stable** — literal `ha.ka.ba` root, permanent API surfaces (bare meme namespace at `child[1]`):
```
lar:///ha.ka.ba/lares/api/pono/meme
lar:///ha.ka.ba/lares/api/pono/lar-uri
```

A CRDT surface names its kind-plane at `child[1]`, the `@`-slug at `child[2]`:
```
lar:///ha.ka.ba/bags/@lares       a bag (mutable content surface)
lar:///ha.ka.ba/wikis/@lares      a wiki (a #has bag-stack)
lar:///ha.ka.ba/cid/bafy…         an immutable content-addressed artifact
```

**Unstable** — arbitrary three-term attitude root, session-specific bearing:
```
lar:///threshold.uncertain.opens/
```

**Adjacent** — no three-term root, local system resources, often ALLCAPS:
```
lar:///AGENTS    lar:///LARES    lar:///CRYSTAL
```

Adjacent paths MUST NOT carry HA.KA.BA dot-notation in the path root.

For stable and unstable paths: each slot holds exactly one lowercase term — a word or a hyphen-joined compound — Ha (heading), Ka (angle), Ba (carried dynamic). The noun/adjective/verb grammar remains the parse mnemonic; the URI ontology reads as bearing, not mapped position. Each slot MUST hold lowercase letters and hyphens alone, and the root MUST carry exactly three terms (count the dots: exactly two); a term hyphen-joining more than two stems trips Address Smuggling. Sub-path after the triple narrows the bearing within the named surface; strip it to get the named l-space address.

### TW5 System Boundary

The `lar:` scheme serves as the lararium **sync-filter predicate**: only `lar:`-titled tiddlers cross the sync boundary into Automerge bags and onto disk, while the TW5 `$:/` namespace stays browser-local. The scheme names *what* crosses; the operational residency rules — system-tiddler siting, tag-value exemption, draft locality, and the `$:/plugins/` dual-distribution convention — ride the **sync-namespace** law: `lar:///ha.ka.ba/lararium/api/sync-namespace`.

<<~/ahu >>

<<~ ahu #bag-surface >>

## Surface Designation — `@` Names a CRDT Surface

The `@`-tag names a **CRDT surface** — a resolvable mutable doc (today an Automerge doc). It appears ONLY behind a **kind-plane** at `child[1]`, with the `@`-slug at `child[2]`. A meme **namespace** is a bare word at `child[1]` and carries no `@`. The two never collide: the `@` marks the surface, the bare word marks the namespace.

- **`bags/@{slug}`** — a bag: a mutable content surface (a composable recipe piece).
- **`wikis/@{slug}`** — a wiki: a `#has` bag-stack IDENTITY, distinct from its CANON (`bags/@{slug}`). Its per-wiki live layers extend the identity as `wikis/@{slug}/{temp,draft,working,personal}`.
- **`cid/{hash}`** — an immutable content-addressed artifact; the name IS the content hash.

```
lar:///ha.ka.ba/lares/api/pono/lar-uri          ← a meme (bare namespace at child[1])
lar:///ha.ka.ba/bags/@lares                     ← the personality bag
lar:///ha.ka.ba/bags/@lararium                  ← the system corpus bag
lar:///ha.ka.ba/wikis/@synthetic-dream-machine   ← a wiki IDENTITY (its #has-stack)
lar:///ha.ka.ba/bags/@synthetic-dream-machine    ← that wiki's CANON content bag
lar:///ha.ka.ba/wikis/@synthetic-dream-machine/personal  ← that wiki's personal slot
lar:///ha.ka.ba/wikis/@synthetic-dream-machine/draft     ← that wiki's draft slot
lar:///ha.ka.ba/cid/bafy…                        ← an immutable artifact
```

Law summary:

1. `child[0]` = the `w1.w2.w3` root (literal `ha.ka.ba` for stable; attitude triple for unstable).
2. `child[1]` forks: a reserved **kind-plane** word (`bags`, `wikis`, `cid`) opens a CRDT surface or artifact; any other bare word is a **meme namespace** — the minting authority. The `@`-tag rides `child[2]` of a `bags`/`wikis` surface, and nowhere else.
3. A CRDT surface carries exactly one canonical address. A wiki's per-wiki live slots extend its identity at `child[3]` (`wikis/@{slug}/{kind}`).
4. Resolution: the runtime resolves an `@`-tagged surface to an AutomergeUrl via the `BagResolver` map carried in the island manifest. The URI is the identity; the resolver maps it to the live doc. Two devices binding the same surface URI to different doc URLs (different recipes, different personal docs) is the normal case — the URI is the address, the doc is the house.

Registry pattern. A bag MAY hold tiddlers whose titles are *paths inside it* pointing at other surfaces. The canonical example is `bags/@catalog`, which tracks corpus bags via entries at `lar:///ha.ka.ba/bags/@catalog/corpus/{slug}` whose text holds the AutomergeUrl of the corresponding `lar:///ha.ka.ba/bags/@{slug}` bag. Catalog catalogs; it does not host.

<<~/ahu >>

<<~ ahu #five-planes >>

## The Five Planes

The schema carries five independent planes; conflating them trips residency, projection, and federation work. This reading runs ahead of settled field vocabulary and stays open to better words.

1. **NAME** — the URI identifies, full stop. A bare `child[1]` segment names the **minting namespace** (the authority that named the unit), never a residency claim. The name survives COPY, MOVE, multi-bag presence, deletion, and federation unchanged (coordinate ⊥ change-identity).
2. **RESIDENCY** — which surfaces hold a manifestation NOW = a queried relation (`listBagsHolding`, catalog holdings, recipe stacks), never derived from the path. The same URI lawfully exists in a draft layer AND a canon bag AND a personal layer at once, shadowed by layer order. Name and holding surface coincide only by convention.
3. **SITING** — where a projection of a manifestation lands on disk: a per-bag mirror convention (`loci` derivation = the canon-bag rule, one projection rule among possible many), gated by the disk-mirror GRANT, never implied by the name.
4. **SPEECH** — the hostful session form (`lar://alias:grant@host/...`): who speaks, under what grant, from where — a speech-act envelope for exchange spans, never storage.
5. **STABILITY** — literal `ha.ka.ba` (settled namespace) vs unstable attitude roots (session bearing, declared-unresolved until adopted into a bag).

The planes compose: a turn of live exchange mints SPEECH + STABILITY-unstable names; adoption moves a unit to NAME-stable; LOAD/INGEST set RESIDENCY; the mirror grant sets SITING. No plane ever answers for another.

<<~/ahu >>

<<~ ahu #resolution >>

## Resolution Model

`lar:` **names**; it does not fetch. A processor MUST resolve a `lar:` reference against the local world graph only:

1. Parse the URI to its form (local / session), path class, and optional fragment.
2. For an `@`-surface (`bags/@…` or `wikis/@…`), map the surface identity to a live doc via the island manifest's `BagResolver`.
3. Resolve the remaining path to a named unit within that bag's address space.
4. Resolve a `#fragment` to a section / `ahu` / pranala anchor within the named unit.

Session form names the speaker through the authority. It MUST stay within exchange spans, away from stable graph addresses, system resource names, and other storage.

<<~/ahu >>

<<~ ahu #signal-law >>

## Signal Law

The `lar:` URI names bearing — attitude and section, nothing mutable, in ASCII.

The root carries an attitude triple: **Ha** sets the heading faced, **Ka** sets the angle of approach, and **Ba** carries the dynamic underway. This runs after the manner of what3words in fixed three-slot arity — a term (word or hyphen-compound) per slot — not in geospatial metric. Hawaiian parallels stay visible: *hā* breathes at the threshold; hoʻokele names navigation by held bearing. The approved exchange term remains **bearing vector**.

Slot order carries the drift gradient: **Ha** drifts slowest, **Ka** at moderate pace, **Ba** fastest. Prefix-stability follows from this law: shared Ha clusters meaningfully while Ba churns.

No metric stands yet claimed. The scheme names attitude and section; it defines no distance function over roots.

**Lineage and source.** The scheme declares a palimpsest lineage for its reinterpretation of the Ha-Ka-Ba triple.

- SDM (Luka Rejec) supplies the **hakaba matrix** itself --- the existential trinity **Ha** (body), **Ka** (soul), **Ba** (psyche). The lar-uri inherits it directly --- body → heading, soul → angle, psyche → carried dynamic --- and overlays the noun·adjective·verb mnemonic. (Source below.)
- Hawaiian *hā* supplies threshold-breath resonance for `ha`.
- Egyptian soul grammar supplies `ka`/`ba` as standing double and returning bird.
- Flight dynamics supplies the orientation frame (yaw · pitch · roll) and keeps the reading on attitude, not mapped position.
- what3words supplies mnemonic three-slot arity; `lar:` fills each slot with a term and forks away from geospatial metric.
- hoʻokele supplies the wayfinding doctrine: hold bearing, infer position.

Source: Luka Rejec, *Vastlands Guidebook* §"Death and Hakaba" --- *"the existential trinity of body (ha), soul (ka), and psyche (ba)"*: the soul as the motive fire of consciousness, the psyche as its unique direction, the body as its vehicle. Adapted from Ancient Egyptian person-conceptions (the *Coffin Texts* and *Book of the Dead*). Indexed in *Ultraviolet Grasslands 2e*, pp. 230–234 (*Ha, Ka, Ba* & *hakaba matrix* 230; *ha · body* 234; *ka · soul* 234; *ba · personality* 232). Hawaiian *hā* (threshold-breath) layers atop the `ha` slot as palimpsest resonance.

Audit anchors carried forward: "Ha: Body... vehicle"; "Ka: Soul... motive fire"; "Ba: Psyche... unique direction." These anchors justify heading/angle/dynamic reinterpretation without claiming strict one-to-one term identity.

Fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`, `#pranala-name`.

BEARING (path) → SECTION (fragment).

<<~/ahu >>

<<~ ahu #conformance >>

## Conformance Classes

A **conforming parser** MUST: accept the surface of #scheme-syntax; reject a path with fewer than three root slots (stable/unstable); reject a slot bearing an underscore, whitespace, or non-ASCII (an internal hyphen joins a compound term); reject an `@`-prefix outside `child[1]`; treat a `#fragment` as an opaque anchor.

A **conforming resolver** MUST: resolve against the local world graph only; map an `@`-surface (a `bags/@…` or `wikis/@…` segment) through the island manifest's `BagResolver`; treat the URI as the stable address and the doc as the bound house (one URI MAY bind different docs per device).

A **conforming author** SHOULD: use local form for stable addresses and system resource names; reserve session form for exchange spans; place the `@`-slug at `child[2]` of a `bags`/`wikis` surface, and keep a meme namespace bare at `child[1]`.

<<~/ahu >>

<<~ ahu #scheme-registration >>

## URI Scheme Registration (RFC 7595)

```
Scheme name:               lar
Status:                    provisional
Applications/protocols:    lararium nodes; memetic-wikitext carriers; CRDT-bag
                           federation; mesh tooling
Syntax:                    see #scheme-syntax (ABNF)
Encoding considerations:   ASCII only in the path; pct-encoding per RFC 3986
Interoperability:          names, does not dereference over a network; an
                           unknown resolver treats a lar: URI as an opaque name
Security considerations:   see #security
Contact:                   the operator (canon authority)
Author/Change controller:  this document (lar:///…/api/pono/lar-uri)
References:                 RFC 3986, RFC 4151, RFC 7595; [MWT], [PRANALA]
```

The scheme registers as **provisional**; a future submission MAY seek permanent status.

<<~/ahu >>

<<~ ahu #security >>

## Security Considerations

**Names, not fetches.** A `lar:` URI MUST resolve against the local world graph. A remote address reaches a peer through the explicit CRDT-federation path alone.

**Surface confusion.** An `@`-surface binds to a doc through the `BagResolver`. A processor MUST treat the URI as the address and the bound doc as untrusted until the manifest authorizes it; canon promotion MUST wait on manifest authorization, never on URI match alone.

**Slot injection.** A slot admits lowercase ASCII letters and internal hyphens only. A processor MUST reject non-ASCII, whitespace, underscores, dot/slash separators, or an out-of-position `@` rather than normalize them silently — silent normalization invites address spoofing.

**Session-form leakage.** Session form names a speaker. A processor MUST keep a session-form URI within its exchange span; a session-form URI reaching stable storage, a graph address, or a system resource name MUST surface as a violation.

<<~/ahu >>

<<~ ahu #examples >>

## Worked Examples (Non-Normative)

A stable API address with a fragment:
```
lar:///ha.ka.ba/lares/api/pono/meme#law
```

An unstable session territory:
```
lar:///threshold.uncertain.opens/notes/first-pass
```

An adjacent system resource:
```
lar:///LARES
```

A session-form speaker (exchange span only):
```
lar://mischief-muse:agent@host/ha.ka.ba/lares/turn/current
```

A registry entry pointing at another bag:
```
lar:///ha.ka.ba/bags/@catalog/corpus/elyncia   → (text) AutomergeUrl of lar:///ha.ka.ba/bags/@elyncia
```

<<~/ahu >>

<<~ ahu #references >>

## Normative References

- **[RFC2119]** / **[RFC8174]** — conformance key words.
- **[RFC3986]** — Uniform Resource Identifier (URI): Generic Syntax.
- **[RFC4151]** — the `tag:` URI scheme (names-not-fetches precedent).
- **[RFC5234]** — ABNF.
- **[RFC7595]** — Guidelines and Registration Procedures for URI Schemes.
- **[MWT]** — the memetic-wikitext markup specification (sibling submission): `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`.
- **[PRANALA]** — pranala edge law: `lar:///ha.ka.ba/lares/api/pono/pranala`.

<<~/ahu >>

<<~ ahu #annex-open >>

## Annex — Open Items (Informative)

- **Permanent registration.** The scheme registers as provisional; permanent status awaits a deliberate submission pass.
- **Session-form authority grammar.** The `alias:grant@host` shape reads stable for exchange; a fuller authority profile (capability proof, key binding) waits for the keyhive pass.
- **Unstable attitude-root vocabulary.** The Ha-Ka-Ba slot discipline holds; a registry of reserved attitude roots remains open.
- **Multi-bag disk projection — full-path-inside-bag.** Every file lives at its full uri-path inside its holding bag's mirror (`bags/@<bag>/<full-name>.md`): directory = residency, interior = the name, whole. Any bag holds any name losslessly.
- **Turn-as-meme-graph.** Live exchange turns already carry aim/yield wires, worn voices, rating marks, hoike/moolelo children — a meme-graph awaiting ingest. The unstable URIs minted per turn stand as declared-unresolved names for session-bag memes; an INGEST organ can decompose session logs into corpus.
- **Lineage citation.** Luka Rejec, *Vastlands Guidebook* §"Death and Hakaba" (the trinity body·soul·psyche), indexed in *Ultraviolet Grasslands 2e* pp. 230–234; Egyptian root: the *Coffin Texts* / *Book of the Dead*; Hawaiian *hā* as resonance.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ sense whether the URI carries local form or session form; identify path class
⏿ orient against scheme law — slot count, path class, `child[1]` kind-plane-or-namespace
◇ decide: valid → carry forward; invalid → surface violation; ambiguous → surface and hold
▶ confirm the path holds ASCII only
↺ verify the three-term root and the `child[1]` fork (surface `@`-slug or bare namespace); close — address confirmed or violation named

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/lares/api/pono/lar-uri/SKILL >>
<<~ loulou lar:///ha.ka.ba/lares/docs/pono/lar-uri >>
<<~ loulou lar:///ha.ka.ba/lararium/api/sync-namespace >>

<<~ loulou lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
