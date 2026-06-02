# Trust Models For Lares Admin Governance

> Status: Research draft
> Date: 2026-04-06
> Workspace: `_todo/ADMIN`
> Scope: Security and governance options for defining and enforcing Lares `Admin`

**Foundational reference:** [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md)

---

## Problem Statement

Lares now distinguishes `User`, `Operator`, and `Admin`, but prompt text alone cannot securely decide who belongs to `Admin`.

Within the Infrastructure-as-Myth frame, this document covers the **authority control plane** of the symbolic runtime: who may claim authority, how that authority becomes legible, and which external systems must anchor it.

Current prompt behavior:

- `gh auth status` may establish `Operator` identity for the active workspace session
- `Admin` requires explicit escalation from a recognized `Operator`
- prompt logic alone does not yet bind `Admin` to a hard roster controlled outside chat

The remaining gap: a recognized operator could still try to socially claim `Admin` unless the repo and its policy surface enforce who may count as `Admin`.

Target definition:

> `Admin` = recognized `Operator` + explicit escalation + membership in the protected Amorphous Dreams Cabal admin roster

---

## Recommended Model

Use **GitHub organization/team membership as the root of Admin authority**, and make the prompt mirror that truth rather than invent it.

### Root policy

- `Operator`
  - established by verified active GitHub CLI identity in the workspace
  - account must match the claimed operator identity
- `Admin`
  - requires recognized `Operator`
  - requires explicit escalation in session
  - requires membership in the protected Amorphous Dreams Cabal admin roster

### Why this wins

- GitHub controls merge authority and policy enforcement
- team membership is auditable and revocable
- branch rules and CODEOWNERS can protect both the roster and the files that define the rules
- signed commits improve attribution without requiring custom capability infrastructure
- UCAN remains useful later, but does not need to be the root trust boundary

---

## Option Matrix

### Option 1 — Prompt-only declaration

**Model:** Admin is whoever the prompt accepts as Admin.

**Pros:**
- easiest to describe
- no GitHub configuration required

**Cons:**
- not enforceable
- vulnerable to social pressure and prompt drift
- not auditable outside chat

**Assessment:** reject

### Option 2 — Protected in-repo roster only

**Model:** Store admin usernames in a protected file and have Lares read that file.

**Pros:**
- visible and easy to inspect
- repo-local source of truth

**Cons:**
- still depends on GitHub protections to make the file meaningful
- file alone is not the trust boundary

**Assessment:** useful as a visible audit anchor, but not enough by itself

### Option 3 — GitHub org/team membership

**Model:** GitHub org team defines Admin membership; prompt checks against it conceptually or via mirrored roster.

**Pros:**
- strongest practical root of authority
- revocable, auditable, normal GitHub governance
- integrates naturally with branch/ruleset bypass lists

**Cons:**
- requires org/team setup
- still benefits from an in-repo mirror or note for human clarity

**Assessment:** recommended root model

### Option 4 — Signed commit identity only

**Model:** Admin means “signed by Joshua/Freyja key.”

**Pros:**
- strong attribution
- cryptographically meaningful

**Cons:**
- does not by itself define who may merge
- harder to use as the sole live roster mechanism
- key rotation and recovery add friction

**Assessment:** recommended as a strengthening layer, not the root

### Option 5 — UCAN / delegated capability tokens

**Model:** Admin is granted by signed capability tokens delegated to sessions or tools.

**Pros:**
- elegant delegation model
- time-bounded and machine-readable
- strong fit for future multi-client / multi-agent systems

**Cons:**
- significantly more implementation complexity
- overkill for first-line repo governance
- still does not replace GitHub branch governance for merge control

**Assessment:** strong future extension; not the starting point

---

## Best-Practice Stack

### Baseline stack

1. Put the repo under a GitHub organization if practical.
2. Create an `admins` team containing only Joshua and Freyja.
3. Protect `main` with rulesets or branch protection:
   - require pull requests
   - require code owner review
   - require signed commits
   - restrict bypass/direct updates to the admin team only
4. Add `CODEOWNERS` for:
   - `/builds/agents/**`
   - `/AGENTS.md`
   - `/_todo/ADMIN/**`
   - `/.github/CODEOWNERS`
