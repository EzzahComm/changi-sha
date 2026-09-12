# Changisha Phase 1: Quick Start

Get up and running with Phase 1 in 15 minutes.

---

## Step 1: Prerequisites (2 min)

```bash
# Verify Node.js 18+
node --version

# Clone or navigate to repo
cd D:\Claude\changi-sha

# Verify git
git status
```

---

## Step 2: Install & Configure (3 min)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL: Get from Supabase dashboard
# - SUPABASE_SERVICE_ROLE_KEY: Get from Supabase > Settings > API Keys
# - DARAJA_CONSUMER_KEY: Get from Safaricom Daraja
# - DARAJA_CONSUMER_SECRET: Get from Safaricom Daraja

# For local development, you can skip signature validation:
# - SKIP_DARAJA_SIGNATURE=true
```

---

## Step 3: Database Schema (5 min)

```bash
# Run migrations to set up Changisha schema
supabase migration up

# Verify tables were created. Go to:
# Supabase Dashboard > SQL Editor > Run this query:
# SELECT table_name FROM information_schema.tables WHERE table_schema = 'changisha';

# Expected output:
# campaigns
# collection_instruments
# pledges
# payment_events
# contributions
# allocations
# exceptions
```

---

## Step 4: Deploy RPC Function (2 min)

```bash
# The RPC is deployed with the migration, but verify it exists:
# Supabase Dashboard > Functions > Look for: changisha.process_contribution()

# Or test it via SQL Editor:
SELECT changisha.process_contribution(
  1,                    -- campaign_id
  'TEST_ID_123',        -- trans_id
  '0712345678',         -- initiator_msisdn
  'Test User',          -- initiator_name
  500,                  -- amount
  '{"test": true}'::jsonb,  -- payload
  NULL                  -- checkout_request_id
);
```

---

## Step 5: Start Dev Server (1 min)

```bash
npm run dev

# Server should start at http://localhost:3000
# You should see no errors in the terminal
```

---

## Step 6: Test Webhook (2 min)

In a new terminal:

```bash
# Send a test Daraja callback
curl -X POST http://localhost:3000/api/changisha/webhook/daraja \
  -H "Content-Type: application/json" \
  -H "x-campaign-id: 1" \
  -d '{
    "Result": {
      "TransactionID": "TEST_WEBHOOK_001",
      "ResultCode": 0
    },
    "MSISDN": "254712345678",
    "TransAmount": "500",
    "AccountReference": "TEST0000001",
    "Names": "Test User"
  }'

# Expected response (HTTP 200):
# {
#   "status": "received",
#   "trans_id": "TEST_WEBHOOK_001",
#   "contribution_id": 1,
#   "success": true
# }
```

---

## Step 7: Run Tests (3 min)

```bash
npm run test:changisha

# Expected: All tests pass (10/10)
# ✓ Invariant R5: Contributions from Daraja callbacks only
# ✓ Invariant C2: trans_id uniqueness
# ✓ Invariant R12: Replay detection
# ... etc
```

---

## Step 8: Verify Database (1 min)

Go to **Supabase Dashboard > SQL Editor** and run:

```sql
-- View contributions created
SELECT id, trans_id, amount, reference_code, allocation_status
FROM changisha.contributions
ORDER BY created_at DESC
LIMIT 5;

-- View exceptions (if any)
SELECT id, exception_type, description, status
FROM changisha.exceptions
ORDER BY created_at DESC
LIMIT 5;

-- View audit trail
SELECT event_type, resource_type, resource_id, created_at
FROM core.audit_events
WHERE resource_type = 'changisha.contributions'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Common Issues & Fixes

### Supabase connection error
```
Error: connect ECONNREFUSED
```
→ Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
→ Check Supabase project is running (visit dashboard)

### Migration fails
```
Error: relation "changisha.campaigns" already exists
```
→ Migrations are idempotent. Safe to re-run.
→ If stuck, drop the schema: `DROP SCHEMA changisha CASCADE;` then re-run

### Webhook returns 400: Missing required fields
→ Verify curl command includes all required fields: `TransactionID`, `MSISDN`, `TransAmount`
→ Verify header includes: `x-campaign-id`

### Tests fail with "Campaign not found"
→ Verify test creates campaign in `beforeEach` hook
→ Check test database has correct permissions (RLS policies)

---

## Next Steps

1. **Create a test campaign:** Go to Supabase > SQL Editor > Insert test data
   ```sql
   INSERT INTO changisha.campaigns (tenant_id, slug, title, narrative, target_amount, ref_prefix, opens_at, closes_at, created_by, status)
   VALUES (1, 'test-campaign', 'Test Campaign', 'Test', 10000, 'TST', now(), now() + '7 days', 1, 'open');
   ```

2. **Create a test pledge:**
   ```sql
   INSERT INTO changisha.pledges (campaign_id, pledger_name, pledger_phone, pledged_amount)
   VALUES (1, 'John Doe', '254712345678', 1000);
   ```

3. **Test the webhook with real campaign/pledge IDs**

4. **Review logs in Vercel dashboard** (after deployment)

5. **Read `PHASE_1_CHECKLIST.md`** for detailed implementation steps

---

## Need Help?

- **Architecture questions?** → See `docs/architecture.md`
- **Phase 1 overview?** → See `docs/PHASE_1_README.md`
- **Detailed checklist?** → See `docs/PHASE_1_CHECKLIST.md`
- **Webhook not working?** → Check `app/api/changisha/webhook/daraja/route.ts`
- **RPC not working?** → Check `supabase/functions/changisha_process_contribution.sql`

---

## Production Domain

**Public URL:** `https://changisha.kitabuyetu.co.ke`

This is where Changisha will be deployed. Use this domain for:
- Social share links (Phase 4)
- API integrations (Phase 5+)
- Daraja webhook callbacks (Phase 1)

For **local testing**, use `http://localhost:3000`

## Celebration 🎉

You've successfully:
- ✅ Set up Supabase
- ✅ Created Changisha schema
- ✅ Deployed RPC
- ✅ Built webhook handler
- ✅ Passed all tests
- ✅ Created contribution records

**Now:** Continue with `PHASE_1_CHECKLIST.md` to finish Phase 1 implementation.
