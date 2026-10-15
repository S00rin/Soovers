import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:8094';
const server=spawn(process.execPath,['scripts/serve.mjs','--port','8094'],{env:{...process.env,BASE_PATH:'/soovers'},stdio:'pipe'});
try{
 for(let i=0;i<30;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal((await (await fetch(base+'/healthz')).json()).status,'ok');
 const redirect=await fetch(base+'/soovers',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/soovers/');
 const html=await fetch(base+'/soovers/');assert.equal(html.status,200);const body=await html.text();assert.match(body,/SooVers/);
 for(const [,file] of body.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)){const response=await fetch(base+'/soovers/'+file.slice(2));assert.equal(response.status,200,file);assert.equal(response.headers.get('x-content-type-options'),'nosniff');}
 assert.equal((await fetch(base+'/soovers/fonts/vazirmatn-500.woff2')).status,200);
 assert.equal((await fetch(base+'/soovers/.env')).status,404);
 assert.equal((await fetch(base+'/soovers/%2e%2e%2fpackage.json')).status,404);
 assert.equal((await fetch(base+'/soovers/%ZZ')).status,400);
 assert.equal((await fetch(base+'/soovers/',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/soovers/',{method:'HEAD'})).status,200);
 console.log('PASS static-server health, subpath redirect, bundled assets/fonts, traversal rejection, malformed URL, method handling and headers.');
}finally{server.kill();}
