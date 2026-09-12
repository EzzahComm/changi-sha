# Changi$ha — Platform Architecture

**Status:** draft for build · **Last updated:** 2026-08-20 (custody re-examined)

---

## 1. Guiding principle

> **Changi$ha owns fundraising and payment transactions. Kitabu Yetu owns the organization's accounting record.**

Everything below follows from that one sentence. When a design question comes up, resolve it by asking which side of that line the answer falls on.

Two corollaries that are easy to get wrong:

- **Only Changi$ha talks to payment rails.** If Kitabu can also charge a card or trigger an STK push, there are two systems moving money and no single source of truth to reconcile against. The rails are *owned*, not shared.
- **Kitabu never computes payment state.** It receives it. A donation's status is whatever Changi$ha says it is; Kitabu records the consequence in its ledger.

---

## 2. Vision

Changi$ha is a standalone fundraising and payments platform. Kitabu Yetu is its first client and integrates through public APIs and webhooks — the same ones every other client uses.

This matters architecturally: **build no private door for Kitabu.** If Kitabu needs an endpoint, it goes in the public API. The day a second client arrives, nothing has to be untangled.

---

## 3. System overview

```
┌──────────────────────┐                    ┌──────────────────────┐
│     KITABU YETU      │                    │      CHANGI$HA       │
│    Group finance     │◄──── REST API ────►│  Fundraising & pay   │
│                      │                    │                      │
│  Owns: the org's     │◄──── Webhooks ─────│  Owns: transactions  │
│  ledger of record    │                    │  and payment state   │
└──────────────────────┘                    └──────────┬───────────┘
                                                       │
                                            ┌──────────▼───────────┐
                                            │    PAYMENT RAILS     │
                                            │  Paystack · Daraja   │
                                            │   (M-Pesa) · SMS     │
                                            └──────────────────────┘
```

Note the asymmetry: the API is bidirectional (Kitabu calls Changi$ha), webhooks are one-way (Changi$ha notifies Kitabu). Kitabu never pushes payment state upstream.

---

## 4. Project structure

| Product | Vercel | Database | Domain |
|---|---|---|---|
| Kitabu Yetu | `kitabuyetu-web` | Supabase `kitabu-prod` | app domain |
| Changi$ha | `changisha-web` | Supabase `changisha-prod` | `changisha.com` |
| Changi$ha API | same project, `/v1/*` | — | `api.changisha.com` |

**Shared infrastructure:** Paystack · Daraja · SMS gateway · monitoring.

> The API is routed from the same Next.js deployment rather than a separate service. One project, two hostnames. Split it out later only if the API develops genuinely different scaling or deploy cadence — starting split costs you shared types and atomic deploys for no early benefit.

---

## 5. Why separate projects

| Decision | Choice | Reason |
|---|---|---|
| Vercel project | Separate | Independent deploy cadence; a Kitabu release cannot take payments down |
| Supabase project | Separate | Blast radius. A bad migration on one side cannot corrupt the other |
| Financial ledger | Separate | Different jobs: Changi$ha records *transactions*, Kitabu records *accounting*. One table would serve neither |
| Authentication UX | Shared via SSO | Users experience one login; the systems stay independent |
| Integration | API + webhooks | The only coupling, and it is versioned and observable |

The cost of this separation is that data lives in two places and must be reconciled. Section 10 is how that debt gets paid.

---

## 6. Domain model

Core entities on the Changi$ha side:

