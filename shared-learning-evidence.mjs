// Dol -> Shared Learning Evidence v1. No changes to factor scoring or original learner progress.
// Existing SDK records become practice evidence; only explicit delayed tests count as retention.
async function bootstrap() {
  const host=document.getElementById('progressView');
  if(!host)return;
  let lib;
  try{lib=await import('https://nirav2000.github.io/Apps/learning-evidence/v1/panel.js');}
  catch(e){console.warn('Shared learning evidence unavailable; Dol progress remains intact',e);return;}
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  const owner=localStorage.getItem('dol-active-account-v1')||'guest';
  const learnerId=owner==='guest'?'local':owner;
  const key='apps-learning-v1:dol:'+learnerId;
  let panel;
  try{panel=lib.mountEvidencePanel({target:host,appId:'dol',accountId:owner,learnerId,
    title:'Learning evidence · independent progress',
    onRecord:row=>window.dispatchEvent(new CustomEvent('dol-shared-evidence-recorded',{detail:row}))});}
  catch(e){console.warn('Unable to mount Dol learning evidence',e);return;}
  const hash=str=>{
    let h=2166136261;
    for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);
    return (h>>>0).toString(36);
  };
  const prepare=event=>{
    if(!event?.concept)return null;
    const linked=event.context?.learningEvidenceV1;
    if(linked?.id){
      return {id:linked.id,concept:event.concept,phase:linked.phase,correctCount:linked.correct,
        total:linked.total,support:linked.support,novel:linked.novel,
        taughtAt:linked.taughtAt,at:event.timestamp,updatedAt:event.timestamp,
        durationMs:event.durationMs,source:linked.source||{kind:'dol-sdk-v1',ref:linked.id}};
    }
    // Guided mode does not prove independence even if the learner tapped no hints.
    const hints=Math.max(0,Number(event.hints)||0),mode=String(event.mode||'');
    const support=hints>=2?'substantial-hint':hints>0?'small-prompt':
      mode==='practice'||mode==='timed'?'none':'unknown';
    const fingerprint=JSON.stringify([event.timestamp,event.concept,event.correct,event.hints,
      event.durationMs,event.mode,event.context?.attemptId,event.context?.target,event.context?.pair]);
    return {id:'dol-sdk:'+hash(fingerprint),concept:'maths:'+event.concept,
      phase:'practice',correct:!!event.correct,total:1,support,
      at:event.timestamp||Date.now(),durationMs:event.durationMs,
      source:{kind:'dol-sdk-v1',ref:hash(fingerprint)}};
  };
  function capture(){
    const current=read(key);
    const source=Array.isArray(current?.events)?current.events:[];
    try{panel.store.ingest(source.map(prepare).filter(Boolean));}
    catch(e){console.warn('Shared evidence snapshot could not be captured',e);}
  }
  function retryUnmirrored(){
    const current=read(key);
    const ids=new Set((current?.events||[]).map(e=>e.context?.learningEvidenceV1?.id).filter(Boolean));
    for(const row of panel.store.getEntries()){
      if(row.source?.kind==='parent-check'&&!ids.has(row.id))
        window.dispatchEvent(new CustomEvent('dol-shared-evidence-recorded',{detail:row}));
    }
  }
  capture();
  // Retry a parent-entered check that was saved before the cloud bridge loaded.
  retryUnmirrored();
  // Let the main game finish initialising before attempting any cloud bridge.
  window.addEventListener('dol-learning-evidence-updated',capture);
  window.addEventListener('storage',e=>{if(e.key===key)capture();});
  window.addEventListener('dol-learning-evidence-ready',retryUnmirrored,{once:true});
  window.DOL_SHARED_EVIDENCE={store:panel.store,refresh:capture,panel};
  if(new URLSearchParams(location.search).get('learningEvidence')==='1'){
    document.querySelector('[data-view="progress"]')?.click();
    panel.element.scrollIntoView({block:'start'});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap);
else bootstrap();
