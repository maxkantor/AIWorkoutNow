# AIWorkoutNow — Version 1.0 Baseline

This document captures the **v1.0** baseline so we can confidently iterate on **v2.0 UI** while keeping an easy rollback path.

## Source-of-truth references

- **Git tag**: `v1.0.0`
- **Release branch**: `release/v1.0`

To roll back to v1.0:

```bash
git checkout v1.0.0
```

## What’s included in v1.0 (high-level)

### Pricing / plans (active)
- Token packs are presented as **3 active plans**:
  - **$1.99** → **10 workouts**
  - **$3.99** → **30 workouts**
  - **$7.99** → **100 workouts**
- “Unlimited” is intentionally **not displayed**.

### Payments (Stripe)
- Checkout session creation saves a **pending** purchase record.
- Tokens are **granted only after payment** via Stripe webhook processing (no “back button grants”).
- Purchases are enriched with available Stripe customer data (email/name/phone/address where present).

### Token accounting
- Generating a workout for paid users **deducts 1 token**.
- Backend reconciliation **must never overwrite** `TokensRemaining` (to avoid undoing token spending).
- `TotalWorkouts` is treated as the denominator for display (remaining/total).

### Admin CRM (overview)
- `/admin/purchases` shows **completed/non-pending purchases** with:
  - date, customer, email, pack, amount, tokens, status, payment intent, and customer link.
- Purchases list filters out **pending** rows to reduce noise.

## Known v1.0 operational notes

- Some “legacy” DTO naming still uses `StripePurchase` for admin purchase display, even though the source table is `UserPurchases`.
- Some customer “reset” history may exist from earlier builds; v1.0 includes logic to restore meaningful statuses from Stripe where possible.

## Version 2.0 UI change goals (next)

### Admin UI
- Redesign admin layouts/components while preserving:
  - purchases correctness (status/amount/tokens)
  - customer enrichment fields
  - activities/analytics stability

### Consumer UI
- Plan cards, checkout flow UX polish, and clearer remaining/total token display.

