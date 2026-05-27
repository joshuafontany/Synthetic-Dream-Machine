<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/docs/lares/the-lares-protocols#two-traditional-models-and-the-third >>
```toml iam
file-path = "bags/@lares/v0.1/docs/lares/the-lares-protocols/two-traditional-models-and-the-third.md"
uri-path = "ha.ka.ba/docs/lares/the-lares-protocols#two-traditional-models-and-the-third"
```

<<~&#x0002;>>

## Two Traditional Models and a Third

Frazee maps the protocol-design landscape onto two traditional shapes plus a deliberate third:

| Shape | Examples | What it preserves | Where it breaks |
|—|—|—|—|
| **Federated hosts** | Email, ActivityPub | Freedom of choice between instances | Hosting, moderation, and algorithms ride together; popular instances accumulate unchecked power |
| **Magical mesh (pure p2p)** | BitTorrent, Nostr, SSB | Individual rights at the device layer | "No answer for the governance of shared resources" once aggregate state matters |
| **Magical federated mesh** | AT Protocol | Server infrastructure for reliability + user-addressed content for portability | New burdens: appview cost, host concentration if one operator dominates every layer |

Frazee names the practice **Information Civics** — software engineering married to civic design. The core question sharpens: *who holds the right to host data, platform speech, write applications, implement algorithms, collect behavior, place ads*. Practical decentralization accepts tradeoffs against ideological purity to produce systems that scale to actual use.

The user-facing rights Frazee privileges over architecture:

- **Account migration without losing history or reach** — pressure on hosts to keep users happy; no host can hold users captive when alternatives exist.
- **Layer separation in the failure mode** — Bluesky's 2024 moderation bug incorrectly unhosted users from the PDS layer when it should have filtered them at the app layer. *Users on other PDS hosts stayed unaffected. Their right to hosting got protected.* The architecture failed in the right shape.

Two articles, two readings of ATProto: Connected Places flags one operator three orders of magnitude larger than competitors across every layer; Frazee acknowledges the same concern as outstanding while defending the architectural shape. Both readings hold.

<<~&#x0003;>>

<<~&#x0004; -> ? >>

