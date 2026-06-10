<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/lar-uri"
file-path = "bags/@lares/v0.1/api/pono/lar-uri.md"
type = "text/x-memetic-wikitext"
register = "Synthesis-Canon"
manaoio = 17
mana = 18
manao = 17
namespace = "ॐ ँ"
role = "submission-grade specification for the lar: URI scheme — abstract, ABNF, resolution model, conformance, scheme registration, security; sibling submission to memetic-wikitext"
status = "submission-draft"
cacheable=true
retain = true
grammar = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #abstract >>

# The `lar:` URI Scheme — A Naming Scheme for the Meme Graph

## Abstract

The `lar:` URI scheme names an address in a content-addressed meme graph — one parseable address per named unit. Like `tag:` (RFC 4151), a `lar:` URI **names; it does not fetch**: resolution runs against a local world graph alone. The scheme carries two forms — a **local form** for stable graph addresses and system resource names, and a **session form** that names a speaker for exchange spans — and a three-slot attitude root carried by a Ha-Ka-Ba (heading · angle · dynamic) triple.

This specification names the scheme syntax (a formal ABNF grammar), the path taxonomy, the `@`-bag CRDT-surface rule, the resolution model, and the conformance, scheme-registration, and security obligations a processor MUST meet. It forms a **sibling submission** to the memetic-wikitext markup specification, which addresses its content by this scheme.

<<~/ahu >>

<<~ ahu #status >>

## Status and Maturity

This document holds **submission-draft** maturity. The scheme law, path taxonomy, and `@`-bag rule read as stable. The formal grammar, conformance classes, scheme registration, and security considerations carry RFC-2119 normative force. Items in the Annex remain open. Promotion to canon rests with the operator, not the document.

<<~/ahu >>

<<~ ahu #introduction >>

## Introduction — Scope, Audience, and Relation to memetic-wikitext

**Scope.** This specification covers the syntax of the `lar:` URI scheme, the path taxonomy and slot discipline, the one-bag `@`-surface rule, and the resolution model. It governs how an address gets **written and resolved**, and stops at identity; what the named unit **means** beyond its identity lives elsewhere.

**Out of scope.** The content carried at a `lar:` address, and the markup that authors it, ride the sibling `memetic-wikitext` specification (Normative Reference [MWT]). The typed-edge grammar rides [PRANALA]. The operational addressing discipline lives at `lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL`.

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
| **bag** | a CRDT surface (today an Automerge doc); designated by one `@`-tagged segment. |
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
stable-path   = "ha.ka.ba" [ "/" bag-seg ] *( "/" segment )
unstable-path = triple [ "/" bag-seg ] *( "/" segment )
adjacent-path = segment                    ; no triple root, no bag-seg

triple        = word "." word "." word     ; Ha heading . Ka angle . Ba dynamic
bag-seg       = "@" name                    ; child[1] ONLY — one CRDT bag
segment       = 1*( unreserved / pct-encoded )   ; child[2]+ : MUST NOT carry "@"
word          = 1*( %x61-7A )              ; one slot: lowercase only
name          = 1*( unreserved )
alias         = 1*( unreserved )
grant          = 1*( unreserved )
```

A `lar:` URI MUST hold ASCII only. A slot MUST hold lowercase ASCII letters alone. A stable or unstable path MUST carry a full three-slot root. An adjacent path MUST carry a non-dotted root.

<<~/ahu >>

<<~ ahu #path-taxonomy >>

## Path Taxonomy

**Stable** — literal `ha.ka.ba` root, permanent API surfaces:
```
lar:///ha.ka.ba/@lares/v0.1/api/pono/meme
lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri
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

For stable and unstable paths: each slot holds exactly one lowercase term — a word or a hyphen-joined compound — Ha (heading), Ka (angle), Ba (carried dynamic). The noun/adjective/verb grammar remains the parse mnemonic; the URI ontology reads as bearing, not mapped position. Each slot MUST hold lowercase letters and hyphens alone, and the root MUST carry exactly three terms (count the dots: exactly two); a term hyphen-joining more than two stems trips Address Smuggling. Sub-path after the triple narrows the bearing within the named surface; strip it to get the named tagspace address.

### TW5 System Boundary

