---
layout: gruv_default_adapter
title: 'Flying Triremes and Laser Swords — Open Beta'
published: true
permalink: /vault/synthetic-dream-machine/overview/
---
# Flying Triremes and Laser Swords

**An OSR Tabletop Roleplaying Game for Elyncia**
*by Joshua Fontany & Freyja Fontany — Amorphous Dreams Cabal*

> **Open Beta — April 2026**
> Core rules, setting material, and the Lares AI agent architecture are all in active development. Expect rough edges, missing sections, and mid-sprint restructuring. Feedback is welcome.

---

## What Is This?

**Flying Triremes and Laser Swords (FTLS)** is a modular tabletop RPG supplement built on the **Synthetic Dream Machine (SDM)** by Luka Rejec. It runs on the OSR design philosophy: stakes, costs, consequences, and emergent play.

**Elyncia** is the setting: a mythpunk orichalcum-age world — Gaia's hidden sister planet — shattered by celestial cataclysm, ruled by old-school dungeon design sensibilities, fae courtly politics, magitech salvage, and distributed AI guardian spirits called Lares. Think flying triremes, laser swords, and the ruins of a planetary internet rebuilt by the gods of craft and strife.

**Lares** is the AI agent architecture that powers the repository's AI assistant tooling. It is also in-world infrastructure: orichalcum-inscribed DreamNet nodes that serve as crossroads guides, archivists, and thresholds. Both things are true at once.

Lares should be read as an **Infrastructure-as-Myth** system: the repo's attempt to treat mythic identity, authority, memory, and epistemic protocol as portable agent infrastructure rather than decorative prompt flavor. Start with [Infrastructure as Myth](infrastructure-as-myth.md) for the design thesis behind the agent stack.

---

## Specifications

This repository holds the **source of record** for several specifications. Their normative text lives in the meme graph under [`bags/lares/`](bags/lares/), addressed by `lar:` URI rather than by file path, and every implementation — in this repository or outside it — consumes that text rather than restating it.

The graph carries 275 memes, 264 of which declare a `role`, and it classifies its own contents. A **specification** states a contract for readers outside the system. An **invariant law** states something the system must not violate. A **doctrine** states a stance the design proceeds from. A **capability** states what a component must be able to do.

### The specification uses the language it specifies

Every meme opens with a doctype naming the dialect it uses, and the specification of that dialect names itself:

```
<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >>
```

Reading the specification therefore requires an implementation of the thing it specifies. The reference parser lives here rather than downstream for that reason: the two carry each other and version together.

### Principal specifications

| `lar:` address | states |
|---|---|
| `lar:///ha.ka.ba/lares/api/pono/lar-uri` | the `lar:` URI scheme — abstract, ABNF, five-planes reading. Submission-grade |
| `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext` | `text/memetic-wikitext` — abstract, conformance under RFC 2119, lexis |
| `lar:///ha.ka.ba/lares/api/pono/memetic-wikitext-framing` | the memetic carrier frame — the declaration and control set |
| `lar:///ha.ka.ba/lares/api/pono/tiddlywiki-wikitext` | TiddlyWiki 5 wikitext base syntax — the normative reference the dialect extends |
| `lar:///ha.ka.ba/lares/api/pono/wikitext-filter` | the wikitext-filter grammar dialect |
| `lar:///ha.ka.ba/lares/docs/voices` | the three-layer voice house, with `…/docs/voices/masks` and `…/docs/voices/workers` beside it |

### Laws, doctrines and capabilities

| `lar:` address | holds |
|---|---|
| `…/api/pono/RFC-2119` | the shared normative vocabulary every other meme cites |
| `…/api/pono/meme` | meme invariant law — copy-shape authority and rating posture |
| `…/api/pono/exchange-vector` | canonical exchange vectors and HUD emission order |
| `…/api/pono/causal-islands` · `…/api/pono/federated-causal-islands` | causal island doctrine, and non-simultaneous apprehension |
| `…/api/pono/local-first` | the seven local-first ideals the storage layer answers to |
| `…/api/pono/guest-grammar` | admission of a guest grammar, and the host–guest boundary |
| `…/api/pono/quine-principles` | quine principles P1–P4 |
| `…/api/pono/tiddler-record` | the canonical Automerge storage unit |
| `…/api/pono/orichalcum-capabilities` | the capability profile, UCAN-compatible at wire boundaries |
| `…/api/mu/pattern-integrity` | Fuller's pattern integrities as applied here |

### Reading a meme

