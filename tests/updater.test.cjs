const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const crypto=require('node:crypto');
const current={version:'2.2.0',build:'10.1',id:'2.2.0-10.1'};
const newer={version:'2.2.0',build:'11.1',id:'2.2.0-11.1'};
function fixture(){
 const changes=[],requests=[];
 let reply=newer,offline=false,reloads=0,saves=0,activations=0;
 const service={controller:null,listeners:[],addEventListener(_,fn){this.listeners.push(fn);},removeEventListener(_,fn){this.listeners=this.listeners.filter(f=>f!==fn);},async register(){return registration;}};
 const worker={state:'installed',postMessage(message,ports){if(message.type==='GET_RELEASE')ports[0].postMessage(reply);if(message.type==='ACTIVATE_RELEASE'){activations++;service.controller=worker;service.listeners.forEach(fn=>fn());}}};
 const registration={waiting:worker,active:null,installing:null,addEventListener(){},removeEventListener(){},async update(){}};
 class Channel {constructor(){this.port1={close(){}};this.port2={postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};}}
 const platform={navigator:{get onLine(){return !offline;},serviceWorker:service},MessageChannel:Channel,async fetch(url,options){requests.push({url:String(url),options});if(offline)throw new Error('offline');return {ok:true,json:async()=>reply};}};
 const context=vm.createContext({URL,AbortController,globalThis:{},setTimeout,clearTimeout,console});
 vm.runInContext(fs.readFileSync('updater.js','utf8')+'\nthis.AppUpdater=AppUpdater;',context);
 const updater=new context.AppUpdater({current,baseURL:'https://example.com/subdir/',platform,onChange:state=>changes.push({...state}),beforeReload(){saves++;},reload(){reloads++;}});
 return {updater,changes,requests,registration,worker,service,platform,setReply:r=>reply=r,setOffline:v=>offline=v,counts:()=>({reloads,saves,activations})};
}
test('same marketing version with a different deployment build is detected',async()=>{
 const f=fixture();await f.updater.check();assert.equal(f.updater.state.phase,'available');assert.equal(f.updater.state.latest.id,newer.id);
 assert.equal(f.requests[0].options.cache,'no-store');assert.match(f.requests[0].url,/\/subdir\/version.json\?_check=/);
 f.setReply(current);await f.updater.check();assert.equal(f.updater.state.phase,'current');assert.equal(f.counts().reloads,0);
});
test('offline and invalid version responses remain retryable, never report current',async()=>{
 const f=fixture();f.setOffline(true);await f.updater.check();assert.equal(f.updater.state.phase,'error');assert.match(f.updater.state.error,/离线/);
 f.setOffline(false);f.setReply({version:'<script>',build:'1',id:'bad'});await f.updater.check();assert.equal(f.updater.state.phase,'error');
 f.setReply(newer);await f.updater.check();assert.equal(f.updater.state.phase,'available');
});
test('concurrent checks share one network request',async()=>{
 const f=fixture();await Promise.all([f.updater.check(),f.updater.check(),f.updater.check()]);assert.equal(f.requests.length,1);
});
test('explicit update saves local state, activates exact release, then reloads once',async()=>{
 const f=fixture();await Promise.all([f.updater.apply(),f.updater.apply()]);assert.deepEqual(f.counts(),{reloads:1,saves:1,activations:1});
 assert.equal(f.updater.state.latest.id,newer.id);
});
test('failed update or failed persistence does not switch/reload the app',async()=>{
 const f=fixture();f.setOffline(true);assert.equal(await f.updater.apply(),false);assert.deepEqual(f.counts(),{reloads:0,saves:0,activations:0});
 f.setOffline(false);f.updater.beforeReload=()=>{throw new Error('storage full');};assert.equal(await f.updater.apply(),false);assert.equal(f.counts().activations,0);assert.equal(f.counts().reloads,0);
});
test('a newer waiting worker never auto-activates on startup',async()=>{
 const f=fixture();await f.updater.start();assert.equal(f.counts().activations,0);
 f.setReply(current);await f.updater.start();assert.equal(f.counts().activations,1);
});
function build(dir,build){execFileSync(process.execPath,['scripts/build.cjs'],{env:{...process.env,BUILD_DIR:dir,RELEASE_BUILD:build},stdio:'pipe'});}
test('release build stamps HTML, worker, client and endpoint; hashes cover every asset',()=>{
 const dir=path.resolve('work/test-build');build(dir,'test.1');const release=JSON.parse(fs.readFileSync(path.join(dir,'version.json')));
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert.match(html,new RegExp('updater.js\\?v='+release.id.replace(/\./g,'\\.')));
 const worker=fs.readFileSync(path.join(dir,'sw.js'),'utf8');const embedded=JSON.parse(worker.match(/const RELEASE = (.*?); \/\/ BUILD_RELEASE/)[1]);assert.equal(embedded.id,release.id);
 const precache=JSON.parse(worker.match(/const PRECACHE = (.*?); \/\/ BUILD_ASSETS/)[1]);assert.ok(precache.length>25);
 for(const asset of precache){const bytes=fs.readFileSync(path.join(dir,asset.url.split('?')[0]));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);}
 assert.ok(fs.readFileSync(path.join(dir,'updater.js'),'utf8').includes(`"id":"${release.id}"`));
 build(dir,'test.2');assert.notEqual(JSON.parse(fs.readFileSync(path.join(dir,'version.json'))).id,release.id);
});
async function workerFixture(fail=false){
 const dir=path.resolve('work/test-worker');build(dir,'worker.1');const handlers={},cacheData=new Map();let skipped=0,claimed=0;
 const cache={async put(url,response){cacheData.set(String(url),response);},async match(url){return cacheData.get(String(typeof url==='string'?url:url.url||url));}};
 const caches={async open(){return cache;},async delete(){cacheData.clear();return true;},async keys(){return [];},async match(req){return cache.match(req);}};
 const context=vm.createContext({URL,Request,Response,Uint8Array,crypto:crypto.webcrypto,caches,self:{registration:{scope:'https://example.com/app/'},location:{origin:'https://example.com'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++,matchAll:async()=>[]}},fetch:async req=>{
  const url=new URL(typeof req==='string'?req:req.url);if(fail&&url.pathname.endsWith('styles.css'))return new Response('corrupt');
  return new Response(fs.readFileSync(path.join(dir,url.pathname.replace('/app/',''))));
 }});
 vm.runInContext(fs.readFileSync(path.join(dir,'sw.js'),'utf8'),context);
 return {handlers,cacheData,get skipped(){return skipped;},get claimed(){return claimed;}};
}
test('service worker fully precaches before waiting for explicit activation',async()=>{
 const f=await workerFixture();let promise;f.handlers.install({waitUntil:p=>promise=p});await promise;assert.ok(f.cacheData.size>25);assert.equal(f.skipped,0);
 f.handlers.message({data:{type:'ACTIVATE_RELEASE',id:'wrong'},ports:[],waitUntil:p=>promise=p});assert.equal(f.skipped,0);
 f.handlers.message({data:{type:'ACTIVATE_RELEASE',id:require('../package.json').version+'-worker.1'},ports:[],waitUntil:p=>promise=p});await promise;assert.equal(f.skipped,1);
 let response;f.handlers.fetch({request:new Request('https://example.com/app/version.json'),respondWith:p=>response=p});assert.equal((await (await response).json()).build,'worker.1');
});
test('integrity mismatch rejects the installing worker without activation',async()=>{
 const f=await workerFixture(true);let promise;f.handlers.install({waitUntil:p=>promise=p});await assert.rejects(promise,/do not match/);assert.equal(f.skipped,0);assert.equal(f.cacheData.size,0);
});
