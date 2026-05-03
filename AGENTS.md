# Agent Instructions — Shared Rules for Claude Code and Codex CLI

This file is the **single source of truth** for AI agent behavior on this
project. Codex CLI reads `AGENTS.md` natively; Claude Code reads `CLAUDE.md`,
which redirects here. **Read this file at the start of every session before
making any changes.**

---

## What this project is

JKOPAY 街口支付 interview assignment: build a charity-donation (公益捐款) project
listing experience modeled on the JKOPAY mobile app's "公益捐款項目 → 搜尋" flow.

The product is a tabbed card list (`公益團體` / `捐款專案` / `義賣商品`) with
sub-category filtering, infinite scroll, a dedicated search route with
loading/empty states, and a detail page per item. Mock data lives in
Postgres and is served by a Fastify API; the Next.js frontend consumes it
with cursor-based pagination and `react-window` virtualization. UI strings
flow through `next-intl` with zh-TW as the default locale.

**Stack:** Frontend — Next.js (App Router) + TypeScript + Tailwind +
`next-intl` + `react-window`. Backend — Fastify + TypeScript + Prisma.
Database — Postgres (docker-compose locally, Neon for the demo).
Deployment — Vercel (FE) + Railway (BE) + Neon (DB).

**Deliverables (per the brief):**

1. GitHub repo with full source + README (install, run, API docs, `## AI 使用聲明`, prompt-records pointer).
2. Live demo URL (Vercel) — **mandatory**, called out in red in the brief.
3. `docs/decisions/` with ≥3 *technical* ADRs.
4. `docs/prompts/` (renamed from `docs/AI_JOURNAL.md` at M9) with curated representative AI exchanges.

**Graded dimensions:**

1. **Product** — list + infinite scroll + search; bonus for Tailwind, ORM, tests, real DB.
2. **AI collaboration** — README's `## AI 使用聲明`, ADRs, prompt records.

The canonical brief is the four assignment screenshots the user shared at
session start (text in `docs/REQUIREMENTS.md` is translated from those).
There is no separate `ASSIGNMENT.md`; if any future requirement clarification
arrives, append it to `docs/REQUIREMENTS.md` rather than creating a new file.

## Required reading at session start

Before touching code, read the current state of these — they change as the
project evolves:

1. `docs/REQUIREMENTS.md` — the acceptance checklist (translated from the brief).
2. `docs/PROGRESS.md` — where we left off; current milestone status.
3. `docs/decisions/README.md` — index of locked-in choices; read the linked ADR before revisiting it.
4. `docs/RISKS.md` — active risks and their mitigations.
5. `docs/AI_JOURNAL.md` — recent AI exchanges (will be renamed to `docs/prompts/` at M9).

## Hard rules (non-negotiable)

