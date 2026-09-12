# CHANGISHA Phase 1 — Implementation Guide

**Version:** 1.0  
**Status:** Ready for deployment  
**Scope:** Weeks 1–4, Foundation  
**Deliverable:** Production Daraja webhook handler, contribution creation RPC, exception queue, audit logging

---

## Overview

This document describes the complete CHANGISHA Phase 1 implementation:

1. **SQL Migrations** — Immutable contribution ledger schema
2. **RPC Functions** — Core `process_contribution()` entry point
3. **Webhook Route** — Next.js handler for Daraja C2B callbacks
4. **SMS Listener** — Async notification dispatcher
5. **Unit Tests** — Coverage for all critical invariants
6. **Deployment** — Staging and production checklist

---

## Architecture

```
Daraja M-Pesa STK Push ← Initiator
                ↓
         [SMS + checkout_request_id]
                ↓
         Initiator presses "OK"
                ↓
         Daraja C2B Callback (POST /api/changisha/webhook/daraja)
                ↓
         Next.js Route Handler
         ├─ Signature validation (Daraja secret key)
         ├─ Replay detection (payment_events table)
         ├─ RPC: changisha.process_contribution()
         │  ├─ Create/skip payment_events record
         │  ├─ Create contributions record
         │  ├─ Match to pledge via phone
         │  ├─ Create allocations or exceptions
         │  ├─ Emit audit_events
         │  └─ Queue SMS receipt
         └─ HTTP 200 (idempotent)
                ↓
         Supabase (appended rows)
         ├─ changisha.payment_events (raw payload, replay flag)
         ├─ changisha.contributions (immutable)
         ├─ changisha.allocations (pledge match)
         ├─ changisha.exceptions (unmatched/invalid)
         └─ core.audit_events (state trail)
                ↓
         SMS Dispatcher (async, non-blocking)
         └─ Receipt SMS to initiator
```

---

## File Structure

```
changi-sha/
├── supabase/
│   └── migrations/
│       ├── 001_changisha_foundation.sql    # Tables + RLS policies
│       └── 002_changisha_rpc.sql            # RPC functions
├── app/
│   └── api/
│       └── changisha/
│           └── webhook/
│               └── daraja/
│                   └── route.ts             # Webhook handler
├── lib/
│   └── services/
│       └── changisha-sms-listener.ts        # SMS queue listener
├── tests/
│   └── changisha.test.ts                    # Unit tests (10 tests)
└── CHANGISHA_PHASE1.md                      # This file
```

---

## Key Invariants

### Data Integrity
- **R5**: Contributions created ONLY from confirmed Daraja callbacks
- **C2**: trans_id MUST be unique; prevents duplicate processing
- **C3**: Contributions are immutable; INSERT-only operations
- **R12**: Replayed callbacks handled idempotently (no duplicate contributions)

### Normalization & Matching
- **I7**: MSISDN normalized to 254-prefix on receipt
- **R6**: Pledge matching via phone number, not amount heuristics
- **R8**: No over-allocation beyond pledged amount

### Exception Handling
- **R7**: Unmatched contributions create exception records
- **R4**: AccountReference validated (≤12 chars)

### Audit & Security
- **A6**: All state changes logged to core.audit_events
- **S1**: SMS dispatch via shared dispatcher via PostgreSQL NOTIFY
- **S2**: Receipt SMS includes campaign title, amount, reference
- **P2**: RLS policies enforce tenant isolation

---

## Migrations

### Migration 001: changisha_foundation.sql

Creates core tables:
- `changisha.campaigns` — Campaign definitions
- `changisha.pledges` — Donor pledges
- `changisha.payment_events` — Raw Daraja payloads (replay detection)
- `changisha.contributions` — Immutable contribution ledger
- `changisha.allocations` — Pledge-to-contribution mapping
- `changisha.exceptions` — Unmatched/invalid contributions
- `changisha.collection_instruments` — Payment collection settings

**Indexes:**
- `trans_id` on payment_events and contributions (uniqueness + replay detection)
- `reference_code` on contributions (pledge matching)
- `campaign_id` on all tables (tenant isolation via campaign)

**RLS Policies:**
- Tenant isolation: Can only access own campaigns and related records
- Public read: Open campaigns visible to anon users

### Migration 002: changisha_rpc.sql

Creates `changisha.process_contribution()` RPC:
- **Input**: campaign_id, trans_id, phone, amount, payload, checkout_request_id
- **Output**: success, contribution_id, reference_code, pledge_id, allocated_amount, exception_id, error_message
- **Execution**: 500ms target, SECURITY DEFINER with auth.uid() verification

**Phases:**
1. Validate campaign exists and is open
2. Extract and validate AccountReference
3. Normalize MSISDN
4. Detect replay via payment_events
5. Create payment_events record
6. Create contribution record
7. Match to pledge via phone
8. Emit audit log
9. Queue SMS
10. Return success/error

---

## API Routes

### POST /api/changisha/webhook/daraja

**Purpose:** Receive Daraja C2B callbacks

**Headers:**
```
x-daraja-signature: <HMAC-SHA256 signature>
x-campaign-id: <campaign_id>
```

