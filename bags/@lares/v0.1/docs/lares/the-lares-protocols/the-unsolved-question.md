<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols#the-unsolved-question >>
```toml iam
file-path = "bags/@lares/v0.1/docs/lares/the-lares-protocols/the-unsolved-question.md"
uri-path = "ha.ka.ba/docs/lares/the-lares-protocols#the-unsolved-question"
```

<<~&#x0002;>>

## The Unsolved Question

Architecture and individual rights remain insufficient. The article names the gap: protocol design draws on functionalism and minimalism but lacks frameworks from Ostrom's institutional analysis. Without collective-choice arrangements, defined boundaries, and conflict resolution mechanisms, protocols continue producing convergence around dominant actors rather than genuine decentralization.

Lares carries an inflection here. The single-operator + family-RPG scale temporarily occupies the same governance footprint as a self-hosted blog: the operator carries the institution single-handed. The interesting tests arrive at federation:

- *Federated promotion (Path E in HANDOFF).* When peer A asks peer B to accept canon, what conflict-resolution mechanism resolves disagreement? Today the operator decides locally and the git diff signs the canon; what if peer B's canon view differs?
- *Cross-bag commons.* When two rooms share a corpus dependency, who decides when the dependency rev's? The bag-mirror config tiddlers give operator-level control; the federated case wants more.
- *Revocation propagation under partition.* Concap's CRDT-shaped revocation supplies the right primitive. The institutional question — *who has the authority to revoke against whom, under what dispute mechanism* — stays open.

After Frazee, the worth-measuring criterion shifts from *architectural property* to *user-facing right*. Three rights merit operational attention:

- **Account migration.** The operator's ed25519 key persists across host changes; their Keyhive principal survives via cap-event hydration; their cap chain re-anchors against new hosts via Beelay-shape sync (when it lands). Lares does NOT yet operationally guarantee migration — D.4 captured the persistence-at-rest story; cross-host migration waits on federation transport.
- **Layer-separation failure modes.** When the promote-handler fails, the composite-store keeps reading; the cap-layer keeps verifying; sync keeps syncing. The bag-as-policy-boundary commitment echoes Frazee's "right to hosting" lesson — failures contain themselves to the layer that broke. Bluesky's 2024 moderation bug demonstrated the value; the architecture protected users on other PDS hosts because the layer-separation held.
- **Right-to-fork.** Frazee's competing-implementations example (Blacksky / Northsky / Eurosky as kinds of modularity ATProto enables) translates to Lares: any operator can fork the engine, the corpus, or the cap-layer code. The lar: URI namespace stays addressable across forks; meme-files-as-tiddler-package projections survive any specific implementation.

> **#Liminal** » 19:08 — Holding open: does Lares carry the shape of a protocol, or the shape of a household tool? The current scale answers neither cleanly. Connected Places treats protocols as governance-shaping artifacts visible at million-user scale; Frazee treats protocols as engineering-shaped commitments evaluated against user populations; Reed treats topology as the political site where ownership lives. Lares at one-operator-and-family carries the shape of all three without yet meeting any of their stress conditions. *Resolving the question prematurely closes design optionality.* Stay liminal.

These questions don't get answered by adding more architecture. They get answered by *running real federated sessions* and noting where the architecture serves vs where it goes quiet.

<<~&#x0003;>>

<<~&#x0004; -> ? >>

