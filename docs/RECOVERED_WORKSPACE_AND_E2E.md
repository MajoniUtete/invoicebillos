# Recovered workspace and isolated end-to-end verification

Date: 2026-11-13, Europe/Helsinki. Branch: `engineering/backend-finance-mobile-2026-11-13`.

## Recovery and preservation

The original workspace reconnected. Its uncommitted changes were recovered, not reconstructed. A private archive, tracked binary diff and untracked-file list were saved outside the repository before reconciliation. No reset, clean, source deletion or replacement checkout was used. `df9ec75` fast-forwarded without conflicts.

Recovered files included web confirmation/session handling; mobile App, Auth storage, PDF helpers, dependencies, app/build configuration and recovery tests; local backend configuration/bootstrap; and all five missing April migration files. The interrupted genuine Auth test script did not exist and was newly implemented.

Incremental checkpoints:

- `e287356`: recovered recovery handlers, native development configuration and historical migrations; type/unit/prebuild checks passed.
- `a0e841c`: verified minimal isolated backend, genuine Auth/API test suite, and a non-retryable invoice version conflict.
- The later browser/security/CI commit containing this document is the release candidate for CI inspection. CI results belong to that exact commit, not to an earlier checkpoint.

## Isolated backend and migration reconciliation

The interrupted full CLI startup left two startup processes. The duplicate was stopped. The resumed large image/startup still stalled at database startup without creating a container. Its exact underlying failure was not established; a successful full CLI startup is NOT claimed.

A free alternative now works: PostgreSQL 17, real Supabase Auth/GoTrue v2.188.1, PostgREST v14.8, Mailpit v1.22.3 and a small local API gateway. There are no new hosted projects, paid services, Storage or Realtime. See `dev/README.md` and `scripts/minimal-local.py`. The normal configuration binds API and underlying ports to loopback; private-LAN device mode must be selected explicitly.

The five recovered historical files were checked against read-only hosted statement digests and match. The local snapshot retains real Auth migrations and omits test Auth stubs. Six snapshot-covered historical versions are marked applied locally; `20261113192503_atomic_invoice_save.sql` then executes locally. Production history was not repaired or modified. The local setup can be restarted without replacing its data or regenerating the client keys.

The staged finance migration was refined, not deployed: stale versions now raise PostgREST `PT409`/HTTP 409 instead of PostgreSQL `40001`. The latter can trigger database retry behavior for a business conflict. Real API tests now assert the exact conflict code. SQL and concurrent tests were updated and passed.

## Implemented repairs and improvements

- Native recovery parses only its development scheme/host/path, rejects injected session fragments, handles cold/warm links, exchanges PKCE codes or recovery hashes, requests recovery emails and updates passwords.
- Web recovery exchanges a code once in a server callback before a browser client initializes. Legacy code links are routed through that callback. Internal relative redirects preserve the host that owns the PKCE/session cookies; no caller-supplied destination is honored.
- SSR refresh cache headers are preserved; session/callback responses use private/no-store and callback redirects use no-referrer.
- Native operation locking, progress states, refreshed customer/invoice lists after saves, readable sanitized PDF filenames and temporary-file cleanup are retained.
- Native development client, internal APK/simulator build profiles, local-network development settings and both native projects' prebuild were prepared.
- Next.js/ESLint were updated to 16.4.6; compatible PostCSS/source-map-js/ws overrides remove reported web production dependency advisories. The new compiler lint check was satisfied by correcting a memo dependency, without disabling checks.

## Measured local results

- Web unit tests: 10 passed; ESLint, TypeScript and optimized Next.js build passed.
- Native unit tests: 6 passed; TypeScript, Expo dependency compatibility check and iOS/Android prebuild passed.
- Genuine Auth/API suite passed: two signups, required email confirmation via captured mail, password login, JWT account separation, forbidden owner/billing writes, exact invoice creation/editing, stale-version conflict, all 26 currencies, failed-create rollback, lost committed response retry, status/immutability, refresh rotation, logout and revoked refresh rejection.
- Genuine native recovery helper passed against the actual Auth service, including a captured email, same-client PKCE exchange, replay rejection, password change and old-password denial. This is not a phone deep-link test.
- Playwright/Chromium passed: login, persisted session reload, invalid-date error recovery, invoice create/save, network response loss after commit and idempotent retry, editing, print-action invocation, PDF rendering, issuance lock, logout/account switch/foreign invoice denial, recovery email/server callback/password change/new login.
- SQL baseline/security/finance suites and two-connection concurrency tests passed on a separate disposable PostgreSQL database.
- Web production dependency audit: zero advisories. Native production dependency audit: three moderate entries in the Expo fingerprint/minimatch chain, no high/critical entries. The reported minimatch glob amplification is in the development fingerprint chain; no attacker-controlled glob path was established in the application. Retain it for dependency review.
- A separate genuine expiry test waits for the issued five-minute token to expire, asserts a 401 using the old access token, and checks SDK on-demand refresh. Its final result and all three GitHub jobs must be checked on the final code commit; do not infer a pass from the earlier immediate-refresh test.

