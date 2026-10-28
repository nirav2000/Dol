import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('PWA cache warm-up survives an HTTP 503 and limits request concurrency',async()=>{
  const source=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
  const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;
  const cacheSlug=version.replaceAll('.','-');
  const listeners=new Map(),stored=new Map();
  let concurrent=0,peak=0,attempts=0;
  const scope='https://nirav2000.github.io/Dol/';
  const context={
    URL,Promise,console,
    self:{
      registration:{scope},
      addEventListener:(type,callback)=>listeners.set(type,callback)
    },
    importScripts:()=>{}, // mock only the upstream worker; exercise Dol's install listener
    caches:{open:async()=>({put:async(url,response)=>{stored.set(url,response)}})},
    fetch:async url=>{
      attempts++;concurrent++;peak=Math.max(peak,concurrent);
      await Promise.resolve();await Promise.resolve();
      concurrent--;
      if(url.endsWith('board-aware-help.mjs'))return{ok:false,status:503};
      return{ok:true,clone(){return{ok:true,url}}};
    }
  };
  vm.runInNewContext(source,context,{filename:'service-worker.js'});
  const config=context.self.APPS_PWA_CONFIG;
  assert.equal(config.cacheName,'apps-pwa-dol-v'+cacheSlug);
  assert.equal(config.precache.length,0,'shared worker cannot use all-or-nothing addAll');
  assert.equal(config.networkFirstPaths.length,0,'static assets must be cache-first; navigation is already network-first');
  assert.ok(listeners.has('install'));
  let task;
  listeners.get('install')({waitUntil:promise=>{task=promise}});
  assert.ok(task&&typeof task.then==='function');
  await task;
  assert.ok(attempts>=50,'attempt all important Dol assets');
  assert.ok(stored.size>=attempts-1,'unavailable module does not prevent caching other files');
  assert.equal(stored.has(scope+'board-aware-help.mjs'),false,'HTTP 503 is never added to the cache');
  assert.ok(stored.has(scope+'learning-app.mjs?v='+version),'serve version-stamped JavaScript offline');
  assert.ok(stored.has(scope+'mobile-learning.css?v='+version),'serve version-stamped CSS offline');
  assert.ok(peak<=4&&peak>=2,'avoid a burst of dozens of concurrent requests');
  assert.ok(stored.has(scope+'index.html'),'cache the app shell for offline launch');
  assert.ok(stored.has(scope+'learning-app.mjs'),'cache the app entry module');
});
