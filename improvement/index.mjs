import {createEvidenceStore} from './store.mjs';
import {createProgressCheck} from './check.mjs';
import {createImprovementUI} from './ui.mjs';
import {normaliseRounds} from './model.mjs';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
export function createImprovement({accountId,getState,getSessions,insights,scope=k=>k}={}) {
  let ui=null,check=null;
  const store=createEvidenceStore({accountId,onChange:()=>ui?.status(),onMerge:snapshot=>{insights.mergeEvents(snapshot.events);if(getState().view==='progress')ui?.render();}});
  // Legacy records are copied, never deleted. Separate guest/account keys remain separate.
  store.append({events:insights.events,rounds:getSessions()});
  insights.mergeEvents(store.snapshot().events);
  if(accountId!=='guest'){
    const guestEvents=read('dol-fact-evidence-v1',[]),guestLearning=read('apps-learning-v1:dol:local',{});
    if(Array.isArray(guestEvents)&&guestEvents.length||guestLearning.sessions?.length){
      const guest=createEvidenceStore({accountId:'guest'});guest.append({events:Array.isArray(guestEvents)?guestEvents:[],rounds:guestLearning.sessions||[]});
    }
  }
  const canStart=()=>!['running','paused'].includes(getState().phase);
  const snapshot=()=>{const data=store.snapshot();return {...data,rounds:normaliseRounds([...getSessions(),...data.rounds])};};
  check=createProgressCheck({store,canStart,defaultStage:()=>getState().stage,onDone:()=>ui.render()});
  ui=createImprovementUI({getSnapshot:snapshot,getStatus:store.status,startCheck:check.open,sync:()=>store.sync(),importGuest:()=>{store.importGuest({approved:true});store.sync();ui.render();},hasGuest:store.hasGuest,getDraft:store.getDraft,canStart});
  store.observe();
  function render(){store.append({events:insights.events,rounds:getSessions()});ui.render();}
  function recordRound(state,session){
    const previous=store.snapshot().rounds.filter(r=>r.target===state.target&&r.mode===state.mode).at(-1);
    store.append({rounds:[{...session,id:state.roundId,startedAt:state.startedAt,stage:state.stage,showCount:state.showCount,activeMs:Math.round(insights.activeRoundMs()),timing:'active-v1',input:insights.roundInput(),detailed:true,reason:state.result?.reason||'complete'}]});
    let note=document.getElementById('improvementRoundNote');if(!note){note=document.createElement('p');note.id='improvementRoundNote';document.getElementById('finishedPanel').append(note);}
    note.textContent=previous&&session.correct===session.total&&previous.correct<previous.total?'You found every pair this time; your previous '+state.target+' round had '+previous.correct+' of '+previous.total+'. Helped answers count fully.':session.hints?'You explored this round with support. Those correct pairs count fully in your progress.':'This round has joined your learning record. Open Progress to compare like-for-like practice.';
    store.sync({pull:false});
  }
  ui.render();
  return {render,record:event=>store.append({events:[event]}),recordRound,connect:(uid,transport)=>store.connect(uid,transport),disconnect:store.disconnect,
    export:()=>store.export(),resetGuest:()=>{store.resetGuest();ui.render();},store};
}
