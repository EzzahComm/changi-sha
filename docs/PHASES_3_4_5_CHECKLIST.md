# Changisha Phases 3–5: Admin, Public Pages & Settlements — Implementation Checklist

---

# PHASE 3: Admin & Workbench (Weeks 9–12)

## Objective
Build the exception workbench, campaign dashboard, and settlement reconciliation UI. Tenants can view campaigns, resolve exceptions, and track settlement status.

---

## Week 9: Admin Dashboard

### Campaign Dashboard
- [ ] Route: `app/admin/campaigns/page.tsx`
  - List all campaigns with status, target, current, pledge count, contribution count
  - Real-time stats: SUM(contributions.amount), COUNT(pledges), COUNT(contributions)
  - Actions: View, Edit, Close campaign
  - Search & filter by status, date range

### Exception Workbench
- [ ] Route: `app/admin/exceptions/page.tsx`
  - List open exceptions: unmatched_msisdn, overpaid_pledge, invalid_amount
  - For each exception: contribution details, suggested pledge matches
  - Dropdown to select pledge for manual allocation
  - Button to create allocation + mark exception resolved
  - Audit log entry for manual resolution

### Settlement Reconciliation
- [ ] Route: `app/admin/settlement/page.tsx`
  - Closed campaigns with settlement summary
  - Expected (SUM contributions), Received (from PSP), Discrepancy
  - Status: reconciled, pending, disputed
  - Drill-down: view individual contributions & settlement references

### Audit Log Viewer
- [ ] Route: `app/admin/audit/page.tsx`
  - Filter by event type: contributions, pledges, SMS, consents, allocations
  - Timeline view with metadata
  - Search by resource ID
  - Export to CSV

---

## Week 10: Tests & Integration

### Unit Tests
- [ ] Dashboard stats queries correct
- [ ] Exception allocation creates audit entries
- [ ] Settlement reconciliation math correct
- [ ] Audit log queries paginated and searchable

### Deployment (Week 10)
- [ ] All admin tests passing
- [ ] Admin routes protected by RLS (tenant isolation verified)
- [ ] Deploy to staging & production
- [ ] Verify admin dashboard shows correct data

---

# PHASE 4: Public Pages & Share (Weeks 13–16)

## Objective
Build unauthenticated, ISR-cached public campaign pages with social share, real-time contribution tracker, and public pledge board.

---

## Week 13: Public Campaign Pages

### Public Campaign Landing
- [ ] Route: `app/campaigns/[slug]/page.tsx` (ISR, revalidate: 60)
  - Campaign title, narrative, beneficiary story
  - Target amount & progress bar
  - Pledge count & total contributions
  - "Pledge Now" button
  - Beneficiary photo/video if available

### Share & Social Preview
- [ ] Meta tags: og:title, og:description, og:image, twitter:card
- [ ] Share buttons: WhatsApp, SMS, copy link
- [ ] QR code to pledge form
- [ ] SMS share template (Swahili)

### Public Pledge Board
- [ ] Route: `app/campaigns/[slug]/pledges` (ISR)
  - List of public pledges: name (masked), amount, date
  - Filter by: amount range, date range
  - Sort by: newest, highest, oldest
  - Total pledges count

### Real-Time Contribution Tracker
- [ ] Supabase Realtime subscription: contributions > amount_updated
- [ ] Live update of progress bar, contribution count
- [ ] Live update of "Top Contributor" leaderboard (if enabled)

---

## Week 14: Tests & Deployment

### Pre-Deployment
- [ ] ISR revalidation works (schedule, on-demand trigger)
- [ ] Social meta tags render correctly
- [ ] Public pledges don't expose private PII
- [ ] Real-time updates work without auth
- [ ] Performance: FCP < 2s, LCP < 2.5s

### Production Deployment
- [ ] Deploy public pages to Vercel (ISR + CDN caching)
- [ ] Monitor cache hit rate
- [ ] Verify share links work across platforms

---

# PHASE 5: Reconciliation & Settlements (Weeks 17–20)

## Objective
Build settlement payouts, provider reconciliation job, refund flow, and Account Credit system.