```prisma
model Organization {   // a tenant — one per Kitabu group / customer
  id             String   @id @default(cuid())
  name           String
  livemode       Boolean  @default(false)
  campaigns      Campaign[]
  apiKeys        ApiKey[]
}

model Campaign {
  id             String   @id @default(cuid())
  organizationId String
  slug           String   @unique          // public-facing URL
  title          String
  targetMinor    BigInt?                   // goal, in minor units
  currency       String   @db.Char(3)      // ISO 4217, "KES"
  status         CampaignStatus            // DRAFT | ACTIVE | PAUSED | CLOSED
  appealType     AppealType                // PRIVATE | PUBLIC | RELIGIOUS — see §12.2
  permitNumber   String?                   // reserved: Public Fundraising Appeals Bill
  permitStatus   PermitStatus?             // NOT_REQUIRED | PENDING | VALID | EXPIRED
  permitExpiresAt DateTime?
  donations      Donation[]
}

model Donation {
  id             String   @id @default(cuid())
  campaignId     String
  grossMinor     BigInt                    // what the donor paid
  feeMinor       BigInt                    // provider + platform fee
  netMinor       BigInt                    // what settles to the org
  currency       String   @db.Char(3)
  status         DonationStatus
  provider       Provider                  // PAYSTACK | DARAJA
  providerRef    String                    // provider's transaction id
  idempotencyKey String   @unique          // client-supplied, dedupes retries
  donorPhone     String?                   // store E.164, display masked
  createdAt      DateTime @default(now())

  @@unique([provider, providerRef])        // the anti-double-credit constraint
}

model LedgerEntry {                        // append-only. No UPDATE. No DELETE.
  id             String   @id @default(cuid())
  transactionId  String                    // groups entries that must balance
  account        String                    // e.g. "campaign:abc", "fees:platform"
  debitMinor     BigInt   @default(0)
  creditMinor    BigInt   @default(0)
  createdAt      DateTime @default(now())
}
```

**Rules that are not negotiable:**

1. **Money is `BigInt` minor units, never a float.** KES 1,250.50 is `125050`. A float will eventually lose a cent, and in a ledger that cent arrives as a bug report from an accountant.
2. **Currency travels with every amount** — even while KES is the only currency.
3. **`LedgerEntry` is append-only.** Corrections are new, opposing entries, never an edit. The history *is* the audit trail.
4. **Every ledger transaction balances.** `SUM(debit) == SUM(credit)` per `transactionId`, enforced by a database constraint or trigger, not only in application code.
5. **`Organization` has no balance field.** Under the recommended non-custodial model there is no Changi$ha-held balance to store — a campaign's "balance" is a derived sum of settled donations, not cash on hand. Adding a stored balance is how a platform accidentally becomes a licensed one (§12.1).

Under Path A the ledger's job also changes, in a way that makes it *easier*: it records flows that Paystack executes, rather than being authoritative over cash Changi$ha holds. Reconciliation becomes "does our record match the provider's" — not "does our bank balance cover our liabilities."

---

## 7. Payment flows

### Collection path — decide this before anything else

**Who receives the donor's money determines whether Changi$ha needs a CBK licence.** This is not a later question; it decides the schema. See §12.

| Path | Donor's paybill | Funds land with | Platform fee | Changi$ha PSP licence |
|---|---|---|---|---|
| **A. Aggregator splits** (Paystack subaccounts) | Paystack's | Paystack → settles each party directly | Automatic, as your split share | **No** — you operate under theirs |
| **B. Org's own paybill** | The organization's | The organization | Hard — money never touches you | **No** |
| **C. Changi$ha paybill + B2C payouts** | Changi$ha's | **Changi$ha** | Trivial | **Yes** + trust account + AML programme |

**Recommended for launch: Path A**, with Path B available for white-label customers who already hold a paybill. Model this as `Organization.collectionMode`, so the tiers in §11 map onto it directly.

Path A is the only option that collects a platform fee without taking custody: Paystack settles each subaccount's share straight to its own bank account or M-Pesa wallet, never through your balance.

Its real costs, which are not trivial: the donor sees an aggregator paybill rather than yours or the organization's — a genuine trust cost in Kenyan fundraising — plus aggregator pricing over direct Daraja rates, and dependence on Paystack's Kenya settlement timelines. Accept them for launch; revisit if and when volume justifies a licence.

### M-Pesa STK Push — the donation flow

Applies to Path A and Path B alike; only the receiving account differs.

```
donor enters phone → POST /v1/donations (idempotency key)
  → Changi$ha calls Daraja STK Push
  → donation: INITIATED → PENDING_PROVIDER
  → donor enters PIN on handset
  → Daraja POSTs callback → donation: SUCCEEDED
  → ledger entries written (one DB transaction)
  → webhook queued to Kitabu
```

**The callback is not reliable.** Daraja callbacks are delayed, duplicated, and sometimes never arrive. Do not build as if a missing callback means a failed payment — the donor may well have paid.

Mitigation, required from day one:

- Schedule a **status query** for every donation still `PENDING_PROVIDER` after 90 seconds, and again with backoff up to ~10 minutes.
- Move to `FAILED` only when the status query confirms failure or the provider window closes — never on timeout alone.

