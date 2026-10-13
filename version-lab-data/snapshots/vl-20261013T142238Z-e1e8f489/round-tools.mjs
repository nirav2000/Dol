import {pairKey,reviewScore,createAutoAdvance} from './round-model.mjs';
import {createVisualTools} from './visual-tools.mjs';
const $=id=>document.getElementById(id);
const STORAGE='dol-round-tools-v1';
const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
function numberTile(value){return el('span',{class:'pair-number'},value);}
function pairContent(button,a,b){button.append(numberTile(a),el('span',{class:'pair-times','aria-hidden':'true'},'×'),numberTile(b));}
/** Thin UI adapter. Manual review marks intentionally never rewrite learning evidence. */
export function createRoundTools({getState,persist,startNext,refresh,markAssisted,fillPair}){
  let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE))||{};}catch{}
  const preferences={autoNext:saved.autoNext===true,delay:[3,5,8,12].includes(saved.delay)?saved.delay:8};
  const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(preferences));}catch{}};
  let reviewIdentity=null,selected=new Set(),roundIdentity=null;
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
  const instruction=el('p',{class:'small muted',id:'reviewInstructions'},'Tap a pair to give or take away its point. Completing the set adds the +2 bonus.');
  const evidence=el('p',{class:'small muted',id:'reviewEvidence'});
  const restore=el('button',{type:'button',class:'text-button',id:'restoreReview'},'Restore played result');
  $('answerReview').after(instruction,summary,evidence,restore);
  for(const p of $('finishedPanel').querySelectorAll('p.muted'))if(p!==instruction&&p!==evidence)p.hidden=true;
  restore.addEventListener('click',()=>{if(getState().phase!=='finished')return;selected=new Set(getState().found);timer.hold('review');applyReview();renderReview(getState());});
  const visualRoot=el('section',{id:'roundVisuals',hidden:''});
  document.querySelector('.play-grid').after(visualRoot);
  const visual=createVisualTools(visualRoot,{onAssist:markAssisted,onInteract:()=>timer.hold('review'),onUsePair:fillPair});
  const playground=el('section',{id:'learnVisuals'});document.querySelector('.learning-layout').before(playground);
  const demo=createVisualTools(playground,{demo:true});demo.update({n:24,roundId:24,found:new Set(),finished:true});
  function applyReview(){
    const s=getState(),score=reviewScore(s.pairs,selected);
    s.score=s.startedWithScore+score.points;
    $('scoreValue').textContent=s.score;persist();
  }
  function renderReview(s){
    if(!s.result)return;
    if(reviewIdentity!==s.result){reviewIdentity=s.result;selected=new Set(s.found);arm();}
    const score=reviewScore(s.pairs,selected),onBoard=document.body.dataset.dolLayout==='pairboard',host=onBoard?$('layoutPairGrid'):$('answerReview'),other=onBoard?$('answerReview'):$('layoutPairGrid');
    const focusKey=document.activeElement?.dataset?.reviewPair;
    $('finishHeading').textContent='Check the pairs';
    $('roundPoints').textContent=`${s.pairs.length} pairs in total`;
    $('finishMessage').textContent=(s.result.reason==='time'?"Time's up. ":s.result.reason==='complete'?'All pairs found. ':'Round finished. ')+`You entered ${s.result.correct} of ${s.result.total} pairs during play.`;
    other.replaceChildren();other.hidden=true;host.hidden=false;host.className=onBoard?'layout-pair-grid unified-pair-review':'pair-review-grid';if(onBoard)host.style.setProperty('--board-columns','3');host.setAttribute('aria-describedby','reviewInstructions');host.replaceChildren();
    for(const [a,b] of s.pairs){
      const key=pairKey(a,b),checked=selected.has(key);
      const button=el('button',{type:'button',class:'review-pair'+(checked?' credited':''),'data-review-pair':key,'aria-pressed':checked,'aria-label':`${a} times ${b}. ${checked?'Credited; remove':'Not credited; award'} its point.`});
      pairContent(button,a,b);
      button.append(el('span',{class:'pair-mark','aria-hidden':'true'},checked?'✓':'○'));
      button.addEventListener('click',()=>{if(getState().phase!=='finished')return;timer.hold('review');if(document.body.dataset.dolPatternMode==='true'){document.dispatchEvent(new CustomEvent('dol-pattern-select',{detail:{n:getState().target,a,b,key}}));return;}if(selected.has(key))selected.delete(key);else selected.add(key);applyReview();renderReview(getState());});
      host.append(button);
    }
    if(onBoard)$('layoutPairStatus').textContent=`${score.count} / ${score.total} credited`;
    instruction.textContent=document.body.dataset.dolPatternMode==='true'?'Explore mode: select a pair to learn its technique. Your score will not change.':'Tap a pair to give or take away its point. Completing the set adds the +2 bonus.';
    summary.replaceChildren(el('strong',{},`${score.count} of ${score.total} pairs credited`),el('strong',{},`${score.points} points${score.bonus?' · +2 bonus included':''}`));
    const changed=selected.size!==s.found.size||[...selected].some(key=>!s.found.has(key));
    evidence.textContent=(changed?'Score adjusted manually. ':'Played result. ')+`${s.result.correct-s.result.assisted} unassisted, ${s.result.assisted} assisted during play. Review taps change the game score, not mastery or recorded learning results.`;
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
    if(s.phase==='ready'){timer.cancel();visualRoot.hidden=true;roundIdentity=null;}
    else{
      const token=s.round+':'+s.target;
      if(roundIdentity!==token)roundIdentity=token;
      visual.update({n:s.target,roundId:roundIdentity,found:s.found,finished:s.phase==='finished',paused:s.phase==='paused'});
    }
    if(s.phase==='finished')renderReview(s);
    environment();
  }
  return {render,renderReview,beforeStart(){timer.cancel();reviewIdentity=null;visual.reset();},viewChanged(){environment();},reset(){timer.cancel();reviewIdentity=null;visual.reset();},holdReview(){timer.hold('review');}};
}
