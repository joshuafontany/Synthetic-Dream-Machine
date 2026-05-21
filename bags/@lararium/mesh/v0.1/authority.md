<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/authority"
file-path    = "bags/@lararium/mesh/v0.1/authority.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.80
mana         = 0.78
role         = "contract for local-first authority checks, proof visibility, and edge re-check boundaries"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# Authority

Authority law for a Lararium peer that validates intent without reverting to server-first posture.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

Authority in Lararium names the proof-bearing right to ask a ceremony or edge action to proceed.
The authority surface gives peers a common way to:

- inspect capability context locally
- reject invalid or stale commands before side effects begin
- re-check proofs at a resource edge when races or ambient effects matter
- write durable receipts for both acceptance and refusal

Authority travels with the peer and its proofs. Authority does not collapse into node residency.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### AU-1 — Peer-visible first check

The invoking peer should validate authority context before it asks a VM lane or edge adaptor to act.
This keeps command intake local-first and keeps invalid intent from masquerading as pending work.

### AU-2 — Edge re-check when needed

If a ceremony crosses a resource boundary such as disk, process, transport, or keystore access, the edge adaptor may re-check the same proof chain before execution.
This re-check protects resource-local races. It does not create a second authority model.

### AU-3 — Receipts document authority outcomes

Authority approval, refusal, expiry, attenuation failure, and replay refusal should all yield durable receipt artifacts.
Thrown errors alone do not satisfy the contract.

### AU-4 — Capability context stays inspectable

The peer should keep enough local capability context to explain why a command passed or failed.
Opaque pass-fail gates make audit and repair too weak for ceremony work.

### AU-5 — Authority remains narrower than identity

Identity names who speaks.
Authority names what that speaker may ask to happen under current proofs and epochs.
One peer may know an identity while refusing a command from that identity.

<<~/ahu >>

<<~ ahu #flow >>

## Authority Flow

1. A peer receives or authors a command record.
2. The admin lane resolves referenced proofs and local capability context.
3. The peer accepts or refuses VM-local planning.
4. Any edge adaptor re-checks before resource-local side effects when needed.
5. The peer writes a durable receipt that records the decision and its reason.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/command-tiddler >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
<<~/ahu >>
