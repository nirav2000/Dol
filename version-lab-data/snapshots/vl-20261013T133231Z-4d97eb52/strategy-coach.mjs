import {suggestLesson,factorLesson,normalPair,makeTechniqueSession,recordChoice,cleanStrategyHistory,strategyNames} from './strategy-model.mjs';
const KEY='dol-strategy-history-v1';
const $=id=>document.getElementById(id);
function element(tag,attributes={},text){const node=document.createElement(tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;}
/** Optional help and a separate, untimed technique workout. No factor score mutations. */
export function createStrategySupport({getState,setView,pause,focusAnswer,learning,holdTime=()=>{},releaseTime=()=>{}}){
  let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch{}
  let history=cleanStrategyHistory(saved),lesson=null,level=0,ownsHintPause=false,ownsSessionPause=false,roundId=null,quiz=null;
  let helpHeld=false;const exposures=new Map(),seenSteps=new Set();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(history));}catch{}}
  const dialog=element('dialog',{id:'strategyHintDialog',class:'strategy-dialog','aria-labelledby':'coachHeading'});
  dialog.innerHTML='<div class="coach-header"><div><p class="eyebrow" id="coachTarget"></p><h2 id="coachHeading">A small nudge</h2></div><button type="button" id="coachClose" class="secondary" aria-label="Close hint and return to practice">Close</button></div><p id="coachProgress" class="small muted"></p><div id="coachStep" aria-live="polite" aria-atomic="true"><h3 id="coachTitle"></h3><p id="coachText"></p><p id="coachEquation" class="coach-equation"></p></div><div class="coach-actions"><button type="button" id="coachBack" class="secondary">Back</button><button type="button" id="coachNext" class="primary">Another step</button></div><button type="button" id="coachTry" class="text-button">Let me try</button><details id="coachApproach"><summary>Stuck somewhere else?</summary><button type="button" id="coachPartner" class="secondary">I know this factor. Help with its partner.</button><div class="coach-factor-picker"><label for="coachFactor">Factor to explore</label><input type="number" id="coachFactor" min="1" max="1024" step="1" inputmode="numeric"><button type="button" id="coachExplore" class="secondary">Explore</button></div><p id="coachPickerMessage" class="small muted" role="status"></p><button type="button" id="coachSuggest" class="text-button">Suggest a move from my board</button></details><p class="small muted" id="coachNote"></p>';
  document.body.append(dialog);
  const entry=element('section',{class:'technique-entry'});
  entry.innerHTML='<div><p class="eyebrow">PRACTISE THE DECISION</p><h2>Choose the move.</h2><p>No factor answers to type. Five situations, three possible moves. Learn which tools help, and when.</p></div><button type="button" class="primary" id="techniqueStart">Start a technique workout</button>';
  $('learnView').querySelector('.page-head').after(entry);
  const view=element('section',{id:'strategyView',class:'view',hidden:''});
  view.innerHTML='<div class="strategy-top"><button type="button" class="text-button" id="strategyExit">Back to factor practice</button><span class="pill">Untimed \u00b7 choose, don\u2019t calculate</span></div><section class="strategy-workout"><p class="eyebrow" id="strategyCount"></p><h1 id="strategyHeading">Which move?</h1><div id="strategyQuestion"><p id="strategyContext" class="strategy-context"></p><p id="strategyPrompt"></p><div id="strategyOptions" class="strategy-options"></div><p id="strategyFeedback" class="strategy-feedback" role="status" aria-live="polite"></p><div class="coach-actions"><button type="button" id="strategySkip" class="text-button">Skip this move</button><button type="button" id="strategyNext" class="primary" hidden>Next move \u2192</button></div></div><div id="strategyResult" hidden></div><p class="small muted">Choosing a method and calculating a factor pair are different skills. These results stay separate from your factor score.</p></section>';
  document.querySelector('main').append(view);
  const progress=element('section',{class:'insight-section',id:'strategySummary'});$('progressView').append(progress);
  function identity(){const s=getState();return s.round+':'+s.target;}
  function expose(){
    if(!lesson)return;const key=lesson.pairKey;
    if(key)exposures.set(key,{level:Math.max(exposures.get(key)?.level||0,level+1),technique:lesson.technique});
    const eventId=identity()+':'+lesson.kind+':'+(key||lesson.candidate)+':'+level;
    if(seenSteps.has(eventId))return;seenSteps.add(eventId);
    history.hints.push({technique:lesson.technique,target:lesson.target,pairKey:key,step:level,at:Date.now()});history.hints=history.hints.slice(-300);save();
  }
  function paintHint(){
    if(!lesson)return;level=Math.min(level,lesson.steps.length-1);const content=lesson.steps[level];
    $('coachTarget').textContent='WORKING ON '+lesson.target;
    $('coachProgress').textContent='Step '+(level+1)+' of '+lesson.steps.length+' · stop whenever you are ready';
    $('coachTitle').textContent=content.title;$('coachText').textContent=content.text;
    $('coachEquation').textContent=content.equation;$('coachEquation').hidden=!content.equation;
    $('coachBack').disabled=level===0;$('coachNext').hidden=level===lesson.steps.length-1;
    $('coachNext').textContent=level===lesson.partnerIndex-1?'Find the partner':'Next step →';
    $('coachTry').className=level===lesson.steps.length-1?'primary':'text-button';
    $('coachPartner').hidden=lesson.kind!=='factor'||!lesson.pairKey||level>=lesson.partnerIndex;
    $('coachFactor').max=String(Math.max(1024,lesson.target));$('coachFactor').value=lesson.candidate||'';
    $('coachNote').textContent=(getState().mode==='timed'?'The clock is paused while this hint is open. ':'')+'Only the pair this hint helps with is marked assisted. Exploring a candidate is not a marked error.';
    expose();
  }
  function replaceLesson(next,start=0){if(!next)return;lesson=next;level=start;$('coachApproach').open=false;$('coachPickerMessage').textContent='';paintHint();}
  function openHint(){
    const s=getState();if(s.view!=='play'||!['running','paused'].includes(s.phase)||dialog.open)return;
    const next=suggestLesson(s.target,s.found);if(!next)return;
    ownsHintPause=s.mode==='timed'&&s.phase==='running';
    if(ownsHintPause){pause();if(getState().phase!=='paused'){ownsHintPause=false;return;}}
    holdTime('hint');helpHeld=true;document.activeElement?.blur();
    if(!lesson||roundId!==identity()||(lesson.pairKey&&s.found.has(lesson.pairKey)))replaceLesson(next);
    else paintHint();
    document.body.classList.add('strategy-help-open');dialog.showModal();$('coachTry').focus({preventScroll:true});
  }
  function tidyHint(resume=true){
    document.body.classList.remove('strategy-help-open');if(helpHeld){releaseTime('hint');helpHeld=false;}
    const shouldResume=resume&&ownsHintPause&&getState().phase==='paused'&&getState().view==='play';ownsHintPause=false;
    if(shouldResume)pause();
    if(resume&&getState().view==='play')focusAnswer();
  }
  dialog.addEventListener('close',()=>tidyHint());
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
  for(const id of ['coachClose','coachTry'])$(id).addEventListener('click',()=>dialog.close());
  $('coachNext').addEventListener('click',()=>{if(!lesson||level>=lesson.steps.length-1)return;level++;paintHint();if($('coachNext').hidden)$('coachTry').focus({preventScroll:true});});
  $('coachBack').addEventListener('click',()=>{if(level>0){level--;paintHint();}});
  $('coachPartner').addEventListener('click',()=>{if(lesson?.kind==='factor')replaceLesson(lesson,lesson.partnerIndex);});
  $('coachExplore').addEventListener('click',()=>{
    const k=Number($('coachFactor').value);if(!Number.isSafeInteger(k)||k<1||k>Math.max(1024,getState().target)){$('coachPickerMessage').textContent='Choose a positive whole-number factor to test.';return;}
    replaceLesson(factorLesson(getState().target,k));
  });
  $('coachSuggest').addEventListener('click',()=>replaceLesson(suggestLesson(getState().target,getState().found)));
  $('helpToggle').addEventListener('click',openHint);
  function summary(){
    const total=history.choices.length,direct=history.choices.filter(x=>x.rating==='direct').length,valid=history.choices.filter(x=>x.rating==='valid').length;
    progress.replaceChildren(element('h2',{},'Technique choices'),element('p',{},total?`${direct+valid} useful first choices from ${total} moves: ${direct} direct methods and ${valid} valid alternatives.`:'No technique moves yet. Try a five-move workout in Learn.'),element('p',{class:'muted small'},'Hint use records support requested, not a diagnosis. Recognising a method does not demonstrate that you can calculate with it. Saved in this browser, alongside your separate factor evidence.'));
  }
  function startTechnique(fresh=false){
    const s=getState();if(dialog.open)dialog.close();
    if(!quiz||quiz.finished||fresh){
      const cards=makeTechniqueSession({target:s.target||24,found:s.found,limit:s.limit,stage:s.stage,history});
      quiz={cards,index:0,first:new Map(),solved:new Set(),tried:new Map(),feedback:'',finished:false};
    }
    if(s.mode==='timed'&&s.phase==='running'){pause();ownsSessionPause=getState().phase==='paused';}
    setView('strategy');paintQuiz();$('strategyHeading').setAttribute('tabindex','-1');$('strategyHeading').focus({preventScroll:true});document.body.classList.remove('focus-menu-revealed');window.scrollTo({top:0,behavior:'auto'});
  }
  function choose(card,choice){
    if(!quiz||quiz.finished||quiz.cards[quiz.index]!==card||quiz.solved.has(card.id))return;
    const answer=card.options.find(o=>o.id===choice);if(!answer)return;
    const tried=quiz.tried.get(card.id)||new Set();if(tried.has(choice))return;tried.add(choice);quiz.tried.set(card.id,tried);
    if(!quiz.first.has(card.id)){
      quiz.first.set(card.id,answer.rating);history=recordChoice(history,card,choice);save();
      learning.record({concept:'technique-choice:'+card.technique,correct:answer.rating!=='retry',hints:0,mode:'technique',context:{target:card.target,choice,rating:answer.rating,evidence:'recognition-only'}});
    }
    if(answer.rating!=='retry')quiz.solved.add(card.id);
    quiz.feedback=(answer.rating==='direct'?'Good move. ':answer.rating==='valid'?'That works too. ':'Not for this job yet. ')+answer.feedback;
    paintQuiz();if(quiz.solved.has(card.id))$('strategyNext').focus({preventScroll:true});
  }
  function finishQuiz(){
    if(quiz.finished)return;quiz.finished=true;
    const ratings=[...quiz.first.values()],useful=ratings.filter(x=>x!=='retry').length;
    history.sessions.push({at:Date.now(),moves:quiz.cards.length,answered:ratings.length,useful,skipped:quiz.cards.length-ratings.length});history.sessions=history.sessions.slice(-100);save();
    $('strategyQuestion').hidden=true;$('strategyResult').hidden=false;$('strategyHeading').textContent='Workout complete';$('strategyCount').textContent=quiz.cards.length+' MOVES';
    const result=$('strategyResult');result.replaceChildren(element('h2',{},`${useful} useful first choices`),element('p',{},`You answered ${ratings.length} of ${quiz.cards.length} situations. A valid alternative counts as useful too. Skips are not marked as errors.`));
    const retry=quiz.cards.filter(c=>quiz.first.get(c.id)==='retry').map(c=>strategyNames[c.technique]);
    if(retry.length)result.append(element('p',{},'Worth another look: '+retry.join(', ')+'.'));
    const again=element('button',{type:'button',class:'primary',id:'strategyAgain'},'Another five moves');again.onclick=()=>startTechnique(true);result.append(again);summary();
  }
  function paintQuiz(){
    if(!quiz||quiz.finished)return;const card=quiz.cards[quiz.index];if(!card){finishQuiz();return;}
    $('strategyQuestion').hidden=false;$('strategyResult').hidden=true;
    $('strategyHeading').textContent='Which move?';$('strategyCount').textContent='MOVE '+(quiz.index+1)+' OF '+quiz.cards.length;
    $('strategyContext').textContent=card.context;$('strategyPrompt').textContent=card.prompt;
    const options=$('strategyOptions');options.replaceChildren();
    for(const choice of card.options){const button=element('button',{type:'button','data-choice':choice.id,class:'strategy-option'},choice.label);button.disabled=quiz.solved.has(card.id)||(quiz.tried.get(card.id)?.has(choice.id)||false);button.onclick=()=>choose(card,choice.id);options.append(button);}
    $('strategyFeedback').textContent=quiz.feedback;$('strategyFeedback').hidden=!quiz.feedback;
    $('strategyNext').hidden=!quiz.solved.has(card.id);$('strategySkip').hidden=quiz.solved.has(card.id);
    $('strategyNext').textContent=quiz.index===quiz.cards.length-1?'See summary':'Next move \u2192';
  }
  function advance(){if(!quiz||quiz.finished)return;quiz.index++;quiz.feedback='';paintQuiz();$('strategyHeading').focus({preventScroll:true});}
  $('strategyNext').addEventListener('click',advance);$('strategySkip').addEventListener('click',advance);
  $('techniqueStart').addEventListener('click',()=>startTechnique());$('strategyExit').addEventListener('click',()=>setView('play'));
  function viewChanged(){
    const s=getState();
    if(s.view==='strategy')document.querySelector('[data-view="learn"]')?.classList.add('active');
    if(s.view!=='play')holdTime('away');else{releaseTime('away');if(ownsSessionPause&&s.phase==='paused'){ownsSessionPause=false;pause();}}
    if(s.view==='progress')summary();
    if(s.view==='learn')$('techniqueStart').textContent=quiz&&!quiz.finished?'Resume technique workout':'Start a technique workout';
  }
  function resetRound(){
    tidyHint(false);if(dialog.open)dialog.close();lesson=null;level=0;exposures.clear();seenSteps.clear();roundId=identity();
  }
  // Mobile browser layout viewport can be taller than the visible viewport.
  // Anchor the hint to visualViewport rather than CSS fixed bottom, which can be off-screen.
  function placeMobileHint(){
    const hint=$('helpToggle');if(!hint)return;
    if(innerWidth<=700&&matchMedia('(pointer:coarse)').matches){
      const vv=window.visualViewport;
      const top=Math.max(8,(vv?.offsetTop||0)+(vv?.height||innerHeight)-54);
      hint.style.setProperty('top',top+'px','important');
      hint.style.setProperty('bottom','auto','important');
    }else{hint.style.removeProperty('top');hint.style.removeProperty('bottom');}
  }
  window.visualViewport?.addEventListener('resize',placeMobileHint,{passive:true});
  window.visualViewport?.addEventListener('scroll',placeMobileHint,{passive:true});
  window.addEventListener('resize',placeMobileHint,{passive:true});
  function render(){
    const s=getState();
    placeMobileHint();if(roundId!==identity())resetRound();
    $('helpToggle').hidden=!['running','paused'].includes(s.phase);$('helpToggle').disabled=false;
    if(dialog.open&&s.phase==='finished'){tidyHint(false);dialog.close();}
  }
  summary();
  return {render,viewChanged,resetRound,openHint,assistanceFor:pair=>exposures.get(normalPair(pair))?.level||0,
    accepted:pair=>{const info=exposures.get(normalPair(pair));if(info)learning.record({concept:'technique-use:'+info.technique,correct:true,hints:info.level,mode:getState().mode,context:{target:getState().target,pair:normalPair(pair),evidence:'supported-application'}});},
    export:()=>history,resetProgress:()=>{history=cleanStrategyHistory(null);quiz=null;save();summary();}
  };
}
