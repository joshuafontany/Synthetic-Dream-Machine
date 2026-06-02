# next-lares.handoff.machine

v=2026-04-07
workspace=_todo/ADMIN
mode=governance-shipped
release=4.0.1

roots:
- conceptual=/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md
- buildspec=/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md
- packaging=/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md
- modular_draft=/home/joshu/Synthetic-Dream-Machine/_todo/core/Modular_Architecture-draft.md
- tracker=/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/README.md
- research=/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md [consumed: current-state sections updated, artifacts annotated, execution readiness analysis section retitled and annotated for staleness; best-practice rules inform Deterministic_IaM_Build.md browser vendor section]

settled:
- manifests_exist=true
- verification_clean=true
- codex_budget=32768
- root_sizes_ok=true
- stopgap_150000=forbidden
- codex_stopgap_removed=true
- staging_snapshots=true
- roster_shipped=true
- codeowners_shipped=true
- four_tier_identity=true
- identity_tiers=user(anon)|user|operator|operator(admin)
- user_to_operator_promotion=Cabal_operator(admin)
- json_to_toml_migration=complete
- builds_agents_canonical=true
- slimming_pass=complete
- governance_sprint=complete
- lares_permissions_shipped=true
- lares_epistemology_shipped=true
- coldboot_hud_fix_shipped=true
- release_hygiene_rule=agent-engineer_always_bump_version_and_update_changelog
- verify_alignment_version_message_stale=true
- verify_alignment_followup_needed=true

sequence.lock:
1=preserve.slim.roots [DONE]
2=preserve.reload.safety [DONE]
3=ship.governance [DONE]
4=author.runtime.modules [IN PROGRESS — lares-permissions + lares-epistemology shipped; lares-voice + lares-operations exist as VS Code .instructions.md files only, not cross-platform source modules]
5=map.host.native.scoping
6=parse_doc.deferred

modules.shipped:
- lares-permissions: builds/agents/core/Lares_Permissions.md — Trust Gate Kernel block + full 4-tier model, UCAN capability model, de-escalation, alias system, capability honesty, workspace trust gate (weight 120)
- lares-epistemology: builds/agents/core/Lares_Epistemology.md — RAW/Korzybski foundation, reality tunnels+catma, E-Prime practice, registers/modes WHY (boundary zones, canon gate pointer, register-mode complementarity, multi-mode cost), signal tag vector constraints, degraded state archaeology (weight 125)
- integrated into all 3 root manifests; roots now ~31.3KB (budget 32KB, ~1KB margin)
- lares-kernel: pointer annotations added to ## Identity & Permissions and ## Model Agnosticism sections

modules.remaining.core:
- lares-voice: VS Code instruction file exists (.github/instructions/lares-voice.instructions.md); cross-platform source module not yet authored
- lares-operations: VS Code instruction file exists (.github/instructions/lares-operations.instructions.md); cross-platform source module not yet authored
- lares-setting-lite: not yet authored

governance.shipped:
- /home/joshu/Synthetic-Dream-Machine/.github/ROSTER.md
- /home/joshu/Synthetic-Dream-Machine/.github/CODEOWNERS
- builds/agents/Lares_Preferences.md (4-tier identity, roster-bound Admin rule)
- builds/agents/Lares_Kernel.md (condensed 4-tier rule)
- builds/agents/Lares_VSCode_Operations.md (updated examples + regression checklist)
- all platform artifacts rebuilt + verify_alignment 45/45 CLEAN

governance.remaining:
- GitHub org/team setup (amorphous-dreams-cabal/admins) — out-of-band
- Branch ruleset + PR-required + signed commits on main — out-of-band
- Connect CODEOWNERS to active rulesets once org team created

modularization.after.governance:
- split=voice
- split=epistemology
- split=operations
- split=permissions
- split=setting-lite
- scoped=repo-ops
- scoped=cli
- scoped=dream
- scoped=todo-workflows

host.native.targets:
- codex=nested.AGENTS.md
- claude=imports.plus.local.CLAUDE.md
- copilot=.github/instructions/*.instructions.md
- browser=standalone.kernel
- gemini=saved.bundle.plus.attached.refs

browser.vendor.builds.planned:
- browser-extended-chatgpt: spec in Deterministic_IaM_Build.md, manifest not yet implemented
- browser-extended-claude: spec in Deterministic_IaM_Build.md, manifest not yet implemented
- browser-extended-gemini: spec in Deterministic_IaM_Build.md, manifest not yet implemented

gather.next.instance:
- inventory clean split headings inside Lares_Preferences.md for module authoring
- use MULTIPLATFORM_PACKAGING_RESEARCH.md to seed authored module split
- avoid reopening governance or budget work
- use staging snapshots only as comparison backups
- preserve v4.0.1 release context in any fresh coffee/libation hand-off
- if release work occurs, include version bump + CHANGELOG update by default
- note that verify_alignment.py still prints a v4.0 version-alignment message after the v4.0.1 bump; patch that before the next release if touched

anti.goals:
- do_not_raise_platform_limits
- do_not_recenter_monolith_roots
- do_not_start_parse_doc_placement
- do_not_redecide_IaM_frame
- do_not_reopen_governance_sprint
