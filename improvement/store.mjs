// Opt-in detailed evidence using the EXISTING shared, UID-checked Firestore
// transport and immutable chunk rules, under learnerId 'improvement-v1'.
import {canonical,validId,normaliseEvent,normaliseRound,normaliseCheck,normaliseEvents,normaliseRounds,roundSignature} from './model.mjs';
export const KEY='dol-improvement-v1:';
const copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({schema:1,chunks:{},uploaded:[],buffer:{events:[],sessions:[]},draft:null});
const recordOK=e=>e?.kind==='check'?!!normaliseCheck(e):!!normaliseEvent(e);
const chunkOK=c=>c&&c.schema===1&&validId(c.id)&&Number.isFinite(c.createdAt)&&Array.isArray(c.events)&&Array.isArray(c.sessions)&&c.events.length<=100&&c.sessions.length<=100&&c.events.every(recordOK)&&c.sessions.every(r=>!!normaliseRound(r))&&canonical(c).length<350000;
const timed=(promise,ms)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Sync timed out; evidence remains on this device.')),ms);Promise.resolve(promise).then(x=>{clearTimeout(timer);resolve(x);},e=>{clearTimeout(timer);reject(e);});});
export function createEvidenceStore({accountId='guest',storage=globalThis.localStorage,onChange=()=>{},onMerge=()=>{},timeoutMs=15000,now=()=>Date.now()}={}) {
  if(!validId(accountId)||accountId.length>128)throw Error('Invalid evidence account');
  const key=KEY+accountId;
  let state=blank(),transport=null,generation=0,busy=null,requested=false,wantPull=false,lastPull=0,lastSynced=null,error='',durable=true,unreadable=false;
  function read(k=key){const raw=storage?.getItem(k);if(!raw)return blank();const v=JSON.parse(raw);if(v.schema!==1||!v.chunks||Array.isArray(v.chunks)||!Object.values(v.chunks).every(chunkOK)||!Array.isArray(v.uploaded)||!v.uploaded.every(validId)||!Array.isArray(v.buffer?.events)||!v.buffer.events.every(recordOK)||!Array.isArray(v.buffer?.sessions)||!v.buffer.sessions.every(r=>!!normaliseRound(r)))throw Error('Unreadable detailed learning record');return v;}
  try{state=read();}catch{unreadable=true;durable=false;error='Existing evidence could not be read and has not been overwritten. Export your learning record before resetting anything.';}
  function mergeState(other){
    for(const c of Object.values(other.chunks)){if(state.chunks[c.id]&&canonical(c)!==canonical(state.chunks[c.id]))throw Error('Conflicting immutable evidence ID');state.chunks[c.id]=copy(c);}
    state.uploaded=[...new Set([...state.uploaded,...other.uploaded])];
    const sealed=new Set(Object.values(state.chunks).flatMap(c=>[...c.events.map(e=>e.id),...c.sessions.map(r=>r.id)]));
    const ev=new Map([...state.buffer.events,...other.buffer.events].filter(e=>!sealed.has(e.id)).map(e=>[e.id,e]));
    const rs=new Map([...state.buffer.sessions,...other.buffer.sessions].filter(r=>!sealed.has(r.id)).map(r=>[r.id,r]));
    state.buffer={events:[...ev.values()],sessions:[...rs.values()]};
  }
  const pending=()=>Object.keys(state.chunks).filter(id=>!state.uploaded.includes(id));
  const status=()=>({accountId,connected:!!transport,busy:!!busy,durable,error,unreadable,pending:pending().length+(state.buffer.events.length||state.buffer.sessions.length?1:0),lastSynced});
  const notify=()=>{try{onChange(status());}catch{}};
  function save(){
    if(unreadable){notify();return;}
    try{if(!storage)throw Error('Storage unavailable');mergeState(read());storage.setItem(key,JSON.stringify(state));durable=true;}
    catch(e){durable=false;error='Device storage could not be updated. Export this learning record. '+e.message;}
    notify();
  }
  function snapshot(){
    const all=[...Object.values(state.chunks),state.buffer],ev=all.flatMap(c=>c.events),checks=new Map(ev.filter(e=>e.kind==='check').map(c=>[c.id,c]));
    return {schema:1,events:normaliseEvents(ev),rounds:normaliseRounds(all.flatMap(c=>c.sessions)),checks:[...checks.values()].sort((a,b)=>a.at-b.at)};
  }
  function seal(){
    while(state.buffer.events.length||state.buffer.sessions.length){
      const id=globalThis.crypto?.randomUUID?.()||('chunk-'+now().toString(36)+'-'+Math.random().toString(36).slice(2));
      const c={schema:1,id,createdAt:now(),source:'dol-improvement-v1',events:copy(state.buffer.events.slice(0,50)),sessions:copy(state.buffer.sessions.slice(0,50))};
      if(!chunkOK(c))throw Error('Invalid detailed evidence chunk');
      state.chunks[id]=c;state.buffer.events.splice(0,c.events.length);state.buffer.sessions.splice(0,c.sessions.length);
    }
  }
  function append({events=[],rounds=[],checks=[]}={}){
    if(!unreadable){try{mergeState(read());}catch(e){error=e.message;}}
    const existing=snapshot(),ids=new Set([...existing.events,...existing.checks].map(e=>e.id)),signatures=new Set(existing.rounds.map(roundSignature));
    const ev=[...normaliseEvents(events),...checks.map(normaliseCheck).filter(Boolean)].filter(e=>!ids.has(e.id));
    const rs=normaliseRounds(rounds).filter(r=>!signatures.has(roundSignature(r)));
    if(!ev.length&&!rs.length)return 0;
    state.buffer.events.push(...copy(ev));state.buffer.sessions.push(...copy(rs));
    if(rounds.length||checks.length||state.buffer.events.length>=50)seal();
    save();return ev.length+rs.length;
  }
  async function sync({pull=true}={}){
    if(accountId==='guest'||!transport||unreadable)return status();
    wantPull ||= pull;
    if(busy){requested=true;return busy;}
    seal();save();const service=transport,token=generation;
    const ensure=()=>{if(token!==generation||service!==transport)throw Error('Evidence account changed');};
    const task=async()=>{
      let success=false;
      try{
        await timed(service.verifyUser(accountId),timeoutMs);ensure();
        const ids=pending();
        for(let i=0;i<ids.length;i+=20){
          const batch=ids.slice(i,i+20),chunks=batch.map(id=>state.chunks[id]);
          ensure();await timed(service.putChunks({appId:'dol',learnerId:'improvement-v1',accountId,chunks}),timeoutMs);ensure();
          state.uploaded=[...new Set([...state.uploaded,...batch])];save();
        }
        if(wantPull){
          wantPull=false;
          const remote=await timed(service.getChunks({appId:'dol',learnerId:'improvement-v1',accountId}),timeoutMs);ensure();
          if(!Array.isArray(remote)||!remote.every(chunkOK))throw Error('Cloud evidence failed validation');
          mergeState({chunks:Object.fromEntries(remote.map(c=>[c.id,c])),uploaded:remote.map(c=>c.id),buffer:{events:[],sessions:[]}});lastPull=now();
        }
        error='';lastSynced=now();save();success=true;onMerge(snapshot());
      }catch(e){if(token===generation){error=e.message||'Cloud evidence unavailable';notify();}}
      finally{
        if(token===generation){busy=null;notify();if(success&&(requested||pending().length||state.buffer.events.length||state.buffer.sessions.length)){requested=false;queueMicrotask(()=>sync({pull:false}));}}
      }
      return status();
    };
    busy=Promise.resolve().then(task);notify();return busy;
  }
  function connect(uid,next){if(uid!==accountId||uid==='guest')throw Error('Evidence account mismatch');if(!next?.verifyUser||!next?.putChunks||!next?.getChunks)throw Error('Authenticated transport required');generation++;busy=null;requested=false;transport=next;notify();return sync();}
  function disconnect(){generation++;transport=null;busy=null;requested=false;notify();}
  function importGuest({approved=false}={}){
    if(!approved||accountId==='guest')throw Error('Sign in and explicitly approve importing guest evidence');
    const guest=read(KEY+'guest'),all=[...Object.values(guest.chunks),guest.buffer],ev=all.flatMap(c=>c.events),rounds=all.flatMap(c=>c.sessions);
    const count=append({events:ev,rounds,checks:ev.filter(e=>e.kind==='check')});onMerge(snapshot());return count;
  }
  function hasGuest(){if(accountId==='guest')return false;try{const guest=read(KEY+'guest'),known=new Set([...snapshot().events,...snapshot().checks].map(e=>e.id));return [...Object.values(guest.chunks),guest.buffer].some(c=>c.events.some(e=>!known.has(e.id)));}catch{return false;}}
  function resetGuest(){if(accountId!=='guest')throw Error('Cloud evidence deletion needs an authorised server flow');state=blank();unreadable=false;error='';try{storage?.removeItem(key);}catch{}save();onMerge(snapshot());}
  function observe(host=globalThis.window){
    const online=()=>sync(),focus=()=>{if(now()-lastPull>30000)sync();},changed=e=>{if(e.key===key&&!unreadable){try{mergeState(read());onMerge(snapshot());notify();}catch{}}};
    host?.addEventListener('online',online);host?.addEventListener('focus',focus);host?.addEventListener('storage',changed);
    return ()=>{host?.removeEventListener('online',online);host?.removeEventListener('focus',focus);host?.removeEventListener('storage',changed);};
  }
  return {append,snapshot,status,sync,connect,disconnect,importGuest,hasGuest,resetGuest,observe,
    getDraft:()=>copy(state.draft),setDraft(draft){state.draft=copy(draft);save();},
    export:()=>({...snapshot(),unfinishedCheck:copy(state.draft),storageStatus:status()})};
}
