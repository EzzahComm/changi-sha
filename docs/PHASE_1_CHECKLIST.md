# Changisha Phase 1 — Implementation Checklist

**Start Date:** [Date]  
**Target Completion:** Week 4  
**Status:** 🟡 In Progress

---

## Week 1: Foundation & Schema

### SQL Migrations ✅
- [ ] Run migration: `20260212_001_changisha_foundation.sql`
  - Creates schemas: campaigns, collection_instruments, pledges, payment_events, contributions, allocations, exceptions
  - Sets up RLS policies for multi-tenancy
  - Creates indexes for performance
- [ ] Verify all tables in Supabase dashboard
- [ ] Verify RLS policies applied

### RPC Functions ✅
- [ ] Create/test `changisha.process_contribution()` RPC
  - Handles replay detection
  - Creates contributions (immutable)
  - Matches pledges
  - Generates exceptions
  - Emits audit events
  - Queues SMS
- [ ] Verify RPC signature in Supabase Functions
- [ ] Test with manual RPC call from SQL editor

### Environment Setup ✅
- [ ] Copy `.env.example` → `.env.local`
- [ ] Fill in Supabase credentials
- [ ] Fill in Daraja sandbox credentials
- [ ] Verify connection: `npm run dev` should connect without errors

---

## Week 2: Webhook & SMS

### Next.js Webhook Route ✅
- [ ] Create route: `app/api/changisha/webhook/daraja/route.ts`
  - Parse Daraja C2B payload
  - Validate signature (test mode first, production later)
  - Extract trans_id, MSISDN, amount, reference_code
  - Call `changisha.process_contribution()` RPC
  - Return HTTP 200 (idempotent)
  - Log all requests with correlation ID
- [ ] Test route with `curl` or Postman
  - Send valid payload
  - Send invalid payload
  - Send replay (same trans_id)
- [ ] Verify logs in Vercel dashboard

### SMS Queue Listener ✅
- [ ] Create SMS listener: `packages/sms-listener/src/changisha-listener.ts`
  - Poll for SMS queue entries
  - Compose SMS message (campaign title + amount + reference)
  - Dispatch to SMS provider (placeholder for Phase 1)
  - Log SMS send/fail in audit trail
  - Mark as sent/failed in queue
- [ ] Test listener locally
- [ ] Deploy listener to production environment

---

## Week 3: Testing

### Unit Tests ✅
- [ ] Create test suite: `tests/changisha/changisha.test.ts`
- [ ] Test invariants:
  - [x] R5: Contributions from Daraja only
  - [x] C2: trans_id uniqueness
  - [x] R12: Replay detection
  - [x] I7: MSISDN normalization
  - [x] R6: Pledge matching
  - [x] R8: No over-allocation
  - [x] A6: Audit logging
  - [x] R7: Exception for unmatched pledges
- [ ] Run all tests: `npm run test:changisha`
- [ ] Achieve 100% test pass rate
- [ ] Measure code coverage: **target ≥90% critical paths**

### Integration Tests ✅
- [ ] Create E2E test: `tests/e2e/changisha.e2e.ts`
- [ ] Full flow: Campaign → Pledge → Webhook → Contribution
- [ ] Verify webhook returns 200 on success
- [ ] Verify contribution created in database
- [ ] Verify pledge matched correctly
- [ ] Verify audit trail complete

### Manual Sandbox Tests ✅
- [ ] Request Daraja sandbox credentials from Safaricom
- [ ] Perform 10 test STK Push → callback → contribution flows
- [ ] Verify 0 duplicate contributions from replays
- [ ] Verify 0 PII leaks to logs
- [ ] Verify all errors are logged with context
- [ ] Verify SMS receipts queued correctly

---

## Week 4: Deployment

### Pre-Deployment Validation ✅
- [ ] All unit tests passing (10/10)
- [ ] All integration tests passing
- [ ] Code reviewed (minimum 1 LGTM)
- [ ] No console warnings or errors
- [ ] Daraja callback signature validation tested
- [ ] Replay detection tested with manual callback replay
- [ ] Audit logs verified queryable and complete
- [ ] Environment variables set correctly in Vercel
- [ ] Database connection pooling configured (6543 for runtime, 5432 for migrations)

### Staging Deployment ✅
- [ ] Deploy migrations to staging database
  ```bash
  supabase migration up --db-url $STAGING_DATABASE_URL
  ```
- [ ] Deploy Next.js app to staging
  ```bash
  vercel deploy --prod --env staging
  ```
- [ ] Deploy SMS listener to staging
  ```bash
  pm2 start packages/sms-listener/dist/changisha-listener.js --name changisha-sms-staging
  ```
- [ ] Run smoke tests in staging
  ```bash
  npm run test:smoke:changisha
  ```
- [ ] Manual test in staging with Daraja sandbox
- [ ] Monitor logs for errors

### Production Deployment ✅
- [ ] Backup production database
  ```bash
  pg_dump $PRODUCTION_DATABASE_URL > changisha-backup-$(date +%s).sql
  ```
- [ ] Deploy migrations to production
  ```bash
  supabase migration up --db-url $PRODUCTION_DATABASE_URL
  ```
- [ ] Deploy Next.js app to production
  ```bash
  vercel deploy --prod
  ```
- [ ] Start SMS listener with auto-restart
  ```bash
  pm2 start packages/sms-listener/dist/changisha-listener.js \
    --name changisha-sms \
    --instances max \
    --autorestart \
    --max-memory-restart 512M
  ```
