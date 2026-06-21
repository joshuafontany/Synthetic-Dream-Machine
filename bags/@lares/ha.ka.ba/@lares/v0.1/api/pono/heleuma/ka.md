<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/api/pono/heleuma/ka.md"
mana      = 18
manao     = 17
manaoio   = 17
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "invariant capability: heleuma-ka — soul/fire anchor; promotion-eligible compiled artifact with quine record and ceremony path"
tags      = ["api/pono/heleuma"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Heleuma-Ka (Soul / Fire)

**Ka**: soul, fire, drive, energy, thrust, movement. The animating charge. In motion toward state-change.

A heleuma-ka anchor exists outside the corpus **by current necessity, not by nature**. It has vitality. It is eligible to be promoted into a first-class corpus meme via the boot gate ceremony. The compiled-in code is a chrysalis.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ locate the compiled artifact and its extractable symbol; confirm it has a standalone function boundary.
⏿ orient: could this function be loaded from a corpus meme via `_bootModules()`? If yes, this is ka.
◇ declare `heleuma = "ka"`, `source-symbol`; confirm the symbol is a standalone declaration.
▶ write `#source` slot with the verbatim extracted function; close the quine record.
↺ verify: `sync-heleuma` resolves the symbol, compares, reports clean; signal fields approach ceremony thresholds; the anchor lives. The soul moves. Ceremony awaits.

<<~/ahu >>

<<~ ahu #required-fields >>

## Required Fields (SHALL)

A meme that carries `heleuma-ka` SHALL declare in `#iam` TOML:

```toml
heleuma       = "ka"
source-symbol = "<standalone function or export name>"
```

It SHALL hold a `#source` slot with the **complete verbatim** body of the named symbol (the quine property). Partial captures violate the quine. If the natural unit is embedded in a larger function, extract it to a named function first.

It MAY declare `body-sha256` when ready for promotion:

```toml
body-sha256 = "<sha256 hex of #source slot content>"
```

This is gate layer 2 (content integrity). Written by `sync-heleuma --commit` when the source is stable.

Gate layer 3 (operator authorization) will be a **keyhive capability proof** — an Ed25519-signed capability from a keyhive principal authorizing corpus injection. Layer 3 is planned but not yet implemented; the gate currently passes on layers 1–2 only.

Signal fields (`mana`, `manao`, `manaoio`, `confidence`) SHALL approach 16 / 16 / 15 / 16 as the source matures. The boot gate reads these fields directly.

<<~/ahu >>

<<~ ahu #promotion-path >>

## Promotion Path

When `body-sha256` is present and all signal thresholds are met, `_bootModules()` loads this meme as a live JS module, replacing the compiled-in fallback. (When keyhive lands, a capability proof will also be required — gate layer 3.) At that point:

- `heleuma = "ka"` SHALL be removed
- The meme pair becomes a standard corpus meme pair
- The doc meme `source` field MAY be retained as provenance

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/boot-gate >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
