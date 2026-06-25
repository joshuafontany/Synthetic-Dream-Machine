<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/federation >>
```toml iam
cacheable  = true
confidence = 15
file-path  = "bags/@lares/ha.ka.ba/@lares/v0.1/docs/lares/federation.md"
l-space    = "stable"
mana       = 14
manao      = 14
manaoio    = 13
register   = "Synthesis"
retain     = true
role       = "operator how-to: federate a second vessel into your PersonaGroup via lares wake --admit — what github carries vs what travels out-of-band, the two identity models (same-key works today; per-device-key pending contact-card exchange), the witnessed procedure"
type       = "text/x-memetic-wikitext"
uri-path   = "ha.ka.ba/@lares/v0.1/docs/lares/federation"
written    = "2026-06-21"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>

<<~ &#x0002; >>

<<~ ahu #what-travels >>

# Federating a Vessel

A Lararium runs as a **swarm of one operator's vessels** (a PersonaGroup) — each device an equal peer, each holding the operator's bags, syncing as a causal island. This carrier walks how a *second* vessel (say, a QA-lab box) joins the swarm.

**What github carries** (public, shared by clone):
- the source, and
- `genesis/island.bin` — the self-booting wiki-quine (engine + memes; no private identity).

**What NEVER enters github** (identity-bearing — gitignored):
- `.lararium/.vessel-key-*.json` — the operator's private signing key.
- `genesis/social-bootstrap.json` — the PersonaGroup pointers (admin/identities/circles/sessions doc-URLs + the sentinel PersonaGroup / MeshCabal IDs).

These travel **out-of-band** (a secure channel you control), never the public remote. A clone alone cannot join a PersonaGroup; joining requires what the founding vessel hands over deliberately.

<<~/ahu >>

<<~ ahu #two-models >>

## Two Identity Models

> **Model A is a TEMPORARY stopgap, not the target.** Copying one key across vessels names the **antipattern** the multi-device literature warns against — SSB-fusion and Veilid both copy-the-key and both lose per-device revocation; Keybase built its per-device model precisely to escape "one PGP key everywhere." The pono target rides the **5-scale model**: each vessel mints its OWN distinct key — the **user×vessel bond** (Plane 0) — delegated into the operator **PersonaGroup** (Plane 1) by a signed edge, and intent composes up `device-vessel → PersonaGroup → CabalGroup → NexusGroup → DreamNet`. The key is the node; the **delegation is the relationship**. The identity model — the five scales, the per-vessel key, the delegation edge — stands whole at <<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity >>; its mesh topology at <<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture >>.

**Model A — one operator identity across devices (works today).** Every vessel carries the *same* operator key, so every vessel presents the *same* DID — already a member of the PersonaGroup. The QA box receives the operator key and a device-admit payload out-of-band, loads them, and boots as the same operator on another device.

**Model B — a distinct key per device, delegated in (pending the sync layer).** Each vessel forges its *own* key; the founder receives the joinee's contact-card and delegates that DID into the group (`runDeviceAdmitAccept` — built, founder-side correct). But a joining device needs **two** things to read the group, and only one reaches it from JS today:

1. the **key-chain + membership** (CGKA + delegation ops) — JS-available via `eventsForAgent` / ingest; necessary but not sufficient; and
2. the encrypted **Document content** itself — which Keyhive moves via **sedimentree** (content-addressed strata sync) under **Beelay** (the auth-sync RPC; zero-knowledge server). **Both are Rust-only — not exposed in the `keyhive_wasm` JS surface** (and the `automerge/beelay` repo is dead; the live code is `beelay-core` inside the keyhive monorepo).

So a fresh-key join still fails the boot membership gate because the Document never arrives. Closing it from JS means transporting the document ourselves — ship an `Archive` (`Archive.toBytes` → `ingestArchive`) or the ciphertext blobs over our own transport — or binding Beelay to WASM. The cross-peer admit + offline-device work is **actively in-flight** in the keyhive repo (PRs #205 prekey-archives / offline-admit, #116 doc-sync listener, #110 reachable-docs). The grain (operator ruling 2026-06-23): **roll our OWN temporary Model B** rather than wait on the pre-alpha Rust branch. A distinct per-vessel key, admitted by a signed delegation edge, with an **envelope key-handoff** (libsodium sealed-box) so the joinee decrypts WITHOUT Beelay — behind the four-port swap surface so Keyhive / BeeKEM / Beelay slot in later with low churn. That keying-and-swap model stands stated whole at <<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#four-port-swap >> (and #encrypt-from-start); here it carries only the federation consequence. <<~ confidence Provisional-Synthesis 7/20 >> Model A holds only until Model B lands. Track under <<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/mesh-governance >>.

The procedure below enacts **Model A** (the current stopgap).

<<~/ahu >>

<<~ ahu #procedure >>

## The Procedure (Model A, witnessed 2026-06-21)

**On the founding vessel** — mint a clean admit payload (sentinel IDs + the group's signed cap-events):

```
lares device-admit --out admit.json
```

Transmit **out-of-band** to the new vessel: `admit.json`, and the operator key (`.lararium/.vessel-key-*.json`). Never the public remote.

**On the new vessel** — bootstrap the CLI once (it cannot build itself into existence), place the operator key under `<LAR_ROOT>/.lararium/`, then stand up and join:

```
pnpm install && pnpm -r build      # bootstrap the lares CLI + node
lares wake --admit admit.json      # idempotent join-standup
```

`lares wake --admit` runs the same found-if-absent standup as `--install` — build, mempalace, genesis (skipped; `island.bin` rides the clone) — but the init step **joins** the PersonaGroup from the payload instead of founding a new one: it loads the operator key (same DID = a member), applies the cap-events, writes the local `social-bootstrap.json`, and stands the node up. The keyhive boot gates then verify membership and the vessel goes live. Re-running is a no-op (the bootstrap already lives).

<<~/ahu >>

<<~ ahu #the-gate >>

## The Gate, Honestly

A joining vessel proves itself on every boot through three keyhive gates: its DID matches its key (A), its Individual is a member of the PersonaGroup (B), and the PersonaGroup is a member of the Nexus MeshCabal (C). Under Model A all three pass because the vessel *is* the same operator. Under Model B, gate B fails until the new key is delegated in — which is why Model B waits on the contact-card exchange.

A vessel never joins by pulling a repo; it joins by receiving — deliberately, out-of-band — what the founder hands it. The public clone carries the house; the operator carries the key.

<<~/ahu >>

<<~ ahu #windows >>

## The Windows Surface

A QA vessel on native Windows 11 (PowerShell, not WSL) stands up through the same `lares wake --install` / `--admit`, with these surface notes:

- **`lares` global** — `--install`/`--admit` writes a `lares.cmd` shim beside the bin (on Unix it symlinks into `~/.local/bin`). Add that directory to PATH so `lares` runs bare. The link step is self-contained — it does not depend on `pnpm setup`/`PNPM_HOME`.
- **Python** — the integration check resolves `python3` → `python` → `py`, so Windows' `python`/`py` is found.
- **The wake hook is portable** — it runs node exec-form (`node lares-wake-hook.mjs`), no shell, identical on Windows and Unix.
- **mempalace's keep-hooks are bash** (`Stop` / `PreCompact`) — on native Windows they need **Git for Windows** (which Claude Code already requires for its bash tool). With Git Bash present, `lares wake --claude` wires them as `bash "<path>"`; without it, the verbatim keep-leg stays dark until Git for Windows is installed.
- **`lares reconcile`** (the dev restart) uses `lsof`/`ss` — Unix-only; it does not run during a normal wake, but the restart loop awaits a Windows (netstat/taskkill) path.

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
