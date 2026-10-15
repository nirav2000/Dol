import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {improvementSummary,compareChecks} from '../improvement/model.mjs';
import {createEvidenceStore} from '../improvement/store.mjs';
import {factorPairs} from '../logic.mjs';
import {VERSION} from '../release.mjs';
const now=Date.UTC(2026,0,1),day=86400000;
class Storage {data=new Map();getItem(k){return this.data.get(k)||null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}}
const make=(i,{target=12,help=false,wrong=0,pace=10000}={})=>{
 const pairs=factorPairs(target),timestamp=now+i*day,durationMs=100000;
 const round={id:'r'+i,timestamp,startedAt:timestamp-durationMs,target,correct:pairs.length,total:pairs.length,hints:help?pairs.length:0,durationMs,mode:'practice',showCount:true};
 const events=pairs.map(([a,b],position)=>({id:'e'+i+'-'+position,at:timestamp-60000+position*10000,target,key:a+'x'+b,outcome:'correct',assisted:help,errors:0,ms:pace,roundId:round.id,mode:'practice',showCount:true,input:'keyboard',position,timing:'active-v1'}));
 return {round,events};
};
test('release labels, cache busting and service worker agree',()=>{const html=fs.readFileSync('index.html','utf8');assert.equal(JSON.parse(fs.readFileSync('version.json')).version,VERSION);assert.ok(html.includes('?v='+VERSION));assert.ok(html.includes('Dol v'+VERSION));assert.ok(fs.readFileSync('service-worker.js','utf8').includes('apps-pwa-dol-v'+VERSION.replaceAll('.','-')));});
test('helped correct answers fully count',()=>{const items=Array.from({length:6},(_,i)=>make(i,{help:true})),m=improvementSummary({rounds:items.map(x=>x.round),events:items.flatMap(x=>x.events)});assert.equal(m.accuracy.before,100);assert.equal(m.accuracy.after,100);assert.equal(m.completeness.after,100);});
test('matched pace excludes different inputs and contexts',()=>{const items=Array.from({length:6},(_,i)=>make(i,{pace:i<3?10000:7000}));const m=improvementSummary({rounds:items.map(x=>x.round),events:items.flatMap(x=>x.events)});assert.equal(m.pace.before,10);assert.equal(m.pace.after,7);for(const x of items.slice(3))for(const e of x.events)e.input='phone-pad';assert.equal(improvementSummary({rounds:items.map(x=>x.round),events:items.flatMap(x=>x.events)}).pace,null);});
test('missing history is not zero improvement',()=>{const m=improvementSummary({});assert.equal(m.accuracy,null);assert.equal(m.pace,null);});
test('guest import requires consent and preserves guest data',()=>{const storage=new Storage(),guest=createEvidenceStore({storage});const x=make(0);guest.append({events:x.events,rounds:[x.round]});const account=createEvidenceStore({accountId:'alice',storage});assert.throws(()=>account.importGuest(),/approve/);account.importGuest({approved:true});account.importGuest({approved:true});assert.equal(account.snapshot().events.length,x.events.length);assert.equal(guest.snapshot().events.length,x.events.length);});
test('offline and two devices converge without losing evidence',async()=>{const docs=new Map(),transport=uid=>({verifyUser:async id=>{if(id!==uid)throw Error('uid mismatch')},putChunks:async({accountId,chunks})=>{if(accountId!==uid)throw Error('uid mismatch');for(const c of chunks)docs.set(uid+'/'+c.id,c)},getChunks:async({accountId})=>[...docs].filter(([k])=>k.startsWith(accountId+'/')).map(([,c])=>c)});const a=createEvidenceStore({accountId:'alice',storage:new Storage()}),b=createEvidenceStore({accountId:'alice',storage:new Storage()});const x=make(0);a.append({events:x.events,rounds:[x.round]});await a.connect('alice',transport('alice'));await b.connect('alice',transport('alice'));assert.deepEqual(b.snapshot(),a.snapshot());});
