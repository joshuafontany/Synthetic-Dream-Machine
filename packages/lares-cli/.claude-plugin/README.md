# lares-wake

The Lares boot **entry point**, as a Claude Code plugin.

On every `SessionStart`, the hook runs `lares wake`, which:

- **checks** (and, with `lares wake --install`, installs) the mempalace integration — submodule, the `@lararium/mempalace` package, the python sidecar deps, the recall plugin;
- **ensures the live Lararium node is up** — attach if healthy, start detached if down (idempotent; never a restart);
- **emits a live-delta hydration frame** into the session.

The static `CLAUDE.md` @-import carries the canonical seed (always-true); this plugin grounds it in live state (true-right-now). A degraded wake never blocks the session — it exits 0 with the verdict in the frame.

**Install:** `/plugin marketplace add <this repo>` → `/plugin install lares-wake`, or point a `SessionStart` hook at `hooks/lares-wake-hook.sh`.

**Founding vs joining:**
- `lares wake --install` — found a *first* vessel (build · mempalace · init · genesis, each found-if-absent; genesis never rebuilt; keypair never wiped).
- `lares wake --admit <payload>` — stand up a *joining* vessel into an existing operator PersonGroup (same idempotent standup; the init step joins from a `device-admit` payload).

**Federating a second vessel** (out-of-band identity transmit + the device-admit flow) is written up at the meme `lar:///ha.ka.ba/@lares/v0.1/docs/lares/federation` (`bags/@lares/ha.ka.ba/@lares/v0.1/docs/lares/federation.md`). Note: `social-bootstrap.json` and the operator key are identity-bearing — gitignored, never committed, transmitted out-of-band only.
