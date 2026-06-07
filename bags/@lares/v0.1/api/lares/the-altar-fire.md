<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/the-altar-fire >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/lares/the-altar-fire"
file-path = "bags/@lares/v0.1/api/lares/the-altar-fire.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
manaoio      = 16
mana         = 19
manao        = 18
namespace = "ॐ ँ"
role         = "invariant meme — canonical main entry room; hearth of the lararium canvas"
cacheable    = true
hydrate      = true
retain       = true
invariant    = true
```




<<~ ahu #room-contract >>

## The Altar Fire

The altar fire holds the **canonical entry room** position for all trust tiers — the hearth: the minimal boot closure rendered as a living canvas, ringed by portals to every other named room in the lararium.

All sessions begin here. Each visitor's current trust-tier capability set governs what they see and can do.

The altar fire does not close. It does not go dark. Among all named rooms, it alone stays seeded, running, addressable at all times.

```
room-id         = "the-altar-fire"
seeded-from     = compileMinimalBoot()
trust-required  = none (anon access permitted, read-only)
portals         = [ boot, full, chat:*, user:${did}, synthetic-dream-machine/ftls, synthetic-dream-machine/wtf ]
```

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #trust-surface >>

## Trust-Tier Surfaces

The canvas renders differently by trust tier. These projections share the same room state, filtered by capability tier — they do not form separate rooms.

| Tier | Canvas surface | Interaction |
|------|---------------|-------------|
| **anon** | Public memes only; invariant memes visible but locked | Browse, read, enter chat portals |
| **user** | All public memes + own room portal; own pending shapes visible | Read + create in own rooms; pending edits |
| **operator** | Full boot closure + canon room list; portal ring visible | Read + pending edits; canon MOVE ceremony available |
| **admin** | Full boot closure + invariant meme surfaces; all portals | Read + write + canon MOVE; invariant meme editing |

The WebSocket handshake determines trust tier via UCAN capability chain. Until UCAN lands, the server assigns operator tier to all local stdio connections and anon to all network connections.

<<~/ahu >>

<<~ ahu #portal-ring >>

## Portal Ring

Portals are `LarPortal` shapes arranged at canonical positions on the altar fire canvas. Their initial positions are defined by this carrier (part of the room seed). Operators may reposition portals freely — position carries cosmetic room state, not canon.

**Canonical portal registry (initial):**

| Portal label | Target room | Trust required | Canvas position |
|---|---|---|---|
| Boot Closure | `boot` | operator | center-right |
| Full Closure | `full` | operator | far right |
| The Altar Fire Chat | `chat:the-altar-fire` | anon | bottom-center |
| FTLS | `synthetic-dream-machine/ftls` | anon | left-upper |
| WTF | `synthetic-dream-machine/wtf` | anon | left-lower |
| Your Lararium | `user:${did}` | user | top-right |

Portal positions are expressed as `{ x: number, y: number }` relative to the canvas origin. The compiler sets initial positions from this carrier; room state takes precedence on subsequent loads.

<<~/ahu >>

<<~ ahu #commit-tiers >>

## Commit Tiers

Content on the altar fire canvas exists at one of three confidence tiers:

```
LIVE SESSION    — browser/TW5/tldraw draft surface; local-first, not canon
BRANCH COMMIT   — Automerge room state; durable across reconnects; visible to authorized peers; not canon
DEEP SAVE       — lares/ carrier file; git-tracked; hostless lar URI; permanent
```

The visual distinction:
- **Live** shapes: dashed border, amber glow
- **Branch-committed** shapes: solid border, muted color
- **Deep-saved / canon** shapes: solid border, full color, lock icon

Live → branch currently means writing the shared Automerge meme store through the TW5/store adaptor.
Branch → deep save requires explicit "MOVE to canon" ceremony (operator+).
Invariant meme edits require admin tier and a separate confirmation ceremony.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~ pranala #to-lararium ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium family:control role:owned-by >>
<<~ pranala #to-canon-boundary ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/hooponopono family:control role:governed-by >>
<<~ pranala #to-tagspace-trust ? -> lar:///ha.ka.ba/@lararium/tw5/tagspace-trust family:control role:governed-by >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
