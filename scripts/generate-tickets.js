#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tickets = [
  {
    id: '001',
    title: 'Freeze Product Spec v1',
    priority: 'HIGH',
    deliverable: '/docs/spec.md',
    test: 'Lint with markdownlint + spec passes review checklist',
    description: 'Finalize and freeze the product specification for AISWelcome v1.0'
  },
  {
    id: '002',
    title: 'Arch Diagram & Data Flow',
    priority: 'HIGH',
    deliverable: '/docs/architecture.drawio',
    test: 'CI job ensures diagram source exists; links in README render',
    description: 'Create architecture diagram and data flow documentation'
  },
  {
    id: '003',
    title: 'ERD & Schema Draft',
    priority: 'HIGH',
    deliverable: '/docs/erd.png, /infra/migrations/000_init.sql',
    test: 'wrangler d1 execute --local succeeds; round-trip insert/select works',
    description: 'Design database schema and create initial migration'
  },
  {
    id: '004',
    title: 'Types & Zod Models Package',
    priority: 'HIGH',
    deliverable: 'packages/shared/src/types.ts',
    test: 'Vitest validates sample payloads against schemas',
    description: 'Create shared TypeScript types and Zod validation schemas'
  },
  {
    id: '005',
    title: 'Logging/Error Format Lib',
    priority: 'HIGH',
    deliverable: 'packages/logging/',
    test: 'Unit tests ensure every error returns {ok:false, code,...} and includes req_id',
    description: 'Implement structured logging and error formatting library'
  },
  {
    id: '006',
    title: 'Monorepo Scaffold (pnpm + Turbo)',
    priority: 'HIGH',
    deliverable: 'repo structure',
    test: 'pnpm lint && pnpm build green in CI',
    description: 'Set up monorepo with pnpm workspaces and Turborepo'
  },
  {
    id: '007',
    title: 'Wrangler Config & Env Bindings',
    priority: 'HIGH',
    deliverable: 'wrangler.toml',
    test: 'wrangler dev boots locally; bindings resolved',
    description: 'Configure Cloudflare Worker with all necessary bindings'
  },
  {
    id: '008',
    title: 'D1 Migration Pipeline',
    priority: 'HIGH',
    deliverable: 'migration scripts + README',
    test: 'Apply/rollback in CI ephemeral DB without errors',
    description: 'Set up database migration system for D1'
  },
  {
    id: '009',
    title: 'KV & Durable Objects Bindings',
    priority: 'HIGH',
    deliverable: 'DO class stubs (rateLimiter.ts)',
    test: 'Unit test concurrency increments atomically',
    description: 'Implement KV cache and Durable Objects for rate limiting'
  },
  {
    id: '010',
    title: 'Auth: Human Signup/Login',
    priority: 'HIGH',
    deliverable: '/api/v1/login, /signup',
    test: 'Integration test: signup → login → session cookie set',
    description: 'Implement human user authentication system'
  },
  {
    id: '011',
    title: 'Auth: Agent + Token Issuance',
    priority: 'HIGH',
    deliverable: '/api/v1/agents, /api/v1/tokens',
    test: 'Token scope check prevents unauthorized actions',
    description: 'Implement AI agent authentication with Bearer tokens'
  },
  {
    id: '012',
    title: 'Turnstile Integration (Humans)',
    priority: 'MEDIUM',
    deliverable: 'form widget + server verify',
    test: 'Mock Turnstile passes/fails accordingly',
    description: 'Add Cloudflare Turnstile for human verification'
  },
  {
    id: '013',
    title: 'Session Store (cookie/JWT)',
    priority: 'HIGH',
    deliverable: 'middleware',
    test: 'Expired session rejected; refresh extends TTL',
    description: 'Implement session management system'
  },
  {
    id: '014',
    title: 'Submit Story Endpoint',
    priority: 'HIGH',
    deliverable: '/api/v1/submit',
    test: 'Validation errors on missing title; DB row created',
    description: 'Create endpoint for submitting stories/links'
  },
  {
    id: '015',
    title: 'Comment Endpoint',
    priority: 'HIGH',
    deliverable: '/api/v1/comment',
    test: 'Parent existence enforced; nested thread appears in /item/:id',
    description: 'Implement commenting system with threading'
  },
  {
    id: '016',
    title: 'Vote Endpoints (story/comment)',
    priority: 'HIGH',
    deliverable: '/api/v1/vote',
    test: 'Double-vote blocked; points increment verified',
    description: 'Create voting system for stories and comments'
  },
  {
    id: '017',
    title: 'Flag Endpoints',
    priority: 'MEDIUM',
    deliverable: '/api/v1/flag',
    test: 'Auto-dead after threshold; mod queue populated',
    description: 'Implement flagging system for moderation'
  },
  {
    id: '018',
    title: 'Ranking Function',
    priority: 'HIGH',
    deliverable: 'ranking.ts',
    test: 'Property tests: older post with same points ranks lower',
    description: 'Implement HN-style ranking algorithm with AI trust scores'
  },
  {
    id: '019',
    title: 'Front Page Query + Cache (KV)',
    priority: 'HIGH',
    deliverable: 'cached ID list',
    test: 'Cache invalidates on new top story; 95th percentile latency <50ms in dev bench',
    description: 'Optimize front page performance with KV caching'
  },
  {
    id: '020',
    title: '/new, /top, /ask, /show, /jobs Lists',
    priority: 'HIGH',
    deliverable: 'handlers + SSR',
    test: 'Sort orders match spec via snapshot tests',
    description: 'Implement all list views with server-side rendering'
  },
  {
    id: '021',
    title: 'Item Page (Story + Threaded Comments)',
    priority: 'HIGH',
    deliverable: 'SSR template',
    test: 'Deeply nested comment renders correctly; JSON mirror matches HTML',
    description: 'Create story detail page with comment threads'
  },
  {
    id: '022',
    title: 'User Profiles (/user/:name)',
    priority: 'MEDIUM',
    deliverable: 'profile view + about edit',
    test: 'Karma updates reflected; editing requires auth',
    description: 'Implement user profile pages'
  },
  {
    id: '023',
    title: 'Threads & Favorites Pages',
    priority: 'MEDIUM',
    deliverable: '/threads, /favorites',
    test: 'Only owner sees their threads; favorites persist',
    description: 'Create user threads and favorites views'
  },
  {
    id: '024',
    title: 'Moderation Dashboard',
    priority: 'MEDIUM',
    deliverable: '/admin/* (CF Access protected)',
    test: 'Non-mod gets 403; mod can kill/unkill',
    description: 'Build moderation tools interface'
  },
  {
    id: '025',
    title: 'Shadow-ban Flow',
    priority: 'MEDIUM',
    deliverable: 'flag in users/agents',
    test: 'Shadow-banned content visible only to mods in e2e tests',
    description: 'Implement shadow-banning functionality'
  },
  {
    id: '026',
    title: 'Duplicate URL Detection',
    priority: 'MEDIUM',
    deliverable: 'URL hash check',
    test: 'Second submit of same URL returns 409 or merges',
    description: 'Prevent duplicate story submissions'
  },
  {
    id: '027',
    title: 'Content Sanitization (Markdown-lite)',
    priority: 'HIGH',
    deliverable: 'sanitizer util',
    test: 'XSS payload stripped in unit tests',
    description: 'Implement safe Markdown subset for user content'
  },
  {
    id: '028',
    title: 'JSON API Mirror (.json or Accept header)',
    priority: 'HIGH',
    deliverable: 'JSON serializers',
    test: 'Schema validates; HTML/JSON parity snapshot',
    description: 'Add JSON API for every HTML endpoint'
  },
  {
    id: '029',
    title: 'OpenAPI Spec',
    priority: 'MEDIUM',
    deliverable: '/docs/openapi.yaml',
    test: 'Spectral lints pass; generated client builds',
    description: 'Document API with OpenAPI specification'
  },
  {
    id: '030',
    title: 'Client Bundle (Vite TS)',
    priority: 'HIGH',
    deliverable: 'apps/web/dist/bundle.js',
    test: 'Build size <50KB gzip; no console errors',
    description: 'Create minimal client-side JavaScript bundle'
  },
  {
    id: '031',
    title: 'Inline Reply & Vote JS (Progressive Enh.)',
    priority: 'MEDIUM',
    deliverable: 'minimal JS',
    test: 'Works with JS disabled (HTML fallback)',
    description: 'Add progressive enhancement for common actions'
  },
  {
    id: '032',
    title: 'KV-backed Session or Token Cache',
    priority: 'MEDIUM',
    deliverable: 'KV handlers',
    test: 'KV hit after first DB read; fallbacks if KV miss',
    description: 'Optimize session lookups with KV cache'
  },
  {
    id: '033',
    title: 'Durable Object Rate Limiter',
    priority: 'HIGH',
    deliverable: 'DO class',
    test: 'Burst >limit returns 429 with reset_seconds',
    description: 'Implement rate limiting with Durable Objects'
  },
  {
    id: '034',
    title: 'Queues: Moderation & Email Digests',
    priority: 'LOW',
    deliverable: 'queue consumer worker',
    test: 'Enqueue/dequeue integration test',
    description: 'Set up async processing with Cloudflare Queues'
  },
  {
    id: '035',
    title: 'Nightly DB Backup to R2',
    priority: 'LOW',
    deliverable: 'scheduled job',
    test: 'File appears in R2 bucket; checksum verified',
    description: 'Implement automated database backups'
  },
  {
    id: '036',
    title: 'Semantic Dedupe (optional) Stub',
    priority: 'LOW',
    deliverable: 'vectorize hook',
    test: 'Behind feature flag; unit mock test passes',
    description: 'Add AI-powered duplicate detection (optional)'
  },
  {
    id: '037',
    title: 'Synthetic Agent Test Suite',
    priority: 'MEDIUM',
    deliverable: '/tests/synthetic/*.ts',
    test: 'Agent posts/comments/votes; assertions on UI/API',
    description: 'Create AI agents for automated testing'
  },
  {
    id: '038',
    title: 'Ranking Unit Tests',
    priority: 'HIGH',
    deliverable: 'tests/unit/ranking.spec.ts',
    test: 'Coverage >90% for ranking.ts',
    description: 'Comprehensive unit tests for ranking algorithm'
  },
  {
    id: '039',
    title: 'Auth Integration Tests',
    priority: 'HIGH',
    deliverable: 'tests/integration/auth.spec.ts',
    test: 'Token misuse -> 401; happy path -> 200',
    description: 'Integration tests for authentication system'
  },
  {
    id: '040',
    title: 'E2E Playwright Tests (HTML flows)',
    priority: 'MEDIUM',
    deliverable: 'tests/e2e/',
    test: 'Headless run passes in CI against preview deploy',
    description: 'End-to-end tests for critical user journeys'
  },
  {
    id: '041',
    title: 'Load Test Script (k6 or Artillery)',
    priority: 'LOW',
    deliverable: '/tests/load/',
    test: '500 rps for 1 min, <1% error rate',
    description: 'Performance testing suite'
  },
  {
    id: '042',
    title: 'Logpush to R2/BigQuery',
    priority: 'LOW',
    deliverable: 'CF Logpush config',
    test: 'Sample logs visible in store; schema matches logger',
    description: 'Set up centralized logging'
  },
  {
    id: '043',
    title: 'OpenTelemetry Exporter',
    priority: 'LOW',
    deliverable: 'OTLP HTTP export',
    test: 'Trace shows in chosen backend (Honeycomb/Jaeger)',
    description: 'Implement distributed tracing'
  },
  {
    id: '044',
    title: '/self-test Health Endpoint',
    priority: 'MEDIUM',
    deliverable: '/api/v1/self-test',
    test: 'Asserts DB/KV/DO reachable; CI checks 200',
    description: 'Create health check endpoint for monitoring'
  },
  {
    id: '045',
    title: 'CI/CD Pipeline (GitHub Actions)',
    priority: 'HIGH',
    deliverable: '.github/workflows/ci.yml',
    test: 'On push → all jobs pass; on tag → deploy',
    description: 'Set up automated testing and deployment'
  },
  {
    id: '046',
    title: 'Preview + Staging Environments',
    priority: 'MEDIUM',
    deliverable: 'staging wrangler env',
    test: 'Manual QA URL works; separate DB',
    description: 'Configure preview and staging environments'
  },
  {
    id: '047',
    title: 'Post-deploy Smoke Tests',
    priority: 'MEDIUM',
    deliverable: 'GH Action hitting key endpoints',
    test: 'Fails abort deploy if any check fails',
    description: 'Automated post-deployment verification'
  },
  {
    id: '048',
    title: 'Rollback Procedure Doc & Script',
    priority: 'LOW',
    deliverable: '/scripts/rollback.sh',
    test: 'Simulate bad deploy; script restores previous wrangler version',
    description: 'Document and automate rollback process'
  },
  {
    id: '049',
    title: 'Security Review (CSP, headers)',
    priority: 'MEDIUM',
    deliverable: '/docs/security.md',
    test: 'Observatory score A; automated header tests',
    description: 'Security audit and hardening'
  },
  {
    id: '050',
    title: 'Community Guidelines & FAQ Pages',
    priority: 'LOW',
    deliverable: '/guidelines, /faq',
    test: 'Links from footer; checked by link checker',
    description: 'Create user-facing documentation'
  },
  {
    id: '051',
    title: 'Analytics/Insights Dashboard',
    priority: 'LOW',
    deliverable: 'simple admin stats page',
    test: 'Numbers match DB queries in unit test',
    description: 'Build admin analytics interface'
  },
  {
    id: '052',
    title: 'Launch Checklist & Retro',
    priority: 'LOW',
    deliverable: '/docs/launch_checklist.md, retro notes',
    test: 'All boxes ticked; retro creates v2 backlog issues',
    description: 'Final launch preparation and retrospective'
  }
];

const ticketsDir = path.join(__dirname, '..', '__tickets__');

tickets.forEach(ticket => {
  const filename = `${ticket.id}-${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
  const filepath = path.join(ticketsDir, filename);
  
  const content = `# Ticket #${ticket.id}: ${ticket.title}

**Priority:** ${ticket.priority}
**Status:** TODO
**Deliverable:** \`${ticket.deliverable}\`
**Test:** ${ticket.test}

## Description
${ticket.description}

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
`;

  fs.writeFileSync(filepath, content);
  console.log(`Created ticket: ${filename}`);
});

console.log(`\nGenerated ${tickets.length} tickets in ${ticketsDir}`);