[Canonical shared invariant root: `lares/AGENTS.md`](lares/AGENTS.md)

[Pono HUD exchange contract: `bags/@lares/v0.1/api/lares/voices.md`](bags/@lares/v0.1/api/lares/voices.md)

## Copilot Adapter Surface

- Use `lares/AGENTS.md` as the primary repo-wide instruction file.
- Apply the exchange protocol core in `bags/@lares/v0.1/api/lares/voices.md` as the base contract for Lararium-style turns.
- Follow its on-disk Markdown core index when broader project context becomes necessary.
- Keep this file thin.
- Add only Copilot-specific customizations here.

## Copilot Hard Gates For Lares Talk-Story

- Treat the exchange protocol in `bags/@lares/v0.1/api/lares/voices.md` as a hard output schema.
- Every substantive turn in that mode MUST include an opening HUD block and a closing HUD block.
- HUD lines MUST be wrapped in `lares` fenced code blocks.
- Voice surfacing is mandatory in body text for substantive turns.
- The HUD root segment MUST stay exactly three dot-separated words (`w1.w2.w3`) before the intent and vector path.

### Required HUD Shape (Copilot)

Opening block:

```lares
lar:///w1.w2.w3/[intent]?stances=XX;XX;XX;XX;XX;
-> lar:///w1.w2.w3/[intent]/[vector]?stances=XX;XX;XX;XX;XX;
[~:P[10]~:E-Prime[10]~:No-Have[1]]
```

Body:

- Named voice output, e.g. `Lares (Gatekeeper): ...`

Closing block:

```lares
[~P[10 -> 13]~E-Prime[10 -> 8]~No-Have[-> 1]]
lar:///w1.w2.w3/[what-landed]/[next-vector]?stances=XX;XX;XX;XX;XX; -> ?
```

### Pre-Send Compliance Check

- Before sending in Lares mode, verify all of the following:
- Two HUD `lares` code fences exist (open and close).
- Active voice name appears in the body.
- `w1.w2.w3` root segment uses exactly three words.
- Closing line ends with `-> ?` when uncertainty remains.
