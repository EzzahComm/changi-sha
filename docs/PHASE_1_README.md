# Changisha Phase 1: Immutable Contribution Ledger

**Objective:** Build the Daraja webhook handler, contribution creation RPC, exception queue, and audit logging for Changisha.

**Timeline:** Weeks 1–4 (Foundation → Testing → Deployment)

**Deliverable:** Production-ready contribution ledger that processes 100 test M-Pesa transactions with 0 duplicates, 0 silent failures, and complete audit trail.

---

## Architecture at a Glance

```
┌─────────────────────┐
│   Daraja M-Pesa     │ ← Initiator sends STK Push
└────────┬────────────┘
         │ (C2B Callback)
         ↓
┌─────────────────────────────────────────┐
│  Next.js Webhook: /api/changisha/webhook/daraja
│  ├─ Validate signature
│  ├─ Replay detection (trans_id UNIQUE)
│  ├─ Call changisha.process_contribution() RPC
│  └─ Return HTTP 200 (idempotent)
└────────┬────────────────────────────────┘
         │ (RPC transaction)
         ↓
┌──────────────────────────────────────────────┐
│  PostgreSQL RPC: changisha.process_contribution()
│  ├─ Validate campaign (open + within window)
│  ├─ Insert into payment_events (raw payload)
│  ├─ Insert into contributions (immutable ledger)
│  ├─ Match pledge via phone
│  ├─ Insert into allocations
│  ├─ Create exceptions if unmatched
│  ├─ Log audit_events
│  └─ Queue SMS via pg_notify
└────────┬───────────────────────────────────┘
         │ (Async SMS dispatch)
         ↓
┌──────────────────────────┐
│  SMS Listener Process
│  ├─ Poll pg_notify queue
│  ├─ Compose receipt SMS
│  ├─ Dispatch to SMS provider
│  └─ Log SMS_sent or SMS_failed
└──────────────────────────┘
```

---

## File Structure

```
D:\Claude\changi-sha\
├── supabase/
│   ├── migrations/
│   │   └── 20260212_001_changisha_foundation.sql    # Schema + RLS + indexes
│   └── functions/
│       └── changisha_process_contribution.sql       # Core RPC function
├── app/
│   └── api/changisha/webhook/daraja/
│       └── route.ts                                  # Webhook handler
├── packages/sms-listener/
│   └── src/
│       └── changisha-listener.ts                     # SMS queue listener
├── tests/
│   └── changisha/
│       └── changisha.test.ts                         # Unit tests (10 test cases)
├── docs/
│   ├── PHASE_1_CHECKLIST.md                          # Implementation checklist
│   ├── PHASE_1_README.md                             # This file
│   └── architecture.md                               # Overall platform architecture
├── .env.example                                      # Environment template
└── package.json                                      # Main + scripts

```

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Supabase account (free tier OK)
- Daraja sandbox credentials from Safaricom
- (Optional) Twilio/AfricasTalking account for SMS

### 2. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in your credentials in .env.local
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=...
# DARAJA_CONSUMER_KEY=...
# etc.
```

### 3. Run Migrations

```bash
# Create the schema, tables, RLS policies, and indexes
supabase migration up

# Verify tables in Supabase dashboard:
# - changisha.campaigns
# - changisha.pledges
# - changisha.payment_events
# - changisha.contributions
# - changisha.allocations
# - changisha.exceptions
```

### 4. Deploy RPC Function

```bash
# The RPC is included in the migration, but can also be deployed separately:
# 1. Copy supabase/functions/changisha_process_contribution.sql
# 2. Paste into Supabase SQL editor → Run
# 3. Verify in Functions tab
```

### 5. Start Development Server

```bash
npm run dev

# Server running at http://localhost:3000
# Webhook ready at http://localhost:3000/api/changisha/webhook/daraja
```

### 6. Test Webhook Locally

```bash
# Send a test Daraja callback
curl -X POST http://localhost:3000/api/changisha/webhook/daraja \
  -H "Content-Type: application/json" \
  -H "x-campaign-id: 1" \
  -d '{
    "Result": {
      "TransactionID": "TEST123",
      "ResultCode": 0
    },
    "MSISDN": "254712345678",
    "TransAmount": "500",
    "AccountReference": "TST0000001",
    "Names": "Test User"
  }'

# Expected response:
# {
#   "status": "received",
#   "trans_id": "TEST123",
#   "contribution_id": 1,
#   "success": true
# }
```

### 7. Run Tests

```bash
# Unit tests
npm run test:changisha

# E2E tests (requires staging database)
npm run test:e2e

