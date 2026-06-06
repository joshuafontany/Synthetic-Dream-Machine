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

The `lar:` URI scheme names a place in a content-addressed meme graph — one parseable address per named unit. Like `tag:` (RFC 4151), a `lar:` URI **names; it does not fetch**: resolution runs against a local world graph, never as a network instruction. The scheme carries two forms — a **local form** for stable graph addresses and system resource names, and a **session form** that names a speaker for exchange spans — and a three-slot coordinate path rooted in a Ha-Ka-Ba (noun · adjective · verb) triple.

This specification names the scheme syntax (a formal ABNF grammar), the path taxonomy, the `@`-bag CRDT-surface rule, the resolution model, and the conformance, scheme-registration, and security obligations a processor MUST meet. It forms a **sibling submission** to the memetic-wikitext markup specification, which addresses its content by this scheme.

<<~/ahu >>

<<~ ahu #status >>

## Status and Maturity

This document holds **submission-draft** maturity. The scheme law, path taxonomy, and `@`-bag rule read as stable. The formal grammar, conformance classes, scheme registration, and security considerations carry RFC-2119 normative force. Items in the Annex remain open. Promotion to canon rests with the operator, not the document.

<<~/ahu >>

<<~ ahu #introduction >>

## Introduction — Scope, Audience, and Relation to memetic-wikitext

**Scope.** This specification covers the syntax of the `lar:` URI scheme, the path taxonomy and slot discipline, the one-bag `@`-surface rule, and the resolution model. It governs how an address gets **written and resolved** — never what the named unit **means** beyond its identity.

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
| **session form** | `lar://alias:tier@host/path` — names a speaker; exchange spans only. |
| **triple** | the three-slot `w1.w2.w3` coordinate root (Ha noun · Ka adjective · Ba verb). |
| **bag** | a CRDT surface (today an Automerge doc); designated by one `@`-tagged segment. |
| **slot** | one lowercase word in the triple. |
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
authority     = alias ":" tier "@" host    ; host per RFC 3986

path          = stable-path / unstable-path / adjacent-path
stable-path   = "ha.ka.ba" [ "/" bag-seg ] *( "/" segment )
unstable-path = triple [ "/" bag-seg ] *( "/" segment )
adjacent-path = segment                    ; no triple root, no bag-seg

triple        = word "." word "." word     ; Ha noun . Ka adj . Ba verb
bag-seg       = "@" name                    ; child[1] ONLY — one CRDT bag
segment       = 1*( unreserved / pct-encoded )   ; child[2]+ : MUST NOT carry "@"
word          = 1*( %x61-7A )              ; one slot: lowercase only
name          = 1*( unreserved )
alias         = 1*( unreserved )
tier          = 1*( unreserved )
```

A `lar:` URI MUST hold ASCII only. A slot MUST NOT carry a hyphen, underscore, or space. A stable or unstable path MUST carry a full three-slot root; fewer than three slots MUST NOT appear. An adjacent path MUST NOT carry HA.KA.BA dot-notation in its root.

<<~/ahu >>

<<~ ahu #path-taxonomy >>

## Path Taxonomy

**Stable** — literal `ha.ka.ba` root, permanent API surfaces:
```
lar:///ha.ka.ba/@lares/v0.1/api/pono/meme
lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri
```

**Unstable** — arbitrary three-word coordinate, session-specific territory:
```
lar:///threshold.uncertain.opens/
```

**Adjacent** — no three-word root, local system resources, often ALLCAPS:
```
lar:///AGENTS    lar:///LARES    lar:///CRYSTAL
```

Adjacent paths MUST NOT carry HA.KA.BA dot-notation in the path root.

For stable and unstable paths: each slot holds exactly one lowercase word — Ha (NOUN), Ka (ADJECTIVE), Ba (VERB). Hyphens, underscores, and spaces within a slot MUST NOT appear. Fewer than three slots MUST NOT appear. Sub-path after the triple navigates within territory; strip it to get the named tagspace address.

### TW5 System Boundary

TW5 reserves the `$:/` URI prefix for system tiddlers that stay browser-local — shadow tiddlers, palette state, draft markers, plugin internals. The lararium sync filter mirrors this distinction: only titles in the `lar:` scheme cross the sync boundary into Automerge bags and onto disk.

Lares system tiddlers — cascade configs, render templates, global mounts, plugin envelopes — MUST carry `lar:///` titles (typically under `lar:///config/...`, `lar:///mounts/...`, `lar:///plugins/...`, or `lar:///ha.ka.ba/@lararium/templates/...`). This lets browser-side shadow-tiddler edits and in-VM plugin re-packs sync to disk and federate to peers; it lets residency-action handlers trust the bag state.

Tag *values* may still reference TW5-conventional `$:/tags/...` strings (`$:/tags/Global`, `$:/tags/Lar/AhuTemplate`). Tag values are not titles and do not intersect the sync filter; they exist only so that cascade entries plug into TW5 core's standard tag-discovery path.