**Request Body:**
```json
{
  "Result": {
    "TransactionID": "RD2K23E6SJ3",
    "ResultCode": 0,
    "ResultDesc": "The service request has been processed successfully."
  },
  "MSISDN": "254712345678",
  "Amount": "500",
  "AccountReference": "TST0000001",
  "CheckoutRequestID": "..."
}
```

**Response:**
```json
{
  "status": "received",
  "trans_id": "RD2K23E6SJ3",
  "contribution_id": 12345,
  "success": true,
  "message": "Contribution processed"
}
```

**Status Codes:**
- `200` — Always returned (even on errors) to prevent Daraja retries
- `401` — Invalid signature
- `400` — Missing required fields

### GET /api/changisha/webhook/daraja

**Purpose:** Health check

**Response:**
```json
{
  "status": "healthy",
  "endpoint": "/api/changisha/webhook/daraja",
  "timestamp": "2026-09-12T12:00:00Z"
}
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Daraja (Safaricom)
DARAJA_SECRET_KEY=your_daraja_secret_from_safaricom
DARAJA_SANDBOX_MODE=true  # Set to false in production

# SMS Provider (Phase 2)
SMS_PROVIDER=safaricom  # Or twilio, aws_sns, etc.
SMS_API_KEY=your_sms_api_key
```

---

## Testing

### Unit Tests

```bash
npm run test -- tests/changisha.test.ts
```

**Coverage:**
- ✓ R5: Contributions from Daraja callbacks
- ✓ C2: trans_id uniqueness
- ✓ I7: MSISDN normalization
- ✓ R12: Replay detection
- ✓ R6: Pledge matching
- ✓ R8: No over-allocation
- ✓ A6: Audit logging
- ✓ R7: Exception handling

**Expected Output:**
```
PASS tests/changisha.test.ts (10 tests)
  ✓ Invariant R5: Contributions from Daraja callbacks (1 test)
  ✓ Invariant C2: trans_id uniqueness (1 test)
  ✓ Invariant I7: MSISDN normalization (2 tests)
  ✓ Invariant R12: Replay detection (1 test)
  ✓ Invariant R6: Pledge matching (2 tests)
  ✓ Invariant R8: No over-allocation (1 test)
  ✓ Invariant A6: Audit logging (1 test)
  ✓ Invariant R7: Exception handling (1 test)

Tests: 10 passed, 10 total
```

### Manual Webhook Test

```bash
# Test against local dev server
curl -X POST http://localhost:3000/api/changisha/webhook/daraja \
  -H "Content-Type: application/json" \
  -H "x-campaign-id: 1" \
  -H "x-daraja-signature: $(echo -n '...' | openssl dgst -sha256 -hmac 'test_secret' -hex | cut -d' ' -f2)" \
  -d '{
    "Result": {
      "TransactionID": "TEST123",
      "ResultCode": 0
    },
    "MSISDN": "254712345678",
    "Amount": "500",
    "AccountReference": "TST0000001"
  }'
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All unit tests passing (10/10)
- [ ] All integration tests passing (5/5)
- [ ] RPC compiles without errors
- [ ] Migration runs idempotently on staging
- [ ] Daraja webhook route tested with sandbox credentials
- [ ] SMS listener running and receiving notifications
- [ ] No console warnings or errors
- [ ] Code reviewed (minimum 1 LGTM)
- [ ] Daraja signature validation tested
- [ ] Replay detection tested with manual callback replay
- [ ] Audit logs verified for all critical paths

### Staging Deployment

```bash
# 1. Deploy migrations
supabase migration up

# 2. Deploy Next.js app
npm run build
npm run start

# 3. Start SMS listener (if applicable)
node lib/services/changisha-sms-listener.ts

# 4. Smoke tests
npm run test:changisha

# 5. Manual Daraja sandbox test
curl -X POST http://localhost:3000/api/changisha/webhook/daraja \
  -H "x-campaign-id: 1" \
  -H "x-daraja-signature: ..." \
  -d '{ ... }'

# 6. Verify contributions created
psql $DATABASE_URL -c "SELECT COUNT(*) FROM changisha.contributions;"
```

### Production Deployment

```bash
# 1. Backup production database
pg_dump $PRODUCTION_DATABASE_URL > changisha-backup-$(date +%s).sql

# 2. Deploy migrations (test idempotency first)
supabase migration up --db-url $PRODUCTION_DATABASE_URL

# 3. Deploy Next.js
npm run build
vercel deploy --prod

# 4. Start SMS listener with auto-restart
pm2 start lib/services/changisha-sms-listener.ts \
  --name changisha-sms \
  --instances 1 \
  --autorestart \
  --max-memory-restart 512M

# 5. Verify webhook endpoint
curl -X GET https://api.example.com/health/changisha

# 6. Monitor logs
pm2 logs changisha-sms
tail -f /var/log/application.log
```

### Rollback Plan

If critical issue discovered:

```bash
# 1. Revert Next.js deployment
vercel rollback

# 2. Stop SMS listener
pm2 stop changisha-sms