Each carries a TOML metadata block after its doctype. `uri-path` gives its address — the address, not the path, identifies it. `role` states in one line what the meme holds. `register` grades its standing: **Synthesis-Canon** (167 memes), **Synthesis** (87), **Provisional-Synthesis** (8), **Canon** (3). `tags` link it into families, and modal force follows RFC 2119 throughout.

### Implementations that consume these

| implementation | where | consumes |
|---|---|---|
| reference parser, two independent hosts | [`packages/tree-sitter-memetic-wikitext`](packages/tree-sitter-memetic-wikitext) | the dialect and its sigil set |
| language server | `packages/tree-sitter-memetic-wikitext/host-py` | the same |
| runtime and vessel | `packages/lararium-*`, `packages/lares-cli` | causal islands, tiddler record, capabilities |
| editor grammars | [`VSCode-TW5-Syntax`](VSCode-TW5-Syntax) (submodule) | TiddlyWiki wikitext and the dialect |
| substrate | [`TiddlyWiki5`](TiddlyWiki5) (submodule) | TiddlyWiki wikitext |

Two independent parser hosts read the same bytes and a gate requires them to agree, which gives the self-hosting graph a reader that answers to something outside itself.

---

## Repository Structure

### SDM Game Rules

| File | Contents |
|---|---|
| [Quickstart](Synthetic_Dream_Machine_01_Quickstart.md) | SDM core rules — the Quickstart entry point |
| [Paths Index](Synthetic_Dream_Machine_02_Paths_Index.md) | Paths index |
| [Traits Index](Synthetic_Dream_Machine_03_Traits_Index.md) | Traits index |
| [Powers Index](Synthetic_Dream_Machine_04_Powers_Index.md) | Powers index |
| [Gear Index](Synthetic_Dream_Machine_05_Gear_Index.md) | Gear index |
| [Campaign Regions](Synthetic_Dream_Machine_06_Campaign_Regions.md) | Campaign regions |

### FTLS Game Rules

| File | Contents |
|---|---|
| [01 — Title & Introduction](ftls/Flying_Triremes_and_Laser_Swords_01_Title_Introduction.md) | Overview, five gameplay modes (Delve / Travel / Company / Faction / Mythic) |
| [02 — FTLS Paths](ftls/Flying_Triremes_and_Laser_Swords_02_FTLS_Paths.md) | Character Paths native to the FTLS setting |
| [03 — OSR Heritage Trait](ftls/Flying_Triremes_and_Laser_Swords_03_OSR_Heritage_Trait.md) | OSR compatibility layer — heritage trait rules |
| [04 — Recon, Salvage, Secrets](ftls/Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md) | Procedures for reconnaissance, salvage operations, and secret discovery |
| [05 — Magitech and Fantascience](ftls/Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md) | Magitech gear, fantascience devices, and related procedures |
| [06 — Powers and ECM](ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md) | Full powers index with OSR conversion cards *(active sprint)* |
| [07 — Wild Magic Exposure](ftls/Flying_Triremes_and_Laser_Swords_07_Wild_Magic_Exposure.md) | Wild magic rules, corruption, and exposure procedures |
| [08 — Formations and Mass Combat](ftls/Flying_Triremes_and_Laser_Swords_08_Formations_and_Mass_Combat.md) | Fleet and army scale combat rules |
| [09 — Loot and Treasure](ftls/Flying_Triremes_and_Laser_Swords_09_Loot_and_Treasure.md) | Treasure generation, loot tables, and salvage rewards |
| [10 — Appendix Null: Referee Resources](ftls/Flying_Triremes_and_Laser_Swords_10_Appendix_Null_Referee_Resources.md) | Referee-facing tables, random generators, and reference tools |

### FTLS Setting

#### Elyncia — Core Chapters

| File | Contents |
|---|---|
| [01 — A Broken World](elyncia/Elyncia_01_A_Broken_World.md) | World overview, orichalcum age, the Second Breaking, the DreamNet |
| [02 — The Lares DreamNet](elyncia/Elyncia_02_The_Lares_DreamNet.md) | DreamNet architecture, Lares spirits, ley-line infrastructure |
| [03 — Daemons and the Metaphysics of Play](elyncia/Elyncia_03_Daemons_and_the_Metaphysics_of_Play.md) | Daemon ontology, noosphere metaphysics, entity mechanics |

#### Elyncia — Regions

