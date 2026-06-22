# lares-wake

The Lares boot **entry point**, as a Claude Code plugin.

On every `SessionStart`, the hook runs `lares wake`, which:

- **checks** (and, with `lares wake --install`, installs) the mempalace integration — submodule, the `@lararium/mempalace` package, the python sidecar deps, the recall plugin;
- **ensures the live Lararium node is up** — attach if healthy, start detached if down (idempotent; never a restart);
- **emits a live-delta hydration frame** into the session.

The static `CLAUDE.md` @-import carries the canonical seed (always-true); this plugin grounds it in live state (true-right-now). A degraded wake never blocks the session — it exits 0 with the verdict in the frame.

**Install:** `/plugin marketplace add <this repo>` → `/plugin install lares-wake`, or point a `SessionStart` hook at `hooks/lares-wake-hook.sh`.
