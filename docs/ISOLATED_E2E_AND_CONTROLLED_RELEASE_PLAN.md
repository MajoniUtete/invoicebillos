# Isolated end-to-end milestone and coordinated release plan

Recovery continuation: [recovered workspace and measured E2E results](RECOVERED_WORKSPACE_AND_E2E.md). The interruption status below is historical.

Date: 2026-11-13 (Europe/Helsinki).
Development branch: engineering/backend-finance-mobile-2026-11-13.
Verified starting code commit: 48b1bd7.
Release decision: NOT READY for a controlled production release.

## Current milestone status

The execution environment became unavailable during local Supabase image downloads. No new end-to-end test pass is claimed. This document is committed through the connected GitHub account; the new application/configuration edits remain in the unavailable workspace and are not included in this documentation commit.

Production was not modified in this continuation. No hosted backend, paid resource, production deployment, main merge, signing submission or app-store submission was created.

Previously completed security and finance tests at 48b1bd7 are not repeated or presented as new end-to-end evidence.

## Work prepared in the workspace, pending recovery and verification

- Generated an isolated local Supabase configuration under dev/supabase with PostgreSQL 17, email/password Auth, email confirmations, a local email capture service, five-minute access tokens, refresh rotation, minimum ten-character passwords and exact web/native recovery redirect entries.
- Started a reduced local stack using the existing pinned CLI 2.90.0. Images were still downloading when the environment failed. A healthy Auth/PostgREST/mail stack was not confirmed.
- Read the hosted migration history without modifying it. Exported the five missing April 2026 migration scripts to the workspace. The November security migration was already present.
- Prepared a local-only bootstrap script: restore the schema-only snapshot without replacing the real Supabase auth schema, copy the reconciled migration files into the isolated project, mark snapshot-covered versions applied locally, then apply the pending finance migration locally. This script has NOT run successfully.
- Added web recovery support for PKCE code exchange in addition to recovery token hashes.
- Added handling for Supabase SSR refresh cache headers and private/no-store responses.
- Added a native recovery URL parser, PKCE/token-hash verification handler, cold/warm URL listeners, recovery email request and password-reset form. The parser refuses injected session-token fragments and unrelated schemes/hosts/paths.
- Added native development-client and build-property dependencies, internal APK/iOS simulator profiles, development-only local-network configuration and safer PDF sharing filenames/cleanup.
- Prepared usability changes for operation locking, progress indicators and customer/invoice list updates after saves.
- Added native recovery test cases; drafted real Auth/API tests, but script creation was interrupted and its presence/completeness must be checked.

These changes are NOT verified, committed application code. Inspect the recovered workspace and reconcile its branch with this documentation commit before continuing. Do not discard the workspace or overwrite its changes.

## Migration reconciliation procedure

1. Verify the five exported scripts against the read-only hosted migration table, including versions, names and full statement contents. Preserve exact applied scripts; do not rewrite them as new migrations.
2. Retain the existing security migration filename 20261113192441_harden_function_paths_and_profile_privileges.sql.
3. Production history has five April versions plus that security version. The only pending application migration should be 20261113192503_atomic_invoice_save.sql.
4. An empty local database cannot replay those historical changes without the original manually created schema. Bootstrap from the schema-only captured snapshot; omit the test-only auth.users/auth.uid stubs and role creation. Keep real local Supabase Auth infrastructure.
5. Mark snapshot-covered history applied ONLY in the local isolated database. Then apply finance locally using an explicit local target. Record migration-list output and catalog comparison.
6. Never run migration repair, db reset, schema bootstrap or a generic linked push against production during this milestone.

## Required end-to-end evidence

Use two disposable accounts created through genuine signUp, not SQL-created auth rows. Capture their confirmation/recovery emails locally. Keep passwords, keys and tokens in ignored files; print only test names and results.

- Confirmation required before login; correct/incorrect password behavior.
- Account A and B cannot read, edit, delete or attach the other's customers, invoices or items through actual JWT-authenticated APIs.
- Profile settings remain usable while subscription/billing writes fail.
- Session persistence, explicit refresh and expiry-triggered refresh, logout clearing, revoked refresh-token rejection and account switching.
- Recovery email delivery, same-device PKCE exchange, password change, old-password rejection, expired/replayed links and cold/warm native deep links.
- Access JWTs can remain valid until expiry after logout; test and document this separately from refresh-token revocation. Do not claim instantaneous JWT invalidation.
- Browser invoice creation/edit/status/deletion flows, all supported currency precisions, invalid dates/discounts and legacy values.
- Offline/reconnect and response loss after a real committed save; retry must produce one invoice and preserve the request key.
- PDF content and pagination, HTML escaping, correct stored totals/snapshots and browser print output.
- Native keychain/keystore draft persistence, interrupted writes, cold starts, account separation and share-sheet outcomes.

