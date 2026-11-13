# InvoiceBillos engineering verification

Date: 2026-11-13. Branch: `engineering/backend-finance-mobile-2026-11-13`.

## What changed live

Supabase project `uorpzqsojdhxouirolxt` was confirmed `ACTIVE_HEALTHY` (PostgreSQL 17).
The applied migration is `20261113192441_harden_function_paths_and_profile_privileges`; the repository filename matches the hosted migration history.

- Inspected all six public tables: customers, profiles, invoices, invoice_items, receipts, receipt_items. All have RLS enabled. Inspected all 24 policies, constraints, triggers, effective table grants, profile column permissions and nine function definitions.
- Pinned all nine invoker functions to an empty search path. Their public relations and function calls are already schema-qualified. Preserved invoker execution and existing business logic. No privilege escalation from the original unset paths was established; this is defensive hardening.
- Revoked TRUNCATE, REFERENCES and TRIGGER from client/public roles. TRUNCATE is outside RLS; a remote PostgREST truncate exploit was not established.
- Removed anonymous table privileges. Owner policies continue to enforce authenticated access.
- Restricted authenticated profile INSERT/UPDATE to the settings form's columns. Direct billing/subscription-field writes now fail. Settings upsert, including its id and updated_at fields, still works.
- No existing account or customer record was migrated or deleted. All hosted fixtures and staged finance DDL were rolled back in their test transactions. PostgreSQL identity sequences can advance during rolled-back tests; gaps have no accounting meaning.

The hosted security advisor now reports only leaked-password protection disabled. The organization is on Free; Supabase documents this feature as Pro and above. No subscription or billing change was made.

## What changed on the branch

### Application security

Login validates its final normalized internal redirect, rejecting scripts, external URLs, controls, backslashes and dot-segment routes that normalize to protocol-relative destinations. Recovery always redirects to the password-reset page. Both related router sinks were reviewed. These application fixes are not live until deployment.

The independent patch review found a normalization bypass in the initial redirect candidate. The final validator rejects it, and regression tests cover both literal and percent-encoded dot segments.

Server session refresh uses `getUser`; data operations use authenticated Supabase clients and database ownership enforcement. No service role or secret key was added to clients. The existing worker excludes authenticated pages, and its prior cache-version eviction is retained.

### Financial reliability — staged migration, not applied to hosted project

`20261113192503_atomic_invoice_save.sql` introduces:

- One transaction for header, full line replacement, server-calculated amounts and durable retry result.
- A private, inaccessible request journal keyed by user and request UUID. Same content/key returns the original response; changed content with the same key is rejected. Transaction locks serialize matching retries.
- A row lock and expected version for edits; competing stale edits fail rather than overwrite.
- Explicit auth/ownership checks in narrowly granted definer RPCs, fixed search paths, and no anonymous execution. Direct authenticated invoice/item mutations are revoked so alternate API clients cannot bypass validation.
- Per-account invoice-number uniqueness; two accounts can use the same number.
- Strict item, quantity, price, tax, discount, currency, date, status and total validation. No invalid total is silently accepted as zero.
- Decimal arithmetic: quantities have up to two decimals; each line is rounded half up, tax is rounded on the subtotal, then an absolute discount is subtracted. The UI's 26 currencies are supported; JPY uses zero decimal places and the others two. Other currencies/scales require an explicit extension.
- Draft-only financial editing, draft-only deletion and checked status transitions. Payment statuses remain manual owner assertions, not a reconciled payments ledger. Issued invoices require a future revision/credit-note workflow.
- Customer/business snapshots so later edits or deletion cannot rewrite issued documents' displayed details.

The web create/edit/list/status/delete callers use these RPCs. Finance previews use decimal-safe shared helpers. Dashboard and invoice-list summaries total each currency separately rather than combining currencies under a USD label. The branch deliberately fails closed if used against a database without the staged RPCs. Do not deploy this frontend independently of the migration.

The migration has NOT been applied permanently to the hosted project. Its privilege revocations would break the currently deployed legacy multi-request client. Production is still the `main` deployment `dpl_kLfCGgKmPpCdwtdXNvfxCo19ZGgE` at inspection time. The Vercel project is named `booking-os` (`prj_OYgEnA5TVEXMAGhrHOQBWbYnWnBp`). No deployment, promotion, store build or store submission was requested by this work.

### iOS/Android foundation

`mobile/` is a separate Expo/React Native app with pinned dependencies and a lockfile. It includes existing-account email/password login, foreground session refresh, customer create/edit/delete, invoice listing/creation, decimal previews, native PDF generation/sharing, and accessible tab/form controls. PDFs escape input and render stored totals and snapshots.

Sessions and one draft per account use native secure storage. Chunking stays within keychain limits; a pointer commits only after all chunks are written. Failed writes preserve the previous record. Draft edits autosave, an explicit save confirms durability, and a submitted request remains frozen/retryable after an uncertain network result. No background publishing occurs. PDF temporary-file removal is attempted after sharing.

