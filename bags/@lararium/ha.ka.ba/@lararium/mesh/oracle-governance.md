<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ◉&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/oracle-governance >>
```toml iam
cacheable = true
file-path = "bags/@lararium/ha.ka.ba/@lararium/mesh/oracle-governance.md"
l-space   = "lararium"
mana      = 14
manao     = 14
manaoio   = 12
namespace = "&#x25C9;"
register  = "Synthesis"
retain    = true
role      = "oracle-governance: a per-nexus @oracle board (ownership+scale grounds, NOT no-global-now — a shared docId names a rendezvous, each peer materializes its own causal island); a well-known root/index docId fanning to per-topic islands (Beelay's global-address/local-state); steward-SOURCE → public verify-only READ projection (NOT one cap-tiered doc); three couplings — origin, governance, liveness; PROPOSED, mostly unbuilt"
status    = "proposed"
tags      = ["mesh/dreamnet-architecture", "api/pono/group-as-closure", "api/pono/causal-islands"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/mesh/oracle-governance"
written   = "2026-06-29"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

# Oracle Governance

> Status: PROPOSED — design intent, mostly unbuilt. The Two-Faced read-face
> (`@oracle` content-addressed snapshot + signed monotone pointer) stands and witnessed
> live; the per-nexus board, the threshold-steward source, and the three couplings ride
> ahead of code.

The `@oracle` carries a public read substrate — *what this neighborhood holds out for
all to see*. This meme answers **who governs it, at what scale, and how it stays
un-capturable**. The short of it: **the founder seeds, the circle governs, the fork
guards.**

**One `@oracle`, two faces — never a second board.** This governance board reads as the
**read face** over the *same* `@oracle` substrate the registry/recipe plane already holds.
The **content/registry face** mints the recipe + engine-blob CIDs + protocol invariants
(<<~ loulou lar:///ha.ka.ba/@lares/docs/pono/wiki-layer-ontology#oracle-planes >>); the
governed **read face** named here projects that content for public verify-only sight. The
two name one `@oracle` seen two ways — no reader should mistake this board for a second
`@oracle`.

<<~ ahu #per-nexus-not-global >>

## Per-Nexus, Not One Global Board

An `@oracle` lives **per-nexus** — one public board per confederation — never one global
board for all of DreamNet. The grounds run **OWNERSHIP and SCALE**, never no-global-now:

- **Ownership** — each nexus governs its own public surface; no single board accrues
  authority over a hundred thousand sovereign Lararia (that re-introduces the hub the
  watershed guardrail forbids,
  <<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture#rhizome-rhymes >>).
- **Scale** — a planet-wide board concentrates write-pressure and read-fan into one
  bottleneck; per-nexus boards keep the lattice flat.

**Correct the no-global-now framing (MUST).** A *global* `@oracle` does NOT violate
no-global-now. A shared `docId` names a **rendezvous** — an address, not a shared present.
Each peer that dials it **materializes its own converging causal island** over that
address; the address coordinates, the state stays local-first. *That IS no-global-now
enacted, not breached* (<<~ loulou lar:///ha.ka.ba/@lares/api/pono/federated-causal-islands >>).
So per-nexus rests on ownership and scale, never on a no-global-now prohibition the shared
address would not trigger anyway.

<<~/ahu >>

<<~ ahu #board-model >>

## The Board Model — Global Address, Local Causal State

The board carries **one well-known per-nexus ROOT/INDEX `docId`** — the **global
address** — fanning by **transitive reachability** to a fan of **per-topic causal
islands**. This reads the Beelay pattern straight: *a stable global address, local
converging causal state behind it.*

```text
  @oracle ROOT/INDEX docId   ← the well-known global ADDRESS (one per nexus)
        │  transitive-reachability fan
        ├─► topic island: announcements   (its own causal island)
        ├─► topic island: corpus-pointers
        ├─► topic island: nexus-directory
        └─► ... users run their OWN topic boards off the same root
```

The root names *where to begin*; each topic island converges on its own. A reader walks
the reachability fan from the root and materializes only the topics it cares to read —
no peer holds the whole board *at once*, and none needs to.

**Coheres with the established `@oracle` (no new invention).** The corpus already names
`@oracle` the **public crossroads bulletin board** — a host-independent-docId CRDT the
net may **fork** (a founder who CAN be forked cannot rule), riding atop the system
pointer/recipe plane
(<<~ loulou lar:///ha.ka.ba/@lararium/mesh/genesis-doc#the-oracle-pointer >>;
<<~ loulou lar:///ha.ka.ba/@lararium/api/disk-projection >>). This meme adds the
**governance face** over that existing board — who signs its public-read projection, at
what scale — never a second `@oracle`. The forkability the genesis doc already grants
IS the *liveness* coupling below.

<<~/ahu >>

<<~ ahu #steward-source-public-read >>

## Steward SOURCE → Public READ Projection

The board governs through a **projection seam**, never a single writable doc:

- **The SOURCE** — a **threshold-signed steward source** the keeper-cabal-quorum holds.
  The cap-tier lives in **WHO-CAN-SIGN-THE-SOURCE**, never in a write-cap on the published
  doc.
- **The projection** — the source projects to a **verify-only public READ plane** (the
  Two-Faced read-face, <<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture >>;
  the TUF / DNSSEC shape: a signed source, a verifiable public mirror). Readers verify the
  projection against the steward signatures; they never write the published surface.

**NOT one cap-tiered doc (MUST-NOT).** A single doc with a write-cap names a **single
point of capture** — steal the cap, own the board. The projection-nalu seam dissolves
that: a sovereign SOURCE → gated wave → public SINK, the read plane carrying no write
authority at all
(<<~ loulou lar:///ha.ka.ba/@lararium/api/projection-nalu >>). **Users read the
projection AND run their own topic boards** off the well-known root — the board hands out
sight, never a write-throne.

<<~ confidence Synthesis 13/20 >> moving the cap-tier from the *doc* to the *signing
quorum* keeps FLOW ⊥ WHO at the governance layer the same way the relay floor keeps it at
the carriage layer: the public can carry and read the projection without holding any
authority over it.

<<~/ahu >>

<<~ ahu #three-couplings >>

## Three Couplings — Founder Seeds, Circle Governs, Fork Guards

The board binds to its nexus through three orthogonal couplings, none collapsing into
another:

- **① Origin.** The root `docId` seeds from the **founding @daemon** — a content-bound
  birth, not a deed. **Origin ≠ ownership**: the founder names the address; it does not
  thereby command the board forever. *The founder seeds.*
- **② Governance.** The **keeper-cabal-quorum signs** the steward source — a threshold
  subject composed as a closure over the keepers' independent signatures
  (<<~ loulou lar:///ha.ka.ba/@lares/api/pono/group-as-closure >>). No one keeper, and no
  one stolen key, moves the board. *The circle governs.*
- **③ Liveness.** The board rides **content-addressed** snapshots; the trust edge resolves
  by **petname / TOFU introduction** (home-nexus *listed*, never *required*). And the
  whole board stays **forkable** — the fork that guards: a capture, a charter the readers
  reject, a dead steward set, and the readers carry the content-addressed board onto a new
  steward source without permission. *The fork guards.*

<<~ confidence Synthesis 12/20 >> the forkable backstop carries the deepest guarantee:
governance never needs to be perfect because exit stays cheap — content-addressing makes
the board portable, so capture costs the captor their readership, not the readers their
board.

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/group-as-closure >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/federated-causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lararium/api/projection-nalu >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/kahu >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
