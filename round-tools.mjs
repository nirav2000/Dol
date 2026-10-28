import {pairKey,reviewScore,createAutoAdvance} from './round-model.mjs';
import {createVisualTools} from './visual-tools.mjs';
import {boardSuggestions} from './board-aware-help.mjs';
import {makeFocusPlan,explainPairMotion} from './focus-learning-model.mjs';
const $=id=>document.getElementById(id);
const STORAGE='dol-round-tools-v1';
const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
function numberTile(value){return el('span',{class:'pair-number'},value);}
function pairContent(button,a,b){button.append(numberTile(a),el('span',{class:'pair-times','aria-hidden':'true'},'×'),numberTile(b));}
/** Thin UI adapter. Manual review marks intentionally never rewrite learning evidence. */
export function createRoundTools({getState,persist,startNext,refresh,markAssisted,markFocusHelp=()=>{},fillPair,openHint=()=>{},exitFocus=()=>{}}){
  let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE))||{};}catch{}
  const preferences={autoNext:saved.autoNext===true,delay:[3,5,8,12].includes(saved.delay)?saved.delay:8};
  const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(preferences));}catch{}};
  let reviewIdentity=null,selected=new Set(),roundIdentity=null,scoreEditing=false;
  const controls=el('div',{class:'auto-settings'});
  controls.innerHTML='<label class="check"><input type="checkbox" id="autoNext"> Auto next question</label><label class="auto-delay-label" for="autoNextDelay">Review time <select id="autoNextDelay"><option value="3">3 seconds</option><option value="5">5 seconds</option><option value="8">8 seconds</option><option value="12">12 seconds</option></select></label>';
  document.querySelector('.controls').append(controls);
  const status=el('div',{class:'auto-next-status',id:'autoNextStatus',hidden:''});
  status.innerHTML='<p id="autoNextText" role="status" aria-live="polite"></p><button type="button" class="secondary" id="holdAutoNext">Stay on this question</button><button type="button" class="secondary" id="resumeAutoNext" hidden>Resume auto next</button>';
  document.querySelector('.number-section .action-row').after(status);
  const timer=createAutoAdvance({onNext:()=>{const s=getState();if(s.phase==='finished'&&s.view==='play'&&!document.hidden&&preferences.autoNext)startNext();},onTick:updateStatus});
  function updateStatus(snapshot=timer.snapshot()){
    if(!status)return;
    status.hidden=!snapshot.pending;
    if(!snapshot.pending)return;
    const seconds=Math.ceil(snapshot.remainingMs/1000);
    const text=snapshot.held?'Auto next paused — take your time.':`Next question in ${seconds} second${seconds===1?'':'s'}.`;
    if($('autoNextText').textContent!==text)$('autoNextText').textContent=text;
    $('holdAutoNext').hidden=snapshot.held;$('resumeAutoNext').hidden=!snapshot.held;
  }
  function environment(){
    if(document.hidden)timer.hold('hidden');else timer.release('hidden');
    if(getState().view!=='play')timer.hold('page');else timer.release('page');
  }
  function arm(){
    const s=getState();
    if(!preferences.autoNext||s.phase!=='finished'){timer.cancel();return;}
    const holds=[];if(document.hidden)holds.push('hidden');if(s.view!=='play')holds.push('page');
    timer.arm(preferences.delay*1000,holds);
  }
  $('autoNext').checked=preferences.autoNext;$('autoNextDelay').value=preferences.delay;
  $('autoNext').addEventListener('change',e=>{preferences.autoNext=e.target.checked;save();arm();});
  $('autoNextDelay').addEventListener('change',e=>{preferences.delay=Number(e.target.value);save();arm();});
  $('holdAutoNext').addEventListener('click',()=>timer.hold('review'));
  $('resumeAutoNext').addEventListener('click',()=>{timer.release('review');environment();});
  document.addEventListener('visibilitychange',environment);
  window.addEventListener('pagehide',()=>timer.hold('hidden'));
  window.addEventListener('pageshow',environment);
  document.querySelectorAll('.controls select:not(#autoNextDelay),[data-mode]').forEach(e=>e.addEventListener('change',()=>timer.hold('review')));
  document.querySelectorAll('[data-mode]').forEach(e=>e.addEventListener('click',()=>{if(getState().phase==='finished')timer.hold('review');}));
  const summary=el('div',{id:'reviewSummary',class:'review-summary','aria-live':'polite'});
  const instruction=el('p',{class:'small muted',id:'reviewInstructions'},'Tap any pair to learn a method. Your played score stays unchanged.');
  const evidence=el('p',{class:'small muted',id:'reviewEvidence'});
  const restore=el('button',{type:'button',class:'text-button',id:'restoreReview'},'Restore played result');
  const scoreEditor=el('button',{type:'button',class:'secondary',id:'reviewAdjustScore','aria-pressed':'false'},'Correct the score');
  $('answerReview').after(instruction,summary,evidence,scoreEditor,restore);
  scoreEditor.addEventListener('click',()=>{
    if(getState().phase!=='finished')return;
    scoreEditing=!scoreEditing;
    scoreEditor.setAttribute('aria-pressed',String(scoreEditing));
    scoreEditor.textContent=scoreEditing?'Done correcting score':'Correct the score';
    timer.hold('review');
    renderReview(getState());
  });
  for(const p of $('finishedPanel').querySelectorAll('p.muted'))if(p!==instruction&&p!==evidence)p.hidden=true;
  restore.addEventListener('click',()=>{if(getState().phase!=='finished')return;selected=new Set(getState().found);timer.hold('review');applyReview();renderReview(getState());});
  const visualRoot=el('section',{id:'roundVisuals',hidden:''});
  document.querySelector('.play-grid').after(visualRoot);
  const visual=createVisualTools(visualRoot,{onAssist:markAssisted,onInteract:()=>timer.hold('review'),onUsePair:fillPair});
  const dismissVisual=el('button',{type:'button',class:'secondary round-visual-dismiss',id:'roundVisualDismiss'},'Close visual');
  visualRoot.prepend(dismissVisual);
  const toolbar=el('div',{id:'roundLearningBar',class:'round-learning-bar',hidden:''});
  toolbar.innerHTML='<strong>Understand this number</strong><button id="roundBarHint" type="button" class="secondary">💡 Explain</button><button id="roundBarRainbow" type="button" class="secondary">🌈 Rainbow</button><button id="roundBarArray" type="button" class="secondary">▦ Arrays</button>';
  document.querySelector('.number-section .action-row').after(toolbar);
  $('roundBarHint').addEventListener('click',()=>{if(['running','paused'].includes(getState().phase))openHint();else if(getState().phase==='finished'){$('roundMathPatterns')?.click();}});
  $('roundBarRainbow').addEventListener('click',()=>openVisual('rainbow'));
  $('roundBarArray').addEventListener('click',()=>openVisual('arrays'));
  // Guided factor reasoning follows the live board. It never reveals or scores a missing pair.
  const coach=el('section',{id:'roundCoachPanel',class:'round-coach',hidden:''});
  coach.innerHTML='<div class="round-coach-heading"><span class="eyebrow">YOUR NEXT DISCOVERY</span><strong id="roundCoachCount"></strong></div><p id="roundCoachText" role="status" aria-live="polite"></p><p id="roundCoachBoundary" class="small muted"></p><div id="roundCoachMotion" role="img" aria-label="Factor relationship animation" hidden></div><div class="round-coach-actions"><button type="button" class="secondary" id="roundCoachStep">One clue</button><button type="button" class="secondary" id="roundCoachDifferent">Another route</button><button type="button" class="secondary" id="roundCoachHint">Work it out with me</button><button type="button" class="secondary" id="roundCoachRainbow">Factor rainbow</button><button type="button" class="secondary" id="roundCoachArray">Build an array</button></div>';
  document.querySelector('.number-section .action-row').after(coach);
  $('roundCoachHint').addEventListener('click',()=>{if(['running','paused'].includes(getState().phase))openHint();});

  // The next move is always derived from the live solved board. A teaser is
  // free; pressing One clue reveals a scaffold and records helpful assistance
  // without changing the learner's game score or labelling help as failure.
  let livePlan=null,coachKey='',routeIndex=0,stepIndex=0,motionTimer=null,motionNonce=0;
  const motionRoot=$('roundCoachMotion');
  function stopPairMotion(){
    motionNonce++;clearTimeout(motionTimer);motionTimer=null;
    motionRoot.hidden=true;motionRoot.replaceChildren();coach.dataset.motion='false';
    document.getElementById('mobileEntryStatus')?.classList.remove('is-math-motion');
  }
  $('roundCoachStep').addEventListener('click',()=>{
    const s=getState(),route=livePlan?.routes[routeIndex];
    if(!route||!['running','paused'].includes(s.phase))return;
    if(stepIndex<route.steps.length){
      if(s.phase==='running')markFocusHelp(route.goalKey);
      stepIndex++;
    }else stepIndex=0;
    updateCoach(getState());
  });
  $('roundCoachDifferent').addEventListener('click',()=>{
    const s=getState();
    if(!livePlan||livePlan.routes.length<2||!['running','paused'].includes(s.phase))return;
    routeIndex=(routeIndex+1)%livePlan.routes.length;stepIndex=0;stopPairMotion();updateCoach(s);
  });
  function animatePair(pair,earlierFound){
    const s=getState();
    if(s.phase!=='running'||s.view!=='play')return;
    const move=explainPairMotion(s.target,earlierFound,pair);
    if(!move)return;
    stopPairMotion();
    if(move.kind==='balance'){
      const row=el('div',{class:'coach-motion-equation'});
      row.append(el('strong',{},move.from.join(' × ')),
        el('b',{class:'coach-motion-arrow','aria-hidden':'true'},'→'),
        el('strong',{},move.to.join(' × ')));
      const transfers=el('div',{class:'coach-motion-steps'});
      transfers.append(el('b',{},move.from[0]+' '+move.first+' → '+move.to[0]),
        el('b',{},move.from[1]+' '+move.second+' → '+move.to[1]));
      motionRoot.append(row,transfers);
    }else{
      const row=el('div',{class:'coach-motion-groups'});
      for(let i=0;i<move.count;i++){
        const cell=el('span',{class:'coach-motion-group'},String(move.to[1]));
        cell.style.setProperty('--group-index',String(i));row.append(cell);
      }
      if(move.totalGroups>move.count)row.append(el('span',{class:'coach-motion-more'},'…'));
      motionRoot.append(row);
    }
    motionRoot.append(el('div',{class:'coach-motion-caption'},move.caption));
    motionRoot.setAttribute('aria-label',move.caption);
    motionRoot.hidden=false;coach.dataset.motion='true';
    // On very short phones the coach card is intentionally collapsed.
    // Display the same factor relationship in the always-visible entry strip
    // rather than attempting to expand a hidden panel over the keypad.
    if(innerWidth<=700&&innerHeight<=690&&document.body.classList.contains('focus-mode')){
      const label=document.getElementById('mobileEntryStatus');
      if(label){
        label.classList.remove('is-math-motion');void label.offsetWidth;
        label.textContent=move.kind==='balance'
          ?move.from.join(' × ')+' → '+move.to.join(' × ')+' ('+move.first+' / '+move.second+')'
          :move.caption;
        label.classList.add('is-math-motion');
      }
    }
    const token=motionNonce;
    motionTimer=setTimeout(()=>{if(token===motionNonce)stopPairMotion();},3900);
  }

  function openVisual(kind){
    const s=getState();
    if(!['running','paused','finished'].includes(s.phase))return;
    visualRoot.hidden=false;
    visual.show(kind);
    document.body.classList.toggle('dol-visuals-open',document.body.classList.contains('focus-mode'));
    if(!document.body.classList.contains('focus-mode'))visualRoot.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function closeVisual(){
    visual.hide();
    visualRoot.hidden=true;
    document.body.classList.remove('dol-visuals-open');
  }
  dismissVisual.addEventListener('click',closeVisual);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('dol-visuals-open')){e.preventDefault();e.stopPropagation();closeVisual();}},true);
  $('roundCoachRainbow').addEventListener('click',()=>openVisual('rainbow'));
  $('roundCoachArray').addEventListener('click',()=>openVisual('arrays'));
  const reflection=el('section',{id:'roundMathReflection',class:'round-math-reflection',hidden:''});
  reflection.innerHTML='<h3>What did this number teach?</h3><p id="roundMathInsight"></p><div class="round-math-actions"><button id="roundMathPatterns" type="button" class="primary">How each factor pair works</button><button id="roundMathExplore" type="button" class="secondary">Explore the factor rainbow →</button></div>';
  $('finishedPanel').append(reflection);
  $('roundMathExplore').addEventListener('click',()=>openVisual('rainbow'));
  $('roundMathPatterns').addEventListener('click',()=>{const toggle=$('patternToggle');if(!toggle)return;if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();toggle.scrollIntoView({behavior:'smooth',block:'start'});});
  function updateCoach(s){
    coach.hidden=s.phase!=='running'&&s.phase!=='paused';
    toolbar.hidden=s.phase!=='running'&&s.phase!=='paused'&&s.phase!=='finished';
    $('roundBarHint').textContent=s.phase==='finished'?'💡 Learn the pairs':'💡 Explain';
    reflection.hidden=s.phase!=='finished';
    if(!coach.hidden){
      const plan=makeFocusPlan(s.target,s.found,s.lastIncorrect);
      if(plan.id!==coachKey){
        coachKey=plan.id;routeIndex=0;stepIndex=0;stopPairMotion();
      }
      livePlan=plan;
      routeIndex=Math.min(routeIndex,Math.max(0,plan.routes.length-1));
      const route=plan.routes[routeIndex],root=Math.floor(Math.sqrt(s.target));
      $('roundCoachCount').textContent=s.found.size+' of '+s.pairs.length+' pairs found';
      coach.dataset.coachKind=route?.kind||'complete';
      $('roundCoachText').textContent=route
        ? (stepIndex?route.steps[stepIndex-1]:route.teaser)
        : 'You have found every pair. Verify completeness by testing up to √'+s.target+'.';
      $('roundCoachStep').hidden=!route;
      $('roundCoachDifferent').hidden=plan.routes.length<2;
      $('roundCoachStep').textContent=route
        ? (stepIndex===route.steps.length?'Start clues again':stepIndex===route.steps.length-1?'Reveal the worked pair':stepIndex?'Next clue':'One clue')
        :'One clue';
      $('roundCoachHint').textContent='Interactive lesson';
      $('roundCoachBoundary').textContent='Stop at √'+s.target+': test first factors from 1 through '+root+'. ';
    }else{
      livePlan=null;coachKey='';routeIndex=0;stepIndex=0;stopPairMotion();
    }
    if(!reflection.hidden){
      const root=Math.floor(Math.sqrt(s.target)),missing=s.pairs.filter(([a,b])=>!s.found.has(a+'-'+b));
      $('roundMathInsight').textContent=s.target+' has '+s.pairs.length+' distinct factor '+(s.pairs.length===1?'pair':'pairs')+'. To prove the list is complete, test divisors 1 to '+root+'. '+(missing.length?'You missed '+missing.length+' during play. Examine the outlined pairs, then try a new round.':'You found every pair. Now look for the faster routes between them.')+(Number.isInteger(Math.sqrt(s.target))?' Its square-root pair is counted once.':'');
    }
  }
  const playground=el('section',{id:'learnVisuals'});document.querySelector('.learning-layout').before(playground);
  const demo=createVisualTools(playground,{demo:true});demo.update({n:24,roundId:24,found:new Set(),finished:true});
  function applyReview(){
    const s=getState(),score=reviewScore(s.pairs,selected);
    s.score=s.startedWithScore+score.points;
    $('scoreValue').textContent=s.score;persist();
  }
  function renderReview(s){
    if(!s.result)return;
    if(reviewIdentity!==s.result){reviewIdentity=s.result;selected=new Set(s.found);scoreEditing=false;scoreEditor.setAttribute('aria-pressed','false');scoreEditor.textContent='Correct the score';arm();}
    const score=reviewScore(s.pairs,selected),onBoard=document.body.dataset.dolLayout==='pairboard',host=onBoard?$('layoutPairGrid'):$('answerReview'),other=onBoard?$('answerReview'):$('layoutPairGrid');
    const focusKey=document.activeElement?.dataset?.reviewPair;
    $('finishHeading').textContent='Check the pairs';
    $('roundPoints').textContent=`${s.pairs.length} pairs in total`;
    $('finishMessage').textContent=(s.result.reason==='time'?"Time's up. ":s.result.reason==='complete'?'All pairs found. ':'Round finished. ')+`You entered ${s.result.correct} of ${s.result.total} pairs during play.`;
    other.replaceChildren();other.hidden=true;host.hidden=false;host.className=onBoard?'layout-pair-grid unified-pair-review':'pair-review-grid';if(onBoard)host.style.setProperty('--board-columns','3');host.setAttribute('aria-describedby','reviewInstructions');host.replaceChildren();
    for(const [a,b] of s.pairs){
      const key=pairKey(a,b),checked=selected.has(key);
      const button=el('button',{type:'button',class:'review-pair'+(checked?' credited':''),'data-review-pair':key,'aria-pressed':checked,'aria-label':`${a} times ${b}. ${scoreEditing?(checked?'Remove score credit':'Award score credit'):'Explain how to find this pair'}.`});
      pairContent(button,a,b);
      button.append(el('span',{class:'pair-mark','aria-hidden':'true'},checked?'✓':'○'));
      button.addEventListener('click',()=>{
        if(getState().phase!=='finished')return;
        timer.hold('review');
        if(scoreEditing){
          if(selected.has(key))selected.delete(key);else selected.add(key);
          applyReview();renderReview(getState());
          return;
        }
        const toggle=$('patternToggle');
        if(toggle&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();
        document.dispatchEvent(new CustomEvent('dol-pattern-select',{detail:{n:getState().target,a,b,key}}));
        $('patternDetail')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
      });
      host.append(button);
    }
    if(onBoard)$('layoutPairStatus').textContent=`${score.count} / ${score.total} credited`;
    instruction.textContent=scoreEditing?'Score correction mode: tap pairs to adjust points. Your learning history remains unchanged.':'Tap any pair to discover the fastest way to find it. These taps do not change your score.';
    summary.replaceChildren(el('strong',{},`${score.count} of ${score.total} pairs credited`),el('strong',{},`${score.points} points${score.bonus?' · +2 bonus included':''}`));
    const changed=selected.size!==s.found.size||[...selected].some(key=>!s.found.has(key));
    evidence.textContent=(changed?'Score adjusted manually. ':'Played result. ')+`${s.result.correct-s.result.assisted} unassisted, ${s.result.assisted} assisted during play. Explanations and score corrections do not rewrite mastery evidence.`;
    restore.hidden=!changed;
    document.dispatchEvent(new CustomEvent('dol-review-rendered',{detail:{target:s.target}}));
    if(focusKey)host.querySelector(`[data-review-pair="${focusKey}"]`)?.focus({preventScroll:true});
  }
  document.addEventListener('dol-layoutchange',()=>{const s=getState();if(s.phase==='finished')renderReview(s);});
  function render(s){
    $('autoNext').checked=preferences.autoNext;$('autoNextDelay').value=preferences.delay;
    // These two controls remain usable in a round; core settings are intentionally locked.
    $('autoNextDelay').disabled=false;
    $('numberValue').dataset.digits=String(s.target||'?').length;
    let badge=$('numberStatus');if(!badge){badge=el('span',{id:'numberStatus',class:'number-status'});document.querySelector('.number-tile').append(badge);}
    badge.hidden=s.phase!=='finished';badge.textContent=s.result?.reason==='time'?"TIME'S UP":'ROUND COMPLETE';
    if(s.phase==='ready'){timer.cancel();visualRoot.hidden=true;document.body.classList.remove('dol-visuals-open');roundIdentity=null;}
    else{
      const token=s.round+':'+s.target;
      const newRound=roundIdentity!==token;
      if(newRound)roundIdentity=token;
      visual.update({n:s.target,roundId:roundIdentity,found:s.found,finished:s.phase==='finished',paused:s.phase==='paused'});
      if(newRound&&s.mode==='guided')visual.show('rainbow');
    }
    updateCoach(s);
    if(s.phase==='finished')renderReview(s);
    environment();
  }
  return {render,renderReview,animatePair,beforeStart(){timer.cancel();reviewIdentity=null;scoreEditing=false;stopPairMotion();closeVisual();visual.reset();},viewChanged(){environment();},reset(){timer.cancel();reviewIdentity=null;scoreEditing=false;stopPairMotion();closeVisual();visual.reset();},holdReview(){timer.hold('review');}};
}
