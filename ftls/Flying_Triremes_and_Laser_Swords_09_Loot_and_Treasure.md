---
layout: gruv_book_page_adapter
title: 'Loot and Treasure'
published: true
---
# Loot and Treasure

Treasure moves along roads, ruins, caravans, and rumor.  
A haul adds weight to the pack train, names to the ledger, and heat to the district.  
Coin, relics, contracts, and strange cargo all pull factions into motion on the next week turn.

This chapter extends [SDM 05 Gear Index (Loot and Treasure)](../Synthetic_Dream_Machine_05_Gear_Index.md#canon-boundary-treasure-and-liquidation) with a fast referee loop:

1. generate lots (random loot / hoard composition)  
2. apply transport pressure (burden and throughput)  
3. liquidate through real channels and scrutiny  

## Treasure Profile

For each looted cache or major hoard, record:

- `Lots` (picks from the tables)
  - `Family + Tags`  
  - `Bulk` and `Base Value`  
- `Source` (site/node/encounter)  
- `Channel` and `Realized Value` (when liquidated)  
- `Attention/Tick changes` and any queued weekly event fallout

## Terminology

- **Base Value:** pre-sale value before channel/time/risk modifiers.  
- **Realized Value:** final value after sale/contract/channel modifiers, losses, and constraints.  
- **Tick (RSS):** area response rate (`+1` to `+4`), used when you **Tick Attention**.  
- **Attention (RSS):** current notice clock (`0-20`) with bands `Quiet`/`Loud`/`Alarm`/`Emergency`.  
- **Tick Attention (RSS verb):** add Area Tick to Area Attention.  
- **Encounter Die check (RSS):** d6 encounter check; trigger range follows Attention band.

## Quickstart Procedure (Referee)

1. Normalize economy and coin values (`1 cash (€) = 1 silver`; if converting OSR material).  
2. Generate a lot with the random loot table or full hoards with the hoard composition procedure.  
3. Record each lot’s treasure family (`coins`, `gems`, `trade goods`, `relics`, `intel`, etc.) and other tags. If the lot yields a concrete strange object, hand off to Chapter 05 for object classification, family resolution, and use handling.  
4. Apply bulk and carry pressure with the transport procedure, then liquidate with the channel procedure and record `Realized Value`.

## Use This Chapter When

- A site/discovery yields explicit valuables.  
- A salvage result says to roll random loot.  
- A hoard, cache, vault, convoy, or relic stash is in play.  
- PCs ask: what did we get, how heavy is it, and what is it worth?

## Treasure Family

Use this table to sort lots by treasure family, not to resolve how a concrete relic, ward, strange item, or charged device works in play. Once a lot turns into a specific object, go to Chapter 05 and run the `Anomalous Object Procedure`, then return here for transport, storage, sale, and fallout.

| Treasure Family | Recommended Tags | Usual Handling |
|---|---|---|
| Coins and bullion | `[cash] [portable] [fungible]` | Fast liquidation, low story friction |
| Gems and jewelry | `[luxury] [portable] [appraisable]` | Specialist buyers pay better |
| Art objects and curios | `[curio] [status] [collector]` | Collector market, slower sales |
| Trade goods and stores | `[trade] [bulk] [market-sensitive]` | High bulk, market-sensitive value |
| Potions, oils, and single-use elixirs | `[consumable] [arcane] [perishable]` | Resolve in Chapter 05, then keep, use fast, or move through specialist sale |
| Scrolls and spell formulae | `[intel] [arcane] [copyable]` | Resolve in Chapter 05, then decide between copy, access control, or sale |
| Wands, staves, rods, and charged devices | `[relic] [tool] [charged]` | Resolve in Chapter 05, then track testing risk and buyer heat here |
| Rings, amulets, and wearable wonders | `[relic] [status] [wearable]` | Resolve in Chapter 05, then choose retention, patron gift, or premium sale |
| Magic weapons and armor | `[relic] [weapon] [armor]` | Resolve in Chapter 05, then record retention pressure, claims, or elite sale |
| Artifacts and named relics | `[artifact] [wanted] [unique]` | Resolve in Chapter 05, then apply provenance, claim-war, and attention fallout here |
| Magic items and relics (mixed lots) | `[relic] [arcane]` or `[oldtech] [volatile]` | Resolve in Chapter 05 before transport, fencing, or open sale |
| Scrolls, maps, ledgers, keys | `[intel] [leverage] [navigation]` | Value depends on who wants it |
| Religious offerings and temple valuables | `[holy] [status] [doctrinal]` | Sale may trigger doctrinal or legal response |
| Captives, hostages, and ransomables | `[ransom] [human] [time-sensitive]` | Time-sensitive negotiation; moral/legal complications |
| Deeds, charters, tax rights, and titles | `[legal] [claim] [transferable]` | Converts via courts/guilds, not open stalls |
| Vehicles, mounts, and burden beasts | `[asset] [bulk] [logistics]` | Throughput gain if kept; slower sale and upkeep drag |
| Ships, caravans, and siege-grade assets | `[strategic] [bulk] [infrastructure]` | Contract/authority channels; high fallout potential |
| Claimed, stolen, or taboo assets | `[illegal] [hot] [tracked]` | Fence channels, heat checks |

Default use:

1. Identify family from source fiction/text.  
2. Apply tags and starting liquidation channel.  
3. Roll detailed output (random loot table / hoard composition) and keep family tags attached.  
4. If the output becomes a specific strange object, resolve it in Chapter 05 before returning to this chapter.

## Random Loot Generation (d20)

### Step 0: Generate a Lot

1. Roll the item/lot and apply linked treasure tables as needed.  
2. Record `Bulk`, `Base Value`, and `Tags`.  
3. Apply [Treasure Table A: Area-Level Multiplier](#treasure-table-a-area-level-multiplier) and record final base value.  

Roll `1d20` once per loot pick.

| d20 | Loot Result | Family | Bulk | Base Value (€) | Tags |
|---:|---|---|---:|---:|---|
| 1 | Nothing usable; traces only | none | 0 | 0 | `[spent] [false]` |
| 2 | Scrap trinkets and broken curios | Art objects and curios | `1 sp` | `1d6 x 5` | `[junk] [salvageable]` |
| 3 | Common goods bundle (tools, cloth, basics) | Trade goods and stores | `1 st` | `1d6 x 10` | `[trade] [common]` |
| 4 | Good supplies cache | Trade goods and stores | `1 sk` | `1d6 x 50` | `[supply] [consumable]` |
| 5 | Coin purse / pay chest fragment (use [B](#treasure-table-b-coin-mix)) | Coins and bullion | `1 sp` | `2d6 x 10` | `[cash] [portable]` |
| 6 | Weapon or shield of decent make | Trade goods and stores | `1 st` | `1d6 x 25` | `[gear] [martial]` |
| 7 | Armor piece or field kit | Trade goods and stores | `1 st` | `1d6 x 40` | `[gear] [protective]` |
| 8 | Trade lot (spice, resin, dyes, medicine) | Trade goods and stores | `1 st` | `2d6 x 25` | `[trade] [market-sensitive]` |
| 9 | Contraband packet (optionally add one [F](#treasure-table-f-special-treasure) roll) | Claimed, stolen, or taboo assets | `1 sp` | `2d6 x 40` | `[illegal] [hot]` |
| 10 | Curio lot (collector appeal) | Art objects and curios | `1 st` | `1d6 x 60` | `[curio] [collector]` |
| 11 | Arcane reagent cluster | Magic items and relics (mixed lots) | `1 st` | `1d6 x 75` | `[arcane] [volatile]` |
| 12 | Technical component set | Magic items and relics (mixed lots) | `1 st` | `1d6 x 75` | `[oldtech] [parts]` |
| 13 | Rare consumable batch (or [G](#treasure-table-g-relicmagic-yield) on 1-2 on d6) | Potions, oils, and single-use elixirs | `1 st` | `2d6 x 60` | `[rare] [consumable]` |
| 14 | Fine item (named maker, elite market; use [D](#treasure-table-d-gem-grade), [E](#treasure-table-e-jewelry-profile), [C](#treasure-table-c-gemjewelry-condition)) | Gems and jewelry | `1 st` | `2d6 x 80` | `[luxury] [status]` |
| 15 | Sensitive document / key-record | Scrolls, maps, ledgers, keys | `1 sp` | `1d6 x 100` | `[intel] [leverage]` |
| 16 | Relic fragment with partial function (use [G](#treasure-table-g-relicmagic-yield)) | Magic items and relics (mixed lots) | `1 st` | `2d6 x 100` | `[relic] [unstable]` |
| 17 | Treasure lot: mixed coin and goods (use [B](#treasure-table-b-coin-mix)) | mixed | `1 sk` | `3d6 x 100` | `[hoard] [bulk]` |
| 18 | Restricted relic or cult asset (use [G](#treasure-table-g-relicmagic-yield)) | Claimed, stolen, or taboo assets | `1 st` | `3d6 x 120` | `[illegal] [relic] [wanted]` |
| 19 | Major cache marker; add 2 more rolls | mixed | varies | roll + roll | `[cache] [escalation]` |
| 20 | Strange Item ([VLG d50](../sdm/Vastlands_Guidebook/Vastlands_Guidebook.md#page_0022) / [UVG d100](../sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md#page_0196)) + 1 bonus roll | Artifacts and named relics | `1 st` | `4d6 x 100` (if not given by Strange Item table) | `[strange] [high-interest]` |

### Treasure Table A: Area-Level Multiplier

Use the same value-bands as RSS salvage trading so loot and salvage do not drift apart.

| Area Level Band | Value Band | Value Multiplier |
|---:|:---|---:|
| `0-4` | Low | `x1` |
| `5-9` | Medium | `x2` |
| `10-14` | High | `x4` |
| `15+` | Epic | `x8` |

### Treasure Table B: Coin Mix

Use when a lot contains significant coin or bullion. This table sets the **currency face** (what it looks like in fiction), while value is still tracked as `cash`.
Style anchors: [OGA cash abstraction and exchange weirdness](../sdm/Our_Golden_Age/Our_Golden_Age.md#cash-assets), plus Elyncia mixed-market circulation (coins/tokens/favors across fractured trade routes) in [Elyncia world material](../elyncia/Elyncia_01_A_Broken_World.md).

| Context | Roll | Output (cash) | Currency Face |
|---|---:|---:|---|
| Carried purse | `1d6` | `1d6 x 10` to `2d6 x 50` | mostly silver (solver) and copper, with clipped gold |
| Port or border cache | `1d6` | `1d6 x 100` to `3d6 x 100` | mixed circulation: brass/silver bells, foreign coin, port tokens |
| Guard post chest | `1d6` | `2d6 x 100` | payroll mix: silver/gold, stamped trade bars, sealed pay-tallies |
| Lair hoard | `1d8` | `1d6 x 1,000` | mixed metals, old mints, tribute coin, oxidized bundles |
| Noble vault | `1d8` | `2d6 x 1,000` | high gold/platinum bias, treaty bullion, ceremonial strikes |

SDM Economy Weirdness (optional `1d6`, once per major lot):

| d6 | Band | Coin-Mix Result |
|---:|---|---|
| 1-3 | Expected | Liquid assets behave as advertised: coins, notes, cards, cheques, and local credits convert cleanly. Resolve at listed `cash` value. |
| 4-5 | Surprising | Split-currency lot: bells, scrip, favor-credit, debt chits, or dead mint mixed in. Exchange is possible but volatile; lose `1d6 x 5%` value in fees/spread, or spend 1 day finding a better broker to avoid the loss. |
| 6 | Error | Monetary shock: counterfeit panic, emergency recall, asset seizure, or bank run. The lot is temporarily "hot": Tick Attention once and schedule one immediate economy interruption scene before normal liquidation can proceed. |

Concept references:
- Cash abstraction / liquid assets: [OGA `Cash Assets`](../sdm/Our_Golden_Age/Our_Golden_Age.md#cash-assets).
- Multi-currency exchange volatility and fee spread: [OGA `Purr-Purr Exchange Rates`](../sdm/Our_Golden_Age/Our_Golden_Age.md#purr-purr-exchange-rates).
- `Tick Attention` and tick escalation interface: [FTLS 04 `RSS Attention`](Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md#rss-attention), [FTLS 09 `Step 5: Escalation Hooks`](#step-5-escalation-hooks).

Referee note: keep the local medium in fiction (coin, bells, cards, scrip, credits, oath-tokens), but settle outcomes in `cash`.

### Treasure Table C: Gem/Jewelry Condition

Roll `d6` per gem/jewelry item (or per grouped lot).

| d6 | Condition | Value Handling |
|---:|---|---|
| 1-3 | Intact | full listed value |
| 4 | Cracked | keep `20-50%` value |
| 5 | Damaged | keep `10-40%` value |
| 6 | Shattered / fragment | keep `5-10%` value |

### Treasure Table D: Gem Grade

Roll `d100` per gem (or per gem group) for base value:

| d100 | Value (cash) | Notes |
|---:|---:|---|
| 01-03 | 10 | low trade stone |
| 04-10 | 50 | minor cut gem |
| 11-25 | 100 | quality common gem |
| 26-46 | 500 | fine gem |
| 47-71 | 1,000 | elite gem |
| 72-90 | 5,000 | high jewel quality |
| 91-97 | 10,000 | crown-grade gem |
| 98-00 | special | Starstone/tristral or equivalent, referee sets value and tags |

Optional size/quality modifier (`2d6`):

| 2d6 | Modifier |
|---:|---:|
| 2-4 | `x1/2` |
| 5-9 | `x1` |
| 10-11 | `x2` |
| 12 | `x4` |

Value Grade Examples:

| Grade | Typical Value Band (cash) | Example Outcomes | Example Gems |
|---|---:|---|---|
| Common | `5-80` | low trade stone, minor cut gem, quality common gem | (d20) azurite, banded agate, bloodstone, carnelian, chalcedony, chrysoprase, hematite, jasper, jet, lapis lazuli, malachite, moonstone, obsidian, onyx, rock crystal, sardonyx, smoky quartz, tiger eye, turquoise, aventurine |
| Uncommon | `100-800` | fine gem, elite gem | (d12) amber, amethyst, aquamarine, garnet, jade, pearl, peridot, spinel, topaz, tourmaline, zircon, citrine |
| Rare | `1,500-10,000` | high jewel quality, crown-grade gem | (d6) black opal, blue sapphire, emerald, fire opal, regalia ruby, white diamond |
| Epic | `12,000+` (referee-set) | exceptional crown-grade, Startstone/tristral equivalent | (d8) flawless diamond, imperial emerald, royal sapphire, imperial topaz, crown opal, alexandrite, tristral crystal, star ruby |

### Treasure Table E: Jewelry Profile

Roll `1d6` for column (band) and `1d10` for row (form).

| d10 | 1-3 | 4-5 | 6 |
|---:|---|---|---|
| 1 | anklet | armband | amulet |
| 2 | beads | belt-chain | ring |
| 3 | bracelet | collar | medallion |
| 4 | brooch | earring set | diadem |
| 5 | buckle | necklace | crown |
| 6 | cameo | pendant | tiara |
| 7 | chain | choker | scepter |
| 8 | clasp | hairpin set | orb |
| 9 | locket | reliquary | talisman |
| 10 | pin | lucky token | scarab idol |

Price bands (by `d6` column):

| d6 | Jewelry Band | Value Tier (cash) |
|---:|---|---:|
| 1-3 | Common | `100-2,500` |
| 4-5 | Uncommon | `3,000-5,000` |
| 6 (1-3 on `d6`) | Rare | `7,500-15,000` |
| 6 (4-6 on `d6`) | Regalia | `20,000-50,000` |

### Treasure Table F: Special Treasure

Roll `d12` when a lot is marked unusual, collector, or special.

| d12 | Special Lot | Value (cash) | Tags |
|---:|---|---:|---|
| 1 | rare codex/book | `1d100 x 10` | `[intel] [collector]` |
| 2 | rare fur/pelt | `1d6 x 100` | `[luxury] [trade]` |
| 3 | incense/perfume case | `1d6 x 50` | `[luxury] [ritual]` |
| 4 | rug/tapestry | `4d6 x 100` | `[curio] [bulk]` |
| 5 | silk bolt lot | `1d6 x 1,000` | `[trade] [status]` |
| 6 | beast-skin bundle | `1d6 x 100` | `[trade] [bulk]` |
| 7 | monster-skin bundle | `5d4 x 10` | `[trade] [taboo]` |
| 8 | rare spice chest | `1d10 x 100` | `[trade] [market-sensitive]` |
| 9 | carved statuette | `1d6 x 100` | `[curio] [status]` |
| 10 | rare wine lot | `1d6 x 50` | `[luxury] [perishable]` |
| 11 | reliquary set | `1d6 x 500` | `[holy] [claimed]` |
| 12 | charter/deed packet | `1d6 x 1,000` | `[legal] [claim]` |

### Treasure Table G: Relic/Magic Yield

Use Chapter 05 for this table and full specific-item resolution:
- [Anomalous Object Procedure](Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md#anomalous-object-procedure)
- [Anomalous Object Catalog](Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md#anomalous-object-catalog)
- [Legacy Generation Support](Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md#legacy-generation-support)

Quick handoff:
1. Roll `d100` on `Magic Item Yield Table` in Chapter 05.  
2. Use the `Anomalous Object Procedure` and `Anomalous Object Catalog` to resolve the concrete object.  
3. Drop into `Legacy Generation Support` only if you need denser old-school yield support or named-effect coverage.  
4. Return to this chapter for hoard handling, transport, and liquidation.

### Referee Advice

Treasure moves people before it moves coin. It buys loyalty, powers wards, settles debts, and marks who can command whom in a district. If a faction controls an item, can operate it, and has leave from the owner or command chain, they will put it to use.

Before play, decide what is already in circulation:
- what is equipped now,
- what is held in reserve,
- what has been spent, damaged, or promised to another power.

At encounter time, show the consequences, not a static vault:
- defenders wearing heirloom wards,
- officers carrying charged tools,
- stores already opened and rationed.

Log in one line: `Active: ... / Reserve: ... / Spent: ... / Locked by claim: ...`.

## Hoard Composition Procedure

Use this when a location has a true hoard, not a single loot pick.

### Step 1: Set Hoard Band

- `Low` (`Area Level 0-4`): `2` picks  
- `Medium` (`Area Level 5-9`): `3` picks  
- `High` (`Area Level 10-14`): `4` picks  
- `Epic` (`Area Level 15+`): `5` picks

### Step 2: Set Hoard Profile by Area Tags

| Profile | Example Tags | Composition Bias | Default Escalation Vector |
|---|---|---|---|
| Civic Trade | `[legal]` `[civil]` `[trade]` `[guild]` `[market]` | coins, goods, contracts, ledgers | taxation, permits, guild claims |
| Wild Ruin | `[ruin]` `[wild]` `[frontier]` `[salvage]` `[derelict]` | mixed goods, tools, scrap, relic fragments | scavengers, predators, rival crews |
| Sacred/Taboo | `[holy]` `[taboo]` `[cult]` `[ritual]` `[doctrinal]` | relics, icons, texts, offerings | sanction, rite-demand, doctrinal response |
| State Security | `[surveilled]` `[state]` `[military]` `[warded]` `[licensed]` | pay chests, records, restricted components | checkpoints, confiscation, official inquiry |
| Void Active | `[void]` `[active]` `[dynamic]` `[anomalous]` `[noospheric]` | unstable reagents, noospheric keys, volatile lots | contamination, anomalies, reality pressure |
| Black Market | `[illegal]` `[hot]` `[smuggling]` `[contraband]` `[wanted]` | compact high-value lots, forged docs, covert cargo | raids, informants, faction retaliation |
| Scholastic Arcane | `[academic]` `[archive]` `[wizard]` `[scriptorium]` `[arcane]` | scrolls, formulae, odd instruments, indexed relic notes | theft, censorship, mage disputes |
| Noble/Domain | `[estate]` `[noble]` `[administrative]` `[taxed]` `[claim]` | deeds, charters, treasury lots, regalia | inheritance conflict, legal contest, audits |
| Industrial Logistics | `[industrial]` `[factory]` `[logistics]` `[supply]` `[mechanical]` | bulk components, tools, fuel, maintenance stock | accidents, labor unrest, production shutdowns |
| Port/Customs | `[port]` `[customs]` `[maritime]` `[warehouse]` `[trade]` | manifests, bonded cargo, import lots, seized goods | customs seizure, tariff jumps, dockside factions |

Referee note: choose the closest profile when any 2-3 tags overlap, then blend one composition element and one escalation element from a second row if needed.

### Step 3: Roll Picks

- Roll once on the random loot table per pick.  
- Apply area-level value multipliers.  
- On `19` or `20`, resolve that entry fully.
- Sum all `sp/st/sk`.  
- If carry bulk exceeds company capacity, apply overload penalties below.

### Step 4: Add Risk Rider (`1d6`)

Hoards carry risk.

| d6 | Hoard Risk Rider |
|---:|---|
| 1 | Quiet stash. No immediate tick; treat as Quiet unless other actions Tick Attention. |
| 2 | Fragile packing. Lose 25% value unless handled carefully. |
| 3 | Tracked goods. Tick Attention once on extraction or first sale (referee call). |
| 4 | Cursed or contaminated lot. Save on handling or take a burden. |
| 5 | Claimed property. A faction or authority arrives soon. |
| 6 | Bait cache. Tick Attention twice and run an immediate Encounter Die check. |

RSS handoff: when a rider says **Tick Attention**, increase Attention by Area Tick.

RSS references: [Attention (0–20)](Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md#rss-attention), [Tick Attention cadence](Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md#rss-attention), [Cooling Down](Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md#rss-cooling-down).

### Step 5: Escalation Hooks

Apply in this order:

1. **Tick Attention (immediate):** extraction always ticks once; `High`/`Epic` hoards tick once on first liquidation attempt. If those ticks cross `7+` or `13+`, run an immediate Encounter Die check at each crossed threshold (at `20`, treat checks as automatic per RSS).  
2. **Illicit lots (immediate):** if any lot is `[illegal]`, `[hot]`, or `[wanted]` and the local Area Attention is `0`, set it to `1d6` (RSS `Starting Hot`). Tick Attention once per illicit tag present (`[illegal]`, `[hot]`, `[wanted]`, etc.) on extraction. While openly moving or selling illicit lots, tick once per major scene shift. Resolve band crossings and Encounter Die checks immediately.  
3. **Weekly fallout (pre-roll):** pre-roll an Event for the next week from the appropriate column/band using total Realized Value moved through the area:  
   - `>= 10 sk` or `>= 5,000 cash` -> pre-roll one **Surprising** Event for next week.  
   - `>= 20 sk` or `>= 10,000 cash` -> pre-roll one **Error** Event for next week (highest band only).  
   - If using OGA `I.N.T.R.`, use matching bands (`Surprising -> Nuisance/Trouble`, `Error -> Trouble/Rupture`).  
   - Log the pre-rolled Event and current Attention/Tick mods in the `Treasure Profile`; carry Area Attention forward until reduced by RSS cooldown.  

## Transport, Burden, and Throughput

### Mixed Hoard Carry Rule

- Coins and compact valuables: `250 cash = 1 st`.  
- Goods and relics: listed bulk.  
- Fragile lots: normal bulk + dedicated slot/container as needed.

### Overload Penalties

Resolve overload by carrier type:

1. **On-foot characters (`st` scale):** compare load to item slots (`7 + STR`). Overflow becomes burdens (`1 st` overflow = `1 burden`; each burden is `-1` to all rolls). If pushed while overloaded (forced haul, chase, hard travel), call an attrition save; on failure apply END/AUR loss or Wear and Tear. Overloaded carriers count as `slow` for weekly day tallies.  
2. **Pack animals and vehicles (`sk` scale):** compare cargo to ride capacity. If overloaded, make a riding/driving overload roll when stressed (or once per week) and apply the VLG outcome (accident/spill, delay, fracture -> permanent slow, exhaustion, or breakdown). Use the ride’s speed and supply profile for weekly travel.

Speed guidance:
- Overloaded human baseline shifts `normal -> slow` (apply one `[-]` in chases/races, and treat as `slow` for weekly day tallies).
- If a carrier already at `slow` overloads further, keep `slow` and apply the overload consequences instead of stacking extra speed downgrades.
- A VLG fracture result is a lasting downgrade (`normal -> slow`, or `slow -> very slow`) until properly repaired.

References: [SDM inventory + weekly cadence](../Synthetic_Dream_Machine_01_Quickstart.md), [VLG supplies](../sdm/Vastlands_Guidebook/Vastlands_Guidebook.md#page_0085), [VLG vehicles/mounts](../sdm/Vastlands_Guidebook/Vastlands_Guidebook.md#page_0086), [VLG capacity/overloading/speed/power](../sdm/Vastlands_Guidebook/Vastlands_Guidebook.md#page_0087), [UVG transport capacities](../sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md#page_0187), [UVG transport fixes/features](../sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md#page_0188), [UVG gear/services supplies](../sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md#page_0189).


## Liquidation and Fencing Treasure


Run liquidation in two layers: first apply one channel profile below to set cadence (`day/watch/week`), value pressure, and visibility risk (`Tick Attention` / Encounter Die complications); then resolve market research/deals with tables from [SDM Quickstart Company/Caravan Play](../Synthetic_Dream_Machine_01_Quickstart.md#market-research).

| Channel | Best For | Time | Value Multiplier | Default Complication |
|---|---|---|---:|---|
| Open market | legal/common goods, straightforward coin conversion | 1 day | `x1.0` | normal scrutiny; no automatic Tick |
| Specialist buyer | gems, luxury, relic-adjacent, or high-knowledge lots | 1 day | `x1.2` | narrow buyer pool; weak provenance can add delay or worse deal terms |
| Fence / black market | `[illegal]` / `[hot]` / `[wanted]` lots | 1 day | `x0.8` to `x1.5` | Use [Step 5 `Illicit lots`](#step-5-escalation-hooks) (ticks, thresholds, and starting-hot handling). |
| Contract lot (10+ sk) | bulk cargo, strategic lots, vehicles/assets | 1 week | `x0.9` to `x1.3` | delayed payout, exclusivity clauses, faction/legal strings |
| Ritual conversion | arcane/oldtech/volatile lots unsellable in normal channels | 1 watch to 1 week | varies | referee calls an Encounter Die check or save/burden risk as appropriate |

`LT04` cash-out overlays run **after** channel selection whenever converting non-coin valuables (`gems`, `jewelry`, `special treasure`) to spendable `cash`.

### LT04 Overlay: Cashing Normal and Special Treasure

Use this optional overlay for conversion friction while keeping SDM06 market rolls and channel multipliers as the primary sale engine.

| Interface | Inputs | Outputs |
|---|---|---|
| Cash-Out Overlay | item class (`gem`, `jewelry`, `special`), stated value (`cash`), settlement population, provenance tags (`[illegal]`, `[hot]`, `[wanted]`, etc.) | realized `cash`, fee paid, acceptance/refusal result, fallback buyer result (if needed) |

Procedure:

1. **Check settlement liquidity cap:** max single-item cash-out is `<=` settlement population (in `cash`).  
   - if above cap, split lot, move to larger market, or use fallback buyer flow.
2. **Apply cashing fee on accepted deals:**  
   - gems: `1-5%`  
   - jewelry: `2-12%`  
   - special treasure: no fixed fee band; resolve through negotiated sale terms, but item must be sold before it becomes spendable `cash`.
3. **Refusal conditions (any may apply):** no ready coin, suspicious provenance, suspected magical/illegal origin, or buyer risk intolerance.
4. **Fallback private buyer (on refusal):** offer `20-80%` (`2d4 x 10%`) of stated value; usually 1 day and local appraisal scene.
5. **Jewelry breakup option:** if broken into parts, lose up to `50%` value before further sale math.
6. **Hot goods:** attempts to cash out `[illegal]`, `[hot]`, or `[wanted]` lots should trigger [Step 5 `Illicit lots`](#step-5-escalation-hooks) handling.

Test prompts:
- Gem conversion in small settlement: `12,000` cash gem at pop `3,000` should fail direct cash-out (split/travel/fallback required).  
- Jewelry with `[hot]` tag: refusal is plausible; fallback `20-80%` route should remain available.  
- Special treasure lot: no spendable `cash` until sale resolves.
