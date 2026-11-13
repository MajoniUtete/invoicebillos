#!/usr/bin/env python3
"""Bootstrap ONLY the isolated CLI stack. Never links or modifies a hosted project."""
from pathlib import Path
import os, subprocess, json, shutil
root=Path(__file__).resolve().parents[1]
cli=os.environ.get('SUPABASE_CLI','supabase')
container='supabase_db_invoicebillos-local'
def psql(sql):
    return subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-qAt'],input=sql,text=True,capture_output=True,check=True).stdout.strip()
existing=psql("select to_regclass('public.invoices') is not null;")=='t'
if not existing:
    schema=(root/'tests/database/baseline.sql').read_text()
    schema=schema[schema.index('CREATE TABLE public.customers'):]
    psql('BEGIN;\n'+schema+'\nCOMMIT;')
    print('Imported schema-only snapshot; real Supabase Auth schema retained.')
# Copy exact hosted historical files and the pending finance migration into the isolated project.
migrations=root/'dev/supabase/migrations'
migrations.mkdir(exist_ok=True)
for file in sorted((root/'supabase/migrations').glob('*.sql')):shutil.copy2(file,migrations/file.name)
applied=[file.name.split('_')[0] for file in sorted(migrations.glob('*.sql')) if not file.name.endswith('atomic_invoice_save.sql')]
# Only the restored local snapshot is marked applied; production history is never repaired.
subprocess.run([cli,'--workdir',str(root/'dev'),'migration','repair','--local','--status','applied',*applied],check=True,capture_output=True)
subprocess.run([cli,'--workdir',str(root/'dev'),'migration','up','--local'],check=True,capture_output=True)
status=json.loads(subprocess.run([cli,'--workdir',str(root/'dev'),'status','--output','json'],check=True,capture_output=True,text=True).stdout)
url=status['API_URL']; key=status.get('PUBLISHABLE_KEY') or status['ANON_KEY']
for file,prefix in [(root/'.env.local','NEXT_PUBLIC'),(root/'mobile/.env.local','EXPO_PUBLIC')]:
    if file.exists() and f'{prefix}_SUPABASE_URL={url}' not in file.read_text():
        raise SystemExit('Existing client configuration preserved. Use a separate checkout or back it up before configuring localhost.')
    file.write_text(f'{prefix}_SUPABASE_URL={url}\n{prefix}_SUPABASE_PUBLISHABLE_KEY={key}\n')
    file.chmod(0o600)
private=root/'dev/backend.local.json';private.write_text(json.dumps(status));private.chmod(0o600)
print('Isolated finance migration applied; ignored development client configuration written. No credentials printed.')
