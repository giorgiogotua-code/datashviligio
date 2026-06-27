# AccessoryShop POS — Project Overview

A point-of-sale + back-office system for a Georgian phone-accessories shop.
Single shared terminal, multi-cashier, fully in Georgian. Live on Cloudflare Workers.

- **Live:** https://accessoryshop-pos.giorgiogotua.workers.dev
- **Installable PWA** (Add to Home Screen) — works as a standalone app.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, React 19), TypeScript |
| Styling | Tailwind CSS v4, lucide-react icons, sonner toasts |
| Motion / UI | framer-motion (micro-interactions, animated `AuroraBackground`, glassmorphism/bento cards) |
| State | Zustand (`lib/store.tsx`) — in-memory **client cache** |
| Backend / DB | Supabase (Postgres + Auth + RLS) — **source of truth** |
| Auth | Supabase email/password; `middleware.ts` gates all routes |
| Photos | Cloudflare R2 (`aws4fetch` SigV4, **not** the aws-sdk) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |

**Architecture:** Zustand is a cache layer; every mutation is async write-through to
Supabase (write first, then update local state). `components/store-hydrator.tsx`
loads all tables once on mount. Money/stock-critical operations run as **atomic
Postgres functions** (one transaction) called via `supabase.rpc`.

---

## Modules (sidebar)

| Route | Module | What it does |
|-------|--------|--------------|
| `/warehouse` | **საწყობი** | Categories + products. Barcode scan/typing, photo upload (auto-compress → R2), Excel import with photo matching. Edit **restocks** (add/set toggle); typing an existing barcode restocks instead of duplicating. |
| `/pos` | **POS სალარო** | Cart, line/% discounts, Hold/Park (cloud), 3 payment types: ნაღდი / ბარათი / **ნისია** (credit, with partial pay-now). **Requires an open shift.** Overselling blocked (client + server). Fiscal-receipt toggle. |
| `/suppliers` | **მომწოდებლები** | Suppliers + purchases (raise stock, refresh cost) + supplier debt + payments. Barcode scanning in the purchase dialog. |
| `/credit` | **ნისია** | Customers + credit balances (who owes us). Record repayments; returns of credit sales reverse the debt. |
| `/accounting` | **ბუღალტერია** | Real KPIs (revenue, real **ხარჯი** = purchases, real **მოგება** = revenue − COGS), all-time totals snapshot, sales history, returns/refunds, inventory valuation. |
| `/staff` | **თანამშრომლები** | Cashiers + 4-digit PINs (unique among active), activate/deactivate, shift history. |
| `/tools` | **ხელსაწყოები** | Bulk photo optimizer (compress + ZIP download). |
| `/guide` | **სახელმძღვანელო** | In-app searchable manual for the admin. |
| `/settings` | **პარამეტრები** | Company info (shown on receipts), in-app PIN lock. |

### Shifts & Z-report (cash control)
Selling requires an open shift. A cashier opens a shift with their **PIN + opening
cash float**; every sale/return is tagged with the shift. Closing runs a **Z-report**:

```
expected cash = opening
              + cash sales
              + cash credit down-payments
              + cash debt repayments        (customer pays back ნისია in cash)
              − cash refunds (returns)
              − cash supplier payments
difference    = counted − expected          (surplus / shortfall)
```
Only **cash-method** payments touch the drawer (card/transfer don't). Closing
re-gates the POS so the next cashier opens their own shift.

---

## Database

Postgres (Supabase), all tables RLS-protected (`authenticated` full access).
Full DDL: [`schema.sql`](schema.sql) (fresh install). Incremental changes: [`migrations/`](migrations/).

**Tables:** `categories`, `products`, `sales`, `sale_items`, `settings`,
`held_carts`, `suppliers`, `purchases`, `purchase_items`, `supplier_payments`,
`customers`, `customer_payments`, `cashiers`, `shifts`, `fiscal_reports`.

**Atomic functions (RPC):**
- `create_sale(...)` — sale/return + line items + stock change (row-locked, rejects
  overselling), captures cost-at-sale (`sale_items.unit_cost`), applies discount,
  adjusts customer credit balance, tags the shift.
- `create_purchase(...)` — purchase + items, raises stock, refreshes `purchase_price`,
  adds unpaid remainder to supplier debt.
- `pay_customer(...)` / `pay_supplier(...)` — record a payment (with shift + method),
  adjust the balance.
- `open_shift(...)` / `close_shift(...)` — one open shift at a time; close computes the
  Z-report snapshot.

### Migrations (run in order, once each)
| # | What |
|---|------|
| `schema.sql` | Full schema — **only for a brand-new empty DB** (it DROPs everything; never run on live). |
| 002 | Cart discounts + held carts |
| 003 | Overselling prevention (row lock) |
| 004 | Suppliers + purchasing |
| 005 | Cost captured at sale time (real COGS) |
| 006 | Customers + credit (ნისია) |
| 007 | Cashiers + shifts + Z-report |
| 008 | Unique cashier PIN (active) |
| 009 | Returns reverse customer credit debt |
| 010 | Shift cash reconciliation (debt repayments / supplier payments, payment method) |

> ⚠️ If a migration changes `create_sale`'s parameter list **and** the client sends
> the new params, run the migration **before** deploying, or sales break.

---

## Setup

1. `.env.local` from `.env.example` with Supabase URL + anon key, R2 keys, and
   `NEXT_PUBLIC_R2_PUBLIC_URL`. **Never commit `.env.local`.**
2. Run `schema.sql` in Supabase → SQL Editor (fresh DB only).
3. Create the admin user in Supabase → Authentication → Users.
4. `npm install` → `npm run dev`.

## Deploy

```bash
npm run deploy   # next build --webpack → opennext build → wrangler deploy
```
- **Must build with `--webpack`** (Turbopack output breaks OpenNext).
- Worker + R2 live in the Cloudflare account `0230be…` (giorgiogotua). If deploy
  fails with an auth error, `npx wrangler login` into that account.
- If it fails with `EPERM … .open-next`, a stray `workerd` locked it:
  `Stop-Process -Name workerd -Force`, `rm -rf .open-next`, redeploy.

---

## Conventions
- All UI text is Georgian; code/comments are English.
- Reference code files with `path:line`.
- `.env.local` and `.mcp.json` are gitignored (hold secrets) — never commit.
- Roadmap / open items live in the agent memory, not here.
