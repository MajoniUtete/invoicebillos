# InvoiceBillos engineering recovery and mobile plan

Current implementation and verified results: [Engineering verification](ENGINEERING_VERIFICATION_2026-11-13.md). The notes below are the earlier recovery plan.

Date: 2026-11-13
Branch: `engineering/backend-finance-mobile-2026-11-13`
Production deployment is intentionally unchanged during investigation.

## Verified evidence

- Next.js 16.2.1 / React 19.2 / Supabase browser and SSR clients.
- Supabase project `uorpzqsojdhxouirolxt` was INACTIVE; restore requested successfully on 2026-11-13, initially reporting COMING_UP.
- Production Vercel deployment READY, but readiness alone does not establish functioning authentication or database.
- Creating an invoice first inserts into `invoices`, then independently inserts `invoice_items`. An error on the latter can leave a header without items.
- Editing updates an invoice and individually deletes/updates/inserts items. Partial failures can produce mismatched totals and contents.
- Current PDF action calls `window.print()`.
- Service worker caches successful navigation responses. Authenticated and financial pages require explicit privacy-safe cache exclusion.
- No repository test command or product-specific setup instructions were present at the start of the audit.

## Restore and security verification gate

1. Confirm project ACTIVE_HEALTHY and perform a read-only `select 1`.
2. Inventory schema, constraints, migrations, triggers, RLS policies and security advisors. Never infer security from frontend `eq('user_id', id)` filters.
3. Verify authenticated user A cannot read, edit or delete user B's customer, invoice, item or profile using dedicated disposable test accounts.
4. Review auth redirects, signup, login, reset, rate limiting, CAPTCHA server configuration, and session cookie protections.
5. Ensure backups or a reversible recovery path before altering production schema, even if seed customer records are disposable.

## Financial operations repair gate

- Migrate monetary arithmetic to decimal-safe or minor-unit arithmetic, with explicit currency scale and clear rounding rules.
- Persist invoice header and items within ONE PostgreSQL transaction, ideally via a narrowly scoped RPC enforcing `auth.uid()` ownership, cross-table consistency, validated input and duplicate-number constraints.
- Make create/edit retry-safe and enforce server-calculated totals rather than trusting browser totals.
- Prevent modification of issued invoices without an explicit revision / credit note workflow; keep audit history.
- Add mandatory validation for currency, dates, discounts, taxes, positive quantity, items and payment state; do not silently clamp invalid total to zero.
- Test concurrent writes, offline retries, rejected inserts, network drop after commit, and cross-tenant attempts.

## Mobile execution

1. Stabilize shared backend and finance domain before platform wrappers.
2. Build an installable mobile UX prototype, with deep-link auth return, biometric screen lock option, accessible forms, native PDF save/share and push-notification permissions where needed.
3. Compare Expo/React Native versus native SwiftUI + Kotlin; choose after measuring reuse, offline requirements and release maintenance.
4. Use separate development and production configuration. Never embed privileged Supabase credentials in client apps.
5. Test physical iPhone and Android: sign-in, create/edit invoice, notification, share PDF, cold start, offline draft recovery and accessibility.
6. Only after tests pass: TestFlight, Google Play closed testing, app-store privacy disclosures and review preparation.

## Release gate

No production schema modification, deletion, deployment or store publication without: verified project health, isolated users, automatic transaction tests, restored auth, financial reconciliation, and review of changes.