- [ ] Verify webhook endpoint is live
  ```bash
  curl -X GET https://api.changisha.com/health/changisha
  ```
- [ ] Monitor production logs for 24h
  ```bash
  pm2 logs changisha-sms
  tail -f $VERCEL_LOGS
  ```

### Rollback Plan ✅
If critical issue discovered:
- [ ] Revert Next.js deployment
  ```bash
  vercel rollback
  ```
- [ ] Stop SMS listener
  ```bash
  pm2 stop changisha-sms
  ```
- [ ] Revert migrations (only if data corruption — avoid if possible)
  ```bash
  psql $PRODUCTION_DATABASE_URL -f changisha-backup-[timestamp].sql
  ```
- [ ] Notify on-call team

---

## Acceptance Criteria

### Daraja Webhook Handler
- [ ] POST `/api/changisha/webhook/daraja` accepts Daraja C2B payload
- [ ] Signature validation works (sandbox + production)
- [ ] Route returns HTTP 200 regardless of processing outcome
- [ ] Errors logged, not exposed to client
- [ ] Correlation ID tracked through entire flow

### Contribution Creation
- [ ] Contribution record created for each valid Daraja callback
- [ ] `trans_id` is unique and prevents duplicates
- [ ] `reference_code` extracted from AccountReference field
- [ ] `initiator_msisdn` normalized to 254-prefix format
- [ ] Amount stored as NUMERIC with 2 decimal places
- [ ] `received_at` timestamp set to callback time
- [ ] `allocation_status` set to 'unallocated' by default

### Pledge Matching
- [ ] Contributions matched to pledges via phone number
- [ ] Allocations created with correct amounts
- [ ] Over-allocation prevention working (allocated ≤ pledged)
- [ ] Unmatched contributions create exception records
- [ ] Pledge status updated when matched

### Replay Protection
- [ ] Replayed Daraja callbacks detected via `trans_id`
- [ ] Replay results in idempotent response (no new contribution)
- [ ] `payment_events.is_replay` flag set correctly
- [ ] Duplicate contribution detection works under concurrent load

### Audit Logging
- [ ] Every contribution generates `audit_events` entry
- [ ] Audit entries include: campaign ID, amount, trans_id, pledge_id
- [ ] Audit entries queryable via Supabase dashboard
- [ ] Audit trail complete (no gaps)
- [ ] No PII in audit logs (phone masked or absent)

### Exception Handling
- [ ] Unmatched contributions land in `exceptions` table
- [ ] Exception type is `unmatched_msisdn` for phone mismatches
- [ ] Exception status is `open` and resolvable by admin
- [ ] Exception includes `suggested_action` field
- [ ] Admin can mark exceptions as `resolved` with notes

### SMS Queueing
- [ ] RPC notifies SMS listener on contribution success
- [ ] SMS listener receives event payload correctly
- [ ] SMS composition includes: campaign title, amount, reference
- [ ] SMS dispatch logged in audit trail
- [ ] SMS failures logged with error reason

### Security & Compliance
- [ ] No PII exposed on public layers
- [ ] RLS policies enforce tenant isolation
- [ ] Daraja payload not exposed to client
- [ ] MSISDN never logged in plaintext outside audit trail
- [ ] Signature validation prevents unauthorized callbacks
- [ ] Service Role key never exposed to client

### Performance
- [ ] Webhook handler responds within 1s
- [ ] RPC completes within 500ms
- [ ] Database indexes effective (query plans checked)
- [ ] No N+1 queries
- [ ] Concurrent requests handled without race conditions

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Daraja AccountReference > 12 chars | HIGH | Verify with Safaricom pre-deploy. Hard-limit in RPC. | 🟡 |
| Replay detection race condition | MEDIUM | PostgreSQL UNIQUE constraint enforced at row level. ON CONFLICT clause handles concurrent inserts. | 🟡 |
| SMS listener crashes silently | MEDIUM | PM2 auto-restart + monitoring. Alert on process restart. | 🟡 |
| Audit log fills database | LOW | Retention policy (60 days, then archive). Index on created_at. | 🟡 |
| Phone normalization fails silently | MEDIUM | Validation in RPC; exceptions created. Test with various formats. | 🟡 |

---

## Success Signal: Week 4, Friday EOD

- ✅ 100 sandbox transactions processed correctly
- ✅ 0 duplicate contributions from replays
- ✅ 0 silent failures (all errors logged + human-visible)
- ✅ All logs clean (no warnings)
- ✅ SMS receipts dispatched and logged
- ✅ Audit trail complete and queryable
- ✅ Production deployment stable 24h

**→ Phase 1 complete. Phase 2 (Pledge & Campaigns UI) begins Monday.**

---

## Helpful Commands

```bash
# Run migrations locally
supabase migration up

# View migrations
supabase migration list

# Run tests
npm run test:changisha
npm run test:e2e

# Deploy to staging
vercel deploy --env staging

# Deploy to production
vercel deploy --prod

# View production logs
vercel logs --follow

# Monitor SMS listener
pm2 logs changisha-sms

# Test webhook locally
npm run dev  # Start dev server
curl -X POST http://localhost:3000/api/changisha/webhook/daraja \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

**Next Steps:**
1. Create any missing environment variables in Vercel
2. Run migrations against staging database
3. Deploy webhook route to staging
4. Begin manual testing with Daraja sandbox
5. Iterate on tests until 100% passing