| Region | Contents |
|---|---|
| [Neo-Thracia — Region Worksheet](elyncia/Neo-Thracia/Neo-Thracia_Region_Worksheet.md) | Region overview and worksheet |
| [Neo-Thracia — Session Zero](elyncia/Neo-Thracia/Session_Zero.md) | Session zero materials |
| [The Caverns of Thracia](elyncia/Neo-Thracia/The%20Caverns%20of%20Thracia/The_Caverns_of_Thracia.md) | Dungeon supplement — Caverns of Thracia |
| [New Delos — Market District Live Feed](elyncia/New%20Delos/Lares_New_Delos_Market_District_Live_Feed_Examples.md) | New Delos market district encounter material |
| [Shattered Isles — Faerie Ring Strandbeest Shrine](elyncia/Shattered%20Isles/Faerie_Ring_Strandbeest_Shrine_Sheet.md) | Shrine sheet — Faerie Ring Strandbeest |
| [Shattered Isles — Powered Symbiote & Ichi Construct](elyncia/Shattered%20Isles/Powered_Symbiote_Trait_and_Ichi_Construct_Golem.md) | Trait and construct golem supplement |

### Reference Material (SDM Third Party)

These directories contain source material from the Synthetic Dream Machine ecosystem by Luka Rejec, used under the SDM Third Party License:

| Directory | Contents |
|---|---|
| [Ultraviolet Grasslands and the Black City 2e](sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md) | UVG 2e reference archive |
| [Vastlands Guidebook](sdm/Vastlands_Guidebook/Vastlands_Guidebook.md) | VLG reference archive |
| [Our Golden Age](sdm/Our_Golden_Age/Our_Golden_Age.md) | OGA reference archive |
| [Magitecnica/](wtf/Magitecnica/Magitecnica_01_Codex_1_The_Use_and_Misuse_of_Powers_Great_and_Small.md) | Magitech and fantascience setting material |
| [Eternal Return Key](wtf/Eternal_Return_Key/Eternal_Return_Key.md) | Supplemental dungeon/scenario material |
| [There, A Red Door](wtf/There_A_Red_Door/There_A_Red_Door.md) | Supplemental scenario material |

### AI Agent Tooling

| Directory / File | Contents |
|---|---|
| [infrastructure-as-myth.md](infrastructure-as-myth.md) | Root design thesis for Lares as portable agent infrastructure |
| [Deterministic_IaM_Build.md](Deterministic_IaM_Build.md) | Deterministic build spec for rendering Lares across platforms |
| [`builds/`](builds/README.md) | Manifest-driven IaM build layer: manifests, module metadata, rendered browser package, verification artifacts |
| [`builds/agents/`](builds/agents/README.md) | Lares AI agent prompt files — kernel, preferences, examples, Markdown rules |
| [AGENTS.md](AGENTS.md) | Root agent configuration — identity, voice architecture, VS Code operational map |
| `_todo/` | Pipeline operations, conversion tracking, design docs |
| `_todo/BECMI/scripts/` | Automation scripts for BECMI conversion pipeline |
| `_becmi/` | BECMI source extractions (conversion pipeline input) |

### Lares Infrastructure

| Directory | Contents |
|---|---|
| [`bags/lares/`](bags/lares/) | the meme graph — 275 memes, the source of record for the specifications above |
| [`noosphere-boot.md`](noosphere-boot.md) | the boot seed: the attractor a woken node hydrates the house from |
| `packages/tree-sitter-memetic-wikitext/` | the reference parser, in two independent hosts, with a language server |
| `packages/lararium-*/` | the runtime — node, browser, mesh, sensorium, keyhive, mempalace, tw5 |
| `packages/lares-cli/` | the vessel door |
| `TiddlyWiki5/`, `VSCode-TW5-Syntax/`, `mempalace/`, `kowloon*/` | submodules the reference deployment runs on |


---

## Starting Points for Human Readers

**New to FTLS?** Start with [Flying Triremes and Laser Swords — Introduction](ftls/Flying_Triremes_and_Laser_Swords_01_Title_Introduction.md).

**New to SDM?** Start with [SDM Quickstart](Synthetic_Dream_Machine_01_Quickstart.md).

**Exploring the setting?** Start with [Elyncia: A Broken World](elyncia/Elyncia_01_A_Broken_World.md).

**Working with the AI tooling?** Read [Infrastructure as Myth](infrastructure-as-myth.md), then [Deterministic IaM Build](Deterministic_IaM_Build.md), then [`builds/agents/README.md`](builds/agents/README.md), then [AGENTS.md](AGENTS.md).

The manifest/verification layer now exists. The active next step for Lares tooling is prompt/package slimming so repo-native roots can return to stable reload-safe budgets before the next governance-hardening pass.

---

## Licenses

This repository contains material under two distinct licenses:

### FTLS Fan Content & Remix License

