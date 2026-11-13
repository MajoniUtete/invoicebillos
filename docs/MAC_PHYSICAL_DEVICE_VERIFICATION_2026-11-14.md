# Mac physical-device validation — 13–14 November 2026

**Decision: needs fixes and physical workflow verification before release.** Both development apps installed on real phones. Installation is verified; the requested native functional matrix is not complete. No production resource, migration, main merge, paid service or store publication was performed.

## Source preservation

Requested baseline: `b1eff8d4a9e7d450612a576718a4c46426e15e6f`.
Engineering branch: `engineering/backend-finance-mobile-2026-11-13`.
At checkout, the branch had advanced to `d6b81a4b569a2173e3aa4aee7bab1357b3dcc329`, adding the scoped native dependency fix and prior Linux report. This is a descendant of the requested baseline. Retained that change; preserved the baseline as local branch `preservation/verified-b1eff8d`.

Fresh checkout: `/Users/majoniutete/Documents/ChatGPT/questions, rough thoughts/invoicebillos-device-validation`.
The older `/Users/majoniutete/Documents/New project 2` directory has uncommitted, untracked project files and no commits. It was inspected only and left untouched.

## Mac and isolated backend

- Apple Silicon, macOS 27.2.1 (26B131); Xcode 27.2 (27B52).
- Node 22.22.2, npm 10.9.7, CocoaPods 1.16.2, Python 3.12 available. Documentation/CI use Node 24; these local checks ran on Node 22 and must not be described as Node 24 validation.
- Android SDK/platform tools and build-tools 36.0.0 available. Java 17 default; existing Homebrew Java 21.0.11 also available. The Android binary was built in CI, not rebuilt with this Mac's Java 17.
- Docker was absent. Installed free Docker CLI and Colima, started the dedicated `invoicebillos` profile (4 CPU / 4 GB RAM / 30 GB disk). No hosted resources or subscriptions.
- Started the documented minimal PostgreSQL 17 / GoTrue v2.188.1 / PostgREST v14.8 / Mailpit v1.22.3 backend. Gateway is at `http://192.168.32.101:54321`; underlying services and Mailpit bind loopback. `/health` returned `ok`.
- Finance migration ran only in isolated development databases. Genuine disposable accounts and their credentials remain in ignored `dev/accounts.local.json`; server credentials remain in ignored local files.

### Confirmed setup defect and repair

The documented LAN procedure could start the backend but `node scripts/e2e-local.mjs --keep-fixtures` then failed with **“Only the isolated loopback backend is permitted”**. Browser and expiry scripts had the same mismatch.

Added shared `assertLocalTestOrigin`: loopback still works; LAN requires explicit matching `DEV_PUBLIC_ORIGIN`, HTTP port 54321, no URL credentials/path/query/fragment, the minimal development stack identity, an RFC1918 IPv4 address, and that address assigned to this Mac. Hosted addresses and other LAN computers remain rejected. Added regression coverage for accepted/rejected origins and updated the LAN instructions. Ignored local native build directories to prevent accidental commits of generated binaries/signing material.

## Device and build evidence

| Item | Physical Android | Physical iPhone |
| --- | --- | --- |
| Model | HONOR TFY-LX1 | iPhone 13 Pro Max (iPhone14,3) |
| OS | Android 13 / API 33; TFY-L31CQ 7.1.0.295(C431E5R2P5) | iOS 27.3 (24C5037i) |
| Connection | USB, adb authorized | Wired, paired; Developer Mode enabled |
| App identifier | `com.invoicebillos.development` | `com.invoicebillos.development` |
| Version/build | 0.1.0 / 1; min API 24, target 36 | 0.1.0 / 1 |
| Installation | Original verified APK installed, then updated in place to the verified `d6b81a4` CI APK | Generated, built, signed and installed successfully |
| Signing | APK v2 signature verification passed | Existing Apple Development identity; team TFZVJQFG48; `codesign --verify --deep --strict` passed |
| Runtime evidence | USB reverse mappings 8081 and 54321 configured; native UI behavior unverified | Running app process observed; Metro served the iOS bundle; native sign-in screen visibly rendered |

The iOS native source is `d6b81a4`; subsequent changes in this task affect development test scripts/documentation only. Its code-directory hash is `4557828a4b4792c04e09972dd250673f00247c5f`. Generated project and build remain ignored under `mobile/ios` and `dev/ios-build.local`. No distribution/store signing or upload occurred. Do not publish device identifiers, signing profiles or disposable credentials.

### Original APK preserved locally

