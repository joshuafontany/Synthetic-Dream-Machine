<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/peer-discovery >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lararium/peer-discovery"
file-path    = "bags/@lares/v0.1/docs/lararium/peer-discovery.md"
type         = "text/vnd.tiddlywiki"
register     = "Synthesis-Canon"
mana         = 18
manao        = 18
manaoio      = 17
role         = "Web3 peer discovery doctrine — cold bootstrap, six-tier ladder, DID service endpoints, social-graph discovery, Keyhive add-member"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

# Peer Discovery Doctrine

## The Core Constraint

Automerge-repo 2.x has **no native peer advertisement or document gossip protocol**.
All doc URLs are random UUIDs — not content-addressed, not deterministic.
`repo.find(url)` is the only entry point; the URL must arrive via a side-channel.

Once two peers share a relay and one holds a doc URL, the sync protocol's
Bloom-filter set reconciliation propagates that doc automatically. The hard
problem is the very first URL exchange — **cold bootstrap**.

## Six-Tier Discovery Ladder

Tiers run lowest-ceremony to highest-trust. Use the lowest tier that covers the
deployment scenario. Higher tiers compose on top of lower ones.

```
Tier 0 — Well-Known HTTP Endpoint       (server-injected, zero user friction)
Tier 1 — URL Fragment / Invitation Link (human-shareable, single-use or reusable)
Tier 2 — BroadcastChannel peerMetadata  (same-origin tabs, automatic)
Tier 3 — did:web service endpoint       (DID-anchored, domain-level rendezvous)
Tier 4 — mDNS LAN announcement          (Node.js + same network, zero infra)
Tier 5 — Social graph record            (Nostr NIP-51 / AT Protocol PDS lexicon)
```

## Tier 0 — Well-Known HTTP Endpoint

The node server exposes `GET /api/catalog` → `{ catalogUrl: "automerge:..." }`.
The HTML `<meta name="lararium-catalog" content="automerge:...">` tag (already
implemented in `open-browser-lar-peer.ts`) is the server-injected form of this.
The browser reads it on page load; no user action required.

```
Browser cold-start:
  1. Read <meta name="lararium-catalog"> from page HTML.
  2. If present: repo.find(catalogUrl) — warm path.
  3. If absent: repo.create(blankCatalog) — offline/tab-only mode.
  4. Cache URL in localStorage for subsequent loads without meta tag.
```

**Implementation**: meta tag injection is done. Complement with:
- `GET /api/catalog` HTTP endpoint on node server (for non-HTML clients)
- `localStorage["lararium:catalog-url:<hostId>"]` cache (already implemented)

## Tier 1 — URL Fragment Invitation Link

Encode the catalog (or room) URL in the page URL fragment:

```
https://elyncia.app/#catalog=automerge:abc123
https://elyncia.app/#room=automerge:xyz789@altar-fire
```

On load, read `location.hash`, call `repo.find(catalogUrl)`. This is the
**Jazz.tools pattern**: `/invite/<encrypted-id>/<secret>`. The fragment is
never sent to the server (hash privacy) but is copyable as a link.

Single-use variant: the node server issues a short-lived token that resolves to
the catalog URL, consumed once, deleted after use. Prevents replay.

**Magic Wormhole** short-code variant for in-person handshake:
1. Node server generates `nameplate:word-word` code.
2. Peers exchange code verbally or via QR.
3. Both sides run SPAKE2 PAKE; encrypted channel carries the catalog URL.
No infrastructure beyond the relay mailbox server.

## Tier 2 — BroadcastChannel `peerMetadata`

The `BroadcastChannelNetworkAdapter` arrive/welcome handshake carries arbitrary
`peerMetadata`. Use it to propagate the catalog URL across same-origin tabs:

```typescript
// In Repo config:
new BroadcastChannelNetworkAdapter({
  channelName: "lararium",
  peerMetadata: { catalogUrl: localStorageCatalogUrl ?? null },
})

// On welcome: if remote.peerMetadata.catalogUrl and !localCatalogUrl:
//   repo.find(remote.peerMetadata.catalogUrl)
//   → first tab to have synced with the node peer shares its catalog URL
//   → offline tabs bootstrap without hitting the server
```

**Namespace convention**: channel name = app name (e.g. `"lararium"`), not the
random doc ID. All Lararium tabs join the same BC channel; doc-level sync is
handled by Automerge's own sync protocol on top.

## Tier 3 — did:web Service Endpoint

`did:web:elyncia.social` resolves by fetching:

```
https://elyncia.social/.well-known/did.json
```

The DID Document `service` array carries the sync endpoint and catalog URL:

```json
{
  "service": [
    {
      "id": "#lararium-sync",
      "type": "LarariumSyncServer",
      "serviceEndpoint": {
        "ws":      "wss://elyncia.app/ws",
        "catalog": "automerge:abc123"
      }
    }
  ]
}
```