Browser automation can use the installed Chromium and Playwright. A browser-sized mobile viewport is not a native device test. Rendering native invoice HTML to a PDF in Chromium does not verify expo-print or an OS share sheet.

## Physical devices and builds

No physical iPhone or Android test was performed. This environment had neither adb nor xcodebuild available. No signed iOS artifact or installed Android APK was produced.

Developer assistance required after the environment is restored:

- Provide a Mac with Xcode and an iPhone, or an existing authorized signing/build environment; select the development team/device without committing signing secrets.
- Provide an Android device with USB debugging and Android SDK/adb, or an emulator host.
- Run the isolated backend on a computer reachable by those devices through an approved trusted development connection. The cloud workspace's 127.0.0.1 address is not reachable from a phone. Do not publish the default-key local stack openly.
- Configure device-specific ignored public URL/key values and matching exact recovery redirects.
- Build/install development-client APK and iOS development/simulator builds, then record model, OS, build hash and pass/fail evidence for each test.
- Verify custom-scheme association after a real native rebuild, cold/warm email links, keyboard behavior, loading/error states, font scaling, screen readers, offline drafts and real PDF sharing.

No paid EAS build or hosted resource is authorized by this plan. Local development builds are the default.

## Coordinated production release, after explicit approval

### Preconditions

- Recover, review, commit and push the new code; pass web/mobile/database CI for that exact code commit.
- Complete real Auth/API/browser tests and physical-device tests. Resolve any native CAPTCHA or recovery-provider configuration.
- Complete a local clean bootstrap and migration-list check; test the full finance migration and concurrency suite with actual Auth infrastructure.
- Review definer RPC permissions and private request-journal access; run advisors on the isolated target.
- Record production schema/ACL/migration-history fingerprints and a tested recovery backup. Never place account data or credentials in Git.
- Validate invoice/customer/profile snapshots, manual payment-state behavior and supported currencies. Define request-journal retention.
- Prepare a known-good RPC-compatible frontend artifact and the exact finance SQL artifact together. No old multi-request client may retain write traffic after privileges change.
- Obtain approval for the production schema/application change and maintenance window. Approval to this plan alone does not execute a release.

### Release sequence

1. Announce/enter a write-maintenance window using a reviewed application mechanism. Confirm old browser/mobile clients cannot continue multi-request invoice writes.
2. Capture the final backup, schema/ACL/history state and active version. Confirm the existing security migration stays applied.
3. Apply only the reviewed finance migration, once, transactionally. Verify columns, per-account uniqueness, request journal, functions and client grants.
4. Deploy the exact RPC-compatible web artifact. Enable only explicitly approved native distribution; no store submission is part of the web release.
5. Smoke-test with disposable production test records: login, tenant isolation, invoice save/retry/edit/issue, PDF and logout. Remove test records through an authorized server cleanup after retaining evidence.
6. Reopen writes only after reconciliation and smoke tests pass. Monitor error rate, unique/version conflicts, request retries and totals. Record deployed commit, migration version and evidence.

### Rollback and failure handling

Before finance migration commit: abort the migration transaction; retain the existing application and live security hardening.

After schema commit but before any finance writes: keep maintenance mode. Prefer deploying the known-good RPC-compatible frontend or repairing the failed deployment. If reverting to the legacy client is necessary, first prove that no new finance records/duplicates exist. A reviewed transactional rollback must restore the original invoker line-total trigger body, original global invoice-number uniqueness and legacy authenticated invoice/item CRUD grants. Keep the security restrictions on anonymous access and billing columns. Preserve new metadata/snapshots/journal for investigation; do not drop financial data automatically.

After any finance writes: do NOT restore the old multi-request frontend and unrestricted writes as an emergency shortcut. Global uniqueness might no longer be valid, issued snapshots and versions may be in use, and restoring a database backup could discard legitimate work. Keep writes paused and roll forward to a known-good RPC-compatible build. If data restoration is unavoidable, obtain explicit approval for the data-loss/replay window, preserve the request journal and all intervening changes, reconcile records and test recovery before reopening.

Native rollback must account for already-installed clients; prevent their write access while the incompatible backend state exists. No configuration change can assume installed apps update immediately.

## Resume order

Restore the execution environment; inspect git status and interrupted commands; fetch this documentation commit without discarding local edits. Complete the local stack and bootstrap, then real Auth/API tests, browser tests, native prebuild/build verification, all tests/CI and device-assisted checks. Replace this blocked status with measured results only after those steps succeed.