This is a development foundation, not an app-store-ready release. It has no native recovery/deep-link flow, native CAPTCHA, multiple simultaneous drafts, biometric lock, push notifications, customer pagination, or invoice revision workflow. Login may require native CAPTCHA configuration depending on the project's Auth settings. Native signing identifiers are development-only.

## Verification performed

| Check | Result |
|---|---|
| Hosted catalog: six tables, 24 policies, nine functions | Inspected; retained schema/security inventory in this directory |
| Security migration with disposable users before applying | PASS, transaction rolled back |
| Same security suite after applying, including foreign reads/writes/deletes, reassignment, parent checks, profile upsert, billing permissions, trigger calculations and anonymous grants | PASS on hosted PostgreSQL |
| Hosted security advisor after repair | Nine function warnings cleared; Free-plan password advisory remains |
| Finance migration and integration suite on hosted PostgreSQL | PASS; DDL, fixtures and writes rolled back |
| Isolated PostgreSQL 17 baseline, security suite, finance suite | PASS |
| Two concurrent identical retries | PASS: one invoice, identical responses |
| Two concurrent edits with the same version | PASS: one commit, one serialization/version conflict |
| Two concurrent creates with the same account/number | PASS: one commit, one unique violation |
| Same invoice number in different accounts | PASS |
| Injected line-write failure after header insertion | PASS: no orphan header |
| Decimal totals, fractional quantities, JPY lines, oversized discounts, empty invoices, immutability, snapshots, RPC/private journal permissions | PASS |
| Root `npm test` | PASS: 10 tests |
| Root ESLint, TypeScript, Next.js optimized build | PASS with placeholder build-only public configuration |
| Mobile TypeScript and unit tests | PASS: 4 tests |
| Expo Android and iOS Hermes bundle export | PASS with placeholder development configuration |

Tests use simulated authenticated database roles/JWT claim context. They do not establish real password login, email recovery, token refresh/revocation, provider rate limits or CAPTCHA behavior. Native bundles establish compile/bundle compatibility, not actual device behavior. Code was directly reviewed and executed; a full Codex Security scan could not be completed because its referenced workflow resources were inaccessible in this session.

## Reproduce

`npm ci --ignore-scripts`, `npm test`, `npm run lint`, `npx tsc --noEmit`, then build with valid public development configuration. In `mobile/`, run `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`, and `npx expo install --check`.

For an EMPTY disposable PostgreSQL 17 database, load `tests/database/baseline.sql`. It contains schema, policies and functions but no customer data or credentials; `auth.users`/`auth.uid()` are minimal test stubs. Configure libpq environment, then run:

```
python3 scripts/test-database.py security
python3 scripts/test-database.py finance
psql --no-psqlrc --set=ON_ERROR_STOP=1 --file supabase/migrations/20261113192503_atomic_invoice_save.sql
python3 scripts/test-concurrency.py
```

The first two suites roll back. The concurrency suite requires the finance migration installed in that disposable database and removes its fixtures. Do not run baseline or concurrency setup against production. `.github/workflows/engineering.yml` runs these checks without production credentials.

## Unresolved and release requirements

1. Review Auth dashboard configuration: redirect allowlist, email confirmation/templates, password requirements, secure password changes, access-token lifetime, refresh rotation, session revocation, CAPTCHA and rate limits. Connected tools did not expose Auth configuration mutation/inspection. Enable leaked-password protection if the owner chooses a supported plan.
2. Use a dedicated development Supabase project for real account/API and native testing. No paid project/branch was created. Verify two disposable real accounts end to end, expiry/refresh, logout, recovery, rejected foreign API requests and account switching.
3. Reconcile the five earlier hosted migration-history entries (20260430) with the repository before using a generic CLI db push; the repository previously had no migration files. The schema-only test baseline is not a production migration. Review the staged definer RPC boundary and request-journal retention policy. Stage the complete migration with the frontend, run advisors and all integration/concurrency tests there, exercise backup/restore, and plan a maintenance window or coordinated release: legacy writes must stop when their privileges are revoked.
4. Verify all 26 supported currencies, extreme numeric bounds and performance with realistic volumes. Receipt tables retain their existing non-atomic client-write model; there is no receipt UI in this repository. A payment ledger, credits, revisions and jurisdiction-specific tax rules remain separate work.
5. On physical iPhone and Android, verify keychain/keystore behavior, crash/background/kill recovery, expired/offline sessions, account isolation, network drop after commit, Unicode and large drafts, PDF pagination and native share/cleanup, keyboard navigation and accessibility. Document uninstall/reinstall behavior and retained draft deletion. Acknowledged secure-store writes are the durability boundary; the OS can kill the app before an asynchronous edit is saved.
6. Add native recovery deep links/CAPTCHA as needed, complete loading/error/empty-state UX and device review, privacy disclosures, account deletion requirements, signing, development builds, TestFlight and Play internal testing. No stores until release verification passes.
7. Review GitHub CI results and preview behavior before production. Production application code and the staged finance schema are unchanged by this branch push; only the separately verified security hardening migration has been applied live.
