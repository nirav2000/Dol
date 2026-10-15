import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createEvidenceStore} from '../improvement/store.mjs';
import {factorPairs} from '../logic.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Refusing production access: emulator required');
const rules=fs.readFileSync((process.env.APPS_CHECKOUT||'Apps-shared')+'/learning-sync/v1/firestore.rules','utf8');
const env=await initializeTestEnvironment({projectId:'demo-dol-evidence',firestore:{rules}});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const make=uid=>{const db=env.authenticatedContext(uid).firestore(),auth={app:{options:{projectId:'demo-dol-evidence'}},currentUser:{uid,getIdToken:async()=>uid}};return {db,transport:{verifyUser:async id=>{if(id!==uid)throw Error('UID mismatch')},putChunks:async({accountId,learnerId,chunks})=>{if(accountId!==uid)throw Error('UID mismatch');for(const c of chunks)await sdk.setDoc(sdk.doc(db,'learningSyncApps','dol','users',uid,'learners',learnerId,'chunks',c.id),{...c,ownerUid:uid});},getChunks:async({accountId,learnerId})=>{if(accountId!==uid)throw Error('UID mismatch');const docs=await sdk.getDocs(sdk.collection(db,'learningSyncApps','dol','users',uid,'learners',learnerId,'chunks'));return docs.docs.map(d=>{const {ownerUid,...data}=d.data();if(ownerUid!==uid)throw Error('Owner mismatch');return data;});}}};};
try{
 const a=make('alice'),b=make('alice'),bad=make('bob');
 const s=createEvidenceStore({accountId:'alice',storage:storage()}),t=createEvidenceStore({accountId:'alice',storage:storage()});
 const pairs=factorPairs(12),timestamp=Date.now(),round={id:'test-round',timestamp,target:12,mode:'practice',correct:pairs.length,total:pairs.length,hints:1,durationMs:20000};
 const events=pairs.map(([x,y],i)=>({id:'test-'+i,at:timestamp-10000+i*1000,key:x+'x'+y,target:12,outcome:'correct',assisted:i===0,ms:2000,errors:0}));
 s.append({events,rounds:[round]});await s.connect('alice',a.transport);assert.equal(s.status().error,'');await t.connect('alice',b.transport);assert.deepEqual(s.snapshot(),t.snapshot());
 const col=sdk.collection(a.db,'learningSyncApps','dol','users','alice','learners','improvement-v1','chunks'),docs=await sdk.getDocs(col);assert.ok(docs.size);
 const first=docs.docs[0];await assertFails(sdk.getDocs(sdk.collection(bad.db,'learningSyncApps','dol','users','alice','learners','improvement-v1','chunks')));
 await assertFails(sdk.deleteDoc(first.ref));await assertFails(sdk.setDoc(first.ref,{...first.data(),createdAt:1}));
 console.log('PASS Firestore owner-only, immutable chunks, two-device sync');
}finally{await env.cleanup();}
