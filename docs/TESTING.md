# Testing Notes

Two tracks: **manual acceptance** (mirrors the reviewer's flow) and
**automated** (catches regressions on the critical path). Keep this doc
honest — if a checkbox is checked, it must actually pass right now.

## Manual acceptance script

Run this end-to-end before any submission or major demo.

### Pre-flight

- [ ] One-command bring-up succeeds (`docker compose up` or equivalent).
- [ ] Health endpoints / smoke checks pass.
- [ ] All required env vars documented in `.env.example`.

### Flow A — <!-- name -->

<!-- TODO: list the manual steps a reviewer would take to validate this
     flow, with checkboxes. Mirror REQUIREMENTS.md acceptance criteria. -->

- [ ]

### Flow B — <!-- name -->

- [ ]

### Persistence

- [ ] After full-stack restart, prior state is restored intact.

## Automated tests

Prioritize the critical path. Add as we build — don't pre-commit to tests
that don't exist yet.

### Backend

- [ ]

### Frontend

- [ ]

### Integration / end-to-end

- [ ]

## Test-data hygiene

- Never commit real credentials, keys, or production data.
- Tests must be deterministic; quarantine flaky tests rather than retrying.
