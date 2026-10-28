import {createLayoutOptions} from './layout-options.mjs';
import {factorPairs,assessPair,formatTime} from './logic.mjs';
import {STAGES,chooseAdaptiveNumber,describeDifficulty,factorHints,TECHNIQUES,requiredConcepts} from './adaptive.mjs';
import {createLearningStore,conceptPriority} from 'https://nirav2000.github.io/Apps/learning/v1/index.js';
import {createRoundTools} from './round-tools.mjs';
import {createRoundLedger} from './round-ledger.mjs';
import {createLearningSync} from 'https://nirav2000.github.io/Apps/learning-sync/v1/index.js';
// Account integration loads asynchronously so Firebase outages never block offline practice.
const activeAccount=()=>{try{return localStorage.getItem('dol-active-account-v1')||'guest'}catch{return 'guest'}};
import {createInsights} from './learning-insights.mjs';
import {createMobileEntry} from './mobile-entry.mjs';
import {createStrategySupport} from './strategy-coach.mjs';
const $=id=>document.getElementById(id);
let roundTools,insights,mobileEntry,strategySupport,layoutOptions;
let improvement=null,improvementLoading=null,improvementUser=null;
const focusKey='dol-focus-mode-v1';
const focusOptInKey='dol-focus-immersive-opt-in-v2'; // Explicit choice, not the old default-on preference.
let focusMode=readFocus();
function readFocus(){try{return localStorage.getItem(focusOptInKey)==='true';}catch{return false;}}
function applyFocus(){if(!focusMode){document.body.classList.remove('focus-menu-revealed');$('menuReveal').setAttribute('aria-expanded','false');}document.body.classList.toggle('focus-mode',focusMode);$('focusToggle').setAttribute('aria-pressed',String(focusMode));$('focusToggle').textContent=focusMode?'Exit focus':'Focus mode';$('focusSetting').checked=focusMode;}
function setFocus(value){focusMode=!!value;try{localStorage.setItem(focusKey,String(focusMode));localStorage.setItem(focusOptInKey,String(focusMode));}catch{}applyFocus();if(state.view==='play'&&state.phase==='running')focusAnswer();}
function focusAnswer(){if(document.body.classList.contains('focus-menu-revealed'))return;if(document.body.dataset.dolLayout==='pairboard'&&['phone','tablet'].includes(document.body.dataset.dolProfile))return;if(mobileEntry?.isMobile()){mobileEntry.focus();return;}if(state.view==='play'&&state.phase==='running'&&!document.hidden&&document.activeElement!==$('pairInput'))$('pairInput').focus({preventScroll:true});}
const accountId=activeAccount();
const scoped=key=>accountId==='guest'?key:key+':account:'+accountId;
const storageKey=scoped('dol-factor-frenzy-v1'),settingsKey=scoped('dol-learning-settings-v2');
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
const old=read(storageKey,{});
const prefs=read(settingsKey,{});
const learning=createLearningStore({appId:'dol',learnerId:accountId==='guest'?'local':accountId});
const ledger=createRoundLedger({storage:localStorage,key:scoped('dol-round-ledger-v1'),legacy:old,recordedSessions:(learning.getState().sessions||[]).length});
// Stage 1: durable guest learning evidence. Cloud/login remain disabled until secure Auth, rules and migration gates pass.
let learningSync=null;
try{learningSync=createLearningSync({appId:'dol',learnerId:'local',accountId});if(accountId==='guest')learningSync.capture(learning.getState());}catch(error){console.warn('Optional Learning Sync unavailable; original learning store remains active.',error);}
const state={
  phase:'ready',view:'play',mode:prefs.mode||'guided',stage:prefs.stage||'foundation',
  limit:[64,128,256,512,1024].includes(prefs.limit)?prefs.limit:128,
  duration:[30,60,90].includes(prefs.duration)?prefs.duration:60,
  showCount:prefs.showCount!==false,sound:prefs.sound!==false,
  round:ledger.data.round,score:ledger.data.score,
  visualHelp:false,target:null,previous:null,pairs:[],found:new Set(),hintedPairs:new Set(),attempted:new Set(),
  chosenFactor:null,hintLevel:0,hintsUsed:0,helpOpen:false,mistakes:0,startedWithScore:0,startedAt:0,
  remainingMs:60000,deadline:0,ticker:null,feedback:'',feedbackType:'',strategy:'',result:null,
  numberHistory:read(scoped('dol-number-history-v2'),{})
};
state.remainingMs=state.duration*1000;
function persist(){
  try{
    ledger.round(state.round);ledger.score(state.score);
    localStorage.setItem(storageKey,JSON.stringify({round:state.round,score:state.score,limit:state.limit,duration:state.duration,showCount:state.showCount,sound:state.sound}));
    localStorage.setItem(settingsKey,JSON.stringify({mode:state.mode,stage:state.stage,limit:state.limit,duration:state.duration,showCount:state.showCount,sound:state.sound}));
    localStorage.setItem(scoped('dol-number-history-v2'),JSON.stringify(state.numberHistory));
  }catch{}
}
function setView(view){
  state.view=view;
  if(view==='play')insights?.releaseTime('other-view');else insights?.holdTime('other-view');
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==view+'View');
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  if(view==='learn')renderLearn();
  if(view==='progress'){renderProgress();loadImprovement();}
  roundTools?.viewChanged();
  mobileEntry?.sync();
  strategySupport?.viewChanged();
  layoutOptions?.sync();
  if(view==='play')focusAnswer();
}
function tone(ok){
  if(!state.sound)return;
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=ok?660:240;gain.gain.value=.035;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.08);osc.onended=()=>ctx.close();}catch{}
}
function setPhase(phase){state.phase=phase;render();}
function renderClock(){
  $('timerValue').textContent=state.mode==='timed'?formatTime(state.remainingMs):'∞';
  $('timeFill').style.width=(state.mode==='timed'?Math.max(0,state.remainingMs/(state.duration*1000))*100:100)+'%';
}
function slots(){
  const node=$('pairSlots');node.replaceChildren();
  const count=state.showCount?state.pairs.length:state.found.size;
  for(let i=0;i<count;i++){
    const el=document.createElement('div'),key=[...state.found][i];
    el.className='slot'+(key?' solved':'');
    if(key){const [a,b]=key.split('-');for(const [text,cls] of [[a,'pair-number'],['×','pair-times'],[b,'pair-number']]){const part=document.createElement('span');part.className=cls;part.textContent=text;el.append(part);}}else el.textContent='? × ?';
    node.append(el);
  }
}
function factors(){
  const el=$('factorButtons');el.replaceChildren();
  if(state.phase!=='running'&&state.phase!=='paused')return;
  const cap=Math.floor(Math.sqrt(state.target));
  // 1–12 always visible in smaller games; all necessary candidate factors in larger games.
  const max=Math.max(12,cap);
  for(let i=1;i<=max;i++){
    const b=document.createElement('button');b.type='button';b.textContent=i;
    b.classList.toggle('selected',i===state.chosenFactor);
    b.setAttribute('aria-label','Explore factor '+i);
    b.disabled=state.phase==='paused';
    b.addEventListener('click',()=>{state.chosenFactor=i;state.hintLevel=0;renderHint();factors();});
    el.append(b);
  }
}
function renderHint(){
  const k=state.chosenFactor,arr=k?factorHints(state.target,k):[];
  $('hintTitle').textContent=k?'Factor '+k:'Choose a factor';
  $('hintLevel').textContent='Hint '+state.hintLevel+' of 4';
  $('hintText').textContent=k?arr[state.hintLevel]:'Is 1 a factor? What about 2? Select a number to explore without giving away the answer.';
  $('hintBack').disabled=!k||state.hintLevel===0||state.phase==='paused';
  $('hintNext').disabled=!k||state.phase==='paused';
  $('testFactor').disabled=!k||state.phase==='paused';
  $('hintNext').textContent=state.hintLevel===4?'Start over ↻':'Next hint →';
  $('hintCounter').textContent=state.hintsUsed?state.hintsUsed+' hints used':'No hints yet';
}
function render(){
  const active=state.phase==='running'||state.phase==='paused',ready=state.phase==='ready',finished=state.phase==='finished';
  $('roundValue').textContent=state.round;$('scoreValue').textContent=state.score;
  $('numberValue').textContent=ready?'?':state.target;
  $('pausedOverlay').hidden=state.phase!=='paused';
  $('challengeLabel').textContent=ready?'READY WHEN YOU ARE':finished?'ROUND COMPLETE':state.phase==='paused'?'ROUND PAUSED':'FIND EVERY FACTOR PAIR OF';
  $('readyPanel').hidden=!ready;$('activePanel').hidden=!active;$('finishedPanel').hidden=!finished;
  $('startButton').hidden=active;$('readySquareLesson').hidden=!ready;$('readyQuickSquares').hidden=!ready;$('startButton').innerHTML=finished?'Next round <span>→</span>':'Start round <span>→</span>';
  $('pauseButton').hidden=!active||state.mode!=='timed';$('pauseButton').textContent=state.phase==='paused'?'Resume':'Pause';
  $('finishButton').hidden=!active;
  $('stageSelect').value=state.stage;$('limitSelect').value=state.limit;$('durationSelect').value=state.duration;
  $('timerSetting').hidden=state.mode!=='timed';
  $('showCount').checked=state.showCount;$('sound').checked=state.sound;
  document.querySelectorAll('.controls select,[data-mode]').forEach(el=>el.disabled=active);
  document.querySelectorAll('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===state.mode));
  renderClock();
  slots(); // Keep canonical solved-pair DOM in sync on automatic completion too.
  if(active){
    $('helpToggle').hidden=false;
    $('helpToggle').textContent='Hint';
    $('helpSection').hidden=true;
    $('foundHeading').textContent=state.found.size+' found';
    $('pairCount').hidden=!state.showCount;
    $('pairCount').textContent=(state.pairs.length-state.found.size)+' left';
    $('pairInput').disabled=state.phase==='paused';$('addButton').disabled=state.phase==='paused';
    $('entryFeedback').textContent=state.feedback;
    $('entryFeedback').className='feedback'+(state.feedbackType?' '+state.feedbackType:'');
    const d=describeDifficulty(state.target);
    $('difficultyDetail').textContent='Challenge profile: '+d.pairCount+' pairs · '+d.primeFactors.length+' prime factors · difficulty '+d.score;
  }
  if(ready)$('difficultyDetail').textContent='';
  if(finished&&state.result)review();
  roundTools?.render(state);
  insights?.render();
  mobileEntry?.sync();
  strategySupport?.render();
  layoutOptions?.sync();
}
function stopTicker(){if(state.ticker!==null)clearInterval(state.ticker);state.ticker=null;}
function tick(){
  if(state.phase!=='running'||state.mode!=='timed')return;
  state.remainingMs=Math.max(0,state.deadline-performance.now());
  if(state.remainingMs<=0)finish('time');else renderClock();
}
function start(){
  if(state.phase==='running'||state.phase==='paused')return;
  roundTools?.beforeStart();
  if(state.phase==='finished')state.round++;
  state.previous=state.target;
  const suggestion=insights?.choose();
  state.target=suggestion?.number||chooseAdaptiveNumber({stage:state.stage,limit:state.limit,history:state.numberHistory,learningState:learning.getState(),previous:state.previous});
  state.visualHelp=false;state.pairs=factorPairs(state.target);state.found=new Set();state.hintedPairs=new Set();state.attempted=new Set();
  state.chosenFactor=null;state.hintLevel=0;state.hintsUsed=0;state.helpOpen=state.mode==='guided';state.mistakes=0;state.feedback='';state.feedbackType='';state.strategy='';state.result=null;
  state.startedWithScore=state.score;state.startedAt=Date.now();state.roundId=crypto.randomUUID();
  state.remainingMs=state.duration*1000;state.deadline=performance.now()+state.remainingMs;
  $('pairInput').value='';
  mobileEntry?.reset();
  insights?.start();
  strategySupport?.resetRound();
  persist();setPhase('running');stopTicker();
  if(state.mode==='timed')state.ticker=setInterval(tick,100);
  focusAnswer();
}
function pause(){
  if(state.mode!=='timed')return;
  if(state.phase==='running'){tick();if(state.phase!=='running')return;stopTicker();state.phase='paused';}
  else if(state.phase==='paused'){state.deadline=performance.now()+state.remainingMs;state.phase='running';state.ticker=setInterval(tick,100);}
  else return;
  render();
  if(state.phase==='running')focusAnswer();
}
function recordPair(pair,correct,hints=0){
  const [a,b]=pair;
  const context={target:state.target,pair:a+'x'+b,stage:state.stage};
  learning.record({concept:'factor:pair',correct,hints,mode:state.mode,context});
  if(a<=12&&b<=12)learning.record({concept:'fact:'+a+'x'+b,correct,hints,mode:state.mode,context});
  if(a<=12)learning.record({concept:'div:'+a,correct,hints,mode:state.mode,context});
}
function animateDiscoveredPair(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const pairBoard=document.body.dataset.dolLayout==='pairboard';
  const tiles=[...document.querySelectorAll(pairBoard?'#layoutPairGrid .layout-pair-chip.credited':'#pairSlots .slot.solved')];
  const tile=tiles.at(-1);
  if(!tile)return;
  tile.classList.remove('pair-discovery');
  void tile.offsetWidth;
  tile.classList.add('pair-discovery');
  tile.addEventListener('animationend',event=>{if(event.target===tile)tile.classList.remove('pair-discovery');},{once:true});
}
function answer(event){
  event.preventDefault();if(state.phase!=='running')return;
  tick();if(state.phase!=='running')return;
  const input=$('pairInput'),check=assessPair(input.value,state.target,state.found);
  // Accidental, incomplete and duplicate submissions are not misconceptions.
  if(check.status==='invalid'||check.status==='duplicate'){
    state.feedback=input.value.trim()?check.message:'';state.feedbackType='';render();focusAnswer();return;
  }
  state.feedback=check.message;state.feedbackType=check.status==='correct'?'success':'error';
  if(check.status!=='correct'){
    if(check.status==='incorrect'){const values=input.value.match(/\d+/g);if(values?.length===2)insights?.answer(values.map(Number),'incorrect',false);}
    state.mistakes++;
    if(state.mistakes>=2&&state.mode==='practice')state.feedback+=' You can open a hint to work through this.';
    if(check.status==='incorrect'&&input.value){const m=input.value.match(/\d+/g);if(m?.length===2){const a=Number(m[0]),b=Number(m[1]);if(Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>0&&b>0)recordPair([Math.min(a,b),Math.max(a,b)],false);}}
    tone(false);render();if(!(document.body.dataset.dolLayout==='pairboard'&&matchMedia('(pointer:coarse)').matches)){input.select();input.focus({preventScroll:true});}return;
  }
  const hints=Math.max(state.hintsUsed,state.visualHelp?1:0,strategySupport?.assistanceFor(check.pair)||0);
  insights?.answer(check.pair,'correct',hints>0);
  state.mistakes=0;state.found.add(check.key);if(hints)state.hintedPairs.add(check.key);
  state.score++;recordPair(check.pair,true,hints);strategySupport?.accepted(check.pair);
  tone(true);input.value='';state.feedback='Correct — '+check.pair.join(' × ')+' = '+state.target;
  state.feedbackType='success';
  // Hints are attributed to their relevant pair and the next successful visual-tool use.
  state.hintsUsed=0;state.hintLevel=0;state.chosenFactor=null;
  // A fully revealed visual board remains assisted for this round; private coach hints are pair-specific.
  persist();
  if(state.found.size===state.pairs.length)finish('complete');else{render();animateDiscoveredPair();focusAnswer();}
}
function finish(reason){
  if(state.phase!=='running'&&state.phase!=='paused')return;
  stopTicker();
  const correct=state.found.size,total=state.pairs.length;
  if(correct===total)state.score+=2;
  const earned=state.score-state.startedWithScore;
  const elapsed=state.mode==='timed'?state.duration*1000-state.remainingMs:Date.now()-state.startedAt;
  const session={timestamp:Date.now(),mode:state.mode,target:state.target,correct,total,hints:state.hintedPairs.size,durationMs:Math.max(0,elapsed)};
  learning.session(session);
  ledger.finish();
  try{learningSync?.capture(learning.getState());if(accountId!=='guest')learningSync?.sync()?.catch(error=>console.warn('Learning cloud sync deferred',error));}catch(error){console.warn('Learning Sync capture failed; original learning store remains active.',error);}
  const prev=state.numberHistory[state.target]||{attempts:0,correct:0};
  state.numberHistory[state.target]={attempts:prev.attempts+1,correct:prev.correct+(correct===total?1:0),nextDue:Date.now()+(correct===total?3:1)*86400000,recentlySeen:1};
  for(const [key,v] of Object.entries(state.numberHistory)){if(Number(key)!==state.target)v.recentlySeen=Math.max(0,(v.recentlySeen||0)-.15);}
  state.result={reason,correct,total,earned,assisted:state.hintedPairs.size};
  if(reason==='time')state.remainingMs=0;
  state.phase='finished';insights?.finish(state);try{improvement?.recordRound(state,session);}catch(e){console.warn('Progress evidence deferred',e);}persist();render();celebrateNumberResult();
}
const ANIMATION_DEFAULT=5;
const ANIMATION_KEY='dol-animation-duration-v1';
const ANIMATION_META_KEY='dol-animation-duration-updated-v1';
let animationPreferenceSync=null;
function validatedSeconds(value){const n=Number(value);return Number.isFinite(n)&&n>=0.5&&n<=6?Math.round(n*10)/10:null;}
function animationSeconds(){return validatedSeconds(localStorage.getItem(ANIMATION_KEY))??ANIMATION_DEFAULT;}
function displayAnimationSeconds(value){
  const slider=document.getElementById('animationDuration'),output=document.getElementById('animationDurationValue');
  if(slider)slider.value=String(value);
  if(output)output.textContent=Number(value).toFixed(1)+' seconds';
  document.documentElement.style.setProperty('--number-celebration-duration',value+'s');
}
function saveAnimationSeconds(value){
  localStorage.setItem(ANIMATION_KEY,String(value));
  const updatedAt=Date.now();
  localStorage.setItem(ANIMATION_META_KEY,String(updatedAt));
  displayAnimationSeconds(value);
  animationPreferenceSync?.({duration:value,updatedAt});
}
function setupAnimationDuration(){
  const slider=document.getElementById('animationDuration'),reset=document.getElementById('resetAnimationDuration');
  if(!slider||!reset)return;
  displayAnimationSeconds(animationSeconds());
  slider.addEventListener('input',()=>saveAnimationSeconds(Number(slider.value)));
  reset.addEventListener('click',()=>saveAnimationSeconds(ANIMATION_DEFAULT));
}
setupAnimationDuration();
async function syncAnimationPreference(user,store){
  animationPreferenceSync=null;
  if(!user||user.uid!==accountId)return;
  const {db,firestore,auth}=store;
  const ref=firestore.doc(db,'users',user.uid,'preferences','dol');
  const uid=user.uid;
  const status=document.getElementById('animationSyncStatus');
  const say=message=>{if(status)status.textContent=message;};
  let pending=Promise.resolve();
  const upload=({duration,updatedAt})=>{
    if(auth.currentUser?.uid!==uid)return;
    say('Saving preference to your account…');
    pending=pending.catch(()=>{}).then(async()=>{
      if(auth.currentUser?.uid!==uid)return;
      await firestore.setDoc(ref,{animationDuration:duration,animationDurationUpdatedAt:updatedAt},{merge:true});
      say('Saved to your Firebase account');
    }).catch(error=>{say('Saved locally · cloud sync unavailable');console.warn('Animation preference sync:',error);});
  };
  try{
    const snapshot=await firestore.getDoc(ref);
    if(auth.currentUser?.uid!==uid)return;
    const cloud=snapshot.exists()?snapshot.data():{};
    const cloudValue=validatedSeconds(cloud.animationDuration);
    const cloudTime=Number(cloud.animationDurationUpdatedAt)||0;
    const localValue=animationSeconds();
    const localTime=Number(localStorage.getItem(ANIMATION_META_KEY))||0;
    if(cloudValue!==null&&cloudTime>=localTime){
      localStorage.setItem(ANIMATION_KEY,String(cloudValue));
      localStorage.setItem(ANIMATION_META_KEY,String(cloudTime));
      displayAnimationSeconds(cloudValue);
      say('Synced with your Firebase account');
    }else if(localTime>0){
      upload({duration:localValue,updatedAt:localTime});
    }else if(cloudValue===null){
      say('Using default · adjust slider to save to your account');
    }
    animationPreferenceSync=upload;
  }catch(error){
    say('Saved locally · cloud sync unavailable');
    animationPreferenceSync=upload;
    console.warn('Animation preference download:',error);
  }
}
function celebrateNumberResult(){
  if(state.result?.reason!=='complete'||state.result.correct!==state.result.total)return;
  const n=state.target,prime=n>=2&&state.pairs.length===1;
  const powerTwo=n>2&&(n&(n-1))===0;
  const tiles=[...document.querySelectorAll('#layoutPairGrid .review-pair.credited, #answerReview .review-pair.credited')].filter(tile=>!tile.closest('[hidden]'));
  if(!tiles.length)return;
  const colors=['#ffe27e','#70e5ff','#ff85aa','#a7faac','#c2a1ff','#ffb16c'];
  for(const [index,tile] of tiles.entries()){
    const pair=state.pairs.find(([a,b])=>tile.dataset.reviewPair===a+'-'+b);
    if(!pair)continue;
    const square=pair[0]===pair[1];
    const kind=prime?'prime':square?'square':powerTwo?'power':'composite';
    const labels={prime:'✦ PRIME',square:'◆ PERFECT SQUARE',power:'⚡ POWER OF TWO',composite:'✦ ALL PAIRS FOUND'};
    tile.querySelector('.number-celebration')?.remove();
    const decoration=document.createElement('span');
    decoration.className='number-celebration number-celebration--'+kind;
    decoration.setAttribute('aria-hidden','true');
    decoration.style.setProperty('--celebrate-delay',(index*.12)+'s');
    if(square||prime||index===0){
      const bubble=document.createElement('span');bubble.className='number-celebration-label';
      bubble.textContent=labels[kind];decoration.append(bubble);
    }
    const sparks=document.createElement('span');sparks.className='number-celebration-sparks';
    [[-60,-32],[0,-48],[60,-32],[62,32],[0,48],[-62,32]].forEach(([x,y],i)=>{
      const star=document.createElement('span');star.className='number-celebration-spark';
      star.textContent=square?'◆':kind==='power'?'⚡':'✦';
      star.style.setProperty('--spark-x',x+'px');star.style.setProperty('--spark-y',y+'px');
      star.style.setProperty('--spark-color',colors[i]);
      star.style.setProperty('--spark-delay',(.22+i*.06+index*.12)+'s');sparks.append(star);
    });
    decoration.append(sparks);tile.append(decoration);tile.classList.add('number-celebrating');
    const cleanup=()=>{decoration.remove();tile.classList.remove('number-celebrating');};
    decoration.addEventListener('animationend',e=>{if(e.target===decoration)cleanup();},{once:true});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(cleanup);
  }
}

function review(){roundTools?.renderReview(state);}
function testSelectedFactor(){
  if(state.phase!=='running'||!state.chosenFactor)return;
  tick();if(state.phase!=='running')return;
  const k=state.chosenFactor,n=state.target;
  state.hintsUsed++;
  insights?.help();
  if(n%k!==0){
    state.feedback=k+' is not a factor: '+n+' ÷ '+k+' leaves a remainder of '+(n%k)+'.';
    state.feedbackType='error';
    learning.record({concept:'div:'+k,correct:false,hints:1,mode:state.mode,context:{target:n}});
    tone(false);render();return;
  }
  const a=Math.min(k,n/k),b=Math.max(k,n/k),key=a+'-'+b;
  if(state.found.has(key)){state.feedback=a+' × '+b+' is already on your board.';state.feedbackType='error';render();return;}
  insights?.answer([a,b],'correct',true);
  state.found.add(key);state.hintedPairs.add(key);state.score++;
  recordPair([a,b],true,state.hintsUsed);
  state.feedback=a+' × '+b+' = '+n+'. You found this pair using the factor checker.';
  state.feedbackType='success';tone(true);
  state.hintsUsed=0;state.hintLevel=0;state.chosenFactor=null;persist();
  if(state.found.size===state.pairs.length)finish('complete');else render();
}
function resetRounds(){
  if(['running','paused'].includes(state.phase)&&!confirm('End the current round and restart the round count at 1? Learning history and score will be kept.'))return;
  roundTools?.reset();stopTicker();state.phase='ready';state.target=null;state.previous=null;state.round=1;ledger.resetRounds();state.result=null;state.remainingMs=state.duration*1000;persist();render();
}
function resetRoundsAfterDataClear(){
  roundTools?.reset();stopTicker();state.phase='ready';state.target=null;state.previous=null;state.round=1;state.score=0;ledger.resetScores();state.result=null;state.remainingMs=state.duration*1000;persist();render();
}
function resetScores(){
  if(['running','paused'].includes(state.phase)&&!confirm('End this round and reset scores?'))return;
  roundTools?.reset();stopTicker();state.phase='ready';state.target=null;state.previous=null;state.round=1;state.score=0;state.result=null;state.remainingMs=state.duration*1000;persist();render();
}
function hintNext(){
  if(state.phase!=='running'||!state.chosenFactor)return;
  state.hintLevel=state.hintLevel===4?0:state.hintLevel+1;
  if(state.hintLevel>0){state.hintsUsed++;insights?.help();}
  renderHint();
}
function tip(type){
  if(state.phase!=='running')return;
  const n=state.target;
  const msg={
    even:n%2===0?'Yes, '+n+' is even. So 2 divides it. Can you work out the partner?':'No, '+n+' is odd. So 2 is not a factor.',
    double:(()=>{
      const chains=[];
      for(const key of state.found){
        let [a,b]=key.split('-').map(Number),sequence=[];
        while(b%2===0&&a*2<=b/2){a*=2;b/=2;const candidate=a+'-'+b;if(!state.found.has(candidate))sequence.push(a+' × '+b);}
        if(sequence.length)chains.push(sequence.join(' → '));
      }
      return chains.length
        ? 'From a pair you found, double the smaller factor and halve the larger: '+chains.join(' · ')+'. Try these pairs, then check the remaining divisors up to √'+n+'.'
        : 'Find an even factor pair first. Then double one factor and halve the other while it remains even. This is fast but does not necessarily find every pair.';
    })(),
    stop:'To prove completeness, check possible first factors from 1 to '+Math.floor(Math.sqrt(n))+'. Anything beyond √'+n+' only reverses an existing pair.'
  }[type];
  state.strategy=msg;state.hintsUsed++;insights?.help();render();
}
const priorities=['Essential','Important','Fast strategy','Systematic','Visual','Extension','Advanced'];
let topicFilter='All';
function renderLearn(){
  const filters=$('topicFilters');filters.replaceChildren();
  for(const name of ['All',...priorities]){
    const b=document.createElement('button');b.textContent=name;b.className=name===topicFilter?'active':'';
    b.onclick=()=>{topicFilter=name;renderLearn();};filters.append(b);
  }
  const search=$('topicSearch').value.toLowerCase();
  const list=$('topicList');list.replaceChildren();
  const topics=TECHNIQUES.filter(t=>(topicFilter==='All'||t.level===topicFilter)&&[t.title,t.detail,t.example].join(' ').toLowerCase().includes(search));
  for(const topic of topics){
    const article=document.createElement('article');article.className='topic';
    const level=document.createElement('p');level.className='eyebrow';level.textContent=topic.level;
    const title=document.createElement('h3');title.textContent=topic.title;
    const detail=document.createElement('p');detail.textContent=topic.detail;
    const example=document.createElement('div');example.className='example';example.textContent=topic.example;
    article.append(level,title,detail,example);
    if(/square|root/i.test(topic.title+' '+topic.detail)){const jump=document.createElement('button');jump.type='button';jump.className='secondary';jump.textContent='Learn, practise & review square numbers →';jump.addEventListener('click',()=>strategySupport?.openSquareStudio());article.append(jump);}
    list.append(article);
  }
  const mem=$('memoryList');mem.replaceChildren();
  const essentials=[
    ['Multiplication and division to 12 × 12','Recall facts and their inverses quickly. Use spaced retrieval, especially for weaker facts.'],
    ['1 is always a factor','For every positive whole number n, 1 × n is a valid pair.'],
    ['Divisibility rules','Memorise 2, 3, 5 and 10 first; then 4, 6, 8 and 9.'],
    ['Squares through 12²','1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121 and 144.'],
    ['Prime numbers','Recognise 2, 3, 5, 7, 11, 13, 17 and 19; extend toward 100.'],
    ['Systematic completeness','Test divisors through the square root, count reversals once, and include square middle pairs.'],
    ['Understand, do not memorise','Do not memorise every target’s complete factor list. Reconstruct pairs from multiplication and division facts.']
  ];
  for(const [title,desc] of essentials){const d=document.createElement('div'),s=document.createElement('strong'),p=document.createElement('p');s.textContent=title;p.textContent=desc;d.append(s,p);if(/Squares through/.test(title)){d.classList.add('clickable-learning-card');d.tabIndex=0;d.setAttribute('role','button');d.setAttribute('aria-label','Open interactive square-number learning course');const open=()=>strategySupport?.openSquareStudio();d.addEventListener('click',open);d.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});p.textContent=desc+' · Tap to learn and practise →';}mem.append(d);}
}