The `lar:` scheme serves as the lararium **sync-filter predicate**: only `lar:`-titled tiddlers cross the sync boundary into Automerge bags and onto disk, while the TW5 `$:/` namespace stays browser-local. The scheme names *what* crosses; the operational residency rules — system-tiddler siting, tag-value exemption, draft locality, and the `$:/plugins/` dual-distribution convention — ride the **sync-namespace** law: `lar:///ha.ka.ba/@lararium/v0.1/api/sync-namespace`.

<<~/ahu >>

<<~ ahu #bag-surface >>

## Bag Surface — `@` Designates a CRDT Surface

Within lar paths (`lar:///ha.ka.ba/...` OR `lar:///w1.w2.w3/...` style), exactly **one** path segment MAY carry an `@`-tag prefix: **`child[1]` only**. An `@`-tagged segment designates **a bag — a CRDT surface (today an Automerge doc)**. Every bag has exactly one canonical address.

```
lar:///ha.ka.ba/@lares                     ← child[1]=@lares       : the personality bag
lar:///ha.ka.ba/@lararium                  ← child[1]=@lararium    : the system bag
lar:///ha.ka.ba/@admin                     ← child[1]=@admin       : the admin wiki bag
lar:///ha.ka.ba/@synthetic-dream-machine   ← child[1]=@<wiki-slug> : a wiki bag
lar:///ha.ka.ba/@elyncia                   ← child[1]=@<corpus>    : a canon content bag
lar:///ha.ka.ba/@personal                  ← child[1]=@personal    : the personal slot
lar:///ha.ka.ba/@draft                     ← child[1]=@draft       : the draft slot
lar:///ha.ka.ba/@temp                      ← child[1]=@temp        : the volatile slot (no CRDT)
```

Law summary:

1. `child[0]` = the `w1.w2.w3` root (literal `ha.ka.ba` for stable; attitude triple for unstable).
2. `child[1]` MAY carry `@<name>` — names a top-level bag. Each bag has exactly one canonical address.
3. `child[2]` and deeper name tiddlers (or path navigation) within the bag's address space; the `@`-prefix rides `child[1]` alone.
4. Resolution: the runtime resolves an `@`-tagged segment to an AutomergeUrl via the `BagResolver` map carried in the island manifest. The URI is the slot identity; the resolver maps it to the live doc. Two devices binding the same slot URI to different doc URLs (different recipes, different personal docs, etc.) is the normal case — the URI is the address, the doc is the house.

Registry pattern. A bag MAY hold tiddlers whose titles are *paths inside it* pointing at OTHER bags. The canonical example is `@catalog`, which tracks corpus bags via entries at `lar:///ha.ka.ba/@catalog/corpus/<slug>` whose text holds the AutomergeUrl of the corresponding `lar:///ha.ka.ba/@<slug>` bag. Catalog catalogs; it does not host.

<<~/ahu >>

<<~ ahu #resolution >>

## Resolution Model

`lar:` **names**; it does not fetch. A processor MUST resolve a `lar:` reference against the local world graph only:

1. Parse the URI to its form (local / session), path class, and optional fragment.
2. For an `@`-bag segment, map the bag identity to a live doc via the island manifest's `BagResolver`.
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

**Lineage and source bind.** We declare a palimpsest lineage for this reinterpretation.

- SDM (Luka Rejec) supplies the **hakaba matrix** itself --- the existential trinity **Ha** (body), **Ka** (soul), **Ba** (psyche). The lar-uri inherits it directly --- body → heading, soul → angle, psyche → carried dynamic --- and overlays the noun·adjective·verb mnemonic. (Source below.)
- Hawaiian *hā* supplies threshold-breath resonance for `ha`.
- Egyptian soul grammar supplies `ka`/`ba` as standing double and returning bird.
- Flight dynamics supplies the orientation frame (yaw · pitch · roll) and keeps the reading on attitude, not mapped position.
- what3words supplies mnemonic three-slot arity; `lar:` fills each slot with a term and forks away from geospatial metric.
- hoʻokele supplies the wayfinding doctrine: hold bearing, infer position.

Source bind (on the `sdm/` shelf): Luka Rejec, *Vastlands Guidebook* §"Death and Hakaba" --- *"the existential trinity of body (ha), soul (ka), and psyche (ba)"*: the soul as the motive fire of consciousness, the psyche as its unique direction, the body as its vehicle. Adapted from Ancient Egyptian person-conceptions (the *Coffin Texts* and *Book of the Dead*). Indexed in *Ultraviolet Grasslands 2e*, pp. 230–234 (*Ha, Ka, Ba* & *hakaba matrix* 230; *ha · body* 234; *ka · soul* 234; *ba · personality* 232). On disk: `sdm/Vastlands_Guidebook/`, `sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/`. Hawaiian *hā* (threshold-breath) layers atop the `ha` slot as palimpsest resonance.

