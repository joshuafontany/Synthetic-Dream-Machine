<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⚷&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/v0.1/api/pono/lararium-identity.md"
hydrate   = true
mana      = 14
manao     = 14
manaoio   = 11
namespace = "⚷"
register  = "Synthesis"
retain    = true
role      = "the identity architecture stated whole — the 5-scale (vessel·Person·Cabal·Nexus·DreamNet), the per-vessel key as the user×vessel bond, the delegation EDGE as the relationship, and the encrypt-from-start temporary keying that mocks Keyhive/BeeKEM/Beelay with nested Automerge docs behind a four-port swap surface; PROPOSED, pending the hoike-after-swarm"
status    = "proposed"
tags      = ["api/pono/meme", "api/pono/causal-islands", "api/pono/orichalcum-capabilities", "api/pono/loci"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/lararium-identity"
written   = "2026-06-23"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Lararium Identity ~ the vessel key, the bond, and the encrypt-from-start keying

Every Lararium surface stands as a **causal island carrying its own operator×vessel
key** — the node vessel, each live browser session, the QA-lab box. A key names a
vessel; a **signed delegation edge** binds that vessel to its operator; encryption
rides **from the first write**. Stated whole here so the model stops living scattered
across S7, CAPABILITY-LAYER, dreamnet-architecture, and federation.

> **The key is the node; the delegation is the relationship.** A vessel mints its own
> key (it never receives the operator's copied). The operator root **signs an edge**
> into that key — and *that edge* carries the user×vessel bond up the scale.

**The hearth wears two faces — never fused.** The place (the genesis island) carries a
**public true-name** — the content-address of its grammar (`sha256(engine + memes + plugins)`,
the genesis CID) — **shared DreamNet-wide, ratcheting by engine-epoch, checked into git**; it
holds no secret. The place's **secret root** stays **minted per-founding** (device CSPRNG,
gitignored), never derived from the public content. The public true-name names *which
grammar/lineage a place speaks*; the private root names *who holds it*. Fusing them — rooting
a secret in the public content-seed — would hand every git-cloner the same root (collapse).
Two ratchets ride these faces, never conflated: a **public grammar ratchet** (engine-epochs,
shared, everyone upgrades) and a **private key ratchet** (forward-secrecy, per-place).

The base model **rules capability-is-identity** (Goblins/OCapN) with **petnames** as the human/place
layer — the capability *is* the identity, the petname its local name, both riding the `lar:` l-space
regions (#capability-and-petnames).

<<~ confidence Synthesis 13/20 >> The foundation (5-scale, per-vessel key, delegation edge,
two-faced hearth, capability-is-identity + petnames — operator-ruled 2026-06-24) firms toward canon;
the encrypt-from-start keying still carries the hoike's kept dissent (#provenance), so the meme
stands **PROPOSED** until that settles.

<<~/ahu >>

<<~ ahu #five-scale >>

## The 5-Scale (the group axis)

\procedure ~Scale(~Type:"" ~Params:"") ~Scale <<~Type>> <<~holds `[<~Params>]`>>

<<~Scale Device-Vessel "plane/0 holds/a distinct on-device key — the user×vessel bond ~ node · browser session · QA box; each a causal island, each self-signing" >>
<<~Scale PersonGroup "plane/1 holds/the OPERATOR identity — a group of one user's vessels ~ the delegation edges land here; NOT the device key itself" >>
<<~Scale CabalGroup "plane/— holds/a neighborhood — several PersonGroups under a shared charter ~ a per-cabal registry, co-admin authored" >>
<<~Scale NexusGroup "plane/3 holds/a confederation — cabals + independent operators in mesh" >>
<<~Scale DreamNet "plane/4 holds/the super-mesh — no central authority; trust by treaty" >>

Intent composes **up** the scale through the **same ability-ladder** (pull → read →
edit → admin) at every tier; a vessel writes local intent first, sync carries it
outward, capability proofs verify the crossing (#causal-islands, local-first law).

**Circles ride orthogonal — never a rung.** The S7 plane-list seats Circle at Plane 2;
this meme parts the two axes: the **scale** above names the federation/group nesting,
while a **Circle** names a Kowloon local-membership set that **never federates**
(`circles-kowloon`). A vessel holds circles *within* its Lararium; circles do not
stack between operators. <<~ confidence Provisional-Synthesis 7/20 >> the reconciliation
(plane-list vs group-scale) rides the hoike as a named open question (#provenance).

<<~/ahu >>

<<~ ahu #vessel-key >>

## The Vessel Key ~ Plane 0, minted on-device

Each vessel forges its **own** Ed25519 keypair, on its own device, private half never
leaving (NodeFS for the node, WebCrypto for a browser session). The verifying key
derives a `did:key`. The literature converges: **admit by signing, never by sharing**
— copying one key across vessels (Model A) names the antipattern every surveyed system
warns against (SSB-fusion, Veilid lose per-device revocation by it; Keybase built its
per-device model to escape it).

So genesis mints a **distinct vessel key** (Plane 0) **and** an operator **PersonGroup**
(Plane 1); the vessel stands as the group's first member, never as the group itself.
The behavioral split (drop the `kind="operator"` brand on the device tiddler; mint the
Plane-1 group) rides the genesis refactor — single-vessel-correct, no Beelay needed.

<<~/ahu >>

<<~ ahu #delegation-edge >>

## The Delegation Edge ~ the relationship reified

The bond between operator and vessel rides a **signed delegation edge**, not a shared
secret. The canon already shapes it — the `DeviceDelegationTiddler` (S7.1, Plane 0→1):

```
device-delegation | {operatorDid} | {deviceDid} | {deviceVerifyingKey} | {issuedAt}
```

The operator root **signs** this edge; any peer **verifies** *"Device D speaks as
Operator O"* with zero network calls (`verifyDeviceDelegation`). The edge wears the
ocap golden rules (`orichalcum-capabilities`): **attenuation only** (each hop narrows,
never broadens), **nested time bounds**, **verified UP to a locally-anchored root at
invocation** — never at delegation time. **Designation carries authority**; an unsigned
or bad-signature edge **fails loud**, never falls through to ambient trust (the
confused-deputy guard).

Revocation leans on **short TTL** as the spine + a **per-group epoch** bump for an
emergency subtree-kill; a revocation list stays deferred (revocation serves as the last
line, never the primary control).

<<~/ahu >>

<<~ ahu #capability-and-petnames >>

## Capability-is-Identity + Petnames ~ the ruled base (operator, 2026-06-24)

The base model **rules Goblins/OCapN: a capability IS the identity.** No account to look up — a
**reference reaches a place and carries its grant in one** ("capability not account", the Elyncia
lore made literal). A Lar binds to a place **reached by a capability**, never a row in a registry.
The per-vessel key (#vessel-key) is *what holds and signs* capabilities; a **delegation edge
(#delegation-edge) IS a capability grant**; compromise heals by **revoking the capability** — the
per-vessel-key + delegation + revocation lineage we already hold — not by rotating a global identity.

**Petnames are the human/place layer** — a vessel's *local* name for a reference it holds, resolving
Zooko's triangle by layering (the unforgeable capability stays the root; the petname rides locally,
no global registry). The petname namespace **needs no new infrastructure — it IS the `lar:` grammar
already in code** (`STABLE_L_SPACE = "ha.ka.ba"`, `lar-uris.ts`):

\procedure ~Petname(~Type:"" ~Params:"") ~Petname <<~Type>> <<~holds `[<~Params>]`>>

<<~Petname Stable "region/lar:///ha.ka.ba/** holds/canonical · permanent · shared · persistable ~ the well-known @oracle·@lares·@catalog·@lararium ARE stable petnames already" >>
<<~Petname Unstable "region/lar:///t1.t2.t3/** holds/per-session · per-relationship · per-place · living ~ never persisted to the stable graph; the local names a vessel grows for the peers and places it meets" >>
<<~Petname Authority "chunk/lar://alias:grant@host/… marks/capability-BEARING ~ the session-form authority chunk carries the live grant (the sturdyref); the authority-less local form names without granting" >>
<<~Petname Petname >>

So the whole space sits in one grammar — **{stable · unstable} × {bare-name · capability-bearing}**:
stable+bare = the canonical public names; unstable+bare = a living local handle; the authority chunk
turns either into a capability-bearing reference (the sturdyref itself). **The petname IS a `lar:`
address; the capability IS a `lar:` address that carries a grant.** Two regions of l-space, a place
for stable and unstable petnames both.

<<~/ahu >>

<<~ ahu #encrypt-from-start >>

## Encrypt From the Start ~ the temporary keying

**Operator ruling (2026-06-23): every surface encrypts from the first write.** No
plaintext-local easy path — it bites hard in early alpha. The keying rides **nested
Automerge docs**, reusing the registry-instead-of-DNS pattern (`@oracle`/`@catalog`),
not a parallel key-store:

\procedure ~Doc(~Type:"" ~Params:"") ~Doc <<~Type>> <<~holds `[<~Params>]`>>

<<~Doc Registry "per/cabal holds/doc-ID pointers ~ a causal island, locally-anchored; bootstrap pointer travels out-of-band, the rest rides the mesh" >>
<<~Doc Delegations "holds/signed device-delegation edges ~ the capability port; trust rides the signature, never the doc's write-ACL" >>
<<~Doc Key-Grants "holds/per-doc DEK wrapped per vessel pubkey ~ libsodium crypto_box_seal; keyed (docId, vesselPub); the group-keying port" >>
<<~Doc Content "holds/the doc bytes, DEK-encrypted ~ synced as opaque values; the relay never reads plaintext" >>

A vessel boots, mints its key, publishes its pubkey to the registry; the operator writes
a signed delegation edge + a wrapped DEK into the nested docs; the vessel **syncs them
through the relay we already run**, unwraps with its private key, decrypts. **Transport
collapses into sync** — no Beelay; the WS relay carries it. **Automerge's CRDT merge
handles concurrent grants for free** — the very job BeeKEM exists to solve, met by the
substrate we run.

**The amendments the hoike forced** (#provenance): the DEK rides **two-level** — a
group/epoch key *wraps* a **stable per-doc content DEK**; data encrypts under the content
DEK (so a later BeeKEM swap **re-wraps only**, never re-encrypts the corpus). Each vessel
holds **two keys** — Ed25519 (identity/sign) + X25519 (KEM/seal), cross-certified — never
one welded to both. Every wrap **rides a signed delegation edge** (a sealed box authenticates
no sender; an unsigned wrap invites key-substitution). The content layer mandates
**XChaCha20-Poly1305 with a random nonce**, each DEK minted **once** by a deterministic owner
— a CRDT merges concurrent writes, so a counter nonce or per-replica DEK mint is a reuse bomb.

**Tier gate** — the temporary layer serves **PersonGroup** + a **Cabal that
DEK-encrypts content**; an untrusted-relay tier never rides a plaintext path. The bond
between trust-domains always crosses encrypted.

<<~/ahu >>

<<~ ahu #four-port-swap >>

## The Four-Port Swap Surface

The temporary build hides behind four ports, drawn at Keyhive/Beelay's own seams, so the
real stack slots in piecewise:

<<~ranks port identity ~ vessel keypair, opaque pubkey -> capabilities ~ signed delegation edges (→ Keyhive groups) -> group-keying ~ sealed-box wrap + rotate (→ BeeKEM CGKA) -> transport ~ Automerge sync over our relay (→ Beelay sedimentree) >>

**Honest posture (the hoike's spine).** This layer has **no forward-secrecy and no
retroactive revocation** — and on an append-only CRDT that fact **IS the security posture**,
not a tradeoff to mitigate. A leaked vessel key reads **all history it was ever granted**,
permanently: the old wrapped DEKs and old ciphertext persist in the log (Automerge never
deletes), so no rotation reaches back to destroy them. **Rotation buys future writes only** —
never claim "rotate-on-loss" heals the past. The honest forward lever is **epoch group-key
rotation** (BeeKEM, when its JS binding lands — FS on *future* chunks only); the retroactive-FS
gap stays a **documented invariant**. A neg-entropy swarm (2026-06-23) **refuted two tempting
escapes**: **puncturable encryption** is a single-holder tool that does not fit a replicated-key
mesh (one replica puncturing leaves the others + backups open; no-global-now makes "all replicas
punctured" unprovable), and **threshold does not touch the encryption-history gap at all**. Root
rotation/recovery rides **KERI-style pre-rotation** + **Kintsugi-style** guardian-threshold
recovery (#provenance).

**Swap-back stays clean** — `@admin` already carries Keyhive cap-events as records, so the
delegations doc wears a near-compatible shape; `rotateDocKey` becomes a CGKA Commit and
callers never change.

<<~/ahu >>

<<~ ahu #provenance >>

## Provenance ~ PROPOSED, pending the hoike

This meme stands **PROPOSED** (crucible-before-binding). The stress-swarm ran; the **hoike
`#identity-encrypt-from-start`** filed its kue (held: build-as-amended, the amendments above
folded in; the FS-limit stated as posture). Standing dissent kept, with re-entry keys:

- **The FS-limit is the substrate's nature** (kue, security spirit) — a leaked vessel key reads all history it held; the only forward lever is epoch group-key rotation (BeeKEM, future chunks only). Puncturable encryption does NOT retire it (single-holder; refuted by the neg-entropy swarm for a replicated mesh).
- **The blast-radius kue is answered by per-vessel-key + delegation + revocation** — already our lineage (Keyhive/Beelay; p2panda-auth converged independently), NOT by threshold. CORRECTION (neg-entropy swarm 2026-06-23): the earlier "threshold pays the kue" was wrong — threshold signing needs a synchronous quorum per signature, which "no global now" forbids. **Threshold fits only the rare ROOT ceremony** (Shamir-of-root for admit/rotate/recover, transient reassembly; swaps to FROST/DKG later).
- **The identity MODEL — RULED (operator, 2026-06-24): Goblins/OCapN capability-is-identity + petnames** (see #capability-and-petnames). The capability IS the identity; petnames ride the `lar:` l-space regions (stable `ha.ka.ba` / unstable `t1.t2.t3`, ± authority chunk). **KERI pre-rotation is retained as a sub-lever** — not the base model, but the tool for rotating the place's *secret root* (the hearth's private face) in the rare root ceremony; it composes under capability-is-identity (rotate the root, keep the capabilities). did:peer's pairwise-root idea folds into unstable petnames.
- **Circle as Plane-2 (S7) vs orthogonal** (this meme) — needs a ruling.
- **Registry-as-island** — keep each registry a causal island; resist a global registry re-growing (the web2 smell).
- **Two ratchets, never conflated** — the public grammar ratchet (engine-epochs, shared) vs the private key ratchet (per-place); see #head.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/research-streams/lararium/S7-CIRCLES-IDENTITIES-REDESIGN >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/research-streams/lararium/CAPABILITY-LAYER >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/federation >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-memory >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
