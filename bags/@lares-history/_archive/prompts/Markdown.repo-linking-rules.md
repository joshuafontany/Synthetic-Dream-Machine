# MARKDOWN.md

**Markdown linking rules & best practices — for the local LLM crawler that cross-links this repository**

---

## Purpose & scope

This document is an action-oriented rulebook for the **local LLM agent** that crawls the repo’s Markdown files and creates/repairs cross-links so they work both in the GitHub UI (source `.md`) and in the live Jekyll site (rendered permalinks). The repository build uses `jekyll-relative-links` (already configured) and `jekyll-optional-front-matter`. The agent must produce links to `.md` sources, keep anchors stable, and follow the project’s publishing conventions — **including the special rule that RPG Book content docs must not have YAML front matter**. All other Markdown files (index pages, landing pages, tooling docs, etc.) are allowed — and may be given — front matter.

This file is written for the repo-local LLM agent that will crawl, validate, and (where safe) edit files and commit batched changes.

---

## TL;DR

* **Always** link to source `.md` files using **relative paths** and include the `.md` extension (e.g. `../other-page.md`).
* For intra-page headings, **use explicit heading IDs** and link with `#id` (e.g. `../other-page.md#deep-details`).
* **RPG Book content docs must NOT receive YAML front matter.** The agent must **not add** front matter to pages identified as RPG Book content. If front matter already exists in a book doc, the agent should flag it for human review (do not remove without human signoff).
* For all **other** `.md` files (indexes, landing pages, non-book docs), front matter is permitted and may be added if needed.
* Use `jekyll-relative-links` to let build-time rewriting convert `.md` links to site permalinks.

---

## Why this approach

* `jekyll-relative-links` rewrites `.md` links at build time into the final permalinks so:

  * The repo remains friendly to human readers and GitHub UI (links open raw `.md` files).
  * The site visitors get correct HTML/permalink URLs.
* `jekyll-optional-front-matter` allows Markdown files to be processed by Jekyll even if they lack YAML front matter. This is intentionally used so **RPG Book content** can be plain Markdown (no front matter) while still being rendered correctly.
* Explicit heading IDs avoid mismatches between GitHub’s auto-slugging and kramdown/Jekyll slugging.

---

## Key refinement: RPG Book content docs (no front matter)

**Definition & detection**

* Treat a file as **RPG Book content** if:

  * It lives under a directory configured in `_config.yml` defaults with `body_class: "book-chapter"` (for example: `Synthetic_Dream_Machine`, `Vastlands_Guidebook`, etc.), **or**
  * Its path matches project-specific book directories (e.g., directories whose names contain `Book`, `Guidebook`, `chapter`, or other agreed patterns), **or**
  * It’s otherwise designated by repository policy (if the repo later declares an explicit `book_content_paths` list in `_config.yml`, the agent should honor that).
* The agent should read `_config.yml` to discover these defaults and prefer the explicit `body_class: "book-chapter"` signal if present.

**Rules**

* **Do not add** YAML front matter to RPG Book content files.
* If a book doc **already has** YAML front matter:

  * **Do not remove** it automatically.
  * Flag the file for manual review and include a short explanation in the PR (reason: removal could change layout/metadata unexpectedly).
* When the agent must add metadata-like information for book docs (for example, anchors or IDs), it should **use inline heading IDs** (`## Heading {#my-id}`) and not YAML `permalink` or `layout` fields.

---

## Link authoring rules

### 1. Link to another Markdown page

Always include the `.md` extension and use relative paths:

```markdown
# Same directory
[Read more](other-page.md)

# Child directory
[Subpage](subfolder/child.md)

# Parent directory
[Parent page](../parent-page.md)
```

**Do not** use leading slashes for source links (e.g., `/other-page.md`) — that becomes a site-root path and is not helpful in the repo.

### 2. Link to a heading inside a page

Prefer explicit target IDs:

```markdown
# In `other-page.md`
## Deep Details {#deep-details}

# In current file
[Deep details](other-page.md#deep-details)
```

If the target does not yet have an explicit `{#id}`, the agent should create one (see "Creating anchors" below), but **do not** add front matter to RPG Book content docs when doing so.

### 3. Images and static assets

Use repository-relative asset paths:

```markdown
![Diagram](../images/diagram-1.png)
```

Avoid site-root absolute URLs inside source files unless the project specifically expects them.

### 4. Avoid Jekyll-only Liquid tags for repo-visible links

Do **not** use `\{% link %\}` in files that must remain repo-friendly. `jekyll-relative-links` will rewrite `.md` source links at build time; prefer `.md` links so GitHub browsing remains useful.

---

## Headings & anchor rules

### Preferred pattern — explicit IDs

Add explicit IDs to headings (kramdown attribute list):

```markdown
## Example Title {#example-title}
```

**ID rules**

* Lowercase ASCII only.
* Allowed characters: `a–z`, `0–9`, `-` (hyphen).
* No spaces, no punctuation except hyphens.
* Start with a letter or digit.

