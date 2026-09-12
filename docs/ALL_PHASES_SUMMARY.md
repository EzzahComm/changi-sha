# Changisha: Complete Implementation Plan — All Phases (1-5)

**Version:** 2.0  
**Total Timeline:** 20 weeks  
**Total LOC (all phases):** ~15,000  
**Platform:** Next.js 16 + Supabase PostgreSQL + Daraja M-Pesa

---

## Executive Summary

Changisha is a **fundraising & payments platform** for group organizations (chamas) in Kenya. Over 20 weeks, we'll build an immutable contribution ledger, pledge management system, exception handling, admin dashboard, public sharing pages, and automated settlements.

**Each phase is independently deployable and adds cumulative value.**

---

## Phase-by-Phase Overview

### ✅ PHASE 1: Immutable Contribution Ledger (Weeks 1–4)

**Deliverable:** Daraja webhook → contribution creation → exception queue → audit logging

**Key Features:**
- Daraja M-Pesa C2B callback handler
- Contribution ledger (append-only, immutable)
- Replay detection (trans_id UNIQUE)
- Pledge matching (phone-based)
- Exception queue (5 types, resolvable)
- Audit trail (complete history)
- SMS receipt queue

**Success Criteria:**
- 100 sandbox transactions → 100 contributions
- 0 duplicates from replayed callbacks
- 0 silent failures

**Files Scaffolded:** 12 (3,200 LOC)

**Status:** ✅ **COMPLETE - Ready to implement**

---

### PHASE 2: Pledge & Notification (Weeks 5–8)

**Deliverable:** Self-service pledge creation + SMS reminders + DPA 2019 consent

**Key Features:**
- Pledge creation form (web + bulk CSV import)
- MSISDN normalization & validation
- DPA 2019 consent capture (method, IP, user agent, 12-month expiry)
- Pledge status computation (pending → fulfilled → overdue)
- SMS reminder job (every 6 hours)
- Reminder count tracking
- Swahili SMS templates

**Success Criteria:**
- 20 pledges created via web form
- All have valid consent
- Reminder job runs without errors

**Files to Create:** 10+ (2,000 LOC)

**Status:** 🟡 **Partially scaffolded - ready to implement**

---

### PHASE 3: Admin & Workbench (Weeks 9–12)

**Deliverable:** Campaign dashboard + exception workbench + settlement reconciliation

**Key Features:**
- Campaign dashboard (status, target, current, pledge count)
- Exception workbench (manual allocation of unmatched contributions)
- Settlement reconciliation (expected vs. received)
- Audit log viewer (timeline, search, export)
- Admin RLS policies (tenant isolation)

**Success Criteria:**
- 10 exceptions resolved manually
- Dashboard stats correct
- Settlement discrepancies identified

**Files to Create:** 12+ (2,500 LOC)

**Status:** 🟡 **Spec complete - scaffolding needed**

---

### PHASE 4: Public Pages & Share (Weeks 13–16)

**Deliverable:** ISR-cached public campaign pages + social share + real-time tracker

**Key Features:**
- Public campaign landing page (ISR, 60s revalidate)
- Social meta tags (og:title, og:image, twitter:card)
- Share buttons (WhatsApp, SMS, copy link)
- QR code to pledge form
- Public pledge board (masked names, sortable)
- Real-time contribution tracker (Supabase Realtime)
- Performance: FCP < 2s, LCP < 2.5s

**Success Criteria:**
- Public page loads cached in < 2s
- Share links work on WhatsApp + Telegram
- Real-time updates work without auth

**Files to Create:** 8+ (1,500 LOC)

**Status:** 🟡 **Spec complete - scaffolding needed**

---

### PHASE 5: Reconciliation & Settlements (Weeks 17–20)

**Deliverable:** Settlement payout + daily reconciliation job + refund flow + Account Credit

**Key Features:**
- Settlement payout RPC (calculate expected, trigger payout)
- Daily reconciliation job (provider report vs. expected, flag discrepancies)
- Account Credit system (balance-based SMS dispatch)
- Refund flow (donor-initiated or manual)
- Discrepancy alerts (on-call notification)

**Success Criteria:**
- Settlement calculations correct
- Daily reconciliation job runs without errors
- Account Credit balance enforced on SMS
- Refund flow completes end-to-end

