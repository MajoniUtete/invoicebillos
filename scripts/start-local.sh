#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cli="${SUPABASE_CLI:-supabase}"
mkdir -p dev
# This workdir is intentionally unlinked; never add --linked to these commands.
log="$(mktemp /tmp/invoicebillos-local-start.XXXXXX)"
chmod 600 "$log"
if ! "$cli" --workdir dev start --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor >"$log" 2>&1; then
  echo "Local stack startup failed; inspect the private log: $log" >&2
  exit 1
fi
SUPABASE_CLI="$cli" python3 scripts/bootstrap-local.py