1. **TypeScript only.** No `.js` source files outside config (e.g. `next.config.js`, `tailwind.config.js`). Both frontend and backend are strict TS.
2. **Backend stays Fastify in a separate process.** Do not introduce Express, and do not migrate the API into Next.js route handlers — the brief constrains the backend to a Node service distinct from the frontend.
3. **ORM-only DB access.** Every query and migration goes through Prisma. No raw SQL string templating against Postgres. (Bonus point #6 in the brief.)
4. **README is a graded artifact.** Before submission it must contain a `## AI 使用聲明` section (tools used, AI scope, my scope), install/run instructions, API documentation, and a pointer to the prompt-records folder. Treat README edits as review-required changes.
5. **`docs/decisions/` must hold ≥3 *technical* ADRs at submission.** Process ADRs (0001 docs structure, 0002 cross-agent review) don't count toward this. ADR-0003 onward are the technical ones; bodies get filled in at the milestone where the decision is made, not retroactively.
6. **Demo URL is mandatory.** A submission email without a live, reachable demo link fails the brief outright. Deploy a "hello world" of FE+BE early (M3) and iterate; do not save deployment for the last milestone.
7. **API uses cursor-based pagination.** All list endpoints return `{ items, nextCursor }`. Don't introduce offset/page-number pagination — see ADR-0006.
8. **Single Prisma `Item` table for all three categories.** Category-specific fields (`amountRaised`/`amountGoal`/`deadline`/`price`/`stock`) are nullable columns on the same row. Don't fork into per-category tables — see the data model in `docs/REQUIREMENTS.md`.
9. **All UI strings flow through `next-intl` dictionaries.** No hard-coded zh-TW literals in JSX. zh-TW is the default locale; an `en` stub bundle is fine but must exist.
10. **Don't commit secrets.** No `.env` with real DB URLs, no Neon connection strings, no Railway tokens. Use `.env.example` for shape; deployment-time secrets live in Vercel/Railway/Neon dashboards.
11. **Design for production load, not the seed size.** The 90-item seed is a development convenience. Risks, ADRs, indexes, and infrastructure choices must be sized against the realistic production scenario (thousands concurrent, 10k–100k+ items). Don't write "this is fine because the seed is small" — write what would actually happen at scale and ship cheap mitigations. Expensive mitigations get documented in `docs/SCALING.md` rather than skipped. (Origin: user feedback after M2 — "you shouldn't assume 90 data... we are demo but we should showcase what we know and think.")

## Working agreements

- **Prove it before plumbing it.** Every load-bearing primitive gets a
  standalone unit test before being exposed via HTTP / called from UI.
- **Trust official docs over training memory.** Recent major versions of
  libraries are likely to have API changes the model hallucinates around.
  Verify against `cargo doc` / source / official changelog, not blog posts.
- **Small commits with descriptive messages.** Each milestone in
  `docs/PROGRESS.md` should map to roughly one commit (or a small handful).
- **Update docs in the same change.** If you change behavior covered by
  `REQUIREMENTS.md`, `RISKS.md`, or `TESTING.md`, update them in the same
  commit.
- **Order of operations matters.** Build the riskiest / most uncertain
  parts first; UI polish comes last. Don't make a thing pretty before it's
  correct.
- **Pre-review self-checks must include build, not only typecheck.** Before
  posting a `Review request` block to `docs/REVIEWS.md`, run all of:
  `npm run typecheck`, `npm run build`, and a runtime smoke check
  (e.g. `curl /health` or equivalent for the surface you just touched).
  Typecheck and build can diverge — different `tsconfig` include scopes,
  emit-time errors that `--noEmit` skips, etc. Record exactly what you ran
  in the `Self-checks done.` section. (Origin: RR-001 reconfirmation, where
  Codex independently ran `npm run build` and the implementer hadn't.)
- **The Review request is a written artifact, not a chat mention.** When a
  meaningful task completes, append the RR-NNN block to `docs/REVIEWS.md`
  *before* reporting milestone-done to the human. Saying "want me to ask
  the other agent to review?" is not the same as appending the entry.

## Cross-agent review workflow

We use Claude Code and Codex CLI and have them check each other's work. After **one
agent** completes a meaningful task, **the other agent** reviews it before we
move on. This catches blind spots, fixes hallucinations, and produces a
paper trail.

### What counts as a "meaningful task" (review required)

- A milestone in `docs/PROGRESS.md` (M1, M2, …).
- Any change to a **high-risk subsystem** (security, crypto, payments,
  data integrity — anything where a silent bug is expensive).
- New or changed **API contract** between services.
- New or changed **DB schema / migration**.
- A new **ADR** in `docs/decisions/`, or any edit to `AGENTS.md` /
  `CLAUDE.md` / `REQUIREMENTS.md`.
- Anything you suspect might violate a Hard Rule above.

Review is **not** required for: tweaking docs you just wrote in the same
turn, formatting/lint fixes, or trivial typo corrections.

### Handoff mechanics

The exchange happens through `docs/REVIEWS.md` — append-only, dated entries.

**1. Implementer (the agent that just finished)** appends a `Review request`
block to `docs/REVIEWS.md`:

```md
### YYYY-MM-DD — RR-NNN — short title — implementer: <agent name>

**Scope.** One paragraph: what was done and why.
**Files touched.** Bullet list with `path:line` ranges where useful.
**Commit / branch.** Hash or branch name (if committed).
**Self-checks done.** What you verified (tests run, manual checks).
**Risks to focus on.** Where you most want a second pair of eyes.
**Status.** `awaiting-review`
```

Then stop and tell the human: "Ready for review by `<other agent>` — entry
RR-NNN in docs/REVIEWS.md."

**2. Reviewer (the OTHER agent)** is invoked by the human with something
like "review RR-NNN". The reviewer:

- Reads the entry, then reads the actual files / diff. Do **not** trust the
  self-report alone.
- Checks against `AGENTS.md` Hard Rules, `docs/REQUIREMENTS.md` acceptance
  criteria, and active items in `docs/RISKS.md`.
- Appends a `Review` block under the same RR-NNN:

```md
**Reviewer: <agent name> — YYYY-MM-DD**

- **Blockers** (must fix before merge): …
- **Suggestions** (worth doing): …
- **Nits** (optional polish): …
- **Verdict.** `approved` | `changes-requested`
```

Reviewer **does not rewrite the implementer's code** beyond trivial
mechanical fixes (typo, missing import, formatter). Substantive feedback is
left as comments for the implementer to address.

**3. Implementer addresses blockers**, appends a short `Resolution` block
noting what was changed, and flips `Status` to `approved` once the reviewer
re-confirms.

`accepted-with-followups` is **only** allowed when the human explicitly
signs off on the remaining risk *and* a follow-up item has been added to
`docs/PROGRESS.md`. Agents must not flip to this status on their own.

**4. The human decides when to move on.** An `approved` review unblocks the
next step but does not by itself advance us to the next milestone — wait
for the human to say so before starting M-next.

### Reviewing your own work

Don't. If only one agent is available in a session, do the implementation,
write the `Review request` block, and leave it `awaiting-review` for the
next session. Self-review defeats the point.

### Exceptions

If a fix is genuinely urgent (build is broken, demo in 10 minutes), the
implementer can land it and add a `post-hoc-review` request to
`docs/REVIEWS.md`. Reviewer comments still happen, just after the fact.

## Documentation discipline

- **`docs/PROGRESS.md`** — append a dated entry whenever you finish a
  milestone, hit a blocker, or change direction. One short paragraph is
  plenty.
- **`docs/decisions/`** — add a new `NNNN-short-title.md` ADR for any
  non-obvious choice (architecture, API shape, schema design, library
  bridging strategy). Numbering is monotonic across the folder; never
  reuse a number even after rejecting an ADR. Update the index in
  `docs/decisions/README.md`.
- **`docs/RISKS.md`** — when you mitigate a risk, move it to
  "Resolved / monitoring" with a one-line note. When you discover a new
  one, add it.
- **`docs/TESTING.md`** — keep the manual checklist honest. Don't tick
  boxes that don't actually pass right now.
- **`docs/AI_JOURNAL.md`** — append meaningful AI exchanges *during* the
  session, not at the end. Sanitize but don't fabricate.
- **`docs/REVIEWS.md`** — cross-agent review log; see "Cross-agent review
  workflow" above.

## Style & scope

- Don't add features, abstractions, or "future-proofing" beyond what the
  task requires. Three similar lines beats a premature trait.
- Default to no comments. Add a comment only when the *why* is non-obvious.
- Match the existing code style of the file you're editing.

## When you're stuck or uncertain

- If a request is ambiguous, ask one targeted question rather than guessing.
- If you discover the spec and existing decisions disagree, flag it — don't
  silently pick a side.
- If a tool/API behaves differently than expected, prefer reading the
  source (e.g. `cargo doc --open`, the crate repo) over inventing a
  workaround.

## What not to do

- Don't run `git push --force`, `git reset --hard`, or destructive
  `docker compose down -v` without confirmation.
- Don't commit `.env`, real keys, RPC tokens, or any keypair file.
- Don't generate documentation files unless asked — except for the
  scaffolding files this project already maintains under `docs/`.

## Tool-specific addenda

- **Claude Code**: `CLAUDE.md` redirects here. If a Claude-only override is
  ever needed, place it after the redirect line in `CLAUDE.md` and reference
  the section here it overrides.
- **Codex CLI**: this is your `AGENTS.md` — no further config needed.