**Files to Create:** 12+ (2,500 LOC)

**Status:** 🟡 **Spec complete - scaffolding needed**

---

## File Inventory (Complete)

### Phase 1 (Complete ✅)
```
✅ supabase/migrations/20260212_001_changisha_foundation.sql
✅ supabase/functions/changisha_process_contribution.sql
✅ app/api/changisha/webhook/daraja/route.ts
✅ packages/sms-listener/src/changisha-listener.ts
✅ lib/changisha/phone-utils.ts
✅ tests/changisha/changisha.test.ts
✅ docs/QUICK_START.md, PHASE_1_README.md, PHASE_1_CHECKLIST.md
✅ .env.example
```

### Phase 2 (Scaffolded 🟡)
```
✅ supabase/migrations/20260219_002_phase2_pledge_notification.sql
✅ supabase/functions/phase2_pledge_rpcs.sql
✅ app/campaigns/[id]/pledge/page.tsx
✅ packages/jobs/src/changisha-reminder-job.ts
✅ tests/changisha/phase2.test.ts
✅ docs/PHASE_2_CHECKLIST.md
```

### Phase 3 (Spec + Checklist)
```
🟡 app/admin/campaigns/page.tsx (to scaffold)
🟡 app/admin/exceptions/page.tsx (to scaffold)
🟡 app/admin/settlement/page.tsx (to scaffold)
🟡 app/admin/audit/page.tsx (to scaffold)
🟡 tests/changisha/phase3.test.ts (to scaffold)
✅ docs/PHASES_3_4_5_CHECKLIST.md
```

### Phase 4 (Spec + Checklist)
```
🟡 app/campaigns/[slug]/page.tsx (to scaffold)
🟡 app/campaigns/[slug]/pledges/page.tsx (to scaffold)
🟡 lib/changisha/social-share.ts (to scaffold)
🟡 tests/changisha/phase4.test.ts (to scaffold)
```

### Phase 5 (Spec + Checklist)
```
🟡 supabase/functions/phase5_settlement_rpcs.sql (to scaffold)
🟡 packages/reconciliation/src/daily-reconciliation.ts (to scaffold)
🟡 tests/changisha/phase5.test.ts (to scaffold)
```

---

## Core Invariants (50+)

### Contribution & Ledger (Phase 1)
- **R5:** Contributions created only from confirmed Daraja callbacks
- **C2:** trans_id MUST be unique
- **C3:** Contributions are immutable (append-only)
- **R12:** Replayed callbacks are idempotent

### Pledge & Notification (Phase 2)
- **P1:** Pledge created with amount + phone
- **P2:** Phone unique per campaign
- **P3:** Non-members require explicit consent
- **P4:** Status computed: pending → fulfilled → overdue
- **P5:** Reminders sent only with consent
- **D1:** Consent required before SMS
- **D2:** Consent records method, timestamp, IP, user agent
- **D4:** Consent expires after 12 months

### Admin & Workbench (Phase 3)
- **A5:** Bulk import is idempotent
- **A6:** All state changes audited

### Public & Share (Phase 4)
- **ISR:** Campaign pages cached at edge
- **Perf:** FCP < 2s, LCP < 2.5s

### Settlements (Phase 5)
- **Sett1:** Settlement = SUM(contributions)
- **Recon1:** Daily reconciliation vs. provider
- **Credit1:** SMS debit requires balance

---

## Implementation Path

### Week-by-Week Timeline

| Week | Phase | Focus | Deliverable |
|---|---|---|---|
| 1-2 | P1 | SQL + RPC | Schema + core function |
| 3 | P1 | Webhook | Route + tests |
| 4 | P1 | Deploy | Staging + production |
| 5-6 | P2 | Pledge + Consent | Form + RPC |
| 7-8 | P2 | Reminders + Deploy | Job + production |
| 9-10 | P3 | Dashboard + Workbench | Admin routes |
| 11-12 | P3 | Tests + Deploy | Staging + production |
| 13-14 | P4 | Public pages + Share | ISR + social |
| 15-16 | P4 | Real-time + Deploy | Subscriptions + production |
| 17-18 | P5 | Settlement + Reconciliation | RPC + job |
| 19-20 | P5 | Refunds + Deploy | Flow + production |