Outside Git: `../device-validation-artifacts/verified-android.zip`, `app-debug.apk`, `original-integrity.json`.

- Actions run: 43508076361; artifact 14078121175; source `b1eff8d`.
- ZIP SHA-256 matches GitHub metadata: `f727c3de3bbaab895512f12b4e169bf2f71817900c9ad3c144fefae10a3fcc46`.
- APK SHA-256: `d5c737aafba9c1e530d2934d5d8b4b8d47eec076a2a70301a323b9ee03fde4fd`.
- APK size: 178707158 bytes. APK signature check and `adb install -r` passed.
- Original artifact expires 14 November 2026 at 23:17:03 Helsinki; the local preserved files survive that expiry.

The dependency-patched APK was also downloaded from successful run 43512412059, artifact 14079901367, source `d6b81a4`. Saved in `../device-validation-artifacts/patched-d6b81a4/`, together with `integrity.json`. ZIP SHA-256 `72abffce1f11504dda7957d16a2904b87f10191d4c80ace7531304de7e6641c2` matches GitHub metadata; APK SHA-256 `f00feaff568744e8d6e147a4478ad8461a68e466b5fb54c2f8533284cadfbd4c`, 178707162 bytes. Signature verification and in-place `adb install -r` passed without removing app data. This is the final installed Android binary.

## Functional evidence — do not conflate platforms

| Requested area | Physical Android | Physical iPhone | Automated evidence on this Mac |
| --- | --- | --- | --- |
| Real login / confirmation | Not verified in native UI | Not verified in native UI | Two genuine signups, confirmation and login passed; browser login passed |
| Recovery | Cold/warm link and password entry unverified | Cold/warm link and password entry unverified | Genuine email + native PKCE helper and browser callback/password change passed |
| Isolation / account change / logout | Native state/storage workflow unverified | Native state/storage workflow unverified | JWT/RLS, billing-write denial, foreign invoice denial and two-tab clearing passed |
| Customers | Native create/edit/delete unverified | Native create/edit/delete unverified | Fixture creation and account isolation passed |
| Invoice creation / amounts | Native UI unverified | Native UI unverified | Atomic creation/edit, all 26 currencies, exact totals passed |
| Editing saved invoices / statuses | Native controls absent | Native controls absent | Browser editing and issuance lock; API draft/paid transitions passed |
| Offline draft persistence | Unverified | Unverified | Six mobile unit tests include chunk-store isolation, interrupted writes and concurrent saves; not physical evidence |
| Retry / interrupted network | Unverified | Unverified | Lost committed response retried without duplication; concurrent same-key/create/edit tests passed |
| PDF / share / cancel | Native print/share sheets unverified | Native print/share sheets unverified | Escaping unit test and Chromium PDF rendering passed |
| Cold start / app switching / resume | Unverified | Process/bundle only, not lifecycle acceptance | Browser session reload passed; not physical evidence |

### Why physical workflow testing stopped

Both phones were detected and installed successfully, and the user confirmed they were unlocked. Device Hub displayed the iPhone home screen with the installed app, but subsequent interaction attempts failed with `noWindowsAvailable` and repeated `timeoutReached`, including after restarting the stalled process. scrcpy connected to the HONOR server but never supplied a usable control window; restarting with forward transport and then the listed software H.264 encoder did not resolve it. Android Studio detected the phone, but repeated attempts to open mirroring did not provide a usable device screen; coordinate control also returned `noWindowsAvailable`.

A forced restart of the frozen Device Hub subsequently restored screen viewing: the iPhone showed the rendered InvoiceBillos sign-in form. Pointer actions still consistently returned `noWindowsAvailable`, although keyboard/menu controls worked. Thus native startup/rendering has visual evidence on iPhone, but no successful native authentication or downstream workflow is claimed. This is a concrete test-control blocker, not proof of an InvoiceBillos UI defect. User confirmation that phones are unlocked is not a workflow acceptance test.

## Dependency review

The requested three moderate native findings were one inherited Expo → fingerprint → minimatch chain. Existing commit `d6b81a4` scopes fingerprint to minimatch 11.0.1. The [upstream advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) identifies 11.0.1 as patched. This task retained the fix, ran fresh installation, and independently verified:

- `mobile/npm audit --omit=dev`: zero vulnerabilities.
- Mobile typecheck, six tests, Expo compatibility and actual signed iOS build passed.
- Root production dependency audit: zero vulnerabilities. Full root install reported 11 development-inclusive entries (9 moderate, 2 high); these are not the three native findings and are not claimed resolved.
- Existing GitHub run 43512412059 completed successfully on exact dependency commit `d6b81a4`.

