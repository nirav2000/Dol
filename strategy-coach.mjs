import {makeTechniqueSession,recordChoice,cleanStrategyHistory,strategyNames} from './strategy-model.mjs';
import {createTeachingCoach} from './teaching-coach.mjs';
const KEY='dol-strategy-history-v1';
const $=id=>document.getElementById(id);
function element(tag,attributes={},text){const node=document.createElement(tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;}
/** Interactive calculation support plus the existing, separate strategy-choice workout. */
export function createStrategySupport({getState,setView,pause,focusAnswer,learning,storageScope=k=>k,holdTime=()=>{},releaseTime=()=>{}}){
  let saved;try{saved=JSON.parse(localStorage.getItem(storageScope(KEY)));}catch{}
  let history=cleanStrategyHistory(saved),ownsSessionPause=false,quiz=null;
  function save(){try{localStorage.setItem(storageScope(KEY),JSON.stringify(history));}catch{}}
  const coach=createTeachingCoach({getState,pause,focusAnswer,learning,storageScope,holdTime,releaseTime});
  const entry=element('section',{class:'technique-entry'});
  entry.innerHTML='<div><p class="eyebrow">PRACTISE THE DECISION</p><h2>Choose the move.</h2><p>No factor answers to type. Five situations, three possible moves. Learn which tools help, and when.</p></div><button type="button" class="primary" id="techniqueStart">Start a technique workout</button>';
  $('learnView').querySelector('.page-head').after(entry);
  const view=element('section',{id:'strategyView',class:'view',hidden:''});
  view.innerHTML='<div class="strategy-top"><button type="button" class="text-button" id="strategyExit">Back to factor practice</button><span class="pill">Untimed \u00b7 choose, don\u2019t calculate</span></div><section class="strategy-workout"><p class="eyebrow" id="strategyCount"></p><h1 id="strategyHeading">Which move?</h1><div id="strategyQuestion"><p id="strategyContext" class="strategy-context"></p><p id="strategyPrompt"></p><div id="strategyOptions" class="strategy-options"></div><p id="strategyFeedback" class="strategy-feedback" role="status" aria-live="polite"></p><div class="coach-actions"><button type="button" id="strategySkip" class="text-button">Skip this move</button><button type="button" id="strategyNext" class="primary" hidden>Next move \u2192</button></div></div><div id="strategyResult" hidden></div><p class="small muted">Choosing a method and calculating a factor pair are different skills. These results stay separate from your factor score.</p></section>';
  document.querySelector('main').append(view);
  const progress=element('section',{class:'insight-section',id:'strategySummary'});$('progressView').append(progress);
  $('helpToggle').addEventListener('click',coach.open);
  function summary(){
    const total=history.choices.length,direct=history.choices.filter(x=>x.rating==='direct').length,valid=history.choices.filter(x=>x.rating==='valid').length;
    progress.replaceChildren(element('h2',{},'Technique choices'),element('p',{},total?`${direct+valid} useful first choices from ${total} moves: ${direct} direct methods and ${valid} valid alternatives.`:'No technique moves yet. Try a five-move workout in Learn.'),element('p',{class:'muted small'},'Hint use records support requested, not a diagnosis. Recognising a method does not demonstrate that you can calculate with it. Saved in this browser, alongside your separate factor evidence.'));
  }
  function startTechnique(fresh=false){
    const s=getState();if(coach.isOpen())coach.close();
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
    for(const choice of card.options){const b=element('button',{type:'button','data-choice':choice.id,class:'strategy-option'},choice.label);b.disabled=quiz.solved.has(card.id)||(quiz.tried.get(card.id)?.has(choice.id)||false);b.onclick=()=>choose(card,choice.id);options.append(b);}
    $('strategyFeedback').textContent=quiz.feedback;$('strategyFeedback').hidden=!quiz.feedback;
    $('strategyNext').hidden=!quiz.solved.has(card.id);$('strategySkip').hidden=quiz.solved.has(card.id);
    $('strategyNext').textContent=quiz.index===quiz.cards.length-1?'See summary':'Next move \u2192';
  }
  function advance(){if(!quiz||quiz.finished)return;quiz.index++;quiz.feedback='';paintQuiz();$('strategyHeading').focus({preventScroll:true});}
  $('strategyNext').addEventListener('click',advance);$('strategySkip').addEventListener('click',advance);
  $('techniqueStart').addEventListener('click',()=>startTechnique());$('strategyExit').addEventListener('click',()=>setView('play'));
  function viewChanged(){
    const s=getState();coach.viewChanged();
    if(s.view==='strategy')document.querySelector('[data-view="learn"]')?.classList.add('active');
    if(s.view!=='play')holdTime('away');else{releaseTime('away');if(ownsSessionPause&&s.phase==='paused'){ownsSessionPause=false;pause();}}
    if(s.view==='progress')summary();
    if(s.view==='learn')$('techniqueStart').textContent=quiz&&!quiz.finished?'Resume technique workout':'Start a technique workout';
  }
  // Preserve the existing touch-safe Hint position, independently of the teaching dialog.
  function placeMobileHint(){
    const hint=$('helpToggle');if(!hint)return;
    if(innerWidth<=700&&matchMedia('(pointer:coarse)').matches){
      const vv=window.visualViewport;const top=Math.max(8,(vv?.offsetTop||0)+(vv?.height||innerHeight)-54);
      hint.style.setProperty('top',top+'px','important');hint.style.setProperty('bottom','auto','important');
    }else{hint.style.removeProperty('top');hint.style.removeProperty('bottom');}
  }
  window.visualViewport?.addEventListener('resize',placeMobileHint,{passive:true});window.visualViewport?.addEventListener('scroll',placeMobileHint,{passive:true});window.addEventListener('resize',placeMobileHint,{passive:true});
  function render(){placeMobileHint();coach.render();$('helpToggle').hidden=!['running','paused'].includes(getState().phase);$('helpToggle').disabled=false;}
  summary();
  return {render,viewChanged,resetRound:coach.resetRound,openHint:coach.open,assistanceFor:coach.assistanceFor,accepted:coach.accepted,
    export:()=>({...history,teaching:coach.export()}),resetProgress:()=>{history=cleanStrategyHistory(null);quiz=null;save();summary();coach.resetProgress();}
  };
}
