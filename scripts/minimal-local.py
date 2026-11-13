#!/usr/bin/env python3
"""Free cached-image local alternative; genuine GoTrue/PostgREST, loopback only."""
from pathlib import Path
import subprocess,os,json,secrets,base64,hmac,hashlib,time,urllib.request,urllib.parse,ipaddress
root=Path(__file__).resolve().parents[1];dev=root/'dev';dev.mkdir(exist_ok=True)
origin=os.environ.get('DEV_PUBLIC_ORIGIN','http://127.0.0.1:54321').rstrip('/')
parsed=urllib.parse.urlparse(origin)
if parsed.scheme!='http' or parsed.port!=54321 or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment or not ipaddress.ip_address(parsed.hostname).is_private:
    raise SystemExit('Only an explicit loopback/private-LAN HTTP development origin on port 54321 is allowed.')
if (dev/'backend.local.json').exists() and json.loads((dev/'backend.local.json').read_text()).get('API_URL')!=origin:
    raise SystemExit('Existing isolated backend URL preserved. Use a fresh development host/check-out for a different device-network origin.')
def run(args,data=None):return subprocess.run(args,input=data,text=True,capture_output=True,check=True).stdout.strip()
def envfile(name,values):
 p=dev/(name+'.local.env');p.write_text('\n'.join(f'{k}={v}' for k,v in values.items())+'\n');p.chmod(0o600);return str(p)
def container(name,image,values,ports=[]):
 existing=subprocess.run(['docker','inspect',name],capture_output=True)
 if existing.returncode==0:run(['docker','start',name]);return
 args=['docker','run','-d','--name',name,'--network','invoicebillos-isolated','--env-file',envfile(name,values)]
 for host,inner in ports:args+=['-p',f'127.0.0.1:{host}:{inner}']
 run(args+[image])
if subprocess.run(['docker','network','inspect','invoicebillos-isolated'],capture_output=True).returncode:run(['docker','network','create','invoicebillos-isolated'])
private=dev/'minimal-secrets.local.json'
if private.exists():s=json.loads(private.read_text())
else:
 s={k:secrets.token_hex(32) for k in ['jwt','db','auth','rest']};private.write_text(json.dumps(s));private.chmod(0o600)
def jwt(role):
 enc=lambda o:base64.urlsafe_b64encode(json.dumps(o,separators=(',',':')).encode()).decode().rstrip('=')
 body=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+86400*30})
 return body+'.'+base64.urlsafe_b64encode(hmac.new(s['jwt'].encode(),body.encode(),hashlib.sha256).digest()).decode().rstrip('=')