function improvementMetrics(){
 const sessions=[...(learning.getState().sessions||[])].filter(s=>Number.isFinite(s.timestamp)&&s.total>0).sort((a,b)=>a.timestamp-b.timestamp);
 const events=(insights?.events||[]).filter(e=>Number.isFinite(e.at)).sort((a,b)=>a.at-b.at);
 const n=Math.min(20,Math.floor(sessions.length/2)),earlier=sessions.slice(0,n),recent=sessions.slice(-n);
 const period=rounds=>{if(!rounds.length)return [];const start=rounds[0].timestamp,end=rounds.at(-1).timestamp;return events.filter(e=>e.at>=start&&e.at<=end);};
 const accuracy=rounds=>{const a=period(rounds).filter(e=>e.outcome==='correct'||e.outcome==='incorrect');return a.length?100*a.filter(e=>e.outcome==='correct').length/a.length:null;};
 const complete=rounds=>rounds.length?100*rounds.filter(r=>r.correct===r.total).length/rounds.length:null;
 const pace=rounds=>{const a=period(rounds).filter(e=>e.outcome==='correct'&&!e.assisted&&!e.errors&&Number.isFinite(e.ms)&&e.ms>0).map(e=>e.ms/1000).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
 const patterns=rounds=>{const set=new Set();for(const r of rounds){const count=factorPairs(r.target).length;if(count===1)set.add('Prime');if(Number.isInteger(Math.sqrt(r.target)))set.add('Square');if(r.target>1&&(r.target&(r.target-1))===0)set.add('Power of two');if(count>=5)set.add('Many pairs');}return set.size;};
 const support=new Map(),familiar=new Set(),last=new Map(),week=new Set(),month=new Set();
 for(const e of events){if(e.outcome==='correct'&&e.assisted)support.set(e.key,e.at);
 if(e.outcome==='correct'&&!e.assisted&&support.has(e.key)&&e.at-support.get(e.key)>=86400000)familiar.add(e.key);
 if(e.outcome==='correct'&&last.has(e.key)){const gap=e.at-last.get(e.key);if(gap>=7*86400000)week.add(e.key);if(gap>=30*86400000)month.add(e.key);}last.set(e.key,e.at);}
 return {n,earlier,recent,accuracy:[accuracy(earlier),accuracy(recent)],completeness:[complete(earlier),complete(recent)],pace:[pace(earlier),pace(recent)],breadth:[patterns(earlier),patterns(recent)],familiar:familiar.size,week:week.size,month:month.size};
}
function renderImprovement(){
 let host=$('improvementPanel');if(!host){host=document.createElement('section');host.id='improvementPanel';host.className='improvement-panel';host.innerHTML='<p class="eyebrow">YOUR IMPROVEMENT</p><h2>How your learning is changing</h2><p id="improvementHeadline"></p><p class="improvement-help"><strong>Hints are part of learning.</strong> Answers reached with help count equally towards accuracy and completeness. Later independent success shows growing familiarity, not a target to avoid help.</p><p id="improvementSample" class="muted small"></p><div id="improvementDimensions" class="improvement-dimensions"></div><div class="improvement-chart"><label>Then and now <select id="improvementDimensionChoice"><option value="accuracy">Accuracy</option><option value="completeness">Completeness</option><option value="pace">Pace (indicative)</option><option value="breadth">Pattern breadth</option></select></label><div id="improvementChart"></div></div><details><summary>How are these changes measured?</summary><p>We compare your first 20 detailed rounds with your latest 20, using equal smaller non-overlapping periods when necessary. Accuracy counts correct submissions with or without help; incomplete and duplicate entries do not count as mistakes. Completeness measures rounds with every pair found. Pace is the median of correct, error-free, unaided pair-entry intervals. Older timing includes thinking, entry and possible interruptions; different question mixes or input methods can make a pace comparison misleading. Breadth describes encountered number patterns, not mastery. Retention requires a successful return after a recorded gap. Missing evidence is not zero progress. These are learning indicators, not validated assessment scores.</p></details>';const anchor=$('progressView').querySelector('.dol-progress-sync');if(anchor)anchor.after(host);else $('progressView').prepend(host);host.querySelector('select').addEventListener('change',drawImprovementChart);}
 const m=improvementMetrics(),fmt=(v,unit='')=>v===null?'Collecting evidence':(unit==='s'?v.toFixed(1):Math.round(v))+unit;
 $('improvementHeadline').textContent=m.n<5?'Your learning record is growing.':m.completeness[0]!==null&&m.completeness[1]>m.completeness[0]+5?'You are finding every pair more reliably.':m.accuracy[0]!==null&&m.accuracy[1]>m.accuracy[0]+5?'You are getting more factor pairs right.':m.familiar?'Skills explored with help are becoming familiar.':'Your practice is developing across several dimensions.';
 $('improvementSample').textContent=m.n?'First '+m.n+' recorded rounds compared with latest '+m.n+'. '+(m.n<20?'Early indication; more practice is needed for a steadier comparison.':'Repeated practice, but question difficulty may differ.'):'Complete more rounds to establish a starting period.';
 const data=[['Accuracy',fmt(m.accuracy[1],'%'),m.accuracy[0]===null?'Building baseline':'Then '+fmt(m.accuracy[0],'%')],['Growing familiarity',m.familiar+' facts','Previously explored with support, then solved unaided on a later day'],['Completeness',fmt(m.completeness[1],'%'),m.completeness[0]===null?'Building baseline':'Then '+fmt(m.completeness[0],'%')],['Pace',fmt(m.pace[1],'s'),m.pace[0]===null?'Building baseline':'Then '+fmt(m.pace[0],'s')+' · indicative only'],['Challenge breadth',m.breadth[1]+' patterns','Then '+m.breadth[0]+' patterns encountered'],['Retention',m.week+' revisited facts',m.month+' after 30-day recorded gaps']];
 const grid=$('improvementDimensions');grid.replaceChildren();for(const [name,value,description] of data){const card=document.createElement('article');const title=document.createElement('h3'),number=document.createElement('strong'),note=document.createElement('small');title.textContent=name;number.textContent=value;note.textContent=description;card.append(title,number,note);grid.append(card);}
 host._improvement=m;drawImprovementChart();
}
function drawImprovementChart(){
 const host=$('improvementPanel');if(!host)return;const m=host._improvement,key=$('improvementDimensionChoice').value,values=m[key],unit=key==='accuracy'||key==='completeness'?'%':key==='pace'?'s':'',area=$('improvementChart');area.replaceChildren();
 if(!values||values.some(v=>v===null)){area.textContent='More recorded practice is needed before this comparison is available.';return;}
 const max=unit==='%'?100:Math.max(1,...values);
 for(const [i,label] of ['Then','Now'].entries()){const row=document.createElement('div'),name=document.createElement('span'),track=document.createElement('div'),bar=document.createElement('div'),value=document.createElement('b');row.className='improvement-bar-row';name.textContent=label;track.className='improvement-track';bar.className='improvement-bar '+label.toLowerCase();bar.style.width=Math.max(0,Math.min(100,values[i]/max*100))+'%';value.textContent=(unit==='s'?values[i].toFixed(1):Math.round(values[i]))+unit;track.append(bar);row.append(name,track,value);area.append(row);}
}


// Improvement is deliberately lazy and isolated from the game bootstrap.
// An unavailable feature module must never blank the playable interface.
function loadImprovement(){
 if(improvement){try{improvement.render();}catch(error){console.warn('Progress panel deferred',error);}return;}
 if(improvementLoading)return;
 improvementLoading=import('./improvement/index.mjs').then(({createImprovement})=>{
   improvement=createImprovement({accountId,getState:()=>state,getSessions:()=>learning.getState().sessions||[],insights,scope:scoped});
   if(improvementUser)improvement.connect(improvementUser.uid,improvementUser.transport()).catch(error=>console.warn('Evidence sync deferred',error));
   improvement.render();
 }).catch(error=>{
   console.warn('Enhanced progress temporarily unavailable; original progress remains usable.',error);
   const progress=document.getElementById('progressView');
   if(progress&&!document.getElementById('improvementFallback')){const p=document.createElement('p');p.id='improvementFallback';p.className='muted';p.textContent='Detailed progress checks are temporarily unavailable. Your original progress remains saved.';progress.append(p);}
 }).finally(()=>{improvementLoading=null;});
}

function renderProgress(){
  // The enhanced UI has its own IDs. Do not mount the obsolete duplicate panel.
  if(!improvement)loadImprovement();
  const data=learning.getState(),sessions=data.sessions||[],summary=learning.summary();
  ledger.updateHistory(sessions.length);
   $('statRounds').textContent=ledger.data.completedRounds;$('statRounds').previousElementSibling.textContent=ledger.data.legacyRoundsIndicated?'ROUNDS (INCLUDES ESTIMATE)':'ROUNDS COMPLETED';$('statConcepts').textContent=summary.concepts;
   $('statCurrentRound').textContent=ledger.data.round;
   $('statCurrentScore').textContent=ledger.data.score;
   $('statAllTimeRounds').textContent=ledger.data.completedRounds;
   $('statAllTimeScore').textContent=ledger.data.allTimeScore;
   $('statHistoryCoverage').textContent=sessions.length+' detailed session'+(sessions.length===1?'':'s')+' recorded'+(ledger.data.legacyRoundsIndicated?' · earlier round counter indicated '+ledger.data.legacyRoundsIndicated+' additional rounds suggested by the old counter (estimate; no detailed records)':'')+'.';
  $('statDue').textContent=summary.needsPractice.length;
  $('statIndependent').textContent=sessions.reduce((n,s)=>n+Math.max(0,s.correct-s.hints),0);
  const el=$('recentSessions');el.replaceChildren();
  for(const s of [...sessions].reverse().slice(0,12)){
    const d=document.createElement('div');d.className='session';const a=document.createElement('span');a.textContent=s.mode+' · '+s.target+' · '+s.correct+'/'+s.total+' pairs';const b=document.createElement('small');b.textContent=s.hints+' assisted · '+new Date(s.timestamp).toLocaleDateString();d.append(a,b);el.append(d);
  }
  if(!sessions.length)el.textContent=ledger.data.completedRounds?'Detailed session history is unavailable for earlier rounds. Your lifetime totals are preserved.':'No recorded rounds yet. Start a guided lesson to begin.';
  const sug=$('practiceSuggestions');sug.replaceChildren();
  const due=Object.entries(data.concepts||{}).sort((a,b)=>conceptPriority(data,a[0])-conceptPriority(data,b[0])).reverse().slice(0,8);
  if(!due.length)sug.textContent='Complete a few rounds to discover what needs practice.';
  for(const [name,c] of due){const d=document.createElement('div');d.className='session';const a=document.createElement('span');a.textContent=name.replaceAll(':',' · ').replaceAll('x',' × ');const b=document.createElement('small');b.textContent=Math.round(c.mastery*100)+'% learning estimate · '+c.attempts+' attempts';d.append(a,b);sug.append(d);}
  insights?.summary();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{setView(b.dataset.view);document.body.classList.remove('focus-menu-revealed');$('menuReveal').setAttribute('aria-expanded','false');}));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(['running','paused'].includes(state.phase))return;state.mode=b.dataset.mode;state.helpOpen=state.mode==='guided';persist();render();}));
