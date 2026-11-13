# Isolated testing backend

No hosted project is linked by these scripts. Production is untouched.

## Free minimal backend (verified alternative)

Requires Docker, Node 24 and Python 3.12+. From the repository root:

```sh
npm ci --ignore-scripts
python3 scripts/minimal-local.py
node scripts/e2e-local.mjs --keep-fixtures
npm run build
npm start -- --hostname 127.0.0.1
# In a second terminal:
npx playwright install chromium
node scripts/e2e-web.mjs
```

On Linux with a system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` for the last command. CI uses Playwright's pinned browser.

The backend uses PostgreSQL 17, genuine Supabase Auth v2.188.1, PostgREST v14.8 and Mailpit v1.22.3. These are pinned public images except the PostgreSQL 17 maintenance tag. There is no Storage, Realtime, billing service or cloud resource. `api-proxy.mjs` supplies a small development-only API gateway; it is not production hosting software.

A schema-only snapshot bootstraps the six public tables. Real GoTrue migrations own the Auth schema; test-only Auth stubs are omitted. Snapshot-covered historical versions are recorded locally; only the pending atomic finance migration executes afterward. Existing local data is preserved on restart.

Generated passwords, signing material, keys and disposable account details stay in ignored `*.local.*` files. Do not print or publish them. Never copy the server/service role key into client configuration. Both client env files receive only the local anonymous key.

The default API is loopback port 54321; Mailpit is loopback 54324. All underlying Auth/REST/database ports bind loopback. For a trusted private-LAN physical iPhone setup on a fresh Mac host, use `DEV_PUBLIC_ORIGIN=http://<MAC_PRIVATE_IP>:54321 python3 scripts/minimal-local.py`; only the gateway binds that private IP. The script refuses public origins and preserves a stack configured for a different URL. Keep the Mac firewall limited to the test device; stop the gateway and containers when done.

For this LAN mode, pass the same `DEV_PUBLIC_ORIGIN` to `scripts/e2e-local.mjs`, `scripts/e2e-web.mjs`, and `scripts/e2e-session-expiry.mjs`. These tests accept only an explicitly selected RFC1918 address assigned to this computer, using the minimal isolated backend and port 54321. Hosted URLs and other LAN machines remain rejected. Example:

```sh
DEV_PUBLIC_ORIGIN=http://<MAC_PRIVATE_IP>:54321 node scripts/e2e-local.mjs --keep-fixtures
```

Stop just this test stack without deleting data:

```sh
docker stop invoicebillos-dev-rest invoicebillos-dev-auth invoicebillos-dev-mail invoicebillos-dev-db
```

Stop the gateway using the PID recorded in `dev/api.local.pid`; rerun the setup script to resume. Do not use `docker system prune`, delete volumes, or reset an unrelated workspace.

## Full Supabase CLI option

The recovered `supabase/config.toml`, `scripts/start-local.sh` and `scripts/bootstrap-local.py` are retained. The CLI path was not successfully brought healthy in this environment: its large database image/startup stalled. The minimal path above is the verified alternative. Never claim the CLI bootstrap as verified until tested on the target machine.

CLI version used during recovery was 2.90.0. Keep this workdir unlinked and pass explicit `--local` for history operations. Never run its bootstrap, repair or reset against production.