container('invoicebillos-dev-db','postgres:17-alpine',{'POSTGRES_PASSWORD':s['db']},[(54322,5432)])
for _ in range(30):
 if subprocess.run(['docker','exec','invoicebillos-dev-db','pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode==0:break
 time.sleep(1)
def sql(text):return run(['docker','exec','-i','invoicebillos-dev-db','psql','-U','postgres','-qAt','-v','ON_ERROR_STOP=1'],text)
if sql("select to_regnamespace('auth') is not null;")!='t':
 sql(f"""CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
 CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '{s['rest']}'; GRANT anon,authenticated,service_role TO authenticator;
 CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD '{s['auth']}'; CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
 CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION \"uuid-ossp\" WITH SCHEMA extensions;
 GRANT USAGE ON SCHEMA auth,public,extensions TO anon,authenticated,service_role,supabase_auth_admin;
 ALTER ROLE supabase_auth_admin SET search_path=auth,public,extensions;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 """)
sql('ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;')
container('invoicebillos-dev-mail','public.ecr.aws/supabase/mailpit:v1.22.3',{},[(54324,8025)])
container('invoicebillos-dev-auth','public.ecr.aws/supabase/gotrue:v2.188.1',{
 'API_EXTERNAL_URL':origin,'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999',
 'GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':f"postgres://supabase_auth_admin:{s['auth']}@invoicebillos-dev-db:5432/postgres?search_path=auth",
 'GOTRUE_SITE_URL':'http://127.0.0.1:3000','GOTRUE_URI_ALLOW_LIST':'http://127.0.0.1:3000/**,invoicebillos-dev://auth/recovery',
 'GOTRUE_JWT_SECRET':s['jwt'],'GOTRUE_JWT_EXP':'300','GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role',
 'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'false','GOTRUE_PASSWORD_MIN_LENGTH':'10',
 'GOTRUE_SMTP_HOST':'invoicebillos-dev-mail','GOTRUE_SMTP_PORT':'1025','GOTRUE_SMTP_ADMIN_EMAIL':'dev@example.test','GOTRUE_SMTP_SENDER_NAME':'InvoiceBillos development',
 'GOTRUE_MAILER_URLPATHS_CONFIRMATION':'/auth/v1/verify','GOTRUE_MAILER_URLPATHS_RECOVERY':'/auth/v1/verify',
 'GOTRUE_RATE_LIMIT_EMAIL_SENT':'100','GOTRUE_SMTP_MAX_FREQUENCY':'1s','GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED':'true','GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL':'10'
},[(54327,9999)])
for _ in range(40):
 try:
  urllib.request.urlopen('http://127.0.0.1:54327/health',timeout=2);break
 except Exception:time.sleep(1)
else:raise SystemExit('Auth failed readiness; inspect local container logs privately.')
sql("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;")
if sql("select to_regclass('public.invoices') is not null;")!='t':
 schema=(root/'tests/database/baseline.sql').read_text();sql('BEGIN;\n'+schema[schema.index('CREATE TABLE public.customers'):]+'\nCOMMIT;')
sql('CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY,statements text[],name text);')
for file in sorted((root/'supabase/migrations').glob('*.sql')):
 version,name=file.stem.split('_',1)
 if sql(f"select exists(select 1 from supabase_migrations.schema_migrations where version='{version}');")=='t':continue
 if 'atomic_invoice_save' in name:sql('BEGIN;\n'+file.read_text()+f"\nINSERT INTO supabase_migrations.schema_migrations(version,name)VALUES('{version}','{name}'); COMMIT;")
 else:sql(f"INSERT INTO supabase_migrations.schema_migrations(version,name)VALUES('{version}','{name}');")
container('invoicebillos-dev-rest','public.ecr.aws/supabase/postgrest:v14.8',{
 'PGRST_DB_URI':f"postgres://authenticator:{s['rest']}@invoicebillos-dev-db:5432/postgres",'PGRST_DB_ANON_ROLE':'anon','PGRST_DB_SCHEMAS':'public','PGRST_DB_EXTRA_SEARCH_PATH':'public,extensions','PGRST_JWT_SECRET':s['jwt'],'PGRST_SERVER_PORT':'3000'
},[(54326,3000)])
previous=json.loads((dev/'backend.local.json').read_text()) if (dev/'backend.local.json').exists() else {}
config={'API_URL':origin,'ANON_KEY':previous.get('ANON_KEY') if previous.get('MODE')=='minimal' else jwt('anon'),'SERVICE_ROLE_KEY':previous.get('SERVICE_ROLE_KEY') if previous.get('MODE')=='minimal' else jwt('service_role'),'MODE':'minimal','DB_CONTAINER':'invoicebillos-dev-db'}
p=dev/'backend.local.json';p.write_text(json.dumps(config));p.chmod(0o600)
for file,prefix in [(root/'.env.local','NEXT_PUBLIC'),(root/'mobile/.env.local','EXPO_PUBLIC')]:
 if file.exists() and f'{prefix}_SUPABASE_URL={config["API_URL"]}' not in file.read_text():raise SystemExit('Existing configuration preserved; use another checkout.')
 file.write_text(f'{prefix}_SUPABASE_URL={config["API_URL"]}\n{prefix}_SUPABASE_PUBLISHABLE_KEY={config["ANON_KEY"]}\n');file.chmod(0o600)
try:urllib.request.urlopen(config['API_URL']+'/health',timeout=2)
except Exception:
 log=open(dev/'api.local.log','a');proc=subprocess.Popen(['node',str(dev/'api-proxy.mjs')],stdout=log,stderr=log,start_new_session=True);(dev/'api.local.pid').write_text(str(proc.pid))
print('Isolated Auth, PostgreSQL, PostgREST and email capture initialized. Credentials remain private.')