---

## Week 17: Settlement Payout

### RPC: Process Settlement
- [ ] RPC: `changisha.process_settlement()`
  - Input: campaign_id
  - Sum all contributions (expected)
  - Fetch settlement from provider (Daraja/Paystack)
  - Reconcile: expected vs. received
  - Flag discrepancies
  - Create settlement_batches record
  - Trigger payout to organization account
  - Log to audit

### Settlement Batch Table
- [ ] Schema migration: `settlement_batches`
  - campaign_id, expected, received, discrepancy, status
  - payout_reference, payout_timestamp
  - reconciliation_notes

---

## Week 18: Reconciliation Job

### Daily Reconciliation Job
- [ ] Job: `packages/reconciliation/src/daily-reconciliation.ts`
  - Query all settled campaigns
  - Fetch settlement reports from Daraja/Paystack
  - Compare expected vs. received
  - Flag variances > 0
  - Alert on-call if discrepancy
  - Log reconciliation status

### Account Credit System
- [ ] Schema: `account_credits`
  - tenant_id, balance, currency
  - Debit on SMS dispatch (from reminder job)
  - Credit on top-up (payment or manual)
  - Audit trail for all transactions
- [ ] SMS dispatch checks balance before sending

---

## Week 19: Refunds

### RPC: Create Refund
- [ ] RPC: `changisha.create_refund()`
  - Input: contribution_id, refund_reason
  - Validate: contribution not already refunded
  - Call provider API to initiate refund
  - Create refund_requests record
  - Update contribution status to "refunded"
  - Notify donor via SMS

### Refund Tracking Table
- [ ] Schema: `refund_requests`
  - contribution_id, refund_reason, status
  - provider_refund_id, created_at, completed_at

---

## Week 20: Tests, Deploy & Wrap-Up

### Tests
- [ ] Settlement payout calculation correct
- [ ] Reconciliation identifies discrepancies
- [ ] Account Credit balance enforced
- [ ] Refunds create audit entries
- [ ] Email alerts on reconciliation issues

### Deployment
- [ ] All Phase 5 tests passing
- [ ] Deploy jobs to production (systemd or Cloud Tasks)
- [ ] Monitor reconciliation job daily
- [ ] Verify refund flow end-to-end
- [ ] Phase 1-5 complete ✅

---

## Success Signals

### Phase 3 (Admin)
- ✅ Admin dashboard shows all campaigns with correct stats
- ✅ Exception workbench resolves 10 test exceptions
- ✅ Settlement reconciliation shows correct discrepancies
- ✅ Audit log queryable & searchable

### Phase 4 (Public)
- ✅ Public campaign page loads < 2s (ISR cached)
- ✅ Social shares render meta tags correctly
- ✅ Real-time contribution tracker updates live
- ✅ Public pledge board shows 10+ pledges masked correctly

### Phase 5 (Settlements)
- ✅ Settlement payout calculated correctly
- ✅ Daily reconciliation job runs without errors
- ✅ Account Credit balance enforced
- ✅ Refund flow completes end-to-end
- ✅ All systems stable 24h in production

---

## Post-Launch (Phase 6+)

- [ ] Kitabu Yetu API integration (webhook events)
- [ ] Multi-currency support
- [ ] Advanced analytics & reporting
- [ ] Mobile app (React Native)
- [ ] White-label tenants

---

## Master Timeline

| Week | Phase | Deliverable | Gate |
|---|---|---|---|
| 1-4 | 1 | Daraja webhook, contribution ledger | ✅ Production stable |
| 5-8 | 2 | Pledge management, SMS reminders | ✅ 20 pledges, 0 SMS failures |
| 9-12 | 3 | Admin dashboard, exception workbench | ✅ 10 exceptions resolved |
| 13-16 | 4 | Public pages, real-time tracker | ✅ ISR caching working |
| 17-20 | 5 | Settlements, reconciliation, refunds | ✅ Production stable |

---

**Total Implementation Time:** 20 weeks  
**Total LOC (all phases):** ~15,000  
**Total Files:** 50+  
**Core Invariants:** 50+
