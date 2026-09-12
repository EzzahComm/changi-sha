# Changisha Phase 2: Pledge & Notification — Implementation Checklist

**Timeline:** Weeks 5–8 (Foundation → Testing → Deployment)  
**Prerequisite:** Phase 1 complete and stable in production

---

## Week 5: Pledge Foundation

### SQL Migrations
- [ ] Run migration: `20260219_002_phase2_pledge_notification.sql`
  - Creates `contributor_consents` table (DPA 2019)
  - Adds reminder fields to `pledges`
  - Creates views: `v_pledges_with_consent_status`, `v_pledge_status_computed`
  - Sets up RLS policies
- [ ] Verify tables in Supabase dashboard

### RPC Functions
- [ ] Deploy RPC: `create_pledge()` — validation, phone normalization, consent requirement
- [ ] Deploy RPC: `compute_pledge_status()` — pending → fulfilled → overdue
- [ ] Deploy RPC: `capture_contributor_consent()` — DPA consent with audit trail
- [ ] Deploy RPC: `bulk_import_pledges()` — idempotent batch import
- [ ] Test each RPC manually in SQL editor

### Environment & Config
- [ ] Add SMS job environment variables to `.env.local`
  - `SMS_POLL_INTERVAL_MS`
  - `REMINDER_JOB_ENABLED`

---

## Week 6: UI & Jobs

### Pledge Creation Form
- [ ] Create route: `app/campaigns/[id]/pledge/page.tsx`
  - Phone input with normalization (07x → 254x)
  - Amount input
  - Due date picker
  - Consent checkboxes (contact + data processing)
  - RPC call to `create_pledge()`
  - RPC call to `capture_contributor_consent()`
  - Success redirect with phone param
- [ ] Test form with valid phone numbers
- [ ] Test form with invalid inputs
- [ ] Verify consent captured in database

### Reminder Job
- [ ] Create job: `packages/jobs/src/changisha-reminder-job.ts`
  - Query pledges with `has_valid_consent=TRUE`
  - Filter: status IN (pending, partially_contributed, overdue)
  - Filter: last_reminder_at < 24h ago
  - Compose Swahili SMS
  - Dispatch SMS (placeholder for Phase 2)
  - Update pledge: increment `reminder_sent_count`, set `last_reminder_at`
  - Log to audit trail
- [ ] Test job locally with sample data
- [ ] Verify SMS composition (Swahili, campaign + amount + due date)
- [ ] Verify audit logs created

---

## Week 7: Testing

### Unit Tests
- [ ] Create test file: `tests/changisha/phase2.test.ts`
- [ ] Test invariants:
  - [x] P1: Pledge creation with amount + phone
  - [x] P2: Phone uniqueness per campaign
  - [x] P3: Non-member consent requirement
  - [x] P4: Pledge status computation
  - [x] D1: Consent capture with metadata
  - [x] A5: Bulk import idempotence
  - [x] Phone normalization (07x → 254x)
- [ ] Run tests: `npm run test:changisha:phase2`
- [ ] Achieve 100% test pass rate

### Integration Tests
- [ ] Campaign → Pledge creation → Consent capture full flow
- [ ] Bulk import with errors and successes
- [ ] Reminder job simulation (manual trigger + verify database)
- [ ] Consent expiration (12 months)

### Manual Testing
- [ ] Create 10 pledges via web form
- [ ] Verify each pledge in database with normalized phone
- [ ] Verify consents captured with method, timestamp, IP
- [ ] Manually trigger reminder job
- [ ] Verify reminder SMS composed correctly
- [ ] Verify audit trail entries

---

## Week 8: Deployment

### Pre-Deployment
- [ ] All Phase 2 tests passing (10/10)
- [ ] Code reviewed (minimum 1 LGTM)
- [ ] No console warnings
- [ ] Pledge form tested with 5 valid phone formats
- [ ] Reminder job tested with 10 pledges
- [ ] Audit logs verified
- [ ] Consent capture verified for all methods

