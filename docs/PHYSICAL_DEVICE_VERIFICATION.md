# Physical-device validation checkpoint

Date: 2026-11-13. Starting verified commit: b1eff8d4a9e7d450612a576718a4c46426e15e6f.
Branch: engineering/backend-finance-mobile-2026-11-13. Production remains unchanged.

## Measured results

The available workspace is Linux, not the requested Mac. Node 24.22.1 and Docker are available. Xcode, CocoaPods, Android SDK/adb, a Java compiler and USB devices are unavailable; Java runtime 21 is present. Connected-host inventory also contained no Mac. No commands were run on the unrelated production hosts in that inventory.

The documented free isolated backend was started idempotently with `python3 scripts/minimal-local.py`; its local gateway health returned `ok`. This uses the existing local-only finance migration and genuine Auth stack. It does not apply finance to production.

Three moderate npm audit entries traced to a single dependency chain: Expo → @expo/fingerprint 0.21.10 → minimatch 10.2.6, GHSA-g3hv-75wg-m249. Added a scoped override of fingerprint's minimatch to 11.0.1 and updated the lockfile, retaining Expo 58 and React Native 0.88.1. `npm audit --omit=dev` then reported zero vulnerabilities. The actual Expo fingerprint API produced the same hash and 33 source identities before and after the change. TypeScript, all six mobile tests, Expo dependency compatibility checking, native project generation for both platforms, and iOS/Android JavaScript exports passed. Generated native projects remain ignored. These checks do not verify device installation or signing.

## Original verified APK preservation

Downloaded artifact 14078121175 from CI run 43508076361, source commit b1eff8d. Archive digest matched GitHub metadata:

- ZIP SHA-256: f727c3de3bbaab895512f12b4e169bf2f71817900c9ad3c144fefae10a3fcc46
- APK SHA-256: d5c737aafba9c1e530d2934d5d8b4b8d47eec076a2a70301a323b9ee03fde4fd
- APK size: 178707158 bytes.
- Package: com.invoicebillos.development; versionName 0.1.0; versionCode 1; minimum Android API 24, target API 36.
- Preserved workspace files: /workspace/work/device-validation/artifacts/invoicebillos-b1eff8d.apk, invoicebillos-b1eff8d.zip and integrity.json.
- Original GitHub artifact expiry: 2026-11-14 21:17:03 UTC. Download it before then to a durable developer machine.

An unpublished draft release `device-validation-b1eff8d` was created to preserve the APK remotely. Upload to uploads.github.com failed with HTTP 401; the draft currently has no assets. Do not treat it as an available APK download. Durable remote preservation remains blocked by upload authentication. No public release was published. Downloaded archive integrity was checked; APK signature verification and installation were not performed.

## Device evidence

| Platform | Model / OS | Installed build | Physical tests |
| --- | --- | --- | --- |
| Android | No connected device | None | Not run |
| iPhone | No connected device or Mac | No signed iOS build | Not run |

No native pass is claimed for authentication, recovery links, account isolation, customers, invoices, retries, offline drafts, cold starts, background/resume, logout/account changes, accessibility or PDF share sheets. Prior genuine backend/browser passes remain documented in RECOVERED_WORKSPACE_AND_E2E.md; they are not physical-device evidence.

## Exact developer installation steps

Use the engineering checkout on a developer computer. Install Node 24 and Docker; run root `npm ci --ignore-scripts` and mobile `npm ci --ignore-scripts`. Keep generated credentials and signing material out of Git.

Android: install JDK 21 and Android SDK/platform-tools. Attach an unlocked phone with USB debugging enabled and authorize the computer. Run `adb devices` and record model/OS/serial privately. Start `python3 scripts/minimal-local.py`, then `node scripts/e2e-local.mjs --keep-fixtures` to generate disposable accounts (private dev/accounts.local.json). Check the downloaded APK using `sha256sum` or macOS `shasum -a 256` against the hash above. Run `adb reverse tcp:54321 tcp:54321`, `adb reverse tcp:8081 tcp:8081`, then `adb install -r /path/to/invoicebillos-b1eff8d.apk`. In mobile run `npx expo start --dev-client --localhost` and open InvoiceBillos Development. This APK predates the dependency-only checkpoint; use the new CI APK when validating the updated native binary.

iPhone: use a Mac with Xcode and CocoaPods, attach/unlock/trust the iPhone and enable Developer Mode. On a fresh development backend use `DEV_PUBLIC_ORIGIN=http://<MAC_PRIVATE_IPV4>:54321 python3 scripts/minimal-local.py`; generate test accounts with the same E2E command. The script writes ignored local environment files. Use a trusted LAN and allow local network access; do not expose the development stack publicly. In mobile run `npx expo prebuild --platform ios`, open the generated ios .xcworkspace, select the existing/free Personal Team and phone, then `npx expo run:ios --device`. No paid EAS or Apple membership purchase is authorized. Run Metro with a LAN connection reachable by the phone. Existing initialized backends must be checked for matching origin/redirect configuration rather than assuming a changed environment variable rewrites them.

On each device record model, OS, app version, source commit and actual build identity. Exercise two genuine accounts, confirmation/login, refresh, invalid password, cold/warm recovery email links and password change; verify that customer/invoice/draft data never crosses accounts. Create/edit/status-change invoices in 0/2/3-decimal currencies, interrupt network before and after save, retry and verify one authoritative invoice. Relaunch offline with a saved draft; switch accounts during operations; background/resume and logout. Generate a multipage PDF with untrusted text, share to Files and another app, cancel sharing and retry. Record each pass/failure and rerun affected automated tests after any fix.

## Remaining release blockers

1. Provide an accessible Mac/Xcode signing environment and USB-authorized physical iPhone and Android phone.
2. Complete durable remote APK preservation or download the original before expiry; resolve upload authentication without exposing credentials.
3. Build/sign/install iOS and install Android; complete the entire physical matrix above and repair confirmed defects.
4. Require web, mobile and database CI success on the exact dependency checkpoint; record the run separately from the already verified starting commit.
5. Complete the coordinated backup, rollback and production approval gates in ISOLATED_E2E_AND_CONTROLLED_RELEASE_PLAN.md. Finance remains staged for production.

Release decision: NOT READY for a controlled release until physical verification and the release gates pass.