Example good ID: `#example-title-2`
Example bad ID: `#Example Title!` (don’t use)

### If relying on auto-generated anchors

* Keep headings simple (lowercase words, single spaces). However, do **not** rely on auto slugs for robust linking — explicit `{#id}` is the recommended standard.

---

## File naming & front matter recommendations

### Filenames

* Prefer `kebab-case`: `my-topic.md`, `another-section.md`.
* Avoid spaces and avoid uppercase letters when possible.

### Front matter rules (updated)

* **RPG Book content docs**: must **not** receive YAML front matter. The agent must **not insert** any YAML block at the top of these files.
* **All other `.md` files** (index pages, landing pages, reference docs, tooling, README-style docs): may have YAML front matter. If the agent needs to add `permalink` or `layout` to implement a stable site URL, it may do so — *unless* the file is identified as RPG Book content.
* If a non-book doc already lacks front matter but the agent needs to add structured metadata, it may add a minimal YAML block:

```yaml
---
title: "Short title"
permalink: /short-title/
layout: default
---
```

* Use front matter sparingly. When possible prefer linking to `.md` source and explicit headings rather than adding many custom permalinks.

---

## Collections & nested content

* For collection items (e.g., `_recipes/foo.md`), link using the repository-relative source path: `../_recipes/foo.md` or `../_recipes/foo.md#id`.
* Ensure the agent honors `_config.yml` `source`, `include`, and `exclude` settings: avoid creating links to excluded paths unless explicitly approved.

---

## Agent workflow (revised)

1. **Load config & detect book paths**

   * Read `_config.yml` and record:

     * `source`, `include`, `exclude`.
     * any `defaults` that set `body_class: "book-chapter"` and the `path` values associated with them.
     * optional patterns such as directories named `*Book*`, `*Guidebook*`, etc.
   * Build a `book_paths` set from those signals. Files under these paths are treated as RPG Book content.

2. **Crawl and index**

   * Find all `.md` files under `source`, ignoring `exclude`.
   * For each file, extract:

     * existing YAML front matter (if present).
     * headings and any explicit `{#id}`.
     * internal relative links and asset references.

3. **Process each Markdown file `A`**

   * For each relative Markdown link in `A`:

     * Resolve `target_path` (normalize `.`/`..`).
     * Confirm `target_path` exists and is not excluded.
     * If `target` is an RPG Book doc:

       * **Never add YAML front matter** to `target`.
       * If the link includes an `#anchor` and the anchor is missing, add an explicit heading ID into `target` (inline `{#id}`), **not** a front-matter change.
     * If `target` is not an RPG Book doc:

       * The agent may add front matter **only** when necessary (e.g., stable permalink is required), but prefer to resolve and/or create inline IDs first.
   * For asset links: verify the asset exists at resolved path.
   * Normalize and rewrite the link to use `path/to/target.md[#id]` with the `.md` extension and the safe `#id` if appropriate.

4. **Creating anchors (if needed)**

   * Choose the nearest, most logical heading to attach an ID.
   * Generate a `safe-id`:

     * Lowercase, replace spaces with `-`, remove punctuation, collapse multiple hyphens.
     * Ensure the ID is unique within the target file; if not, append `-1`, `-2`, etc.
   * Insert the ID immediately after the heading text:

     ```markdown
     ## Heading text {#safe-id}
     ```
   * **Never** use YAML front matter to store IDs for RPG Book content.

5. **Front matter edits (non-book docs)**

   * When adding front matter to non-book docs, insert a minimal YAML block. Keep it minimal and do not change author intent (do not change `layout` unless it’s clearly necessary).
   * Log every front matter insertion for review.

6. **Validation**

   * After edits, re-index and verify:

     * All relative `.md` links resolve to existing files.
     * Anchors referenced exist as explicit `{#id}` in the target file.
     * No front matter was added to any file in `book_paths`.
   * If any failures occur, produce a report and do not auto-commit failed or partially fixed files.

7. **Commit & PR**

   * Create a branch: `auto/links/<short-desc>`.
   * Commit changes with a clear message and PR body summarizing:

     * files changed, anchors added, front matter added (if any, and only for non-book docs), and validation results.
   * Prefer small, focused PRs.

---

## Regex patterns & parsing hints

* Markdown links (non-HTTP):

  ```regex
  \[([^\]]+)\]\(((?!https?:\/\/|mailto:)[^\)]+)\)
  ```
* Extract `.md` target and anchor:

  ```regex
  \[([^\]]+)\]\(((?!https?:\/\/|mailto:)([^#\)]+\.md))(?:#([^\)]+))?\)
  ```
* Headings w/ explicit IDs (kramdown):

  ```regex
  ^(#{1,6})\s*(.+?)\s*\{\#([a-z0-9\-]+)\}\s*$
  ```

---

## Validation checklist

For each changed link or ID, ensure:

