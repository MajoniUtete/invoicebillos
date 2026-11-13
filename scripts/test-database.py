#!/usr/bin/env python3
"""Run rollback-only integration suites against a disposable/staging database.
Configure libpq PGHOST/PGDATABASE/PGUSER/PGPASSWORD; credentials are never printed.
"""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[1]
if len(sys.argv)!=2 or sys.argv[1] not in ('security','finance'):
    raise SystemExit('Usage: python3 scripts/test-database.py security|finance')
kind=sys.argv[1]
sql=(root/f'tests/database/{kind}.sql').read_text()
if kind=='finance':
    migration=(root/'supabase/migrations/20261113192503_atomic_invoice_save.sql').read_text()
    sql=sql.replace('BEGIN;', 'BEGIN;\n'+migration,1)
subprocess.run(['psql','--no-psqlrc','--set=ON_ERROR_STOP=1','--quiet'],input=sql,text=True,check=True)