## Exact CI and build evidence

The three existing jobs remain `web`, `mobile`, and `database`. Web runs unit/lint/type/build checks. Database adds the real Auth, browser and expiry suites to the existing SQL/concurrency checks. Mobile adds Android native prebuild and `assembleDebug` after its type/unit checks.

A successful mobile job publishes `invoicebillos-android-development`, retaining the debug APK for one day. Verify the workflow's commit SHA and job result before downloading; a configured workflow is not proof an APK exists. Download through the connected GitHub account and record its SHA-256 before device testing. Re-run the mobile job if the artifact has expired.

No physical devices were connected or tested. This Linux workspace has no Android SDK/adb or Xcode. No signed physical-iPhone build was produced. Android build success/failure is determined by the final CI run, not by Metro/prebuild output.

## Physical Android installation

1. On the development computer, check out the exact tested commit. Install Docker, Node 24, JDK 21 and Android platform tools. Run `npm ci --ignore-scripts` at root and in `mobile/`.
2. Start `python3 scripts/minimal-local.py`; it writes ignored localhost public client configuration. Do not copy the service key into the app.
3. Download and unzip the successful CI Android development artifact, or run `cd mobile && npx expo run:android --device` with the Android SDK installed.
4. Connect the phone by USB, enable Developer options/USB debugging and approve its prompt. Run:

```
adb devices
adb reverse tcp:54321 tcp:54321
adb reverse tcp:8081 tcp:8081
adb install -r /absolute/path/to/app-debug.apk
cd mobile
npx expo start --dev-client --localhost
```

5. Open InvoiceBillos Development and connect to the local Metro server. Open Mailpit at `http://127.0.0.1:54324` on the computer for disposable-account emails. The phone can reach matching localhost recovery URLs through the USB reverse mapping. Verify that opening the recovery link on the phone launches the app, in both cold and warm states.
6. Record phone model/OS, APK SHA-256 and commit; test login/logout/switching, expiry, customers, invoice retry/offline draft recovery, native PDF pagination/share/cancellation and accessibility. Browser tests do not substitute for these results.

## Physical iPhone installation

1. Use a Mac with Xcode, CocoaPods and an iPhone with Developer Mode enabled. Use an existing Apple development team or free Personal Team where supported; no paid account purchase or EAS cloud build is authorized.
2. Use a fresh isolated checkout/backend on that Mac. Determine its private LAN IP. On a trusted network with firewall access limited to the test phone, run:

```
DEV_PUBLIC_ORIGIN=http://<MAC_PRIVATE_IP>:54321 python3 scripts/minimal-local.py
cd mobile
npm ci --ignore-scripts
npx expo prebuild --platform ios
npx expo run:ios --device
```

3. In Xcode, if prompted, open the generated `mobile/ios/*.xcworkspace`, select the development target/team and the connected iPhone, and enable automatic development signing. Build/Run. Trust the developer profile on the phone when required. Free Personal Team provisioning may expire after seven days.
4. Approve the app's local-network prompt. Metro must be reachable from the iPhone on the trusted LAN. The ignored mobile env file must contain the Mac's private API origin, and the Auth email link origin is configured to match it. Do not use the cloud workspace's loopback address on a phone.
5. Read captured mail via Mailpit on the Mac and open the recovery link on the iPhone. Verify the `invoicebillos-dev://auth/recovery` scheme with an installed native build; Expo Go or an iOS simulator does not establish this physical-device behavior.
6. Record Xcode/team provisioning, device/OS, installed commit and all the Android-equivalent cases, especially secure-store lifecycle, cold/warm recovery, local-network/ATS behavior and real share-sheet output.

## Remaining release gates

Not ready for production approval until physical-device results, signing/install evidence and final exact-commit CI are reviewed. Native biometric lock/multiple drafts/push remain outside this milestone. Native CAPTCHA remains unconfigured because the isolated backend uses email confirmation and has CAPTCHA disabled; match intended hosted Auth policy before release. The full CLI path and hosted staging parity are not verified by the minimal backend.

Retain `ISOLATED_E2E_AND_CONTROLLED_RELEASE_PLAN.md` for coordinated maintenance, backup, migration/deployment and rollback instructions. After finance writes occur, roll forward with an RPC-compatible frontend; never restore unrestricted legacy writes as a shortcut. No production deployment, main merge, paid resource or store submission occurred in this continuation.
