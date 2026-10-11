// Node-only bridge: disk-backed Blob and memory diagnostics; actual browser worker unchanged.
import {parentPort} from 'node:worker_threads';import {openAsBlob} from 'node:fs';
globalThis.self={postMessage:(message,transfer)=>parentPort.postMessage({...message,validationMemory:process.memoryUsage()},transfer)};
await import('../worker.mjs');
parentPort.on('message',async data=>{try{if(data.filePath){data={...data,file:await openAsBlob(data.filePath)};delete data.filePath;}self.onmessage({data});}catch(e){self.postMessage({type:'error',message:e.message});}});