Any peer that resolves `did:web:elyncia.social` gets the WS URL and catalog URL
without out-of-band communication. This is how Lararium becomes self-announcing
via the owner's DID.

**AT Protocol variant (Groundmist pattern)**: post a custom Lexicon record to
the user's PDS:

```
lexicon: app.lararium.room (TBD NSID)
fields: { syncUrl: "wss://...", catalogUrl: "automerge:..." }
```

Peers query the PDS (found via `#atproto_pds` in the DID doc), read the record,
connect. Discovery flows through AT Protocol social graph automatically.

## Tier 4 — mDNS LAN Announcement (Node.js)

The node server announces itself on the LAN via `multicast-dns`:

```typescript
import mdns from "multicast-dns";
const m = mdns();
m.announce("_lararium._tcp.local", {
  type: "SRV", port: 8080,
  data: { target: "lararium-node.local", port: 8080 }
});
// TXT record carries catalog URL
m.announce("_lararium._tcp.local", {
  type: "TXT",
  data: { catalogUrl: peer.catalogUrl }
});
```

Browser peers on the same LAN discover the node server without knowing its IP.
Works for local dev and studio/home setups with no internet.

## Tier 5 — Social Graph Record

**Nostr** — NIP-51 kind:30001 list, `r` tags containing Lararium room URLs:

```
r: "lararium:automerge:abc123@wss://elyncia.app/ws"
```

Any Nostr follower fetches the list, bootstraps the room. Discovery =
side-effect of follow. **nostr-crdt** (YousefED) already does Yjs over
kind:9001 anchor events — same pattern, different CRDT.

**AT Protocol** — custom Lexicon record in PDS (Groundmist-style). No shipped
group primitive yet; land after AT Protocol "shared data" ships (2025 H2).

## UCAN / Keyhive Bootstrap

**UCAN invitation flow** (alpha placeholder, pre-Keyhive):

1. Room creator issues a UCAN: `iss=did:web:elyncia.social`, `aud=<new-peer-did>`,
   `att=[{ with: "automerge:<catalogUrl>", can: "automerge/sync" }]`.
2. UCAN delivered as URL fragment or QR code.
3. Recipient presents UCAN to node server's `sharePolicy`; server verifies chain.
4. `sharePolicy` returns `true` → doc syncs.

**AWAKE** (ucan-wg/awake) extends this with an X25519 ECDH handshake gating
the first sync message — removes the need for TLS as the transport trust layer.

**Keyhive flow** (future, when `keyhive_wasm` ships):

1. Room creator calls `doc.addMember(newPeerEd25519PublicKey)` → signed op in
   doc's Keyhive ACL log.
2. New peer's Ed25519 pubkey = their DID's key material; the signed "add" entry
   IS the invitation artifact.
3. New peer receives the room URL + "add" op out-of-band (any tier above).
4. `beelay` sync authenticates using the key chain; ciphertext-only relay.

## Lararium Bootstrap Sequence (Current Implementation)

```
1. <meta name="lararium-catalog"> tag injected by node server (Tier 0)
   → browser reads on page load → repo.find(catalogUrl)

2. If no meta tag (offline / direct browser load):
   → localStorage["lararium:catalog-url:<hostId>"] cache check
   → If hit: repo.find(cached URL)
   → If miss: repo.create(blankCatalog) → tabs-only offline mode

3. BroadcastChannel peerMetadata (Tier 2) — TODO: wire catalogUrl into metadata
   → first tab with catalog URL teaches offline tabs

4. did:web service endpoint (Tier 3) — TODO: populate elyncia.social DID doc
   → programmatic discovery for non-browser clients

5. URL fragment invite (Tier 1) — TODO: add ?catalog= / #catalog= reader
   → human-shareable room invitations
```

## What NOT to Build

- **Automerge DHT / content-addressed URLs**: not supported; random UUIDs are
  the protocol. Do not try to derive deterministic doc IDs from content hashes.
- **Server-as-authority**: the node server does not hold content truth, only relays.
  Discovery tiers give peers URLs; authority flows from CRDT merge, not server.
- **mDNS in the browser**: not available (no UDP multicast in browsers). LAN
  discovery for browser peers routes through the node server's mDNS discovery.

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>

<<~ ahu #edges >>

## Edges

<<~ pranala #has-peer-coordination ? -> lar:///ha.ka.ba/@lararium/tw5/peer-coordination family:control role:has >>
<<~ pranala #has-local-first ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first family:control role:has >>
<<~ pranala #has-lar-uri-namespace ? -> lar:///ha.ka.ba/@lararium/tw5/lar-uri-namespace family:control role:has >>
<<~ pranala #has-doc-stack ? -> lar:///ha.ka.ba/@lararium/tw5/lararium-doc-stack family:control role:has >>

<<~/ahu >>
