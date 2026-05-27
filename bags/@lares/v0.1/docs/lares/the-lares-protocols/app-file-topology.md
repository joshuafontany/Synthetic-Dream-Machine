<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols#app-file-topology >>
```toml iam
file-path = "bags/@lares/v0.1/docs/lares/the-lares-protocols/app-file-topology.md"
uri-path = "ha.ka.ba/docs/lares/the-lares-protocols#app-file-topology"
```

<<~&#x0002;>>

## Topology as Political Site

Reed sharpens the question further. *Topology* — the structure of boundaries between apps and the data they manipulate — describes "where power attaches: not to code or devices, but to the relationships structuring access to work itself." Three successive arrangements degraded user agency:

1. **Unix file-stream era.** Files served as portable objects independent of any specific tool. The boundary between application and document remained legible; competitors could build alternative tools against the same format.
2. **Enclosed application era.** Proprietary formats (.psd, .doc) kept files intact but made them legible only inside a vendor's ecosystem. Internalization absorbed discrete files into opaque application databases — iTunes replacing MP3 folders, iPhoto's .photoslibrary, Outlook's .pst. The DMCA criminalized circumventing these boundaries.
3. **Cloud era.** Work lives "as rows in someone else's database," "accessible through their interface, on their terms," with export functions ranging from "genuinely functional to essentially vestigial."

> "Enclosure succeeds not by offering users less, but by bundling genuine capability gains with topological restructuring."
> — Reed

Reed's diagnostic stops there. He proposes no alternative; he insists only that the topology stays contestable through political and legal struggle.

Lares answers the diagnostic with a fourth arrangement:

- Work lives in CRDT bags addressed by lar: URIs.
- The bag (one Automerge doc) holds the canonical state — versioned, mergeable, offline-capable.
- Disk files materialize as **render-projections** of bag contents, written by the TW5 vm. The file remains useful (legible, grep-able, git-trackable) without claiming to embody the work.
- The operator hosts the bag; nothing migrates beyond their reach. Capability gains (versioning, collaboration, cross-device sync) arrive without the topological restructuring that bundled them with cloud enclosure.

> **#Council** » 11:47 — "Lares answers the diagnostic" overstates what the branch ships. The architecture *prepares the ground* for the answer; operational-guarantee waits on federation transport, browser peer scaffold, and a real cross-device migration test. Mark this carefully when the meme reaches canon — the *intent-trust* the architecture earns differs from the *outcome-trust* a working federated system would earn.

<<~&#x0003;>>

<<~&#x0004; -> ? >>