---

## Quality Gates

### Per-Phase Gates
- ✅ **Phase 1:** 100 sandbox transactions, 0 duplicates, 0 silent failures
- ✅ **Phase 2:** 20 pledges created, all consented, reminders working
- ✅ **Phase 3:** 10 exceptions resolved, dashboard stats correct
- ✅ **Phase 4:** Public pages cached, share links working
- ✅ **Phase 5:** Settlements reconciled, refunds working

### Overall Gates
- ✅ All tests passing (100+ test cases)
- ✅ No console errors in production
- ✅ Audit trail complete & queryable
- ✅ RLS policies verified (multi-tenant isolation)
- ✅ No PII leaks to public or unauthenticated layers

---

## Tech Stack (Final)

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.3.1 | Web app + API routes |
| **Database** | Supabase PostgreSQL | All data |
| **Auth** | Supabase Auth + RLS | Session + row-level security |
| **Background Jobs** | PM2 + Node.js | Reminders, reconciliation |
| **Real-time** | Supabase Realtime | Live updates (Phase 4) |
| **SMS** | Twilio/AfricasTalking | SMS dispatch |
| **Payment Rails** | Daraja M-Pesa | M-Pesa collection |
| **Deployment** | Vercel + Supabase | Edge + serverless |
| **Monitoring** | Vercel Logs + PM2 | Observability |

---

## Security & Compliance

### Data Protection (DPA 2019)
- ✅ Consent captured with method, timestamp, IP
- ✅ Consent expires after 12 months
- ✅ No SMS without consent
- ✅ Phone numbers E.164 stored, masked on display

### Payment Security
- ✅ Daraja signature validation
- ✅ No card data stored (Hosted checkout only)
- ✅ Replay detection prevents double-crediting
- ✅ Immutable ledger prevents fund loss

### Multi-Tenancy
- ✅ RLS policies enforce tenant isolation
- ✅ Campaign ownership verified
- ✅ No cross-tenant data leaks

### Audit Trail
- ✅ All state changes logged
- ✅ Queryable via admin dashboard
- ✅ Exportable to CSV

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Consent expiration not checked | HIGH | Query with `consent_expires_at > now()` |
| SMS provider unavailable | HIGH | Fallback + retry with exponential backoff |
| Settlement discrepancy unnoticed | HIGH | Daily reconciliation + alerts |
| Admin dashboard stats stale | MEDIUM | Query computed views + caching |
| Real-time updates lag | MEDIUM | Supabase Realtime + polling fallback |

---

## Success Signals: Week 20, Friday

✅ **Phase 1:** 100 live transactions, 0 duplicates  
✅ **Phase 2:** 20 pledges, 100% SMS sent, 0 consent bypass  
✅ **Phase 3:** 10 exceptions resolved manually, all stats correct  
✅ **Phase 4:** Public page cached, 1000 views/day, social shares working  
✅ **Phase 5:** Settlement reconciled daily, refund flow working  

**→ Changisha Phase 1-5 complete. Ready for Phase 6 (Kitabu integration, multi-currency, mobile).**

---

## Next Phase Ideas (Phase 6+)

- Kitabu Yetu API integration (webhook events, account linking)
- Multi-currency support (USD, ZAR, etc.)
- Advanced analytics & reporting dashboard
- Mobile app (React Native)
- White-label tenants (custom domains, branding)
- API marketplace (third-party integrations)

---

## Resources

- **Daraja Docs:** https://developer.safaricom.co.ke/
- **Supabase Docs:** https://supabase.com/docs
- **DPA 2019:** https://www.odpc.go.ke/
- **Quick Start:** See `QUICK_START.md`
- **Phase 1 Checklist:** See `PHASE_1_CHECKLIST.md`
- **Phase 2 Checklist:** See `PHASE_2_CHECKLIST.md`
- **Phases 3-5:** See `PHASES_3_4_5_CHECKLIST.md`

---

**Total Implementation:** 20 weeks  
**Total Team Size:** 2-3 engineers  
**Go-Live:** Week 5 (Phase 1) → Full platform Week 20

Let's build. 🚀