Drafts, ephemeral UX state, and per-operator working surface remain in the `$:/` namespace by design — those tiddlers stay browser-local until the operator's explicit promotion act.

For drag-and-drop distribution to the broader TW5 community, lar-namespaced plugin envelopes MAY be re-emitted under `$:/plugins/...` titles. The plugin module code is identical; only the envelope title differs. This dual-distribution shape is a packaging convention, not a namespace exception — the canonical artifact carrying the operator's signature is always the `lar:///` form.

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

1. `child[0]` = the `w1.w2.w3` root (literal `ha.ka.ba` for stable; coordinate triple for unstable).
2. `child[1]` MAY carry `@<name>` — names a top-level bag. Each bag has exactly one canonical address.
3. `child[2]` and deeper MUST NOT carry `@`-prefix. Those segments name tiddlers (or path navigation) within the bag's address space — never further sub-bags.
4. Resolution: the runtime resolves an `@`-tagged segment to an AutomergeUrl via the `BagResolver` map carried in the island manifest. The URI is the slot identity; the resolver maps it to the live doc. Two devices binding the same slot URI to different doc URLs (different recipes, different personal docs, etc.) is the normal case — the URI is the address, the doc is the house.

Registry pattern. A bag MAY hold tiddlers whose titles are *paths inside it* pointing at OTHER bags. The canonical example is `@catalog`, which tracks corpus bags via entries at `lar:///ha.ka.ba/@catalog/corpus/<slug>` whose text holds the AutomergeUrl of the corresponding `lar:///ha.ka.ba/@<slug>` bag. Catalog catalogs; it does not host.

<<~/ahu >>

<<~ ahu #resolution >>

## Resolution Model

`lar:` **names**; it does not fetch. A processor MUST NOT treat a `lar:` reference as a network-fetch instruction. Resolution runs against the local world graph only:

1. Parse the URI to its form (local / session), path class, and optional fragment.
2. For an `@`-bag segment, map the bag identity to a live doc via the island manifest's `BagResolver`.
3. Resolve the remaining path to a named unit within that bag's address space.
4. Resolve a `#fragment` to a section / `ahu` / pranala anchor within the named unit.

Session form names the speaker through the authority. It MUST NOT appear in stable graph addresses, system resource names, or other storage — exchange spans only.

<<~/ahu >>

<<~ ahu #signal-law >>

## Signal Law

The `lar:` URI names WHERE — place and nothing else, in ASCII.

Fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`, `#pranala-name`.

WHERE (path) → SECTION (fragment).

<<~/ahu >>

<<~ ahu #conformance >>

## Conformance Classes

A **conforming parser** MUST: accept the surface of #scheme-syntax; reject a path with fewer than three root slots (stable/unstable); reject a slot bearing a hyphen, underscore, space, or non-ASCII; reject an `@`-prefix outside `child[1]`; treat a `#fragment` as an opaque anchor.

A **conforming resolver** MUST: resolve against the local world graph only, never as a network fetch; map an `@`-bag segment through the island manifest's `BagResolver`; treat the URI as the stable address and the doc as the bound house (one URI MAY bind different docs per device).

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

**Names, not fetches.** A `lar:` URI MUST NOT trigger a network fetch. A resolver runs against the local world graph; a remote address reaches a peer only through the explicit CRDT-federation path, never by URI dereference.

**Bag confusion.** An `@`-bag binds to a doc through the `BagResolver`. A processor MUST treat the URI as the address and the bound doc as untrusted until the manifest authorizes it; it MUST NOT promote a doc to canon on URI match alone.

**Slot injection.** A slot admits lowercase ASCII only. A processor MUST reject non-ASCII, separators, or an out-of-position `@` rather than normalize them silently — silent normalization invites address spoofing.

**Session-form leakage.** Session form names a speaker. A processor MUST NOT persist a session-form URI into stable storage, a graph address, or a system resource name; such a URI escaping its span MUST surface as a violation.

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
lar://mischief-muse:synthesis@host/ha.ka.ba/@lares/turn/current
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
- **Session-form authority grammar.** The `alias:tier@host` shape reads stable for exchange; a fuller authority profile (capability proof, key binding) waits for the keyhive pass.
- **Unstable-coordinate vocabulary.** The Ha-Ka-Ba slot discipline holds; a registry of reserved coordinates remains open.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ sense whether the URI carries local form or session form; identify path class
⏿ orient against scheme law — slot count, path class, `@`-bag placement
◇ decide: valid → carry forward; invalid → surface violation; ambiguous → surface and hold
▶ confirm the path holds ASCII only
↺ verify the three-word root and the single `@`-bag segment; close — address confirmed or violation named

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>

<<~ pranala #sibling-spec ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:relation role:sibling-spec >>
<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
