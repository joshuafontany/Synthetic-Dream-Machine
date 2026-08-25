

- `lar:///ha.ka.ba/lares/api/pono/RFC-2119#normative-language`

<a id="abstract"></a>

# The `lar:` URI Scheme — A Naming Scheme for the Meme Graph

## Abstract

The `lar:` URI scheme names an address in a content-addressed meme graph — one parseable address per named unit. Like `tag:` (RFC 4151), a `lar:` URI **names; it does not fetch**: resolution runs against a local world graph alone. The scheme carries two forms — a **local form** for stable graph addresses and system resource names, and a **session form** that names a speaker for exchange spans — and a three-slot attitude root carried by a Ha-Ka-Ba (heading · angle · dynamic) triple.

This specification names the scheme syntax (a formal ABNF grammar), the path taxonomy, the kind-plane surface rule (the `bags/` and `wikis/` segments designate a CRDT surface, while a meme namespace stands bare), the resolution model, and the conformance, scheme-registration, and security obligations a processor MUST meet. It forms a **sibling submission** to the memetic-wikitext markup specification, which addresses its content by this scheme.

<a id="status"></a>

## Status and Maturity

This document holds **submission-draft** maturity. The scheme law, path taxonomy, and kind-plane surface rule read as stable. The formal grammar, conformance classes, scheme registration, and security considerations carry RFC-2119 normative force. Items in the Annex remain open. Promotion to canon rests with the operator, not the document.

<a id="introduction"></a>

## Introduction — Scope, Audience, and Relation to memetic-wikitext

**Scope.** This specification covers the syntax of the `lar:` URI scheme, the path taxonomy and slot discipline, the kind-plane surface rule (the kind-plane segment names a CRDT surface; a bare `child[1]` names a meme namespace), and the resolution model. It governs how an address gets **written and resolved**, and stops at identity; what the named unit **means** beyond its identity lives elsewhere.

**Out of scope.** The content carried at a `lar:` address, and the markup that authors it, ride the sibling `memetic-wikitext` specification (Normative Reference [MWT]). The typed-edge grammar rides [PRANALA]. The operational addressing discipline lives at `lar:///ha.ka.ba/lares/api/pono/lar-uri/SKILL`.

**Relation to the memetic-wikitext specification.** Memetic-wikitext treats a `lar:` URI as an opaque content identity and defers its internal structure here. The two specifications form **one dual submission**: [MWT] names the markup; this document names the address. They SHALL cross-reference normatively.

**Precedent.** The naming-not-fetching posture follows `tag:` (RFC 4151). The syntax builds on the generic URI grammar (RFC 3986). Scheme registration follows RFC 7595.

