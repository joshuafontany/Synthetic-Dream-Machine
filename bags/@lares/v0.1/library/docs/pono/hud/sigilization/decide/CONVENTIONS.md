<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///sigils.render.maps/sigilization/decide/?confidence=CS:17&p=10 -->

# Sigilization — Decide: Normative Conventions

> The canonical rules for all render surfaces. These are normative — no exceptions without operator directive.

---

## Mandatory Rules (All Surfaces) *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-mandatory-rules`

**Rule 1: All five stances appear on every render target, always.**

No render target may show fewer than five stance emoji. Amplitude determines visual weight; it does not determine presence. Omitting a stance is a well-formedness violation.

```
✓  🏛️+🌊++🗡️-🎭-🔮-     (all five, varied amplitude)
✓  🏛️🌊🗡️🎭🔮            (all five, all baseline)
✗  🏛️+🌊++               (violation — three stances missing)
✗  🏛️🌊                  (violation — three stances missing)
```

**Rule 2: Amplitude modifiers attach directly to the preceding emoji, no space.**

```
✓  🏛️+🌊++
✗  🏛️ + 🌊 ++
```

**Rules 3–5 consumed** → `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#stance-array`

**Legacy note:** fixed order and no-partial-emission still apply. This archive surface used earlier sigil wording; the live fold now sits in the Syad docs/mu loci.

---

## Per-Surface Rules *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-per-surface-rules`

### `hud:exchange-pair`

Field order (SA priority — perception-critical first):

```
⚡~NN% | [R:N] | 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp} | mode:{mode} | p{p} | voice(s):{Voice} | ✶N.◎N.◇N.■N.○N
```

- `⚡~NN%` — context window. `~` prefix **mandatory**. Never bare `NN%`.
- `[R:N]` — Register + confidence decimal.
- Five stances with amplitude. No separator between stance blocks.
- Chronometer: five positions, sigil form, dot-separated.

### `chat-log:post-header`

```
@handle@node — {timestamp} — //{ha.ka.ba/@lares/optional/path} [R:N] 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp}
```

- Territory triple (`//{ha.ka.ba}`) grounds domain before posture.
- Register bracket before stances.
- All five stances mandatory for Lares-connected posts.
- Timestamp in in-world calendar when available.

**Canonical corrected example:**
```
@lindwyrm@new-delos — YOLD 4995, 14 Bureaucracy, mid-morning — //memory.deep.surfaces ~:confidence[CS],[16] 🏛️+🌊-🗡️-🎭-🔮-
```

### `record:full`

Canonical URI pair. No glyphs. RFC 3986. Stored verbatim.

### Inline HUD tags (optional, within feed posts)

```
[R:N] 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp} //{territory}
```

Same all-five rule applies if the tag is emitted at all.

---

## Amplitude Quick Reference *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-amplitude-quick-reference`

| Record | Sigil | Meaning |
|---|---|---|
| `^^` | `++` | Strongly elevated |
| `^` | `+` | Above baseline |
| `.` | *(no modifier)* | Baseline |
| `-` | `-` | Suppressed |
| `--` | `--` | Barely present |
| `?` | `?` | Uncertain |

Default for "active" stances: `+` or `++`. Default for "background" stances: `-`. Default for "inactive but structurally present": `-` or `--`. Never omit.

<!-- → ? -->