$('stageSelect').addEventListener('change',e=>{state.stage=e.target.value;persist();render();});
$('limitSelect').addEventListener('change',e=>{state.limit=Number(e.target.value);persist();render();});
$('durationSelect').addEventListener('change',e=>{state.duration=Number(e.target.value);state.remainingMs=state.duration*1000;persist();render();});
$('showCount').addEventListener('change',e=>{state.showCount=e.target.checked;persist();render();});
$('sound').addEventListener('change',e=>{state.sound=e.target.checked;persist();render();});
$('startButton').addEventListener('click',start);$('pauseButton').addEventListener('click',pause);$('finishButton').addEventListener('click',()=>finish('manual'));$('answerForm').addEventListener('submit',answer);$('resetScores').addEventListener('click',resetScores);$('resetRounds').addEventListener('click',resetRounds);
$('hintNext').addEventListener('click',hintNext);$('testFactor').addEventListener('click',testSelectedFactor);$('hintBack').addEventListener('click',()=>{if(state.hintLevel>0){state.hintLevel--;renderHint();}});
$('evenTip').addEventListener('click',()=>tip('even'));$('doubleTip').addEventListener('click',()=>tip('double'));$('stopTip').addEventListener('click',()=>tip('stop'));
$('topicSearch').addEventListener('input',renderLearn);
$('resetProgress').addEventListener('click',()=>{if(accountId!=='guest'){alert('Cloud learning history cannot yet be deleted safely. Sign out to reset guest learning, or export your records first.');return;}if(confirm('Delete this browser’s learning history? This cannot be undone.')){learning.reset();try{learningSync?.resetGuest();}catch(error){console.warn('Learning Sync reset failed',error);}insights?.resetEvidence();try{improvement?.resetGuest();}catch(e){console.warn('Evidence reset deferred',e);}strategySupport?.resetProgress();resetRoundsAfterDataClear();renderProgress();}});
$('exportProgress').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...JSON.parse(learning.export()),strategyHistory:strategySupport?.export(),detailedEvidence:improvement?.export()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='factor-frenzy-learning.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Enter'&&state.view==='play'&&state.phase==='finished'&&!e.repeat&&!e.isComposing&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!['BUTTON','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.activeElement?.closest?.('[contenteditable]')){e.preventDefault();start();return;}if(e.key==='Escape'&&state.mode==='timed'&&['running','paused'].includes(state.phase)){e.preventDefault();pause();}});
$('dolRetryCloud')?.addEventListener('click',async()=>{
  if(!learningSync||accountId==='guest')return;
  const button=$('dolRetryCloud');button.disabled=true;
  $('dolSyncStatus').textContent='Retrying cloud synchronisation...';
  try{
    learningSync.capture(learning.getState());
    await learningSync.sync();
    $('dolSyncStatus').textContent='Cloud learning record synchronised';
    if(state.view==='progress')renderProgress();
  }catch(error){
    $('dolSyncStatus').textContent='Saved on this device · cloud sync pending: '+(error.code||error.message);
    console.warn('Dol learning sync retry deferred',error);
  }finally{button.disabled=false;}
});
$('focusToggle').addEventListener('click',()=>setFocus(!focusMode));
$('focusSetting').addEventListener('change',e=>setFocus(e.target.checked));
const reveal=()=>{if(!focusMode)return;document.body.classList.add('focus-menu-revealed');$('menuReveal').setAttribute('aria-expanded','true');};
const hide=()=>{if(!focusMode)return;if(!document.querySelector('.topbar:focus-within')){document.body.classList.remove('focus-menu-revealed');$('menuReveal').setAttribute('aria-expanded','false');}};
document.addEventListener('pointermove',e=>{if(!focusMode)return;if(e.target instanceof Element&&e.target.closest('#menuReveal,.topbar'))return;if(e.pointerType==='mouse'||e.pointerType==='pen'){if(e.clientY<56)reveal();else if(e.clientY>140)hide();}});
$('menuReveal').addEventListener('click',()=>{if(document.body.classList.contains('focus-menu-revealed')){document.body.classList.remove('focus-menu-revealed');$('menuReveal').setAttribute('aria-expanded','false');}else reveal();});
document.querySelector('.topbar').addEventListener('focusin',reveal);
document.querySelector('.topbar').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget)&&e.relatedTarget!==$('menuReveal'))hide();});
roundTools=createRoundTools({getState:()=>state,persist,startNext:start,refresh:render,
  markAssisted:()=>{tick();if(state.phase==='running'){insights?.help();state.visualHelp=true;state.hintsUsed=Math.max(1,state.hintsUsed);}},
  fillPair:pair=>{tick();if(state.phase!=='running')return;insights?.help();state.visualHelp=true;state.hintsUsed=Math.max(1,state.hintsUsed);$('pairInput').value=pair.join('x');$('pairInput').focus({preventScroll:true});},
  openHint:()=>strategySupport?.openHint(),exitFocus:()=>setFocus(false)
});
layoutOptions=createLayoutOptions({getState:()=>state});
applyFocus();insights=createInsights({storageScope:scoped,getState:()=>state,refresh:render,onRecord:event=>improvement?.record(event)});
mobileEntry=createMobileEntry({getState:()=>state,submit:()=>answer({preventDefault(){}})});
strategySupport=createStrategySupport({storageScope:scoped,getState:()=>state,setView,pause,focusAnswer,learning,holdTime:reason=>insights?.holdTime(reason),releaseTime:reason=>insights?.releaseTime(reason),onLearningRecord:()=>{try{learningSync?.capture(learning.getState());if(accountId!=='guest')learningSync?.sync()?.catch(error=>console.warn('Square learning cloud sync deferred',error));}catch(error){console.warn('Square learning saved in the learning store; cloud capture deferred',error);}}});
$('readySquareLesson')?.addEventListener('click',()=>strategySupport?.openSquareStudio());
$('readyQuickSquares')?.addEventListener('click',()=>strategySupport?.openSquareQuick());
$('statConcepts').closest('.stats-grid > div')?.addEventListener('click',()=>{document.getElementById('conceptList')?.scrollIntoView({behavior:'smooth',block:'start'});});
$('statConcepts').closest('.stats-grid > div')?.setAttribute('title','Select to view the concepts practised');
render();setView('play');
document.body.dataset.dolReady='true';
loadImprovement();

