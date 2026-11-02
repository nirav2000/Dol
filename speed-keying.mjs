import {
 CHECKPOINT_VERSION,WARMUP_TARGETS,CHECKPOINT_TARGETS,MAX_SAVED_CHECKPOINTS,
 checkpointPlan,summariseTrials,matchingHistory,compareCheckpoints,
 storageKey,normaliseCheckpoints
} from './speed-keying-model.mjs';
import {STANDARD_NUMPAD_KEYS,TTRS_NUMPAD_KEYS,KEYPAD_STORAGE_KEY} from './keypad-layout.mjs';

const $=id=>document.getElementById(id);
const account=(()=>{try{return localStorage.getItem('dol-active-account-v1')||'guest';}catch{return 'guest';}})();
const key=storageKey(account);
const referenceKey='dol-speed-keying-ttrs-v1'+(account==='guest'?'':':account:'+account);
const methodKey='dol-speed-keying-method-v1'+(account==='guest'?'':':account:'+account);
const techniqueKey='dol-speed-keying-technique-v1'+(account==='guest'?'':':account:'+account);
function readPreference(storageKey,allowed,fallback){
 try{const value=localStorage.getItem(storageKey);return allowed.includes(value)?value:fallback;}catch{return fallback;}
}
function writePreference(storageKey,value){
 try{localStorage.setItem(storageKey,value);}catch{}
}
const readHistory=()=>{
 try{return normaliseCheckpoints(JSON.parse(localStorage.getItem(key)||'[]'));}catch{return [];}
};
let history=readHistory();
let run=null;
let lastResult=null;
let couldSave=true;

