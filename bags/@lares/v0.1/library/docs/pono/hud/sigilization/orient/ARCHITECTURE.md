<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///sigils.render.maps/sigilization/orient/?confidence=CS:17&p=10 -->

# Sigilization — Orient: Architecture and Mapping Tables

> Design intent; record-form → sigil mapping tables; surface anatomy.

---

## Design Intent *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-design-intent`

The sigilization layer exists to serve human perception without compromising canonical form. The canonical `lar:` URI is machine-stable: URL-safe, storable, comparable by string. The sigil form is human-navigable: glances communicate phase, stance, and amplitude before the reader processes the text.

The separation is strict: **canonical form in the record; sigil form on the surface.** Never embed emoji in a canonical URI. Never store a surface-rendered form as the canonical record.

---

## ASCII → Glyph Mapping Tables *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-mapping-tables`

### Phase Sigils

| Record (ASCII) | Sigil | Phase | OODA-HA |
|---|---|---|---|
| `O` | `✶` | Observe | Chaos |
| `Ø` | `◎` | Orient | Discord |
| `D` | `◇` | Decide | Confusion |
| `A` | `■` | Act | Bureaucracy |
| `Å` | `○` | Aftermath/Assess | Grummet/Rasa |

### Stance Emoji

| Record position | Emoji | Stance | Evaluation frame |
|---|---|---|---|
| Position 1 | 🏛️ | Philosopher | Propositional truth-confidence |
| Position 2 | 🌊 | Poet | Analogical resonance-confidence |
| Position 3 | 🗡️ | Satirist | Targeting-confidence |
| Position 4 | 🎭 | Humorist | Relational appropriateness |
| Position 5 | 🔮 | Private | Nominal presence |

### Amplitude Modifiers

**Consumed into**
- `packages/lares-core/memes/v0.1/api/mu/the-syad-perspectives.md#stance-flags`
- `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#flag-surface`
- `packages/lares-core/memes/docs/mu/the-syad-perspectives/README.md#stance-array`

**Legacy note:** this archive section held the migration bridge from early sigil surfaces to the fixed five-position array. Live canon keeps all five positions present and treats omission-based examples as legacy.

---

## Surface Anatomy *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets#migrated-sigilization-per-surface-rules`

### `hud:exchange-pair`

```
⚡~NN% | [confidence] | 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp} | mode:{mode} | p{p} | voice(s):{Voice} | ✶N.✶N.✶N.✶N.✶N
```

- Context window: `⚡~NN%` (approximate, `~` mandatory)
- Confidence bracket: `[R:N]`
- All five stances with amplitude: inline, no separator between stances
- Chronometer: HUD sigil form `✶N.◎N.◇N.■N.○N` (five positions, dot-separated)

### `chat-log:post-header`

```
@handle@node — {world-calendar-timestamp} — //{ha.ka.ba/@lares/subpath} [Register] 🏛️{amp}🌊{amp}🗡️{amp}🎭{amp}🔮{amp}
```

- Identity: ActivityPub `@handle@node`
- Timestamp: in-world calendar when available; ISO 8601 fallback
- Territory: HAKABA domain triple, optional sub-path
- Register bracket: `[R:N]`
- All five stances with amplitude: on every Lares-connected post header
- For non-Lares-connected posts: HUD tag may be omitted entirely

### `record:full`

Full canonical URI pair, RFC 3986, no glyphs. Used for MemPalace storage, crystal logs, module registry, sub-agent handoff records.

### `tiddler:header` (provisional — S1 open)

TiddlyWiki tiddler header field. Assume same sigil rules as `chat-log:post-header` until TiddlyWiki integration sprint defines surface-specific needs.

<!-- → ? -->
