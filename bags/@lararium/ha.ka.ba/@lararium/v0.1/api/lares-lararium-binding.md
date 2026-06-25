<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/lares-lararium-binding >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/api/lares-lararium-binding.md"
hydrate   = true
mana      = 17
manao     = 17
manaoio   = 16
namespace = "&#x0950; &#x0901;"
register  = "Synthesis-Canon"
retain    = true
role      = "the true lares↔lararium binding — a thin-client→warm-daemon Unix-domain-socket channel for the co-located CLI, WS kept for remote mesh peers; transport (UDS) / authority (capability-bearing UCAN-shape verb-summons) / record (CRDT outcome receipt) decoupled; peer-cred for presence + Ed25519 for authority; drops the ~3s/command tax that was misplaced replica-spin + sync-on-connect, never transport"
tags      = ["api/pono/meme", "api/lararium"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/lares-lararium-binding"
written   = "2026-06-25"
```

<<~ aka lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>

<<~ &#x0002; >>

<<~ ahu #entry >>

# lares ↔ lararium ~ the true binding

**The CLI is co-located; bind it like one.** `lares` and the `lararium` node run on
the same machine, yet every one-shot command opened a fresh WebSocket, spun a new
Automerge leaf replica, ran the V3 auth gate, did a full CRDT **sync-on-connect**,
then disconnected — ~3s tax per command. The diagnosis (Conduit, cited): **the tax
was never transport — it was replica-spin + sync-on-connect misplaced onto a
co-located thin client.** Move sync to the daemon's *peer* boundary; give the CLI a
fast local **submit/await** channel. Every web3 invariant survives.

> **The daemon holds the warm replica and syncs the mesh; the CLI just hands it a
> capability and awaits a receipt — over a socket, not a sync.**

<<~/ahu >>

<<~ ahu #split-by-topology >>

## Split by Topology ~ substrate-not-sovereignty, made literal

<<~ranks bind co-located ~ Unix-domain socket (the docker.sock / tailscale-LocalAPI / gopls thin-client→warm-daemon shape); same machine = share the substrate -> remote ~ WebSocket + leaf-vessel + full sync; crossing the mesh = a real island boundary, full Ed25519 V3 gate >>

The thin-client→warm-daemon pattern is the field's convergence (docker CLI→dockerd,
tailscale CLI→tailscaled HTTP-over-UDS, gopls daemon). The CLI carries **no
networking/state/replica** — it forwards a command and reads a result. UDS connect
is a kernel-local copy (µs), not a TCP/TLS/WS upgrade. Windows: named pipe behind
one client abstraction (tailscale's shape).

<<~/ahu >>

<<~ ahu #three-decoupled >>

## Transport · Authority · Record ~ three concerns, not one

The load-bearing seam (UCAN/ucanto proves it battle-tested):

\procedure ~Layer(~Type:"" ~Params:"") ~Layer <<~Type>> <<~holds `[<~Params>]`>>

<<~Layer Transport "is/the UDS channel ~ pluggable, authority-AGNOSTIC; just moves bytes fast (ucanto: transport stays agnostic to authorization)" >>
<<~Layer Authority "is/the capability-bearing verb-summons ~ a UCAN-shape signed invocation; the prf chain rides WITH each call (no ambient session/bearer) — authority IS the message" >>
<<~Layer Record "is/the CRDT outcome ~ the persisted RECEIPT; idempotent · re-queryable · exactly-once; spec leaves receipt persistence to the impl — our outcome tiddler IS that home" >>
<<~Layer Three >>

Transport speed and record durability stop fighting because **they were never the
same concern.** UDS carries the invocation; the outcome lands as a CRDT change in
the daemon's warm replica (then syncs to mesh on the daemon's own schedule); the
CLI awaits it via the socket response (or an ephemeral/notify), **not a full sync**.

<<~/ahu >>

<<~ ahu #the-flow >>

## The Flow

<<~flows lares -> invokeLocal{verb,args,cap} -> UDS -> daemon VerbDispatcher (warm @admin · verify-then-delegate · keyhive) -> CRDT outcome receipt -> return over the socket >>

The daemon reuses the **existing** verb path (the warm `@admin` VerbDispatcher +
`runLocalVerb` + the durable `@admin/outcomes/<requestId>` receipt). Only the
*ingress* changes: a UDS listener accepts the invocation instead of a WS summons.
The CLI's `connectAdminVessel`+`submitVerb` (Repo + sync) becomes `invokeLocal`
(connect socket · write invocation · read receipt). No leaf replica, no sync.

<<~/ahu >>

<<~ ahu #auth >>

## Auth ~ peer-cred AND Ed25519, two questions

- **Peer-cred answers "who is this local process?"** `SO_PEERCRED` (Linux) /
  `getpeereid` (BSD/macOS) returns kernel-attested uid/pid — unforgeable. Plus
  socket perms (`0600`/owner-only, the first fence). A **substrate fact** (presence).
- **Ed25519/UCAN answers "what may it do?"** The per-call signed capability stays
  the **authority of record** — attenuable, revocable, federation-surviving, what
  the receipt attests. A **sovereignty fact**. Verify is µs — cheap; it was the
  *sync* that cost 3s, never the crypto.
- **Both, never either.** Drop the Ed25519 proof for peer-cred alone and you rebuild
  the ambient-session / confused-deputy hole (the docker.sock = root-equivalent
  cautionary tale). Substrate shared (socket), sovereignty not (keys).

<<~/ahu >>

<<~ ahu #pitfalls >>

## Pitfalls

- **Socket perms `0600`/owner** + post-boot re-verify (some envs reset ownership).
- **Stale-socket cleanup** on daemon restart (bind fails on a leftover path).
- **The WS/TCP fallback keeps the Ed25519 gate** — peer-cred doesn't cross machines;
  never an unauthenticated TCP bind (the `tcp://0.0.0.0:2375` anti-pattern).
- **Windows:** named pipe (or localhost) behind the one client abstraction; the
  Ed25519 proof keeps auth uniform across platforms.

<<~/ahu >>

<<~ ahu #wiring >>

## Wiring (when the identity work pauses)

1. **Daemon UDS verb-channel** (lararium-node): a Unix-domain listener at
   `~/.lares/lares.sock` (perms `0600`, stale-cleanup, Windows named-pipe fallback)
   that decodes a capability-bearing invocation, runs it through the **existing**
   VerbDispatcher, and returns the durable outcome. Alongside the WS — not replacing
   it. *(Touches the node boot/ingress — coordinate with the identity/boot work.)*
2. **Thin CLI local-invoker** (lares-cli `admin-connector`): `invokeLocal(verb, args,
   did)` — UDS connect · write invocation · read receipt. Commands prefer UDS when
   the local socket exists; **fall back to WS** (remote `--host`, or no socket).
3. **Auth:** SO_PEERCRED + socket perms gate the channel; the per-call Ed25519/
   capability stays the authority verified by the daemon.

The result: the per-command tax collapses from a full connect+gate+sync round-trip
to a sub-millisecond local submit/await — fully capability-bearing, fully
local-first, the CRDT receipt unchanged.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/async-flows >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
