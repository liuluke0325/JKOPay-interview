# AI Collaboration Journal

> **At M9 (final prep) this file is renamed/restructured to `docs/prompts/`** to
> match the assignment's required layout (the brief names `/docs/prompts/`
> explicitly as the prompt-records folder). Until M9, append exchanges here
> — do not pre-create `docs/prompts/` or you'll end up with two parallel logs.

A running log of meaningful AI exchanges during this project. Append entries
**during** sessions, not retroactively. Sanitize as needed but don't fabricate.

What's worth logging:

- Course corrections (the AI proposed X, we did Y, here's why)
- Hallucinations caught and fixed (especially on niche / recent APIs)
- Prompt engineering wins (a phrasing that consistently produced better output)
- Domain learning moments (the AI explained a concept that unblocked you)
- Human override moments (where you rejected AI advice and it mattered)
- Hard problems decomposed across multiple sessions

What's NOT worth logging:

- Routine tab-completion-style help
- Successful AI suggestions that did exactly what you'd have written anyway
- Mechanical refactors

## Entry template

```md
### YYYY-MM-DD — short title — agent: Claude | Codex

**Context.** What were we trying to do?
**Exchange.** What was asked / suggested / corrected. Quote actual prompts
and responses where instructive.
**Outcome.** What we kept, what we rejected, why.
**Lesson.** (optional) Generalizable takeaway.
```

---

## Log

<!-- Append new entries below, newest at the bottom. -->

### 2026-05-02 — bootstrap — agent: Claude

**Context.** Spinning up interview-jopay. Wanted the same dual-agent
review workflow we used on prior projects.

**Exchange.** Invoked the `agent-collab-init` skill to scaffold
`AGENTS.md` + `docs/` seven-pack. Skill asked for project name, stack,
and whether AI collaboration is graded.

**Outcome.** Scaffolded. `<!-- TODO -->` markers flag where domain-specific
rules and risks need to be authored before the first real session.

**Lesson.** N/A (process).

### 2026-05-02 — Phase A: align scaffold to JKO brief — agent: Claude

**Context.** Right after bootstrap I had a generic agent-collab scaffold;
the JKO brief and four UI mockup screenshots arrived next. Needed to translate
the brief into concrete Hard Rules, acceptance criteria, milestones, risks —
and reshape `docs/DECISIONS.md` into a `docs/decisions/` folder because the
brief explicitly names that path.

**Exchange.** I drafted a plan in plan-mode listing the deltas (folder rename,
TODO replacements, design-derived API shape) and asked four scope-affecting
questions via AskUserQuestion: tab scope, sub-filter functional vs stub, card
detail page, mobile/desktop responsiveness. User answered: all 3 tabs;
sub-filter functional with BE support; assume scaling so use react-window;
detail page yes; mobile-first + responsive; restore tab+scroll on cancel;
i18n with zh-TW default; Railway for BE deploy; tests in scope. User also
clarified the prompt-records strategy: keep `docs/AI_JOURNAL.md` as the live
log during dev and rename to `docs/prompts/` only at M9.

**Outcome.** Phase A executed: 9 ADRs in `docs/decisions/` (2 process accepted,
7 technical proposed); Hard Rules in `AGENTS.md` rewritten with 10 concrete
project-specific rules; `REQUIREMENTS.md` filled with criteria A–F (matching
the four mockup screens); milestones M0–M9 with critical-path order; risk
register R1–R12 including the new design-derived risks (search race,
react-window variable-height, restore-on-refresh, hotlinked logos).

**Lesson.** The four mockup screenshots arrived after the initial brief and
materially changed the data model (single `Item` table with category enum +
nullable category-specific fields; sub-category as a real filter; detail page
needed) — worth re-running the requirements pass when new design artifacts
land, not assuming the v1 plan stands.