# Watch mode
npm run test:changisha -- --watch
```

---

## Key Invariants

| Code | Invariant | Verification |
|---|---|---|
| **R5** | Contributions created only from confirmed Daraja callbacks | RPC is single entry point; contributions never created elsewhere |
| **C2** | trans_id MUST be unique | UNIQUE constraint + UNIQUE index on payment_events.trans_id |
| **R12** | Replayed callbacks are idempotent (no new contribution) | payment_events.is_replay flag; ON CONFLICT handling |
| **I7** | MSISDN normalized to 254-prefix format | 07x → 254x conversion in RPC; validation enforced |
| **R6** | Pledge matching via phone number, not amount heuristics | Query: WHERE pledger_phone = normalized_msisdn |
| **R8** | No over-allocation (allocated ≤ pledged) | LEAST(contribution_amount, pledge_amount) |
| **R7** | Unmatched → exception (not silent) | INSERT into exceptions if no pledge found |
| **A6** | All state changes audited | core.log_audit_event() called for every contribution |

---

## Testing Strategy

### Unit Tests (10 test cases)
- ✅ Contribution creation from valid RPC
- ✅ trans_id uniqueness (no duplicates)
- ✅ Replay detection (idempotent)
- ✅ MSISDN normalization (07x → 254x)
- ✅ Pledge matching (phone-based)
- ✅ No over-allocation (capped at pledged)
- ✅ Audit logging (events created)
- ✅ Exception creation (unmatched pledges)
- ✅ Invalid AccountReference rejection
- ✅ Invalid MSISDN rejection

Run with: `npm run test:changisha`

### Integration Tests
- Campaign → Pledge → Webhook → Contribution full flow
- Replay detection with concurrent requests
- Exception handling and resolution

Run with: `npm run test:e2e`

### Manual Sandbox Tests
1. Request Daraja sandbox credentials
2. Perform 100 test STK Push → callback flows
3. Verify 0 duplicates
4. Verify 0 PII in logs
5. Verify all errors logged

---

## Deployment

### Staging

```bash
# Deploy migrations
supabase migration up --db-url $STAGING_DATABASE_URL

# Deploy app
vercel deploy --prod --env staging

# Deploy SMS listener
pm2 start packages/sms-listener/dist/changisha-listener.js \
  --name changisha-sms-staging

# Run smoke tests
npm run test:smoke:changisha
```

### Production

```bash
# Backup database
pg_dump $PRODUCTION_DATABASE_URL > changisha-backup-$(date +%s).sql

# Deploy migrations
supabase migration up --db-url $PRODUCTION_DATABASE_URL

# Deploy app
vercel deploy --prod

# Deploy SMS listener with auto-restart
pm2 start packages/sms-listener/dist/changisha-listener.js \
  --name changisha-sms \
  --instances max \
  --autorestart \
  --max-memory-restart 512M

# Monitor
pm2 logs changisha-sms
tail -f $VERCEL_LOGS
```

### Rollback

```bash
# Revert app
vercel rollback

# Stop SMS listener
pm2 stop changisha-sms

# Restore database (if needed)
psql $PRODUCTION_DATABASE_URL -f changisha-backup-[timestamp].sql
```

---

## Security Checklist

- [x] Daraja callback signature validated (HMAC-SHA256)
- [x] No card data stored (Daraja is PCI-DSS compliant)
- [x] MSISDN never logged in plaintext
- [x] RLS policies enforce tenant isolation
- [x] Service Role key never exposed to client
- [x] Replay detection prevents double-crediting
- [x] All errors logged with context (no silent failures)
- [x] Audit trail complete and queryable

---

## Troubleshooting

### Webhook returns 400: Missing required fields
- Verify payload includes: `Result.TransactionID`, `MSISDN`, `TransAmount`
- Verify header includes: `x-campaign-id`

### Webhook returns 401: Invalid signature
- In development, set `SKIP_DARAJA_SIGNATURE=true` in `.env.local`
- In production, verify `DARAJA_CONSUMER_SECRET` matches Safaricom credentials

### RPC returns error: Campaign not found or not open
- Verify campaign ID is correct
- Verify campaign status is 'open'
- Verify current time is between opens_at and closes_at

### SMS not sending
- Check SMS listener is running: `pm2 status changisha-sms`
- Check SMS provider credentials: `TWILIO_ACCOUNT_SID`, etc.
- Check logs: `pm2 logs changisha-sms`

### Tests fail with "Supabase connection error"
- Verify `.env.local` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify Supabase project is running (check dashboard)
- Verify network connectivity

---

## Useful Links

- [Daraja Documentation](https://developer.safaricom.co.ke/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)

---

## Next Steps (Phase 2)

After Phase 1 is deployed:
- [ ] Build Campaign UI (create, edit, publish)
- [ ] Build Pledge UI (create, view, manage)
- [ ] Build Admin Dashboard (contributions, exceptions, settlements)
- [ ] Integrate settlement payout (sweep contributions to organization account)
- [ ] Multi-language SMS templates
- [ ] Refund flow (provider + RPC)

---

**Questions?** Check `PHASE_1_CHECKLIST.md` for detailed implementation steps.