// Auth is initialised only after the game UI has mounted. Cloud sync is scoped to the
// actual Firebase UID and never runs for a guest or a mismatched account.
import('./dol-account.mjs').then(({initAccountUI,transport,preferencesStore,evidenceTransport})=>initAccountUI({onUser:async user=>{
  improvementUser=user?.uid===accountId&&user?{uid:user.uid,transport:evidenceTransport}:null;
  if(improvement&&improvementUser)improvement.connect(improvementUser.uid,improvementUser.transport()).catch(e=>console.warn('Evidence sync deferred',e));
  else improvement?.disconnect();
  await syncAnimationPreference(user,preferencesStore());
  if($('dolRetryCloud'))$('dolRetryCloud').hidden=!user||user.uid!==accountId;
  if(!user||user.uid!==accountId||!learningSync)return;
  try{
    const service=createLearningSync({appId:'dol',learnerId:'local',accountId,transport:transport(),onChange:syncState=>{
      const message=document.getElementById('dolSyncStatus');
      if(!message)return;
      if(syncState.working)message.textContent='Synchronising your saved learning history...';
      else if(syncState.pending)message.textContent='Saved locally · '+syncState.pending+' cloud batch(es) awaiting synchronisation';
    },onSnapshot:merged=>{
      if(merged.sessions.length>=learning.getState().sessions.length){learning.import(merged);service.adoptSnapshot(merged);ledger.updateHistory(merged.sessions.length);renderProgress();}
    }});
    // Keep an authenticated transport even when the first cloud attempt fails.
    // Otherwise all later rounds incorrectly stay on the local-only instance.
    learningSync=service;
    service.capture(learning.getState());
    if(localStorage.getItem('dol-guest-imported:'+accountId)!=='yes'&&confirm('Copy the learning history saved on this device into this account? Only do this if it belongs to you.')){
      service.importGuest({approved:true});localStorage.setItem('dol-guest-imported:'+accountId,'yes');
    }
    service.observeOnline();
    await service.sync();
    document.getElementById('dolSyncStatus').textContent='Cloud learning record synchronised';
  }catch(error){document.getElementById('dolSyncStatus').textContent='Offline/local progress saved. Sync: '+(error.code||error.message);console.warn('Dol sync unavailable',error);}
}})).catch(error=>{document.getElementById('dolAccountStatus').textContent='Account service unavailable: '+error.message});
