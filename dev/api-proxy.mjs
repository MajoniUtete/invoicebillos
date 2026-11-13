// Loopback-only gateway for the minimal genuine Auth/PostgREST development backend.
import http from 'node:http';
import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('./backend.local.json',import.meta.url)));
const keys=new Set([c.ANON_KEY,c.SERVICE_ROLE_KEY]);
http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&['http://127.0.0.1:3000','http://localhost:3000'].includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,x-supabase-api-version,accept-profile,content-profile,prefer,range');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
 res.setHeader('Access-Control-Expose-Headers','content-range');
 res.setHeader('Cache-Control','private, no-store');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.url==='/health'){res.end('ok');return;}
 const auth=req.url.startsWith('/auth/v1/'),rest=req.url.startsWith('/rest/v1/');
 if(!auth&&!rest){res.writeHead(404);res.end();return;}
 if(!req.url.startsWith('/auth/v1/verify')&&!keys.has(req.headers.apikey)){res.writeHead(401);res.end('{"message":"Invalid API key"}');return;}
 const path=req.url.slice(auth?8:8);const target=(auth?'http://127.0.0.1:54327':'http://127.0.0.1:54326')+path;
 const headers={...req.headers};delete headers.host;delete headers['content-length'];
 if(auth){headers['x-forwarded-host']=new URL(c.API_URL).host;headers['x-forwarded-proto']='http';}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 try{
  const response=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),redirect:'manual'});
  res.statusCode=response.status;
  console.log(req.method,req.url.split('?')[0],response.status);
  for(const[name,value]of response.headers)if(!['connection','content-encoding','content-length','transfer-encoding','access-control-allow-origin'].includes(name))res.setHeader(name,value);
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(502);res.end('{"message":"Isolated backend unavailable"}');}
}).listen(54321,new URL(c.API_URL).hostname,()=>console.log('Isolated development API started.'));