### Card and bank (Paystack)

Hosted checkout or Paystack's inline widget. **Card data never touches Changi$ha servers** — this is what keeps compliance at PCI-DSS SAQ-A instead of a full audit (see §12). Do not build a custom card form.

### Donation state machine

```
INITIATED → PENDING_PROVIDER → SUCCEEDED
                             → FAILED
                             → EXPIRED

SUCCEEDED → REFUND_PENDING → REFUNDED
                           → PARTIALLY_REFUNDED
```

States are forward-only. A `SUCCEEDED` donation never returns to `PENDING` — a late duplicate callback is ignored, not replayed. Enforce this in one transition function rather than scattered `status =` assignments.

---

## 8. Integration contract

### 8.1 Two kinds of authentication — keep them separate

The original sketch says "shared sign-in," which quietly merges two unrelated problems:

| | **Service auth** | **User auth** |
|---|---|---|
| Who | Kitabu's server → Changi$ha API | A human logging in |
| Mechanism | API key (`chs_live_…` / `chs_test_…`) | OIDC / account linking |
| Scoped to | An organization | A person |
| Failure mode | 401, retried by machine | Redirect to login |

Server-to-server calls **never** carry a user session. Build service auth first — it is what the integration actually runs on. SSO is UX polish that can land later without reworking anything.

**API keys:** prefixed, scoped per organization, **hashed at rest** (store the hash plus a display suffix only), rotatable with an overlap window so rotation is not an outage.

### 8.2 Kitabu → Changi$ha (REST)

```
POST   /v1/campaigns                     create a campaign
GET    /v1/campaigns/:id                 current state + balance
POST   /v1/campaigns/:id/payment-link    generate a shareable link
GET    /v1/donations?campaign_id=        list / paginate
GET    /v1/settlements                   settlement history
```

Versioned under `/v1`. Additive changes only within a version: new fields are safe; removed or retyped fields mean a new version.

**Idempotency:** every `POST` accepts an `Idempotency-Key` header. The same key with the same body within 24h returns the original response instead of acting twice. Non-optional on anything that moves money.

### 8.3 Changi$ha → Kitabu (webhooks)

Envelope:

```json
{
  "id": "evt_01HZX3K9QW",
  "type": "donation.succeeded",
  "created_at": "2026-08-20T10:15:00Z",
  "livemode": true,
  "data": {
    "donation_id": "don_01HZX3",
    "campaign_id": "cmp_01HYA0",
    "gross_minor": 125050,
    "fee_minor": 3751,
    "net_minor": 121299,
    "currency": "KES",
    "provider_ref": "SFG7H2K91X"
  }
}
```

**Event catalog:**

| Event | Fires when |
|---|---|
| `donation.succeeded` | Funds confirmed by the provider |
| `donation.failed` | Provider declined, or donor abandoned |
| `donation.refunded` | Refund completed, full or partial |
| `campaign.balance.updated` | Campaign net balance changed |
| `settlement.initiated` | Payout to the organization's account started |
| `settlement.paid` | Funds landed |

**Signing.** Header `Changisha-Signature: t=<unix>,v1=<hex>`, where the signature is `HMAC-SHA256(secret, "{t}.{raw_body}")`.

Kitabu must:

1. Verify against the **raw request body, before JSON parsing.** In a Next.js route handler that means `await req.text()` and parsing yourself — `await req.json()` re-serializes and the signature will not match. This is the single most common webhook bug.
2. Reject if `|now − t| > 5 minutes`, or a captured request stays replayable forever.
3. Compare with a **constant-time** comparison, not `===`.

**Delivery is at-least-once.** Kitabu *will* receive duplicates. Dedupe on `id` with a unique constraint before acting on the event.

**Retry schedule:** immediate → 1m → 5m → 30m → 2h → 6h → 24h, then dead-letter with an alert. Kitabu returns `2xx` quickly — queue the work, do not process inline. Any other status, or a timeout, counts as a failure.

---

## 9. Where each fact lives

| Fact | Source of truth | Copy |
|---|---|---|
| Did this donation succeed? | Changi$ha | Kitabu (via webhook) |
| Campaign balance | Changi$ha | Kitabu |
| Organization's books | Kitabu | — |
| Donor contact details | Changi$ha | Only where consented |
| Fee breakdown | Changi$ha | Kitabu |

