// Keep this checkout's loopback preview available after the task command exits.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.SP8072_PREVIEW_PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('SP8072_PREVIEW_PORT must be an integer from 1024 to 65535.');
const url=`http://localhost:${port}/standalone.html`,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=sha(readFileSync(path.join(root,'standalone.html')));
async function check(){
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(1000)});
    if(!response.ok)throw new Error(`Port ${port} is serving a different application.`);
    if(sha(Buffer.from(await response.arrayBuffer()))!==expected)throw new Error(`Port ${port} is serving a different standalone build; leave that server intact.`);
    return true;
  } catch(error){if(error.cause?.code==='ECONNREFUSED'||error.name==='TimeoutError')return false;throw error;}
}
let started=false;
if(!await check()){
  const directory=path.join(root,'tmp','sp8072-preview');mkdirSync(directory,{recursive:true});
  const log=openSync(path.join(directory,'server.txt'),'a');
  const child=spawn(process.execPath,[path.join(root,'scripts','serve.mjs')],{cwd:root,env:{...process.env,PORT:String(port)},detached:true,stdio:['ignore',log,log]});
  closeSync(log);child.unref();
  writeFileSync(path.join(directory,'process.json'),JSON.stringify({pid:child.pid,port,root,startedUTC:new Date().toISOString()},null,2)+'\n');
  for(let attempt=0;attempt<20;attempt++){
    if(await check()){started=true;break;}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!started)throw new Error('Preview did not become ready; inspect tmp/sp8072-preview/server.txt.');
}
console.log(JSON.stringify({url:url+'#/tool/nasa-sp8072',started,standaloneSha256:expected,checkout:root}));
