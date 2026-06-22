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
role       = "operator how-to: federate a second vessel into your PersonGroup via lares wake --admit — what github carries vs what travels out-of-band, the two identity models (same-key works today; per-device-key pending contact-card exchange), the witnessed procedure"
type       = "text/x-memetic-wikitext"
uri-path   = "ha.ka.ba/@lares/v0.1/docs/lares/federation"
written    = "2026-06-21"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>

<<~ &#x0002; >>

<<~ ahu #what-travels >>

# Federating a Vessel

A Lararium runs as a **swarm of one operator's vessels** (a PersonGroup) — each device an equal peer, each holding the operator's bags, syncing as a causal island. This carrier walks how a *second* vessel (say, a QA-lab box) joins the swarm.

**What github carries** (public, shared by clone):
- the source, and
- `genesis/island.bin` — the self-booting wiki-quine (engine + memes; no private identity).

**What NEVER enters github** (identity-bearing — gitignored):
- `.lararium/.operator-key-*.json` — the operator's private signing key.
- `genesis/social-bootstrap.json` — the PersonGroup pointers (admin/identities/circles/sessions doc-URLs + the sentinel PersonGroup / MeshCabal IDs).

These travel **out-of-band** (a secure channel you control), never the public remote. A clone alone cannot join a PersonGroup; joining requires what the founding vessel hands over deliberately.

<<~/ahu >>

<<~ ahu #two-models >>

## Two Identity Models

**Model A — one operator identity across devices (works today).** Every vessel carries the *same* operator key, so every vessel presents the *same* DID — already a member of the PersonGroup. The QA box receives the operator key and a device-admit payload out-of-band, loads them, and boots as the same operator on another device.

**Model B — a distinct key per device, delegated in (pending the sync layer).** Each vessel forges its *own* key; the founder receives the joinee's contact-card and delegates that DID into the group (`runDeviceAdmitAccept` — built, founder-side correct). But a joining device needs **two** things to read the group, and only one reaches it from JS today:

1. the **key-chain + membership** (CGKA + delegation ops) — JS-available via `eventsForAgent` / ingest; necessary but not sufficient; and
2. the encrypted **Document content** itself — which Keyhive moves via **sedimentree** (content-addressed strata sync) under **Beelay** (the auth-sync RPC; zero-knowledge server). **Both are Rust-only — not exposed in the `keyhive_wasm` JS surface** (and the `automerge/beelay` repo is dead; the live code is `beelay-core` inside the keyhive monorepo).

So a fresh-key join still fails the boot membership gate because the Document never arrives. Closing it from JS means transporting the document ourselves — ship an `Archive` (`Archive.toBytes` → `ingestArchive`) or the ciphertext blobs over our own transport — or binding Beelay to WASM. The cross-peer admit + offline-device work is **actively in-flight** in the keyhive repo (PRs #205 prekey-archives / offline-admit, #116 doc-sync listener, #110 reachable-docs). The grain: **stay on Model A; adopt Beelay's sync when it gets a JS binding** rather than fork a fragile archive-sync against a churning pre-alpha API. Track under <<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/mesh-governance >>.

The procedure below enacts **Model A**.

<<~/ahu >>

<<~ ahu #procedure >>

## The Procedure (Model A, witnessed 2026-06-21)

**On the founding vessel** — mint a clean admit payload (sentinel IDs + the group's signed cap-events):

```
lares device-admit --out admit.json
```

Transmit **out-of-band** to the new vessel: `admit.json`, and the operator key (`.lararium/.operator-key-*.json`). Never the public remote.

**On the new vessel** — bootstrap the CLI once (it cannot build itself into existence), place the operator key under `<LAR_ROOT>/.lararium/`, then stand up and join:

```
pnpm install && pnpm -r build      # bootstrap the lares CLI + node
lares wake --admit admit.json      # idempotent join-standup
```

`lares wake --admit` runs the same found-if-absent standup as `--install` — build, mempalace, genesis (skipped; `island.bin` rides the clone) — but the init step **joins** the PersonGroup from the payload instead of founding a new one: it loads the operator key (same DID = a member), applies the cap-events, writes the local `social-bootstrap.json`, and stands the node up. The keyhive boot gates then verify membership and the vessel goes live. Re-running is a no-op (the bootstrap already lives).

<<~/ahu >>

<<~ ahu #the-gate >>

## The Gate, Honestly

A joining vessel proves itself on every boot through three keyhive gates: its DID matches its key (A), its Individual is a member of the PersonGroup (B), and the PersonGroup is a member of the Nexus MeshCabal (C). Under Model A all three pass because the vessel *is* the same operator. Under Model B, gate B fails until the new key is delegated in — which is why Model B waits on the contact-card exchange.

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