Audit anchors carried forward: "Ha: Body... vehicle"; "Ka: Soul... motive fire"; "Ba: Psyche... unique direction." These anchors justify heading/angle/dynamic reinterpretation without claiming strict one-to-one term identity.

Fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`, `#pranala-name`.

BEARING (path) → SECTION (fragment).

<<~/ahu >>

<<~ ahu #conformance >>

## Conformance Classes

A **conforming parser** MUST: accept the surface of #scheme-syntax; reject a path with fewer than three root slots (stable/unstable); reject a slot bearing an underscore, whitespace, or non-ASCII (an internal hyphen joins a compound term); reject an `@`-prefix outside `child[1]`; treat a `#fragment` as an opaque anchor.

A **conforming resolver** MUST: resolve against the local world graph only; map an `@`-bag segment through the island manifest's `BagResolver`; treat the URI as the stable address and the doc as the bound house (one URI MAY bind different docs per device).

A **conforming author** SHOULD: use local form for stable addresses and system resource names; reserve session form for exchange spans; keep one `@`-bag per address at `child[1]`.

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

**Bag confusion.** An `@`-bag binds to a doc through the `BagResolver`. A processor MUST treat the URI as the address and the bound doc as untrusted until the manifest authorizes it; canon promotion MUST wait on manifest authorization, never on URI match alone.

**Slot injection.** A slot admits lowercase ASCII letters and internal hyphens only. A processor MUST reject non-ASCII, whitespace, underscores, dot/slash separators, or an out-of-position `@` rather than normalize them silently — silent normalization invites address spoofing.

**Session-form leakage.** Session form names a speaker. A processor MUST keep a session-form URI within its exchange span; a session-form URI reaching stable storage, a graph address, or a system resource name MUST surface as a violation.

<<~/ahu >>

<<~ ahu #examples >>

## Worked Examples (Non-Normative)

A stable API address with a bag and a fragment:
```
lar:///ha.ka.ba/@lares/v0.1/api/pono/meme#law
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
lar://mischief-muse:agent@host/ha.ka.ba/@lares/turn/current
```

A registry entry pointing at another bag:
```
lar:///ha.ka.ba/@catalog/corpus/elyncia   → (text) AutomergeUrl of lar:///ha.ka.ba/@elyncia
```

<<~/ahu >>

<<~ ahu #references >>

## Normative References

- **[RFC2119]** / **[RFC8174]** — conformance key words.
- **[RFC3986]** — Uniform Resource Identifier (URI): Generic Syntax.
- **[RFC4151]** — the `tag:` URI scheme (names-not-fetches precedent).
- **[RFC5234]** — ABNF.
- **[RFC7595]** — Guidelines and Registration Procedures for URI Schemes.
- **[MWT]** — the memetic-wikitext markup specification (sibling submission): `lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext`.
- **[PRANALA]** — pranala edge law: `lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala`.

<<~/ahu >>

<<~ ahu #annex-open >>

## Annex — Open Items (Informative)

- **Permanent registration.** The scheme registers as provisional; permanent status awaits a deliberate submission pass.
- **Session-form authority grammar.** The `alias:grant@host` shape reads stable for exchange; a fuller authority profile (capability proof, key binding) waits for the keyhive pass.
- **Unstable attitude-root vocabulary.** The Ha-Ka-Ba slot discipline holds; a registry of reserved attitude roots remains open.
- **Lineage citation bind.** BOUND 2026-06-08 from the `sdm/` shelf: Luka Rejec, *Vastlands Guidebook* §"Death and Hakaba" (the trinity body·soul·psyche), indexed in *UVG 2e* pp. 230–234. Egyptian root named in source: the *Coffin Texts* / *Book of the Dead*. Hawaiian *hā* layers as resonance.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ sense whether the URI carries local form or session form; identify path class
⏿ orient against scheme law — slot count, path class, `@`-bag placement
◇ decide: valid → carry forward; invalid → surface violation; ambiguous → surface and hold
▶ confirm the path holds ASCII only
↺ verify the three-term root and the single `@`-bag segment; close — address confirmed or violation named

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/sync-namespace >>

<<~ pranala #sibling-spec ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:relation role:sibling-spec >>
<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