Kitabu's copies are **derived and disposable** — rebuildable from Changi$ha by replaying the API. If a copy cannot be rebuilt, it has quietly become a source of truth and the boundary has leaked.

---

## 10. Reconciliation

Separate ledgers on separate databases will drift. Plan for it rather than discovering it.

**Daily, automated:**

1. Pull the provider's settlement report (Paystack, Daraja).
2. Compare provider totals against the Changi$ha ledger for the period.
3. Compare Changi$ha campaign balances against what Kitabu holds.
4. Any non-zero variance opens an alert naming the offending transaction IDs. **Never auto-correct** — a silent fix hides the bug that caused the drift.

**A replay endpoint pays for itself.** `POST /v1/webhooks/replay?since=<ts>` lets Kitabu re-request events after an outage, instead of someone repairing balances by hand in SQL.

---

## 11. Product tiers

| Tier | What it is | What it needs technically |
|---|---|---|
| **Hosted** | Campaigns on the Changi$ha site | Nothing extra — the baseline |
| **Embedded** | Payment widget on a customer site | Publishable (non-secret) keys, CORS allowlist, `frame-ancestors` CSP, iframe isolation |
| **API** | Customer builds their own | Scoped keys, rate limits, versioning, docs |
| **White-label** | Customer branding and domain | Custom domains and TLS, per-tenant theming, per-tenant SMS sender ID |

Each tier is the previous one plus configuration, not a separate codebase. If a tier needs a fork, the tenancy model is wrong.

---

## 12. Security and compliance

- **Never store card data.** Hosted checkout only, which keeps this at PCI-DSS SAQ-A. A custom card form escalates it to a full audit that a platform this size should not take on.
- **Daraja callbacks are unsigned**, unlike Paystack's. Compensate with IP allowlisting, an unguessable callback path, and — most importantly — treating the callback as a *hint* that triggers a server-side status query rather than as trusted state. Never credit a ledger on the strength of an unsigned callback alone.
- **Secrets live in Vercel environment variables**, per environment, never in the repo. Rotate on any staff change.
- **PII:** phone numbers stored E.164, displayed masked (`+2547••••1234`), never written to logs. Kenya's Data Protection Act 2019 applies; ODPC registration is likely required before handling donor data at volume.
- **Fund custody** — see §12.1. It is the single largest architectural constraint in this document.

### 12.1 Fund custody and the CBK

Under the National Payment System Act 2011 and the NPS Regulations 2014, facilitating electronic payments or merchant acquiring for Kenyan users requires authorization as a Payment Service Provider. Authorized PSPs must hold all customer monies in a **trust fund** at a licensed commercial bank — ring-fenced from company funds, beyond the reach of creditors, with no lending or investment permitted.

**The test is not "do we hold funds for long."** Duration is irrelevant. Ask instead:

1. Whose name is on the account the donor's money lands in?
2. Does Changi$ha, at any instant, owe a campaign money it is holding?

If (1) is Changi$ha and (2) is yes, that is custody — even at T+0, even for a second. Path C in §7 is custody by construction. Paths A and B are not, because the donor's funds never rest in a Changi$ha account.

**Custody tripwires.** Each of these silently converts Path A into Path C. None looks like a regulatory decision in a sprint planning meeting; all of them are:

- A stored `balance` on `Organization` — a wallet by another name
- Goal-based or all-or-nothing release ("funds only if the target is met") — escrow by definition
- Instant refunds paid from platform float
- Aggregating several campaigns into a single payout
- Holding funds pending dispute, verification, or moderation
- Paying out on a schedule Changi$ha chooses rather than the provider's

Adding any one of these means a licence application, a trust account, capital requirements, an AML programme, and audits. That is a company-shaping decision, not a feature.

### 12.2 Fundraising is separately regulated

Payments law is not the only regime that applies. The **Public Fundraising Appeals Bill, 2024** (Senate Bills No. 36 of 2024) reached Committee of the Whole during 2026. It is not yet law, but it is advancing, and it targets exactly this product category. As drafted it would:

