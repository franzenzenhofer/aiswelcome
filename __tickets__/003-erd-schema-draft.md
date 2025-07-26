# Ticket #003: ERD & Schema Draft

**Priority:** HIGH
**Status:** TODO
**Deliverable:** `/docs/erd.png, /infra/migrations/000_init.sql`
**Test:** wrangler d1 execute --local succeeds; round-trip insert/select works

## Description
Design database schema and create initial migration

## Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging

## Technical Details
See main spec for detailed requirements.

## Dependencies
Check ticket order and dependencies in project plan.

## Notes
- Follow AISWelcome coding standards
- Ensure AI-debuggability (structured logs, clear errors)
- Performance target: <150ms p95 TTFB