### Staging Deployment
```bash
# 1. Deploy migration
supabase migration up --db-url $STAGING_DATABASE_URL

# 2. Deploy Next.js
vercel deploy --prod --env staging

# 3. Start reminder job
pm2 start packages/jobs/dist/changisha-reminder-job.js --name changisha-reminder-staging

# 4. Run smoke tests
npm run test:smoke:changisha:phase2

# 5. Manual testing on staging
# - Create 20 test pledges
# - Trigger reminder job
# - Verify SMS and audit logs
```

### Production Deployment
```bash
# 1. Deploy migration
supabase migration up --db-url $PRODUCTION_DATABASE_URL

# 2. Deploy app
vercel deploy --prod

# 3. Start reminder job
pm2 start packages/jobs/dist/changisha-reminder-job.js \
  --name changisha-reminder \
  --instances 1 \
  --autorestart \
  --cron "0 */6 * * *"

# 4. Monitor
pm2 logs changisha-reminder
```

---

## Acceptance Criteria

### Pledge Creation
- [ ] Pledges created via web form with name, phone, amount, due date
- [ ] Phone normalized to 254-prefix format
- [ ] Non-members require explicit consent_to_contact
- [ ] Unique constraint on (campaign_id, pledger_phone)
- [ ] Status initialized as 'pending'
- [ ] Audit entry created for each pledge

### Pledge Status
- [ ] Status computed on-read: pending → partially_contributed → fulfilled → overdue
- [ ] `compute_pledge_status()` RPC works correctly
- [ ] View `v_pledge_status_computed` returns correct status
- [ ] Over-fulfillment handled correctly (cap at pledged amount)

### Consent Capture
- [ ] Consent captured with method (web_form, sms_callback, ussd, offline)
- [ ] Consent includes IP address, user agent, timestamp
- [ ] Consent expires after 12 months
- [ ] No SMS sent without valid consent
- [ ] Consent can be captured multiple times (upsert)

### Bulk Import
- [ ] Bulk import accepts JSONB array of pledges
- [ ] Returns {success, failed, errors} with detailed error messages
- [ ] Idempotent (retry doesn't create duplicates)
- [ ] Partial success: some succeed, some fail (not all-or-nothing)
- [ ] Audit log created with success/failed counts

### SMS Reminders
- [ ] Reminder job queries pledges with `has_valid_consent=TRUE`
- [ ] Filters pledges with status: pending, partially_contributed, overdue
- [ ] Filters pledges: last_reminder_at < 24h ago
- [ ] Composes SMS in Swahili (campaign + amount + due date)
- [ ] Dispatches SMS (placeholder in Phase 2, real provider in Phase 3+)
- [ ] Increments `reminder_sent_count` atomically
- [ ] Updates `last_reminder_at` to current time
- [ ] Logs SMS sent/failed to audit trail

### Audit Logging
- [ ] Every pledge creation logged
- [ ] Every consent capture logged
- [ ] Every reminder sent/failed logged
- [ ] Audit entries queryable via dashboard
- [ ] No PII in logs (phone masked or absent where appropriate)

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Consent expiration not checked on SMS | HIGH | Query with `consent_expires_at > now()` in view | 🟡 |
| Phone normalization differs from Phase 1 | MEDIUM | Use same function from `phone_utils.ts` | 🟡 |
| Reminder job crashes & doesn't restart | MEDIUM | PM2 auto-restart + monitoring alerts | 🟡 |
| Bulk import fails silently on some rows | LOW | Return error array with row indices | 🟡 |

---

## Success Signal: Week 8, Friday EOD

- ✅ 20 test pledges created via web form
- ✅ All pledges have normalized phone numbers
- ✅ All pledges have valid consents
- ✅ Reminder job runs without errors
- ✅ SMS composition correct (Swahili)
- ✅ Audit trail complete
- ✅ Production deployment stable 24h

---

## Next Steps → Phase 3

After Phase 2 is deployed:
- [ ] Build Admin Dashboard (campaigns, exceptions, settlement)
- [ ] Build Exception Workbench (manual allocation)
- [ ] Build Settlement Reconciliation view
- [ ] Deploy admin routes with RLS

**Phase 3 Checklist:** See `PHASE_3_CHECKLIST.md`