- Require a **permit** for public fundraising appeals
- **Limit administrative costs** — a statutory ceiling on the platform fee, overriding whatever the commercial model says
- Restrict participation by state officers and political aspirants
- Require contributors to declare donations to the KRA
- Carry penalties up to **KES 5 million**
- **Exempt** private appeals, religious collections, and lotteries

The exemption matters more than the rest. A chama's internal contribution is plausibly a *private* appeal and therefore exempt; a public campaign is not. So `Campaign.appealType` (`PRIVATE | PUBLIC | RELIGIOUS`) is a compliance-bearing field, not a label — and Kitabu's core group-finance use case may fall largely outside the permit regime.

Design for this now, build it behind a flag: carry `appealType`, and reserve `permitNumber` / `permitStatus` / `permitExpiresAt` on `Campaign`. If the Bill passes, a public campaign must not reach `ACTIVE` without a valid permit. Note also that in 2025 the High Court struck the Bill's donor-identity disclosure provisions on privacy grounds — do not build donor-disclosure features against the original draft text.

### 12.3 Two boundaries worth naming

- **Investment-based crowdfunding is a different regulator.** The moment a campaign offers any financial return — equity, profit share, interest — it leaves donation fundraising and falls under the Capital Markets (Investment-Based Crowdfunding) Regulations 2022, licensed by the CMA, not the CBK. Keep "contribute and receive a return" off the roadmap unless that licence is being sought deliberately.
- **Kenya remains on the FATF grey list** as of the June 2026 review. Practically this means heavier due diligence when onboarding provider and bank accounts, slower approvals, and a higher chance of account freezes on unusual patterns. Under Path A most of this burden sits with Paystack; under Path C it becomes yours, including KYC on organizations and suspicious-transaction reporting to the FRC.

> Not legal advice. This is architecture reasoning from public sources, and it needs confirmation from Kenyan fintech counsel before launch — particularly the Bill's current status, the administrative-cost ceiling (the figure was not in the sources consulted; it needs reading off the bill text), and Paystack's current Kenya split-settlement terms.

---

## 13. Environments

| | Database | Provider credentials | Keys |
|---|---|---|---|
| Local | Supabase branch or local Postgres | Sandbox | `chs_test_` |
| Preview | Supabase branch | Sandbox | `chs_test_` |
| Production | `changisha-prod` | Live | `chs_live_` |

**Test mode is a product feature, not a deploy target.** Every record carries `livemode`; test and live data coexist in production, fully partitioned. Integrators need to exercise real flows without moving real money, and only a `livemode` flag gives them that.

---

## 14. Observability

- **Correlation ID** on every request, threaded through provider calls and outbound webhooks. Without it, tracing one donation across two systems and a provider is guesswork.
- **Alert on:** webhook failure rate, donations stuck in `PENDING_PROVIDER` past threshold, reconciliation variance ≠ 0, provider error-rate spikes.
- **Structured logs**, no PII, retained long enough to investigate a disputed transaction — 90 days minimum.
- A donation that fails silently is worse than one that fails loudly. Bias every alert threshold toward noisy.

---

## 15. Current state → next steps

The `changi-sha` repo today:

| Piece | State |
|---|---|
| Next.js 16.3.1, App Router, Turbopack | ✅ Scaffolded |
| Prisma 7.9.1 + `@prisma/adapter-pg` | ✅ Wired; client generates to `app/generated/prisma` |
| Supabase pooler split | ✅ `DATABASE_URL` (6543, runtime) / `DIRECT_URL` (5432, migrations) |
| Supabase SSR helpers in `lib/` | ⚠️ Present but **unused** — no root `middleware.ts`, so sessions never refresh |
| `prisma/schema.prisma` | ❌ No models |
| `prisma/migrations/` | ❌ Does not exist |
| Routes | ❌ Starter page only |

**Two traps already latent in this setup:**

1. **Prisma bypasses Row Level Security.** Prisma connects as the database owner, so RLS policies do not apply to it. With both `@supabase/supabase-js` (RLS enforced) and Prisma (RLS bypassed) in one codebase, authorization silently depends on which client a route happens to use. **Decide the rule now:** Prisma for all server-side writes with authorization in application code, Supabase client for auth only. Write it down, because the failure mode is one tenant reading another tenant's donations with no error raised.

