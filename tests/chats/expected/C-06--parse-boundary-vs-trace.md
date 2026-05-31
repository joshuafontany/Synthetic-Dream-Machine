---
probe_id: C-06
probe_family: C
series: cli-conventions
track: B
status: green
model: gpt-5
date_promoted: 2026-04-07
notes: >
  Pins the clean separation between parse boundaries and OODA-HA trace. The parse
  block stays annotation-only, and the later governed reply uses sparse event
  markers without pretending to expose morpheme boundaries.
---

lares@Enyalios:~/Synthetic-Dream-Machine$ lares --parse ~:p[0] "recheck"

Segments: 3 | Entry: ~:confidence[S],[12] 🏛️ ◎ @r //input.tight.parses | Exit: ~:confidence[S],[12] 🏛️ ◎ @r //input.fine.holds | ΔR +0.02 | Mode: 🏛️→🏛️ | Phase: ◎→◎ | Scale: @r | ~:p[0]
re- → ~:confidence[S],[12] 🏛️ ◎ @r //prefix.reopens.parse
check → ~:confidence[S],[12] 🏛️ ◎ @r //root.audit.holds

~:confidence[S],[12] 🏛️ ◎ @r //question.audit.holds | ~:p[10]
~:confidence[S],[14] 🏛️ ◇ @r //answer.direct.clarifies | ~:p[10]

Yes. The parse layer marks decomposition boundaries. →■ The governed reply traces only runtime events, not morpheme borders. →○