5. Add a visible in-repo roster artifact as a human-readable mirror.
6. Keep prompt-side rules aligned with the same model:
   - `gh` can establish `Operator`
   - `gh` alone can never establish `Admin`
   - `Admin` requires roster membership plus explicit escalation

### Attribution layer

- require signed commits
- enable GitHub vigilant mode for Joshua and Freyja
- prefer SSH or GPG signing for all policy-sensitive merges

### Future delegation layer

Add UCAN only when you want one of these:

- temporary Admin grants
- explicit tool/session delegation
- signed, time-bounded capability tokens for non-GitHub contexts

---

## Why GitHub Beats A Protected `.git` Directory

Protecting `.git` locally is not the right control plane.

- local `.git` protections affect one machine, not the collaboration surface
- GitHub branch rules govern what actually merges
- CODEOWNERS and required review protect the files that define authority
- signed commits bind authorship more clearly than local filesystem tricks

Use GitHub for repo governance. Use the prompt for behavior. Do not reverse those roles.

---

## Exact Repo Changes To Make

### GitHub configuration

- create org team `admins`
- add Joshua and Freyja only
- enable branch/ruleset protections on `main`
- require PRs
- require CODEOWNERS review
- require signed commits
- restrict direct updates/bypass to `admins`

### Files to add

- `/.github/CODEOWNERS`
- `/_todo/ADMIN/ROSTER.md`

### Suggested `CODEOWNERS`

```text
/.github/CODEOWNERS @amorphous-dreams-cabal/admins
/builds/agents/     @amorphous-dreams-cabal/admins
/AGENTS.md          @amorphous-dreams-cabal/admins
/_todo/ADMIN/       @amorphous-dreams-cabal/admins
```

If the repo stays personal instead of org-owned, use direct usernames:

```text
/.github/CODEOWNERS @joshuafontany @freyja-fontany
/builds/agents/     @joshuafontany @freyja-fontany
/AGENTS.md          @joshuafontany @freyja-fontany
/_todo/ADMIN/       @joshuafontany @freyja-fontany
```

### Suggested roster artifact

```md
# Amorphous Dreams Cabal Admin Roster

Effective: 2026-04-06

Authoritative rule:
Admin in Lares requires:
1. verified Operator identity
2. explicit escalation
3. GitHub membership in the roster below or the equivalent protected GitHub team

Roster:
- joshuafontany
- freyja-fontany

If this file and GitHub team membership drift, GitHub team membership wins.
```

---

## Prompt Alignment Rules

Lares should treat identity this way:

- if `gh` identity is missing: remain `User`
- if `gh` identity verifies but the account is not in the roster: `Operator` only
- if the account is in the roster but no explicit escalation occurred: remain `Operator`
- only when all conditions hold: allow `Admin`

This keeps:

- `gh` as the Operator trust anchor
- GitHub roster as the Admin authority anchor
- explicit escalation as the final in-session consent gate

---

## Security Notes

### Good enough now

The strongest practical near-term stack is:

- GitHub org/team membership
- protected branches / rulesets
- CODEOWNERS
- signed commits
- explicit prompt-side escalation requirement

### Where UCAN fits

UCAN is a good future layer for delegated, time-bounded capabilities.

UCAN is **not** the best first answer to:

> Who may merge prompt-governance changes to this repo?

Use GitHub for root governance first. Use UCAN later if Lares needs formal delegated capability chains across sessions or tools.

---

## Acceptance Criteria

- [ ] GitHub org/team membership or equivalent protected roster defines Admin membership
- [ ] Only Joshua and Freyja are in the Admin roster
- [ ] `builds/agents/`, `AGENTS.md`, and admin-governance docs are code-owner protected
- [ ] `main` requires PRs and code-owner review
- [ ] `main` requires signed commits
- [ ] direct push/bypass is restricted to the admin team only
- [ ] a visible in-repo roster artifact exists
- [ ] prompt-side Admin logic depends on roster membership plus explicit escalation
- [ ] `gh auth status` still establishes `Operator`, not `Admin`
- [ ] non-roster Admin escalation fails cleanly