**Name.** The three letters read as a mnemonic for properties this document then specifies, and carry no normative weight of their own: a `lar:` URI names a **relation** in a meme graph rather than a location; it does not dereference, so the referent it names stands **latent** until a local resolver acts on it (#resolution); and its path carries **attention** — where regard points — as bearing, never as a level or a coordinate (#signal-law). **Latent Attention Relation**. The name also carries the *lar*, the household spirit bound to a place rather than to a family, which names the same posture in an older register.

**Audience.** Implementers of parsers and resolvers; authors and registry maintainers; peers federating CRDT bags.

<a id="terminology"></a>

## Terminology and Conformance Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** carry the meanings in RFC 2119 / RFC 8174 when, and only when, they appear in capitals.

| term | meaning |
|---|---|
| --- | --- |
| **address** | one resolved `lar:` URI; the identity of a named graph unit. |
| **local form** | `lar:///path` — authority-less; for stable addresses and system resource names. |
| **session form** | `lar://alias:grant@host/path` — names a speaker; exchange spans only. |
| **triple** | the three-slot `w1.w2.w3` attitude root (Ha heading · Ka angle · Ba carried dynamic). |
| **surface** | a CRDT surface (today an Automerge doc); designated by its kind-plane segment (`bags/slug`, `wikis/slug`). The slug reads as an opaque name. |
| **namespace** | a bare `child[1]` segment naming a meme's minting authority. |
| **kind-plane** | the reserved `child[1]` word that names a resolvable surface: `bags`, `wikis`, or `cid`. |
| **slot** | one lowercase term (word or hyphen-compound) in the triple. |
| **fragment** | a `#`-anchor whose meaning belongs to the media type of the unit it anchors into [RFC3986 §3.5]; the scheme carries it opaque. |

<a id="scheme-syntax"></a>

## Scheme Syntax (ABNF)

The following grammar uses ABNF (RFC 5234), importing `unreserved`, `pct-encoded`, `host`, and `fragment` from RFC 3986.

```abnf
lar-URI       = "lar:" hier-part [ "#" fragment ]

hier-part     = local-form / session-form
local-form    = "///" path                 ; authority-less
session-form  = "//" authority "/" path    ; speaker named
authority     = alias ":" grant "@" host    ; host per RFC 3986

path          = triple [ "/" child1 ] *( "/" segment )
                ; the literal triple "ha.ka.ba" names the STABLE root; any other triple, a session
                ; root — one grammar, and the taxonomy below carries the distinction, because the
                ; two classes differ in what they MEAN, never in how they parse.

triple        = word "." word "." word     ; Ha heading . Ka angle . Ba dynamic
child1        = surface / namespace         ; the child[1] fork: a CRDT surface, or a bare namespace
surface       = ( "bags" / "wikis" ) "/" segment   ; a CRDT surface: bags/slug · wikis/slug
              / "cid" "/" hash                     ; an immutable content-addressed artifact
namespace     = segment                    ; a bare meme minting namespace;
                                            ;   MUST NOT equal a kind-plane word (bags / wikis / cid)
segment       = 1*pchar                    ; pchar per [RFC3986] §3.3 — imported, not restated;
                                            ;   a segment stays opaque to the generic syntax
word          = stem *( "-" stem )         ; one slot: a word, or a hyphen-joined compound
stem          = 1*( %x61-7A )              ; lowercase only
hash          = 1*( unreserved )
alias         = 1*( unreserved )
grant         = 1*( unreserved )
```

A `lar:` URI MUST hold ASCII only. A root slot MUST hold lowercase ASCII letters and hyphens alone. EVERY path MUST carry a full three-slot root — no class escapes it.  The words `bags`, `wikis`, and `cid` stand RESERVED at `child[1]` — a meme namespace MUST NOT equal one.

**The scheme-relative form: `uri-path`.** Instruments and carrier declarations abbreviate an address to
its `uri-path` — the spelling with the leading `lar:///` removed, codepoint-identical to the path it
abbreviates. A carrier's identity block declares its own address in this form, and every corpus
instrument walks it. The abbreviation carries no semantics of its own: `uri-path = "ha.ka.ba/x/y"` and
`lar:///ha.ka.ba/x/y` name one address, related by exactly seven leading characters, and the equality
rule (#equality) reads through the abbreviation unchanged. Defined here and only here: substructure
within a scheme lives in the scheme's defining document [RFC7320].

<a id="path-taxonomy"></a>

## Path Taxonomy

**Stable** — literal `ha.ka.ba` root, permanent API surfaces (bare meme namespace at `child[1]`):
```
lar:///ha.ka.ba/lares/api/pono/meme
lar:///ha.ka.ba/lares/api/pono/lar-uri
```

A CRDT surface names its kind-plane at `child[1]`, the `@`-slug at `child[2]`:
```
lar:///ha.ka.ba/bags/lares       a bag (mutable content surface)
lar:///ha.ka.ba/wikis/lares      a wiki (a #has bag-stack)
lar:///ha.ka.ba/cid/bafy…         an immutable content-addressed artifact
```

**Unstable** — arbitrary three-term attitude root, session-specific bearing:
```
lar:///threshold.uncertain.opens
```

**The root admits no exception.** A resource local to one device still stands at an address: an address
that skipped the root could not say which house it stood in, and a name that travels nowhere would then
read the same as a name that travels, with only the reader's assumption telling them apart.

(The `l-space` field's `adjacent` band names an unrelated axis — a locality of meaning, never an address class.)

For every path: each slot holds exactly one lowercase term — a word or a hyphen-joined compound — Ha (heading), Ka (angle), Ba (carried dynamic). The noun/adjective/verb grammar remains the parse mnemonic; the URI ontology reads as bearing, not mapped position. Each slot MUST hold lowercase letters and hyphens alone, and the root MUST carry exactly three terms (count the dots: exactly two); a term hyphen-joining more than two stems trips Address Smuggling. Sub-path after the triple narrows the bearing within the named surface; strip it to get the named l-space address.

### TW5 System Boundary

The sync boundary admits **any valid TW5 tiddler**: a plain-titled tiddler crosses into Automerge bags and onto disk as content, and a `lar:`-titled tiddler crosses as a **placed carrier** — address-bearing, corpus-walkable. What stays local, the **system filters** decide: the TW5 `$:/` plane — state, temp, drafts, shadow machinery — remains browser-local by filter, never by scheme. The scheme therefore gates nothing; it **names**. The operational residency rules — system-tiddler siting, tag-value exemption, draft locality, and the `$:/plugins/` dual-distribution convention — ride the **sync-namespace** law: `lar:///ha.ka.ba/lararium/api/sync-namespace`.

<a id="equality"></a>

## Equality

Two `lar:` URIs name one address exactly when their spellings match, codepoint for codepoint. No
normalization applies at comparison time: a comparer that transforms before comparing manufactures
equalities the author never wrote, and a spoofer aims whatever transform a comparer applies. The precedent stands in RFC 4151 §2.4, which settles `tag:` equality the same way so that
handling software compares without transforming.

The canonical spelling therefore carries the whole burden, and a conforming producer MUST emit it:

- the scheme lowercase, the local form spelled `lar:///` exactly;
- no percent-encoding of unreserved characters — `%61` and `a` spell different names, so only the bare
  spelling conforms;
- no dot-segments — a URI carrying `.` or `..` as a complete segment stands INVALID, and a consumer
  MUST reject it rather than resolve it. Resolution-time dot-segment removal (RFC 3986 §5.2.4) rewrites
  an address silently before any comparison — the spoofing surface this rule closes;
- no empty segments — `//` within a path and a trailing `/` each produce one, and neither conforms.

The session form never names a stable address (#path-taxonomy), so equality across the two forms never
holds: `lar://alias:grant@host/p` and `lar:///p` spell different strings and name different things —
the first a speaker's span, the second a place in the graph.

A resolver MAY dereference less than equality distinguishes — disk projection, for one, reads only the
path — but it MUST NOT report two addresses equal that this rule reads apart.

<a id="minting"></a>

## Minting and Collision

Minting stays open: any device MAY mint any address, and no registry gates it — a mint authority would
stand as a global now, which this scheme's substrate refuses. An open mint owes a lawful answer to
collision instead, and the substrate already carries one:

**An address names one place; a bag holds one testimony about it.** Multiple bags MAY hold different
content under one address without fault. A wiki reads through a **recipe** — an ordered #has stack of
bags, the live edit layer above all — and the highest bag holding the address answers for that wiki.
Which bag answered stays surfaced on the read path, so priority never masquerades as uniqueness.

Two consequences bind:

- **Same URI, same ADDRESS, on every peer.** What CONTENT stands at the address resolves per wiki,
  through that wiki's own recipe. No global now stands, so no global answer stands — a claim that one
  content reads canonical on every peer overreaches what an open mint can promise.
- **The immutable plane self-certifies.** A `cid/{hash}` address binds its content by construction;
  a collision under it names an accident of hashing, never a disagreement of testimony. Where a name
  must mean one content everywhere, that plane carries it.

<a id="bag-surface"></a>

## Surface Designation — `@` Names a CRDT Surface

A **kind-plane** segment at `child[1]` (`bags`, `wikis`, `cid`) opens a **CRDT surface** — a resolvable mutable doc (today an Automerge doc) — with the slug or hash at `child[2]`. A meme **namespace** stands as any other bare word at `child[1]`. The two never collide: the kind-plane word opens the surface, and any other word opens the namespace.

- **`bags/{slug}`** — a bag: a mutable content surface (a composable recipe piece).
- **`wikis/{slug}`** — a wiki: a `#has` bag-stack IDENTITY, distinct from its CANON (`bags/{slug}`). Its per-wiki live layers extend the identity as `wikis/{slug}/{temp,draft,working,personal}`.
- **`cid/{hash}`** — an immutable content-addressed artifact; the name IS the content hash.

```
lar:///ha.ka.ba/lares/api/pono/lar-uri          ← a meme (bare namespace at child[1])
lar:///ha.ka.ba/bags/lares                     ← the personality bag
lar:///ha.ka.ba/bags/lararium                  ← the system corpus bag
lar:///ha.ka.ba/wikis/synthetic-dream-machine   ← a wiki IDENTITY (its #has-stack)
lar:///ha.ka.ba/bags/synthetic-dream-machine    ← that wiki's CANON content bag
lar:///ha.ka.ba/wikis/synthetic-dream-machine/personal  ← that wiki's personal slot
lar:///ha.ka.ba/wikis/synthetic-dream-machine/draft     ← that wiki's draft slot
lar:///ha.ka.ba/cid/bafy…                        ← an immutable artifact
```

Law summary:

1. `child[0]` = the `w1.w2.w3` root (literal `ha.ka.ba` for stable; attitude triple for unstable).
2. `child[1]` forks: a reserved **kind-plane** word (`bags`, `wikis`, `cid`) opens a CRDT surface or artifact; any other bare word names a **meme namespace** — the minting authority. The `@`-tag rides `child[2]` of a `bags`/`wikis` surface, and nowhere else.
3. A CRDT surface carries exactly one canonical address. A wiki's per-wiki live slots extend its identity at `child[3]` (`wikis/{slug}/{kind}`).
4. Resolution: the runtime resolves a surface to an AutomergeUrl via the resolver map carried in the device's runtime manifest. The URI carries the identity; the resolver maps it to the live doc. Two devices binding one surface URI to different doc URLs (different recipes, different personal docs) run as the normal case — the URI names the address, and the doc stands as the house.

Registry pattern. A bag MAY hold tiddlers whose titles read as *paths inside it*, pointing at other surfaces. `bags/catalog` carries the canonical example: it tracks corpus bags via entries at `lar:///ha.ka.ba/bags/catalog/corpus/{slug}` whose text holds the AutomergeUrl of the corresponding `lar:///ha.ka.ba/bags/{slug}` bag. Catalog catalogs; it does not host.

<a id="five-planes"></a>

## The Five Planes

The schema carries five independent planes; conflating them trips residency, projection, and federation work. This reading runs ahead of settled field vocabulary and stays open to better words.

1. **NAME** — the URI identifies, full stop. A bare `child[1]` segment names the **minting namespace** (the authority that named the unit), never a residency claim. The name survives COPY, MOVE, multi-bag presence, deletion, and federation unchanged (coordinate ⊥ change-identity).
2. **RESIDENCY** — which surfaces hold a manifestation NOW = a queried relation (`listBagsHolding`, catalog holdings, recipe stacks), never derived from the path. The same URI lawfully exists in a draft layer AND a canon bag AND a personal layer at once, shadowed by layer order. Name and holding surface coincide only by convention.
3. **SITING** — where a projection of a manifestation lands on disk: a per-bag mirror convention (`loci` derivation = the canon-bag rule, one projection rule among possible many), gated by the disk-mirror GRANT, never implied by the name.
4. **SPEECH** — the hostful session form (`lar://alias:grant@host/...`): who speaks, under what grant, from where — a speech-act envelope for exchange spans, never storage.
5. **STABILITY** — literal `ha.ka.ba` (settled namespace) vs unstable attitude roots (session bearing, declared-unresolved until adopted into a bag).

The planes compose: a turn of live exchange mints SPEECH + STABILITY-unstable names; adoption moves a unit to NAME-stable; LOAD/INGEST set RESIDENCY; the mirror grant sets SITING. No plane ever answers for another.

<a id="resolution"></a>

## Resolution Model

`lar:` **names**; it does not fetch. A processor MUST resolve a `lar:` reference against the local world graph only:

1. Parse the URI to its form (local / session), path class, and optional fragment.
2. For a kind-plane surface (`bags/…` or `wikis/…`), map the surface identity to a live doc via the runtime manifest's resolver map.
3. Resolve the remaining path to a named unit within that bag's address space.
4. Hand a `#fragment` to the named unit's media type unread: fragment semantics belong to the representation, never to the scheme [RFC3986 §3.5] — and absent a representation, they stay unconstrained.

Session form names the speaker through the authority. It MUST stay within exchange spans, away from stable graph addresses, system resource names, and other storage.

**The userinfo slot carries the grant by design.** [RFC3986] §3.2.1 deprecates `user:password` in the userinfo slot — a secret before an unencrypted transport. The grant stands in that slot anyway, deliberately: `alias:grant` re-uses the one authority shape every URI reader — parser, tool, or model — already holds, bent to a new office rather than fighting it. The grant names a capability reference, never a secret: it authorizes nothing by itself, discloses nothing when logged, and rides only within exchange spans the transport already protects. The deprecation guards against a hazard this slot's cargo does not carry, and the familiar shape means every existing URI parser splits the speaker correctly with no new grammar taught.

<a id="signal-law"></a>

## Signal Law

The `lar:` URI names bearing — attitude and section, nothing mutable, in ASCII.

The root carries an attitude triple: **Ha** sets the heading faced, **Ka** sets the angle of approach, and **Ba** carries the dynamic underway. This runs after the manner of what3words in fixed three-slot arity — a term (word or hyphen-compound) per slot — not in geospatial metric. Hawaiian parallels stay visible: *hā* breathes at the threshold; hoʻokele names navigation by held bearing. The approved exchange term remains **bearing vector**.

Slot order carries the drift gradient: **Ha** drifts slowest, **Ka** at moderate pace, **Ba** fastest. Prefix-stability follows from this law: shared Ha clusters meaningfully while Ba churns.

No metric stands yet claimed. The scheme names attitude and section; it defines no distance function over roots.

**Lineage.** The Ha-Ka-Ba reading carries a declared palimpsest lineage; the citation and its audit
anchors ride the documentation companion (lar:///ha.ka.ba/lares/docs/pono/lar-uri#lineage).

Fragment (`#`) carries an anchor whose meaning the anchored unit's media type defines; the scheme carries it opaque.

BEARING (path) → ANCHOR (fragment, media-type-defined).

<a id="conformance"></a>

## Conformance Classes

A **conforming parser** MUST: accept the surface of #scheme-syntax; reject a path with fewer than three root slots (the root arity law); reject a ROOT slot bearing an underscore, whitespace, or non-ASCII (an internal hyphen joins a compound term); treat a `#fragment` as an opaque anchor.

A **conforming resolver** MUST: resolve against the local graph only; map a kind-plane surface (a `bags/…` or `wikis/…` path) to its live doc through the device's runtime manifest; treat the URI as the stable address and the doc as the bound store (one URI MAY bind different docs per device).

A **conforming author** SHOULD: use local form for stable addresses and system resource names; reserve session form for exchange spans; place the slug at `child[2]` of a `bags`/`wikis` surface, and keep a meme namespace bare at `child[1]`.

<a id="scheme-registration"></a>

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
Contact:                   Joshua Fontany <joshua.fontany@gmail.com>
Author/Change controller:  Joshua Fontany; specification of record:
                           this document (lar:///…/api/pono/lar-uri)
References:                 RFC 3986, RFC 4151, RFC 7595; [MWT], [PRANALA]
```

The scheme registers as **provisional**; a future submission MAY seek permanent status.

<a id="security"></a>

## Security Considerations

**Names, not fetches.** A `lar:` URI MUST resolve against the local world graph. A remote address reaches a peer through the explicit CRDT-federation path alone.

**Surface confusion.** An `@`-surface binds to a doc through the `BagResolver`. A processor MUST treat the URI as the address and the bound doc as untrusted until the manifest authorizes it; canon promotion MUST wait on manifest authorization, never on URI match alone.

**Slot injection.** A slot admits lowercase ASCII letters and internal hyphens only. A processor MUST reject non-ASCII, whitespace, underscores, dot/slash separators, or an out-of-position `@` rather than normalize them silently — silent normalization invites address spoofing.

**Session-form leakage.** Session form names a speaker. A processor MUST keep a session-form URI within its exchange span; a session-form URI reaching stable storage, a graph address, or a system resource name MUST surface as a violation.

<a id="examples"></a>

## Worked Examples (Non-Normative)

A stable API address with a fragment:
```
lar:///ha.ka.ba/lares/api/pono/meme#law
```

An unstable session territory:
```
lar:///threshold.uncertain.opens/notes/first-pass
```

A session-form speaker (exchange span only):
```
lar://mischief-muse:agent@host/ha.ka.ba/lares/turn/current
```

A registry entry pointing at another bag:
```
lar:///ha.ka.ba/bags/catalog/corpus/elyncia   → (text) AutomergeUrl of lar:///ha.ka.ba/bags/elyncia
```

<a id="references"></a>

## Normative References

- **[RFC2119]** / **[RFC8174]** — conformance key words.
- **[RFC3986]** — Uniform Resource Identifier (URI): Generic Syntax.
- **[RFC4151]** — the `tag:` URI scheme (names-not-fetches precedent).
- **[RFC5234]** — ABNF.
- **[RFC7595]** — Guidelines and Registration Procedures for URI Schemes.
- **[MWT]** — the memetic-wikitext markup specification (sibling submission): `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`.
- **[PRANALA]** — pranala edge law: `lar:///ha.ka.ba/lares/api/pono/pranala`.

<a id="annex-open"></a>

## Annex — Open Items (Informative)

- **Permanent registration.** The scheme registers as provisional; permanent status awaits a deliberate submission pass.
- **Session-form authority grammar.** The `alias:grant@host` shape reads stable for exchange; a fuller authority profile (capability proof, key binding) waits for the keyhive pass.
- **Unstable attitude-root vocabulary.** The Ha-Ka-Ba slot discipline holds; a registry of reserved attitude roots remains open.
- **Multi-bag disk projection — full-path-inside-bag.** Every file lives at its full uri-path inside its holding bag's mirror (`bags/<bag>/<full-name>.mem`): directory = residency, interior = the name, whole. Any bag holds any name losslessly.
- **Turn-as-meme-graph.** Live exchange turns already carry aim/yield wires, worn voices, rating marks, hoike/moolelo children — a meme-graph awaiting ingest. The unstable URIs minted per turn stand as declared-unresolved names for session-bag memes; an INGEST organ can decompose session logs into corpus.

<a id="ooda-ha"></a>

✶ sense whether the URI carries local form or session form; identify path class
⏿ orient against scheme law — slot count, path class, `child[1]` kind-plane-or-namespace
◇ decide: valid → carry forward; invalid → surface violation; ambiguous → surface and hold
▶ confirm the path holds ASCII only
↺ verify the three-term root and the `child[1]` fork (surface `@`-slug or bare namespace); close — address confirmed or violation named

<a id="edges"></a>

## Edges

- `lar:///ha.ka.ba/lares/api/pono/lar-uri/SKILL`
- `lar:///ha.ka.ba/lares/docs/pono/lar-uri`
- `lar:///ha.ka.ba/lararium/api/sync-namespace`

- `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext`