* [ ] Target `.md` exists at the resolved path and is not excluded.
* [ ] If an anchor is present, target has explicit `{#id}` matching the link.
* [ ] If the agent added an ID, it is unique in the target file.
* [ ] The agent **did not** add YAML front matter to any file under `book_paths`.
* [ ] Assets referenced exist.
* [ ] Link text is preserved or intentionally improved for clarity.
* [ ] Commit and PR include a concise change summary for human review.

---

## Commit & PR practices (unchanged)

* **Branch**: `auto/links/<short-desc>` (example: `auto/links/add-anchors-2026-01-09`)
* **Commit message**: `chore: update cross-links and anchors — <short summary>`
* **PR Body**: list files changed, list anchors added, and include a short validation summary (number of links fixed, images verified). Explicitly call out any front matter additions (should only exist for non-book docs).

---

## Common pitfalls & handling

* **Accidentally adding front matter to book docs**
  — *Prevention:* the agent must check `book_paths` before any front-matter insertion.
  — *If found:* revert the change and flag for human review.

* **Anchor mismatch (GitHub vs site)**
  — Add explicit `{#id}` in the target heading (or update to the project’s safe-id format).

* **Duplicate IDs**
  — Rename the later ID to `id-1`, update inbound links; prefer uniqueness with predictable suffixes.

* **Filename case problems**
  — Use exact repo filename casing. Prefer lowercase filenames to avoid cross-OS issues.

* **Links to excluded files**
  — Do not create links to files listed in `_config.yml` `exclude`. Either skip or propose a config change.

## Back-link convention

Back-links that read “↩ Back” should now carry `class="js-back-link"` and a site permalink fallback (`href="/Synthetic_Dream_Machine/Synthetic_Dream_Machine_01_Paths_Index/#anchor"`), so the new layout script can use `history.back()` safely while the repo view keeps delivering readable `.md` URLs.

---

## Examples

**Book doc (must NOT have front matter)**

`Vastlands_Guidebook/chapter-01.md` (book doc; no front matter)

```markdown
# The First Chapter

## Storms and Lanterns {#storms-and-lanterns}

See the lore: [Lantern Rituals](../Appendix/lanterns.md#rituals)
```

**Non-book doc (front matter allowed / can be added)**

`index.md` (non-book)

```yaml
---
title: "Project Index"
layout: default
permalink: /
---
```

```markdown
Welcome — see the guide: [Chapter 1](Vastlands_Guidebook/chapter-01.md#storms-and-lanterns)
```

**Bad before & good after**

*Before* (`chapter/index.md`):

```markdown
See the overview at [Intro](/Intro/)
Reference: [Deep](../Overview.md#Deep Details)
```

*After*:

```markdown
See the overview: [Intro](../overview.md)
Reference: [Deep](../overview.md#deep-details)
```

And in `overview.md` (target):

```markdown
## Deep Details {#deep-details}
```

Note that `overview.md` may be non-book and could have front matter if needed, but `Vastlands_Guidebook` pages should not.

---

## Example agent pseudocode (revised)

```text
load _config.yml -> get exclude/include rules, defaults
book_paths = find_paths_with_defaults_body_class("book-chapter") + configured_book_patterns

index = find_all_markdown_files(source, exclude)
for file in index:
  text = read(file)
  links = extract_relative_markdown_links(text)
  for link in links:
    target_path, anchor = resolve_and_normalize_path(file, link)
    if not exists(target_path):
      report_broken_link(file, link)
      continue
    is_book_doc = is_under_book_paths(target_path, book_paths)
    if anchor and not anchor_exists(target_path, anchor):
      heading = choose_nearest_heading(target_path, anchor_hint=link_text)
      id = make_safe_id(heading)
      if id_conflict(id, target_path): id = uniquify(id)
      insert_id_into_heading(target_path, heading, id)
      # Important: if is_book_doc -> do not add YAML front matter ever
    # If target lacks front matter and is not a book doc and we need a permalink:
    if not is_book_doc and needs_front_matter(target_path):
      add_minimal_front_matter(target_path)
    # Ensure the link in file uses .md and the chosen/created #id
    new_link = format_relative_md_link(file, target_path, anchor_or_created_id)
    update_link_in_file(file, link, new_link)

# Validate:
re-run index and verify all checks in Validation checklist

# Commit:
git checkout -b auto/links/<desc>
git add <changed files>
git commit -m "chore: update cross-links and anchors — <short summary>"
git push origin auto/links/<desc>
```

---

## Final notes for the agent

* **Conservative behavior is required**: never add YAML front matter to RPG Book content docs. If in doubt, do not change the file; flag it for human review.
* **Log and explain every front-matter addition** in the PR. Front matter additions are allowed only for non-book content.
* **Idempotency**: repeated runs should not keep changing the same files. If an anchor was created, the agent should detect it on subsequent runs and skip.
* **Transparency**: every PR should contain a short machine-readable list of changes (files touched, anchors added, front matter added/left alone, validation status) to expedite review.
