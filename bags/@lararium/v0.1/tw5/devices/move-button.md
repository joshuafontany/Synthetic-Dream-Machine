<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/devices/move-button >>
```toml iam
cacheable  = true
file-path  = "bags/@lararium/v0.1/tw5/devices/move-button.md"
listenable = "InteractedWithEvent"
namespace  = "&#x2299;"
register   = "Synthesis"
retain     = true
role       = "kumu device type — move-button: fires the MOVE residency ACTION verb on InteractedWithEvent"
type       = "text/x-memetic-wikitext"
uri-path   = "ha.ka.ba/@lararium/v0.1/tw5/devices/move-button"
verb       = "MOVE"
```

<<~ ahu #head >>

# move-button Device

A kumu device type that fires the `MOVE` residency ACTION verb when its InteractedWithEvent listenable activates. `MOVE` performs the atomic `ADD`-to-destination + `CLEAR`-from-source gesture defined by the residency model — the coordinate-space successor to the retired canon-promotion ceremony.

**Verse analogue:** a `button_device` whose `InteractedWithEvent` is wired via DEB to a handler
that issues a residency `MOVE`. In Lares the DEB wire becomes a papalohe edge on the instance meme;
the verb intent lives here on the type meme as a `reaction:listenable` edge with `payload.verb`.

**TW5 filter:** `[field:verb[MOVE]]` returns both signal and outcome tiddlers for all `MOVE`
dispatches, across any instance of this type.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #kumu >>

## Kumu Declaration

```
kumu: move_button_device
extends: button_device
```

This device type extends `button_device`. It inherits `InteractedWithEvent` (listenable) and
`InteractedWithAgent` (subscribable) from the parent type.

<<~/ahu >>

<<~ ahu #reaction-pins >>

## Reaction Pins

**OUTPUT — `InteractedWithEvent`**

When a player interacts with the placed button instance, `InteractedWithEvent` fires carrying
the activating `agent`. In the Lares graph this pin declares as a `reaction:listenable` edge
with `payload.verb = "MOVE"` — the ACTION verb the VerbDispatcher routes on receipt.

**`reaction-router.ts`** reads this edge's `payload.verb` on nalu and fires:
```
tm-verse-event { uri, listenable: "InteractedWithEvent", verb: "MOVE", fromUri: uri }
```

`island-kernel.ts` wraps this into `IslandMsg_Event.payload { verb, fromUri }` and posts to
the vessel. The vessel's M.1 subscriber calls `adminVm.placeVerb({ verb: "MOVE", fromUri, listenable })`.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ control:extends ? -> lar:///ha.ka.ba/@lararium/mesh/kumu-device/button_device family:control role:extends >>

<<~ reaction:listenable ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/devices/move-button listenable:InteractedWithEvent verseKind:listenable payloadType:agent verb:MOVE >>

<<~ pranala #to-kumu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kumu family:relation role:uses >>
<<~ pranala #to-papalohe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/papalohe family:relation role:uses >>
<<~ pranala #to-residency-model ? -> lar:///ha.ka.ba/@lararium/v0.1/api/residency-model family:control role:implements >>
<<~ pranala #to-reaction-protocol ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/reaction-protocol family:control role:governed-by >>
<<~ pranala #to-uefn-scene ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/uefn-scene family:reference role:see >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
