# InvoiceBillos mobile development app

Expo 58 / React Native app for iOS and Android. See `../docs/ENGINEERING_VERIFICATION_2026-11-13.md` for verification, limitations and release gates.

```
npm ci --ignore-scripts
cp .env.example .env
# Fill in your DEVELOPMENT project's URL and publishable key.
npm run typecheck
npm test
npx expo install --check
npm start
```

The finance migration is staged in `../supabase/migrations/`. Install it on an isolated development backend before invoice creation. It is not installed on production. Never put a service-role key, database password or secret key in EXPO_PUBLIC variables.

Use existing-account email/password login. Refresh records to load customers/invoices, manage customers, select New invoice, choose a customer, enter ISO dates (YYYY-MM-DD) and decimal strings, then save. Native CAPTCHA and recovery flows remain release work; use the website for recovery.

One draft per account is stored with sessions in native secure storage and survives app restarts/sign-out on the same installation. Wait for the saved confirmation or use Save local draft now before leaving. Once submitted, uncertain saves stay frozen so retries use the same durable request ID. Publishing needs a connection; drafts do not publish automatically. Drafts are retained at sign-out and are not backed up or synced to other devices.

Use Generate PDF and share on an invoice to fetch authoritative values and open the native share sheet. Physical-device tests, development native builds and signing have not been completed. The identifiers in app.json are development placeholders. Do not submit this app to stores.