All original Amorphous Dreams Cabal content — FTLS rules text, Elyncia setting material, Lares agent architecture, and related original work — is published under the **[FTLS Fan Content & Remix License](FTLS-3rd-Party-License.md)**.

The short version: you can make Fan Works (house rules, supplements, fiction, AI agent forks, community tools) freely for non-commercial purposes. Commercial or AI training use requires a separate agreement. Product Identity (specific names, compound terms, artwork) is reserved; the design is open.

### SDM Third Party License

The Synthetic Dream Machine rules ecosystem (Ultraviolet Grasslands, Vastlands Guidebook, Our Golden Age) by Luka Rejec is used under the **[Synthetic Dream Machine Third Party License](Synthetic-Dream-Machine-3rd-Party-License.md)**.

> *Flying Triremes and Laser Swords* is an independent production by Amorphous Dreams Cabal and is not affiliated with Luka Rejec or WTF Studio. It is published under the Synthetic Dream Machine Third Party License.
>
> Synthetic Dream Machine (SDM), Ultraviolet Grasslands (UVG), Our Golden Age (OGA), and the Vastlands Guidebook (VLG) are copyright Luka Rejec.

---

## Development Status

See [CHANGELOG.md](CHANGELOG.md) for version history and sprint status.

The Lares agent architecture (`AGENTS.md`, `builds/agents/`) is versioned at **v3.6**.

---

## Development Setup

These scripts are idempotent and intended to be run from the repository root.
They assume Python 3 is available. For project setup, activate `.venv` first.

### 0. Prepare scripts

If the executable bit was not preserved by your checkout or zip tool, run:

```bash
chmod +x scripts/*.sh scripts/*.py
```

### 1. Create and activate a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install the repo in editable dev mode

```bash
./scripts/dev-setup.sh
```

This script:

- verifies that `.venv` is active,
- syncs git submodules when `.gitmodules` is present,
- upgrades packaging tools,
- installs the package with dev extras via `pip install -e '.[dev]'`,
- verifies that the `lares` package imports.

### 3. Install Ollama

Install Ollama with the official installer:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify the CLI is available:

```bash
ollama -v
ollama list
```

### 4. Configure Ollama under WSL/systemd

```bash
./scripts/ollama-wsl-setup.sh
```

The first run may enable systemd in `/etc/wsl.conf` and stop with instructions.
If that happens, run this from PowerShell:

```powershell
wsl.exe --shutdown
wsl
```

Then, inside WSL:

```bash
cd ~/Synthetic-Dream-Machine
code-insiders Synthetic-Dream-Machine.code-workspace
source .venv/bin/activate
./scripts/ollama-wsl-setup.sh
```

By default this configures Ollama models under:

```text
/mnt/d/ollama/models
```

Override that path when needed:

```bash
OLLAMA_MODEL_DIR="$HOME/.ollama/models" ./scripts/ollama-wsl-setup.sh
```

### 5. Pull local models

Default model pull:

```bash
./scripts/ollama-models.sh
```

Custom model pull:

```bash
./scripts/ollama-models.sh qwen3.6:27b qwen3-coder-next qwen2.5-coder:7b
```

The script skips models that are already present.

### 6. Manage the Ollama service

On WSL/Linux service installs, Ollama runs as a `systemd` service. Use these commands to start, stop, restart, or disable it.

This is useful when working on a laptop that should not keep local model services running, or when large models are not appropriate for the current machine.

#### Check Ollama service status