# 3. Revert migrations (only if data corruption)
psql $PRODUCTION_DATABASE_URL -f changisha-backup-[timestamp].sql

# 4. Notify on-call team
```

---

## Acceptance Criteria (Phase 1 Gate)

### Requirement: Daraja Webhook Handler
- [ ] POST `/api/changisha/webhook/daraja` accepts Daraja C2B payload
- [ ] Signature validation works (production + sandbox)
- [ ] Route returns HTTP 200 regardless of processing outcome
- [ ] Errors logged, not exposed to client

### Requirement: Contribution Creation
- [ ] Contribution record created for each valid Daraja callback
- [ ] `trans_id` is unique and prevents duplicates
- [ ] `reference_code` extracted from AccountReference field
- [ ] `initiator_msisdn` is normalized to 254-prefix format
- [ ] Amount is stored as NUMERIC with 2 decimal places

### Requirement: Pledge Matching
- [ ] Contributions matched to pledges via phone number
- [ ] Allocations created with correct amounts
- [ ] Over-allocation prevention working
- [ ] Unmatched contributions create exception records

### Requirement: Replay Protection
- [ ] Replayed Daraja callbacks are detected via `trans_id`
- [ ] Replay results in idempotent response (no new contribution)
- [ ] `payment_events.is_replay` flag set correctly

### Requirement: Audit Logging
- [ ] Every contribution generates an audit_events entry
- [ ] Audit entries include campaign ID, amount, trans_id
- [ ] Audit entries are queryable and complete

### Requirement: Exception Handling
- [ ] Unmatched contributions land in exceptions table
- [ ] Exception type is `unmatched_msisdn` for phone mismatches
- [ ] Exception status is `open` and resolvable by admin

### Requirement: SMS Queueing
- [ ] RPC notifies SMS listener on contribution success
- [ ] SMS listener receives event payload correctly
- [ ] SMS composition includes campaign title, amount, reference

### Requirement: Security
- [ ] No PII exposed on public layers
- [ ] RLS policies enforce tenant isolation
- [ ] Daraja payload not exposed to client
- [ ] MSISDN never logged in plaintext outside audit trail

### Requirement: Performance
- [ ] Webhook handler responds within 1s
- [ ] RPC completes within 500ms
- [ ] Database indexes on trans_id, reference_code, campaign_id effective

---

## Success Signal: Week 4, Friday

- ✅ 100 sandbox transactions processed correctly
- ✅ 0 duplicate contributions from replays
- ✅ 0 silent failures
- ✅ All logs clean (no warnings)
- ✅ SMS receipts dispatched and logged
- ✅ Audit trail complete and queryable
- ✅ Production deployment stable 24h

→ **Phase 1 complete. Phase 2 (Pledge & SMS) begins Monday.**

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Daraja AccountReference > 12 chars | HIGH | Verify with Safaricom pre-deploy. Hard-limit in RPC. |
| Replay detection race condition | MEDIUM | PostgreSQL UNIQUE constraint enforced at row level. ON CONFLICT clause handles concurrent inserts. |
| SMS listener crashes silently | MEDIUM | PM2 auto-restart + monitoring. Alert on process restart. |
| Audit log fills database | LOW | Retention policy (60 days, then archive). Index on created_at. |
| Phone normalization fails silently | MEDIUM | Validation in RPC; exceptions created. Test with various formats. |

---

## Troubleshooting

### Webhook not receiving callbacks

1. Check Daraja configuration
2. Verify webhook URL is publicly accessible
3. Check firewall/security group rules
4. Enable debug logging: `DEBUG=changisha:* npm run dev`
5. Test manually: `curl -X POST http://localhost:3000/api/changisha/webhook/daraja ...`

### SMS not being sent

1. Check SMS listener is running: `pm2 logs changisha-sms`
2. Verify SMS provider credentials in `.env.local`
3. Check PostgreSQL NOTIFY channel: `LISTEN changisha_sms_queue;`
4. Verify audit_events has SMS records

### High RPC latency

1. Check database connection pool
2. Verify indexes exist: `\d changisha.payment_events`
3. Monitor RPC execution time: `SELECT * FROM pg_stat_statements;`
4. Profile slow queries: `EXPLAIN ANALYZE SELECT ...`

### Duplicate contributions despite trans_id check

1. Verify UNIQUE constraint exists: `\d changisha.payment_events`
2. Check for concurrent RPC calls with same trans_id
3. Verify ON CONFLICT clause in migration 002
4. Test replay detection: `SELECT COUNT(*) FROM changisha.contributions WHERE trans_id = 'X';`

---

## Next Steps (Phase 2)

- [ ] SMS dispatcher integration (Safaricom/Twilio)
- [ ] Admin UI for exception resolution
- [ ] Pledge management dashboard
- [ ] Campaign reporting & analytics
- [ ] Settlement reconciliation

---

## Support

For questions or issues:
1. Check this guide's Troubleshooting section
2. Review test logs: `npm run test:changisha`
3. Inspect database records
4. Contact: [support@ezzahcomm.com](mailto:support@ezzahcomm.com)

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-12  
**Maintained by:** EZZAHCOMM NEXUS AI