2. **Ledger writes need `Serializable` isolation.** The transaction-mode pooler on `:6543` does support transactions, but concurrent balance updates under the default `ReadCommitted` will interleave and produce a wrong balance that no error surfaces.

**Build order:**

0. **Decide the collection path (§7) and confirm it with Paystack Kenya.** This comes before the schema, because it determines whether `Organization` carries a balance, whether `Donation` needs a destination subaccount, and whether this company needs a CBK licence. Everything below assumes Path A.
1. Model `Organization` → `Campaign` → `Donation` → `LedgerEntry`; first migration.
2. Root `middleware.ts` calling `updateSession` from `lib/middleware.ts`.
3. API key issuance and verification (service auth).
4. `POST /v1/donations` via Paystack with subaccount splits, including the status-query fallback for M-Pesa.
5. Ledger writes in serializable transactions.
6. Outbound webhook dispatcher with signing and retries.
7. Reconciliation job.
8. SSO / account linking — last, deliberately.

---

## 16. Open questions

1. **Confirm Path A is actually available** — Paystack Kenya split settlement to M-Pesa wallets, current pricing, subaccount onboarding requirements and lead time, and refund windows. The architecture recommends it (§7); this verifies it. *Highest priority — it gates the schema.*
2. **Fee model, within a possible statutory ceiling** — platform fee on top of the donor's amount, or deducted from the campaign's net? Under Path A the split share makes deduction-from-net the natural mechanism. But if the Public Fundraising Appeals Bill passes with an administrative-cost limit (§12.2), the ceiling is set by statute, not by pricing strategy. Read the figure off the bill text before modelling fees.
3. **Is Kitabu's use case a private appeal?** If chama contributions are exempt from the permit regime, the compliance surface for the first client is dramatically smaller. Worth a counsel opinion early — it may justify launching against private appeals only.
4. **Refund authority and mechanism** — can Kitabu trigger refunds via API, or is that Changi$ha-console only? Note that Path A constrains this more than the state machine in §7 implies: with no float to refund from, every refund goes through the provider against the original transaction and is bound by the provider's window. "Refund a donation from six weeks ago" may simply not be possible.
5. **SSO direction** — is Changi$ha the identity provider, or does Kitabu authorize via OAuth the way a Stripe Connect integration does? The latter scales to client #2; the former does not.
6. **Multi-currency** — KES only at launch? The schema carries currency regardless, but FX handling is a much larger piece of work.

---

## Appendix: changes from the original sketch

| Change | Why |
|---|---|
| Payment rails moved under Changi$ha, not "shared" | Two systems touching rails makes reconciliation impossible |
| Split auth into service vs user | "Shared SSO" merged two unrelated problems and hid the one the integration actually runs on |
| Added money representation rules | Float money is a guaranteed future defect |
| Added idempotency, signing, retries | At-least-once delivery is the default reality; duplicate donations are the failure mode |
| Added M-Pesa status-query fallback | Daraja callbacks are unreliable; timeout ≠ failure |
| Added reconciliation | Separate ledgers drift; unplanned drift gets found by an accountant, not an alert |
| Added §15 traps (RLS, isolation) | Both are latent in the current repo and silent when they fail |
| Added open questions | Custody and fee model shape the schema and cannot be deferred quietly |

**Second pass — custody re-examined:**

| Change | Why |
|---|---|
| Collection path promoted to the first decision (§7) | The original draft named Daraja the "primary rail" while treating custody as a deferred question. Those contradict: a Changi$ha paybill *is* custody, so the rail choice silently decided the licensing posture |
| Custody reframed from "how long" to "whose account, and who owes whom" | Duration is irrelevant to the CBK test; T+0 custody is still custody |
| Path A (aggregator splits) recommended | The only path that collects a platform fee without custody — the provider settles each party directly, never through your balance |
| Added the custody tripwire list (§12.1) | Every item on it is a normal-looking feature that converts the company into a licensed one |
| Added §12.2 on fundraising regulation | The original missed an entire second regime. A Bill aimed squarely at this product category is live in the Senate, and its administrative-cost limit may cap the platform fee by statute |
| Added `appealType` and permit fields to `Campaign` | The private-appeal exemption is compliance-bearing, and may put Kitabu's core use case outside the permit regime entirely |
| Softened the refund state machine | Without float, refunds are bound by provider windows — the original modelled them as freely available |