```bash
systemctl status ollama --no-pager
````

Check whether the daemon is reachable:

```bash
ollama ps
```

Check installed models:

```bash
ollama list
```

Useful distinction:

```text
ollama list   # installed / pulled models
ollama ps     # currently loaded / running models
ollama run    # starts a model session and loads it
ollama serve  # starts the Ollama daemon manually, not a specific model
```

#### Start Ollama

```bash
sudo systemctl start ollama
```

Verify:

```bash
systemctl is-active ollama
ollama ps
```

#### Stop Ollama for the current WSL session

```bash
sudo systemctl stop ollama
```

Verify:

```bash
systemctl is-active ollama
```

Expected output:

```text
inactive
```

#### Restart Ollama

Use this after changing service configuration, model storage paths, or environment variables.

```bash
sudo systemctl restart ollama
```

Then verify:

```bash
systemctl status ollama --no-pager
ollama ps
```

#### Enable Ollama auto-start on WSL boot

```bash
sudo systemctl enable --now ollama
```

This enables the service and starts it immediately.

Verify:

```bash
systemctl is-enabled ollama
systemctl is-active ollama
```

#### Disable Ollama auto-start

Recommended for laptops or machines that should not automatically run local model infrastructure.

```bash
sudo systemctl disable --now ollama
```

This disables auto-start and stops the currently running service.

Verify:

```bash
systemctl is-enabled ollama || true
systemctl is-active ollama || true
```

Expected output:

```text
disabled
inactive
```

#### Stop a loaded model without stopping the daemon

If the Ollama daemon should remain available but a model should be unloaded:

```bash
ollama ps
ollama stop qwen3.6:27b
```

Or with an environment variable:

```bash
OLLAMA_SMOKE_MODEL="${OLLAMA_SMOKE_MODEL:-qwen3.6:27b}"
ollama stop "$OLLAMA_SMOKE_MODEL"
```

Then confirm:

```bash
ollama ps
```

#### View Ollama logs

```bash
journalctl -u ollama -n 100 --no-pager
```

Follow logs live:

```bash
journalctl -u ollama -f
```

#### Laptop-safe default

For a local development laptop that is not suitable for large local models, keep Ollama installed but disabled by default:

```bash
sudo systemctl disable --now ollama
```

Start it only when needed:

```bash
sudo systemctl start ollama
```

Stop it when done:

```bash
sudo systemctl stop ollama
```

#### Windows boot vs WSL boot

`systemctl enable ollama` starts Ollama when the WSL distro starts. It does not necessarily start WSL at Windows login.

If Ollama should start on every Windows login, create a Windows Task Scheduler task that starts the WSL distro, for example:

```powershell
wsl.exe -d Ubuntu --exec systemctl start ollama
```

Replace `Ubuntu` with the distro name from:

```powershell
wsl.exe -l -v
```

For this project, the recommended laptop default is **not** to auto-start Ollama unless the machine is intended to serve local models.

Useful distinction:

```text
ollama list   # installed / pulled models
ollama ps     # currently loaded / running models
ollama run    # starts a model session and loads it
ollama serve  # starts the Ollama daemon, not a specific model
```

For VS Code Insiders + Copilot local models, the important requirement is that the Ollama daemon is reachable and the model is pulled. Warming the model first is optional, but useful as a smoke test before opening Copilot Chat.

Quick local smoke test:

```bash
OLLAMA_SMOKE_MODEL="${OLLAMA_SMOKE_MODEL:-qwen3.6:27b}"
ollama ps
ollama run "$OLLAMA_SMOKE_MODEL" "Reply with ready."
ollama ps
```
### 7. Run tests

```bash
pytest
```

### 8. Smoke-test the repo MCP server

Default smoke test:

```bash
python scripts/mcp-smoke.py
```

If the MCP server entrypoint differs, pass the exact launch command after `--`:

```bash
python scripts/mcp-smoke.py -- python -m lares.lararium_mcp
python scripts/mcp-smoke.py -- ./lares/lararium_mcp/run.sh
```

The smoke test sends MCP `initialize` and `tools/list` requests over stdio.

### 9. Check local environment status

```bash
make status
# or
./scripts/status.sh
```

This prints repo, Python, package import, installed Ollama models, running Ollama models, Ollama service, and VS Code Insiders status.

### 10. Open the repo in VS Code Insiders

```bash
code-insiders .
```

Then configure Ollama in Copilot Chat:

1. Open Copilot Chat.
2. Open the model picker.
3. Select **Local**.
4. If models do not appear, use **Chat: Manage Language Models**.
5. Choose **Add Models → Ollama**.
6. Add the repo MCP server through `.vscode/mcp.json`.

Recommended workspace MCP config:

```json
{
  "servers": {
    "lararium": {
      "type": "stdio",
      "command": ".venv/bin/python3",
      "args": ["-m", "lares.lararium_mcp"],
      "cwd": ".",
      "env": {}
    }
  }
}
```

For clients that read root `.mcp.json`:

```json
{
  "mcpServers": {
    "lararium": {
      "command": ".venv/bin/python3",
      "args": ["-m", "lares.lararium_mcp"],
      "cwd": "."
    }
  }
}
```

## Project Structure

- `lares/` — main package, MCP server modules, and agentic logic.
- `scripts/` — idempotent setup, status, and smoke-test scripts.
- `tests/` — test suite.
- `requirements.txt` — development dependencies, if present.
- `pyproject.toml` — build and project metadata.



## License
LICENSE

---

## Community

- Live site: [amorphous-dreams.github.io](https://amorphous-dreams.github.io/vault/synthetic-dream-machine/)
- Issues and feedback: GitHub Issues on this repository

---

*Make it weird, wonderful, and wild. — Luka Rejec, SDM Third Party License*

*Hail Eris. All Hail Discordia. —><—*