function supportsTouch(){
 return navigator.maxTouchPoints>0||matchMedia('(pointer:coarse), (any-pointer:coarse)').matches;
}
function deviceInfo(){
 const touch=supportsTouch();
 const ua=navigator.userAgent||'';
 const applePhone=/iPhone|iPod/i.test(ua);
 const appleTablet=/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 const shortSide=Math.min(innerWidth,innerHeight);
 const device=applePhone?'phone':appleTablet?'tablet':touch?
  (shortSide<=700?'phone':'tablet'):'desktop';
 return {device,orientation:innerWidth>innerHeight?'landscape':'portrait'};
}
function seconds(ms){return Number.isFinite(ms)?(ms/1000).toFixed(2)+'s':'—';}
function dateLabel(timestamp){return new Date(timestamp).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});}
function setupDescription(record){
 const title=record.method==='hardware'?'hardware keys':record.layout==='ttrs'?'TTRS pad':'physical pad';
 return [record.device,record.orientation,title,record.technique.replaceAll('-',' ')].join(' · ');
}
function download(name,content,type){
 const blob=new Blob([content],{type});
 const href=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function readReference(){
 try{return localStorage.getItem(referenceKey)||'';}catch{return '';}
}
function saveReference(){
 const val=$('speedTtrs').value.trim();
 try{if(val)localStorage.setItem(referenceKey,val);else localStorage.removeItem(referenceKey);}catch{}
}
function currentLayout(){
 try{return localStorage.getItem(KEYPAD_STORAGE_KEY)==='ttrs'?'ttrs':'physical';}catch{return 'physical';}
}
function renderPad(layout){
 const pad=$('speedPad');
 pad.replaceChildren();
 const keys=layout==='ttrs'?TTRS_NUMPAD_KEYS:STANDARD_NUMPAD_KEYS;
 for(const keyValue of keys){
  const button=document.createElement('button');
  button.type='button';
  button.dataset.speedKey=keyValue;
  button.textContent=keyValue==='clear'?'⌫':keyValue==='action'?'✓':keyValue;
  button.setAttribute('aria-label',keyValue==='clear'?'Delete last digit':keyValue==='action'?'Submit number':'Digit '+keyValue);
  if(keyValue==='clear')button.className='erase';
  if(keyValue==='action')button.className='confirm';
  // Touch pointerdown is the earliest reliable sampling point. Keep the
  // subsequent synthesized click from entering a duplicate digit.
  let suppressClick=false,suppressTimer=null,ackTimer=null;
  button.addEventListener('pointerdown',event=>{
   if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
   event.preventDefault();
   suppressClick=true;
   clearTimeout(suppressTimer);
   suppressTimer=setTimeout(()=>{suppressClick=false;},850);
   press(keyValue,'touch');
   button.classList.add('pressed');clearTimeout(ackTimer);
   ackTimer=setTimeout(()=>button.classList.remove('pressed'),120);
  });
  button.addEventListener('click',event=>{
   if(suppressClick){event.preventDefault();suppressClick=false;clearTimeout(suppressTimer);return;}
   press(keyValue,'touch');
  });
  pad.append(button);
 }
}
function setMethod(){
 const method=$('speedMethod').value;
 $('speedLayout').disabled=method==='hardware';
 const label=method==='hardware'?'Hardware keyboard · type digits, Backspace and Enter':
  'Touchscreen · copy digits and tap ✓';
 $('speedDeviceLabel').textContent=deviceInfo().device+' · '+deviceInfo().orientation+' · '+label;
}
$('speedLayout').value=currentLayout();
$('speedMethod').value=readPreference(methodKey,['touch','hardware'],supportsTouch()?'touch':'hardware');
$('speedTechnique').value=readPreference(techniqueKey,['index','thumbs','two-fingers','other'],
 deviceInfo().device==='phone'?'thumbs':'index');
$('speedTtrs').value=readReference();
$('speedMethod').addEventListener('change',()=>{
 writePreference(methodKey,$('speedMethod').value);
 setMethod();
});
$('speedTechnique').addEventListener('change',()=>writePreference(techniqueKey,$('speedTechnique').value));
$('speedLayout').addEventListener('change',()=>{
 try{localStorage.setItem(KEYPAD_STORAGE_KEY,$('speedLayout').value);}catch{}
});
$('speedTtrs').addEventListener('change',saveReference);
setMethod();

function resetTrial(){
 const target=run.plan[run.index];
 run.typed='';
 run.firstDigitAt=null;
 run.lastDigitAt=null;
 run.digitPresses=[];
 run.backspaces=0;
 $('speedTyped').textContent='—';
 $('speedTarget').textContent=target;
 const measured=run.index>=WARMUP_TARGETS.length;
 const index=measured?run.index-WARMUP_TARGETS.length:run.index;
 const total=measured?CHECKPOINT_TARGETS.length:WARMUP_TARGETS.length;
 $('speedPhase').textContent=measured?'MEASURED CHECKPOINT':'WARM-UP · NOT SCORED';
 $('speedCounter').textContent=(index+1)+' of '+total;
 $('speedProgressFill').style.width=(100*run.index/run.plan.length)+'%';
 $('speedInputGuidance').textContent=measured?'Enter the displayed number, then submit.':'Warm up your fingers; these do not count.';
 // Each displayed prompt starts a fresh clock. Never include inter-question
 // delays, feedback or page navigation in the next response time.
 run.shownAt=performance.now();
}
function start(){
 const setup=deviceInfo();
 const method=$('speedMethod').value;
 const layout=method==='hardware'?'hardware':$('speedLayout').value;
 const technique=$('speedTechnique').value;
 const ref=Number($('speedTtrs').value);
 // Save even when the user accepts the detected default without changing
 // the selector; Safari and PWA device-mode detection can vary on reload.
 writePreference(methodKey,method);
 writePreference(techniqueKey,technique);
 saveReference();
 const targets=checkpointPlan(history.length);
 run={
  id:crypto.randomUUID(),version:CHECKPOINT_VERSION,startedAt:Date.now(),
  device:setup.device,orientation:setup.orientation,method,layout,technique,
  ttrsAvgSec:Number.isFinite(ref)&&ref>0&&ref<=20?ref:null,
  plan:[...WARMUP_TARGETS,...targets],index:0,trials:[]
 };
 renderPad(layout==='hardware'?'physical':layout);
 $('speedPad').hidden=method==='hardware';
 $('speedHardwareHint').hidden=method!=='hardware';
 $('speedSetup').hidden=true;
 $('speedResults').hidden=true;
 $('speedRunning').hidden=false;
 document.body.classList.add('speed-testing');
 resetTrial();
 window.scrollTo({top:0,behavior:'auto'});
}
function press(value,source){
 if(!run||$('speedRunning').hidden)return;
 if(source==='hardware'&&run.method!=='hardware')return;
 if(source==='touch'&&run.method!=='touch')return;
 const now=performance.now();
 if(value==='clear'){
  if(!run.typed)return;
  run.typed=run.typed.slice(0,-1);
  run.backspaces++;
 }else if(value==='action'){
  submit(now);
  return;
 }else if(/^\d$/.test(value)){
  if(run.typed.length>=4)return;
  run.typed+=value;
  if(run.firstDigitAt===null)run.firstDigitAt=now;
  run.lastDigitAt=now;
  run.digitPresses.push(Math.max(0,Math.round(now-run.shownAt)));
 }else return;
 $('speedTyped').textContent=run.typed||'—';
}
function submit(now){
 const target=run.plan[run.index];
 const totalMs=Math.max(0,Math.round(now-run.shownAt));
 const first=run.firstDigitAt===null?null:Math.max(0,Math.round(run.firstDigitAt-run.shownAt));
 const entryMs=first===null?null:Math.max(0,totalMs-first);
 const confirmMs=run.lastDigitAt===null?null:Math.max(0,Math.round(now-run.lastDigitAt));
 const trial={
  position:run.index,target,entered:run.typed,correct:run.typed===target,
  timestamp:Date.now(),totalMs,reactionMs:first,entryMs,
  confirmMs,backspaces:run.backspaces,digitPresses:run.digitPresses.slice(),
  source:run.method
 };
 if(run.index>=WARMUP_TARGETS.length)run.trials.push(trial);
 run.index++;
 if(run.index>=run.plan.length){complete();return;}
 resetTrial();
}
function complete(){
 const finished=run;run=null;
 if(!finished||finished.trials.length!==CHECKPOINT_TARGETS.length)return;
 const summary=summariseTrials(finished.trials);
 const checkpoint={
  id:finished.id,version:finished.version,startedAt:finished.startedAt,
  completedAt:Date.now(),device:finished.device,orientation:finished.orientation,
  method:finished.method,layout:finished.layout,technique:finished.technique,
  ttrsAvgSec:finished.ttrsAvgSec,summary,trials:finished.trials
 };
 history=normaliseCheckpoints([...history,checkpoint].slice(-MAX_SAVED_CHECKPOINTS));
 couldSave=true;
 try{localStorage.setItem(key,JSON.stringify(history));}
 catch(error){couldSave=false;console.warn('Speed checkpoint only saved in memory',error);}
 lastResult=checkpoint;
 $('speedRunning').hidden=true;
 document.body.classList.remove('speed-testing');
 $('speedResults').hidden=false;
 $('speedSetup').hidden=true;
 renderResults(checkpoint);
 renderHistory();
 window.scrollTo({top:0,behavior:'auto'});
}
function createBar(label,ms,range,klass){
 const row=document.createElement('div');row.className='comparison-row';
 const title=document.createElement('span');title.textContent=label;
 const track=document.createElement('div');track.className='comparison-track';
 const fill=document.createElement('div');fill.className='comparison-fill '+klass;
 fill.style.width=Math.max(2,ms/range*100)+'%';
 const value=document.createElement('strong');value.textContent=seconds(ms);
 track.append(fill);row.append(title,track,value);
 return row;
}
function renderResults(record){
 const result=record.summary;
 $('speedMedian').textContent=seconds(result.medianMs);
 $('speedAccuracy').textContent=Math.round(result.firstTryAccuracy*100)+'%';
 $('speedReaction').textContent=seconds(result.medianReactionMs);
 $('speedEntry').textContent=seconds(result.medianEntryMs);
 $('speedResultSub').textContent=dateLabel(record.startedAt)+' · '+setupDescription(record);
 const quality=$('speedQualification');
 quality.textContent=(couldSave?'Saved locally. ':'Storage full: export this checkpoint now. ')+
  result.corrections+' correction'+(result.corrections===1?'':'s')+' · '+Math.round(result.accuracy*100)+'% submitted accurately. '+
  (result.qualified?'Comparable baseline (at least 90% first-try accuracy).':
   'Provisional result: below 90% first-try accuracy. Improve accuracy before using speed changes as evidence.');
 quality.dataset.good=String(result.qualified);
 const matched=matchingHistory(history,record);
 const comparison=compareCheckpoints(history,record);
 const {baseline}=comparison;
 const bars=$('speedComparisonBars');bars.replaceChildren();
 if(baseline?.summary.medianMs!==null&&record.summary.medianMs!==null){
  const max=Math.max(1,baseline.summary.medianMs,record.summary.medianMs)*1.06;
  bars.append(createBar('Baseline',baseline.summary.medianMs,max,'baseline'));
  if(baseline.id!==record.id)bars.append(createBar('Latest',record.summary.medianMs,max,'latest'));
 }
 const text=$('speedComparisonText');
 if(matched.length===1){
  text.textContent='This is your first matching checkpoint. Repeat the same setup another day to see improvement.';
 }else if(!result.qualified||!baseline?.summary.qualified){
  text.textContent='Some checkpoints are below 90% accuracy. Save them, but compare speed only after accuracy is reliable.';
 }else{
  const pct=comparison.improvementPercent;
  const direction=pct>0?'faster':pct<0?'slower':'the same speed';
  text.textContent='Against your first qualified matched checkpoint: '+
   (pct===null?'more practice needed':Math.abs(pct).toFixed(1)+'% '+direction)+
   ' · '+matched.length+' matching checkpoints recorded.';
 }
 const lengths=$('speedLengthResults');lengths.replaceChildren();
 for(const row of result.byDigits){
  const item=document.createElement('div');item.className='length-row';
  const title=document.createElement('span');title.textContent=row.digits+' digit'+(row.digits>1?'s':'');
  const n=document.createElement('strong');n.textContent=seconds(row.medianMs);
  const note=document.createElement('small');note.textContent=row.correct+' correct';
  item.append(title,n,note);lengths.append(item);
 }
 $('speedTtrsComparison').textContent=record.ttrsAvgSec?
  'Your manually entered TTRS Studio average is '+record.ttrsAvgSec.toFixed(2)+
  's per question; this number-copy checkpoint is '+seconds(result.medianMs)+
  ' per correctly copied answer. TTRS also involves interpreting and calculating, so these are different tasks: do not subtract them to claim a pure thinking time.':
  'You can enter your latest TTRS Studio average in the setup to display it beside the number-entry baseline. Dol does not import TTRS scores automatically.';
}
function renderHistory(){
 const host=$('speedHistory');host.replaceChildren();
 $('speedHistoryCount').textContent=history.length+' saved';
 if(!history.length){
  const p=document.createElement('p');p.className='muted';
  p.textContent='No checkpoints yet. Complete your first 30-number test to establish a baseline.';
  host.append(p);return;
 }
 const sorted=[...history].reverse().slice(0,15);
 for(const record of sorted){
  const card=document.createElement('article');card.className='history-item';
  const main=document.createElement('div');
  const heading=document.createElement('strong');heading.textContent=dateLabel(record.startedAt);
  const detail=document.createElement('small');detail.textContent=setupDescription(record);
  main.append(heading,detail);
  const right=document.createElement('div');right.className='history-results';
  const timing=document.createElement('strong');timing.textContent=seconds(record.summary.medianMs);
  const quality=document.createElement('small');
  quality.textContent=Math.round(record.summary.firstTryAccuracy*100)+'% first-try'+(record.ttrsAvgSec?' · TTRS '+record.ttrsAvgSec.toFixed(2)+'s':'')+(record.summary.qualified?'':' · provisional');
  right.append(timing,quality);card.append(main,right);host.append(card);
 }
}
function showSetup(){
 run=null;
 $('speedRunning').hidden=true;
 document.body.classList.remove('speed-testing');
 $('speedResults').hidden=true;
 $('speedSetup').hidden=false;
 window.scrollTo({top:0,behavior:'auto'});
}
$('speedStart').addEventListener('click',start);
$('speedAgain').addEventListener('click',showSetup);
$('speedCancel').addEventListener('click',()=>{
 if(!run)return;
 if(confirm('Cancel this checkpoint? The incomplete attempt will not be saved.'))showSetup();
});
document.addEventListener('keydown',event=>{
 if(!run||$('speedRunning').hidden||run.method!=='hardware')return;
 if(event.repeat||event.altKey||event.metaKey||event.ctrlKey||event.isComposing)return;
 if(event.target instanceof HTMLElement&&event.target.matches('input,select,textarea'))return;
 const key=event.key;
 if(/^\d$/.test(key)){event.preventDefault();press(key,'hardware');}
 else if(key==='Backspace'){event.preventDefault();press('clear','hardware');}
 else if(key==='Enter'){event.preventDefault();press('action','hardware');}
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&run){
  // A hidden tab produces misleading response times. Discard an interrupted
  // checkpoint rather than quietly saving a false slow result.
  showSetup();
  $('speedDeviceLabel').textContent='Checkpoint interrupted when Dol went into the background. Restart for a clean measurement.';
 }
});
$('speedExportJson').addEventListener('click',()=>{
 if(!history.length)return;
 download('dol-speed-keying-checkpoints.json',
  JSON.stringify({format:'dol-speed-keying-v1',exportedAt:new Date().toISOString(),checkpoints:history},null,2),'application/json');
});
$('speedExportCsv').addEventListener('click',()=>{
 if(!history.length)return;
 const columns=['sessionId','sessionDate','device','orientation','method','layout','technique','ttrsAverageSec','position',
  'target','entered','correct','totalMs','reactionMs','entryMs','confirmMs','backspaces','digitPressesMs'];
 const escapeCsv=value=>{const s=String(value??'');return '"'+s.replaceAll('"','""')+'"';};
 const lines=[columns.join(',')];
 for(const record of history)for(const trial of record.trials){
  const row=[record.id,new Date(record.startedAt).toISOString(),record.device,record.orientation,
   record.method,record.layout,record.technique,record.ttrsAvgSec,trial.position,
   trial.target,trial.entered,trial.correct,trial.totalMs,trial.reactionMs,trial.entryMs,
   trial.confirmMs,trial.backspaces,trial.digitPresses?.join('|')];
  lines.push(row.map(escapeCsv).join(','));
 }
 download('dol-speed-keying-trials.csv',lines.join('\r\n')+'\r\n','text/csv;charset=utf-8');
});
renderHistory();