## Commands and measured results

All commands below ran in the fresh checkout unless a directory is given. Logs are private/ignored in `dev/*.local.log`.

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts` at root and `mobile/` | Passed |
| `colima start --profile invoicebillos --cpu 4 --memory 4 --disk 30 --vm-type vz` | Passed |
| `DEV_PUBLIC_ORIGIN=http://192.168.32.101:54321 /opt/homebrew/bin/python3.12 scripts/minimal-local.py` | Healthy isolated backend |
| `npm test` | 11 tests passed after the origin-guard regression test |
| `npm run lint`; `npx tsc --noEmit`; `npm run build` | Passed |
| `cd mobile`; `npm run typecheck`; `npm test`; `npm audit --omit=dev`; `npx expo install --check` | Passed, 6 tests, zero audit findings, compatible dependencies |
| `DEV_PUBLIC_ORIGIN=http://192.168.32.101:54321 node scripts/e2e-local.mjs --keep-fixtures` | All eight reported genuine-auth/finance groups passed |
| `DEV_PUBLIC_ORIGIN=http://192.168.32.101:54321 node scripts/e2e-session-expiry.mjs` | Passed when run sequentially after browser tests: genuinely expired JWT rejected, session refreshed successfully |
| `npm start -- --hostname 127.0.0.1`; `DEV_PUBLIC_ORIGIN=http://192.168.32.101:54321 node scripts/e2e-web.mjs` | All ten reported browser groups passed |
| Baseline/security/finance SQL via `docker exec -i invoicebillos-dev-db psql -U postgres -d invoicebillos_validation -v ON_ERROR_STOP=1` | Passed on a separate disposable database |
| `python3 scripts/test-concurrency.py --docker invoicebillos-dev-db --database invoicebillos_validation` | Passed |
| `cd mobile`; `CI=1 EXPO_NO_TELEMETRY=1 npx expo prebuild --platform ios --no-install`; `cd ios`; `pod install` | Passed |
| `xcodebuild -workspace InvoiceBillosDevelopment.xcworkspace -scheme InvoiceBillosDevelopment -configuration Debug -destination 'id=<connected-iPhone-UDID>' -derivedDataPath ../../dev/ios-build.local DEVELOPMENT_TEAM=TFZVJQFG48 -allowProvisioningUpdates build` | BUILD SUCCEEDED |
| `xcrun devicectl device install app --device <connected-iPhone-UDID> dev/ios-build.local/Build/Products/Debug-iphoneos/InvoiceBillosDevelopment.app` | Installed |
| `apksigner verify --verbose <preserved-APK>`; `adb install -r <preserved-APK>` | Passed original binary |
| `git diff --check` | Passed |

The first expiry attempt overlapped browser tests using the same fixture accounts and failed with `Invalid Refresh Token: Refresh Token Not Found` after those tests performed logout. The isolated rerun passed. Run these fixture-sharing suites sequentially, as CI already does; the failed concurrent attempt is retained in `dev/expiry.local.log`, and the pass in `dev/expiry-sequential.local.log`. No Auth security setting was weakened.

## Remaining release blockers and next action

1. Restore reliable physical screen/test control, or perform a recorded owner-assisted session. Complete every unverified native cell above on both phones, including cold and warm recovery, secure offline draft recovery after force-close, account isolation, interrupted saves, real PDF share/save/cancel, app switching and token-refresh lifecycle. Fix any reproduced failure and rerun its regression.
2. Native saved-invoice editing and status-change controls are absent from `mobile/App.tsx`. Decide/implement the required native workflow before claiming the requested editing/status matrix passes. API/browser functionality is not a replacement.
3. Review exact-final-checkpoint CI results separately from `b1eff8d` and `d6b81a4`. Local passes do not imply a final CI pass.
4. The minimal backend does not verify hosted staging parity, full Supabase CLI startup, hosted CAPTCHA policy, Storage or Realtime. Confirm intended hosted auth/recovery configuration before release.
5. Complete coordinated backup, rollout/rollback and explicit production approval gates in `ISOLATED_E2E_AND_CONTROLLED_RELEASE_PLAN.md`. Production finance remains staged and unapplied.

Development services are deliberately retained for the device follow-up. To stop only this task's backend without deleting data, stop the four `invoicebillos-dev-*` containers, terminate the gateway using `dev/api.local.pid`, and stop the InvoiceBillos Metro/web processes. `colima stop --profile invoicebillos` stops the dedicated VM. Do not prune Docker or remove unrelated project data.
