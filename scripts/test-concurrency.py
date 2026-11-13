#!/usr/bin/env python3
"""Concurrent integration tests on a disposable database with finance migration installed.
Uses standard libpq environment, or --docker CONTAINER [--database NAME].
Never point this test fixture runner at production.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import subprocess
import uuid
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--docker')
parser.add_argument('--database',default='postgres')
args=parser.parse_args()
command=['psql','--no-psqlrc','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=1','--set=VERBOSITY=verbose']
if args.docker:
    command=['docker','exec','-i',args.docker]+command+['-U','postgres','-d',args.database]
def query(sql,check=True):
    result=subprocess.run(command,input=sql,text=True,capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result

def literal(value):
    return "'"+str(value).replace("'","''")+"'"
def payload(value):
    return literal(json.dumps(value))+"::jsonb"
a,b=str(uuid.uuid4()),str(uuid.uuid4())
query(f'INSERT INTO auth.users(id) VALUES ({literal(a)}),({literal(b)});')
def customer(actor):
    return query(f"INSERT INTO public.customers(user_id,name) VALUES({literal(actor)},'Concurrency fixture') RETURNING id;").stdout.strip()
try:
    ca,cb=customer(a),customer(b)
    header={'invoice_number':'concurrency-'+a,'customer_id':ca,'currency':'EUR','issue_date':'2026-11-13','due_date':'2026-11-27','status':'Draft','tax_percent':'0','discount':'0'}
    lines=[{'item_name':'Test','quantity':'1','unit_price':'0.10'}]
    def save(key,body,actor=a,invoice_id=None,version=None):
        claims=literal(json.dumps({'sub':actor,'role':'authenticated'}))
        sql=f"BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims',{claims},true); SELECT public.save_invoice({literal(key)},{payload(body)},{payload(lines)},{invoice_id or 'NULL'},{version or 'NULL'}); SELECT pg_sleep(0.25); COMMIT;"
        return query(sql,False)
    def pair(first,second):
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(first),pool.submit(second)]
            return [future.result() for future in futures]
    key=str(uuid.uuid4())
    results=pair(lambda:save(key,header),lambda:save(key,header))
    assert all(r.returncode==0 for r in results),[r.stderr for r in results]
    def response(result):
        for line in result.stdout.splitlines():
            if line.startswith('{'):
                data=json.loads(line)
                if 'id' in data:return data
        raise AssertionError('Missing RPC response')
    assert response(results[0])==response(results[1]),'Same-key retry differs'
    invoice_id=response(results[0])['id']
    assert query(f"SELECT count(*) FROM public.invoices WHERE user_id={literal(a)};").stdout.strip()=='1'
    results=pair(lambda:save(str(uuid.uuid4()),header,invoice_id=invoice_id,version=1),lambda:save(str(uuid.uuid4()),header,invoice_id=invoice_id,version=1))
    assert sum(r.returncode==0 for r in results)==1,[r.stderr for r in results]
    assert any('PT409' in r.stderr for r in results),'Stale concurrent edit was not rejected'
    duplicate={**header,'invoice_number':'duplicate-'+a}
    results=pair(lambda:save(str(uuid.uuid4()),duplicate),lambda:save(str(uuid.uuid4()),duplicate))
    assert sum(r.returncode==0 for r in results)==1,[r.stderr for r in results]
    assert any('23505' in r.stderr for r in results),'Duplicate concurrent create was not rejected'
    foreign_number={**header,'customer_id':cb}
    assert save(str(uuid.uuid4()),foreign_number,actor=b).returncode==0,'Invoice numbers must be independent per account'
    print('PASS: concurrent same-key retry, conflicting edits, duplicate creates, per-account numbers')
finally:
    query(f'DELETE FROM auth.users WHERE id IN ({literal(a)},{literal(b)});')
