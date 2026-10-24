// Rapid square recall: one action to begin, digits/Enter to submit, no unnecessary taps.
// The shared Learning SDK remains the sole source of learning evidence.
import {quickSquareDeck,squareMemory,squareReview} from './square-learning-model.mjs';
import {el,button} from './teaching-question.mjs';
const KEY='dol-square-fluency-preferences-v1';
const isPhone=()=>matchMedia('(pointer:coarse)').matches&&innerWidth<=700;
function validPrefs(raw){
 const range=[12,20,32,50,75,100].includes(Number(raw?.range))?Number(raw.range):32;
 const count=[5,10,20].includes(Number(raw?.count))?Number(raw.count):10;
 return {range,count};
}
export function installSquareFluency({studio,learning,events=()=>[],onLearningRecord=()=>{},onUpdate=()=>{},scope=k=>k}={}){
 if(!studio)return {start(){},close(){},reset(){}};
 const host=el('section',{id:'sqQuick',class:'sq-quick',hidden:'','aria-label':'Rapid square recall practice'});
 host.innerHTML='<div class="sq-quick-top"><div><p class="eyebrow">QUICK PRACTICE · ADAPTIVE RECALL</p><h3>Square fluency</h3><p class="sq-quick-note">Fast and correct → next question automatically. Slow or incorrect → stop, learn, then press Enter to continue.</p></div><button type="button" id="sqQuickClose" class="secondary">Close</button></div>'
 +'<details id="sqQuickSettings" class="sq-quick-settings"><summary id="sqQuickSettingsLabel">1–32 · 10 questions · 4s target · Change</summary><div class="sq-quick-prefs"><label for="sqQuickRange">Squares up to <select id="sqQuickRange"><option value="12">12</option><option value="20">20</option><option value="32">32</option><option value="50">50</option><option value="75">75</option><option value="100">100</option></select></label><label for="sqQuickCount">Questions <select id="sqQuickCount"><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></label><label for="sqQuickFast">Quick means <select id="sqQuickFast"><option value="3000">Under 3 seconds</option><option value="4000" selected>Under 4 seconds</option><option value="5000">Under 5 seconds</option><option value="6000">Under 6 seconds</option></select></label></div></details>'
 +'<div class="sq-quick-main"><p id="sqQuickCounter" class="eyebrow"></p><div class="sq-quick-question"><h3 id="sqQuickPrompt" tabindex="-1"></h3><p id="sqQuickPerformance">Recall the answer and type it below.</p></div><form id="sqQuickForm" novalidate><label for="sqQuickAnswer">Your answer</label><div class="sq-quick-input-row"><input type="text" id="sqQuickAnswer" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" enterkeyhint="done" aria-describedby="sqQuickFeedback" /><button class="primary" type="submit" id="sqQuickSubmit">Enter ↵</button></div></form>'
 +'<div id="sqQuickPad" class="sq-quick-pad" role="group" aria-label="Number keypad"><button data-digit="1">1</button><button data-digit="2">2</button><button data-digit="3">3</button><button data-digit="4">4</button><button data-digit="5">5</button><button data-digit="6">6</button><button data-digit="7">7</button><button data-digit="8">8</button><button data-digit="9">9</button><button data-key="clear" aria-label="Clear answer">Clear</button><button data-digit="0">0</button><button data-key="back" aria-label="Delete last digit">⌫</button></div>'
 +'<button type="button" id="sqQuickKeyboard" class="text-button" hidden>Use phone keyboard instead</button><p id="sqQuickFeedback" class="sq-quick-feedback" role="status" aria-live="polite"></p><div id="sqQuickExplanation" class="sq-quick-explanation" hidden></div>'
 +'<div class="sq-quick-actions"><button type="button" id="sqQuickNudge" class="secondary">Show a clue</button><button type="button" id="sqQuickReveal" class="secondary">See worked answer</button><button type="button" id="sqQuickNext" class="primary" hidden>Next ↵</button><button type="button" id="sqQuickSkip" class="text-button">Skip</button></div></div>'
 +'<div id="sqQuickDone" class="sq-quick-done" hidden></div><p class="sq-quick-hint">No countdown or points. The clock only measures recall latency. Correct fast answers are scheduled further away (7 → 14 → 30 → 60 → 90 days across successful returns). Slow or helped answers return sooner. Empty answers and examples never count as success.</p>';
 studio.prepend(host);
 const $=id=>host.querySelector('#'+id);
 let prefs;try{prefs=validPrefs(JSON.parse(localStorage.getItem(scope(KEY))||'null'));}catch{prefs=validPrefs(null);}
 $('sqQuickRange').value=String(prefs.range);$('sqQuickCount').value=String(prefs.count);
 let session=null,pending=null,phoneKeyboard=false;
 const saving=()=>{prefs=validPrefs({range:$('sqQuickRange').value,count:$('sqQuickCount').value});$('sqQuickSettingsLabel').textContent='1–'+prefs.range+' · '+prefs.count+' questions · '+(Number($('sqQuickFast').value)/1000)+'s target · Change';try{localStorage.setItem(scope(KEY),JSON.stringify(prefs));}catch{}};
 const invalidate=()=>{if(pending){clearTimeout(pending);pending=null;}};
 const active=()=>!host.hidden&&!!session;
 const current=()=>session?.deck[session.index];
 function lockAnswer(value){
  $('sqQuickAnswer').disabled=value;$('sqQuickSubmit').disabled=value;
  $('sqQuickPad').querySelectorAll('button').forEach(b=>b.disabled=value);
 }
 function progress(){
  const s=session;
  $('sqQuickCounter').textContent='QUESTION '+(s.index+1)+' OF '+s.deck.length+' · '+s.fast+' FAST · '+s.slow+' SLOW · '+s.missed+' REVIEW AGAIN';
 }
 function focusInput(){
  const input=$('sqQuickAnswer');
  if(isPhone()&&!phoneKeyboard){input.readOnly=true;input.focus({preventScroll:true});}
  else{input.readOnly=false;input.focus({preventScroll:true});}
 }
 function showPad(){
  const phone=isPhone();$('sqQuickPad').hidden=!phone||phoneKeyboard;
  $('sqQuickKeyboard').hidden=!phone;
  $('sqQuickKeyboard').textContent=phoneKeyboard?'Use the large keypad':'Use phone keyboard instead';
  $('sqQuickSubmit').hidden=phone&&!phoneKeyboard;
 }
 function paint(){
  invalidate();
  if(!session)return;
  if(session.index>=session.deck.length){complete();return;}
  const q=current();
  session.state={start:performance.now(),hints:0,failed:false,resolved:false,recorded:false,shown:false};
  $('sqQuickDone').hidden=true;$('sqQuickDone').replaceChildren();$('sqQuickForm').hidden=false;
  $('sqQuickPrompt').textContent=q.prompt;
  $('sqQuickAnswer').value='';lockAnswer(false);
  $('sqQuickFeedback').textContent='';$('sqQuickExplanation').replaceChildren();$('sqQuickExplanation').hidden=true;
  $('sqQuickNext').hidden=true;$('sqQuickNudge').hidden=false;$('sqQuickReveal').hidden=false;$('sqQuickSkip').hidden=false;
  $('sqQuickPerformance').textContent='Enter your answer. A quick correct response moves on automatically.';
  progress();showPad();focusInput();
 }
 function record(q,correct,ms,hints=0){
  try{
   const fastLimitMs=Number($('sqQuickFast').value)||4000;
   learning?.record({concept:q.concept,correct,hints,mode:'square-fluency',
    durationMs:Math.max(1,Math.min(1200000,Math.round(ms))),
    context:{target:q.n*q.n,root:q.n,activity:'square',fastLimitMs,
     evidence:correct?(hints?'supported-retrieval':'retrieved'):'needs-practice'}});
   onLearningRecord();
  }catch(error){console.warn('Square fluency evidence remains unavailable:',error);}
 }
 function explanation(q,reason){
  $('sqQuickExplanation').hidden=false;
  $('sqQuickExplanation').replaceChildren(el('h4',{},reason),el('p',{},q.n+'² = '+q.answer+'. '+q.steps));
 }
 function pause(message,worked=true){
  invalidate();
  session.state.resolved=true;lockAnswer(true);
  $('sqQuickFeedback').textContent=message;
  $('sqQuickNudge').hidden=true;$('sqQuickReveal').hidden=true;$('sqQuickSkip').hidden=true;
  $('sqQuickNext').hidden=false;
  $('sqQuickNext').textContent=session.index===session.deck.length-1?'See summary ↵':'Next question ↵';
  if(worked)explanation(current(),'A helpful method');
  $('sqQuickPad').hidden=true;
  $('sqQuickPerformance').textContent='Take a moment to understand the method, then press Enter for the next question.';
  $('sqQuickNext').focus({preventScroll:true});
  progress();
 }
 function queueRetry(q){
  if(session.retryKeys.has(q.concept)||q.retry)return;
  session.retryKeys.add(q.concept);
  session.deck.push({...q,retry:true});
 }
 function submit(event){
  event?.preventDefault?.();
  if(!active())return;
  if(session.state.resolved){next();return;}
  invalidate();
  const value=$('sqQuickAnswer').value.trim();
  if(!/^\d+$/.test(value)){$('sqQuickFeedback').textContent=value?'Enter a whole number.':'Type an answer, or use a clue.';return;}
  const q=current(),st=session.state,elapsed=performance.now()-st.start;
  const correct=Number(value)===q.answer;
  if(!correct){
   record(q,false,elapsed,st.hints);
   st.failed=true;session.missed++;queueRetry(q);
   pause('Not quite — '+q.n+'² = '+q.answer+'. We will revisit this one.',true);
   return;
  }
  const fastLimitMs=Number($('sqQuickFast').value)||4000;
  const assisted=!!st.hints||st.failed||!!q.retry,fast=!assisted&&elapsed<=fastLimitMs;
  record(q,true,elapsed,assisted?Math.max(1,st.hints):0);
  if(fast){
   session.fast++;
   $('sqQuickFeedback').textContent='Correct · '+(elapsed/1000).toFixed(1)+' s. Nicely fluent!';
   $('sqQuickPerformance').textContent='Next square…';
   session.state.resolved=true;lockAnswer(true);
   invalidate();
   pending=setTimeout(()=>{pending=null;next();},220);
  }else{
   session.slow++;
   pause('Correct · '+(elapsed/1000).toFixed(1)+' s. '+(assisted?'Good practice with support.':'Let this one settle before the next.'),true);
  }
  onUpdate();
 }
 function typeDigit(digit){
  if(!active()||session.state.resolved)return;
  const input=$('sqQuickAnswer');
  if(input.value.length>=5)return;
  input.value+=String(digit);received();
 }
 function received(){
  if(!active()||session.state.resolved)return;
  invalidate();
  const input=$('sqQuickAnswer'),expected=String(current().answer).length;
  // A short settling window allows the learner to backspace a mistype before judging.
  if(/^\d+$/.test(input.value)&&input.value.length>=expected){
   pending=setTimeout(()=>{pending=null;submit();},190);
  }
 }
 function next(){
  if(!session)return;invalidate();
  session.index++;paint();
 }
 function skip(){
  if(!session||session.state.resolved)return;
  session.skipped++;next();
 }
 function complete(){
  const s=session;if(!s)return;invalidate();session=null;
  $('sqQuickForm').hidden=true;$('sqQuickPad').hidden=true;$('sqQuickNext').hidden=true;
  $('sqQuickSkip').hidden=true;$('sqQuickReveal').hidden=true;$('sqQuickNudge').hidden=true;
  $('sqQuickPerformance').textContent='Session complete';
  $('sqQuickDone').hidden=false;$('sqQuickDone').replaceChildren();
  $('sqQuickDone').append(el('h4',{},'A focused round, completed'),el('p',{},s.fast+' fast first-try responses · '+s.slow+' slower or supported responses · '+s.missed+' incorrect responses · '+s.skipped+' skipped.'));
  $('sqQuickDone').append(el('p',{},'Fluent squares will rest longer. Slower or incorrect squares have a shorter review interval. You can practise a new set whenever you like.'));
  $('sqQuickDone').append(button('Another round ↵',()=>start(),{class:'primary',id:'sqQuickAgain'}));
  $('sqQuickAgain').focus({preventScroll:true});
  onUpdate();
 }
 function start(){
  saving();invalidate();$('sqQuickSettings').open=false;
  const deck=quickSquareDeck({upTo:prefs.range,count:prefs.count,events:events()});
  host.hidden=false;onUpdate();
  if(!deck.length){
   session=null;$('sqQuickForm').hidden=true;$('sqQuickPad').hidden=true;$('sqQuickNudge').hidden=true;$('sqQuickReveal').hidden=true;
   $('sqQuickSkip').hidden=true;$('sqQuickNext').hidden=true;
   $('sqQuickDone').hidden=false;$('sqQuickDone').replaceChildren(
    el('h4',{},'No new or due squares in this range'),
    el('p',{},'Fluent squares are deliberately resting until their next review. Try a wider range, or return when more become due.'));
   $('sqQuickDone').append(button('Try a wider range',()=>{$('sqQuickRange').value='100';start();},{class:'primary'}));
  }else{
   session={deck,index:0,fast:0,slow:0,missed:0,skipped:0,retryKeys:new Set()};
   paint();
  }
  host.scrollIntoView({block:'start',behavior:'smooth'});
 }
 function close(){
  invalidate();session=null;host.hidden=true;onUpdate();
 }
 $('sqQuickClose').addEventListener('click',close);
 $('sqQuickForm').addEventListener('submit',submit);
 $('sqQuickAnswer').addEventListener('input',received);
 $('sqQuickPad').addEventListener('click',e=>{
  const key=e.target.closest('button');if(!key)return;
  if(key.dataset.digit!==undefined)typeDigit(key.dataset.digit);
  else if(key.dataset.key==='back'){$('sqQuickAnswer').value=$('sqQuickAnswer').value.slice(0,-1);received();}
  else if(key.dataset.key==='clear'){$('sqQuickAnswer').value='';received();}
 });
 $('sqQuickNext').addEventListener('click',next);
 $('sqQuickSkip').addEventListener('click',skip);
 $('sqQuickNudge').addEventListener('click',()=>{
  if(!active()||session.state.resolved)return;
  session.state.hints++;
  $('sqQuickFeedback').textContent=current().hint;
  $('sqQuickPerformance').textContent='Use the hint to work out the answer. Help is welcome.';
  focusInput();
 });
 $('sqQuickReveal').addEventListener('click',()=>{
  if(!active()||session.state.resolved)return;
  session.state.shown=true;queueRetry(current());
  pause('Worked example: '+current().n+'² = '+current().answer+'. This is not recorded as a correct answer.',true);
 });
 $('sqQuickKeyboard').addEventListener('click',()=>{phoneKeyboard=!phoneKeyboard;showPad();focusInput();});
 for(const id of ['sqQuickRange','sqQuickCount','sqQuickFast'])$(id).addEventListener('change',saving);
 saving();
 // Hardware keyboards, including Return on external keyboards, work without moving focus.
 host.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.isComposing){
   if(e.target.closest('select')||e.target.closest('button:not(#sqQuickNext)'))return;
   if(!active()&&$('sqQuickAgain'))return;
   e.preventDefault();
   if(session?.state.resolved){invalidate();next();}
   else if(session)submit();
   else if(!host.hidden&&$('sqQuickDone').hidden===false)start();
  }else if(isPhone()&&!phoneKeyboard&&active()&&!session.state.resolved&&e.target.id==='sqQuickAnswer'){
   if(/^[0-9]$/.test(e.key)){e.preventDefault();typeDigit(e.key);}
   if(e.key==='Backspace'){e.preventDefault();$('sqQuickAnswer').value=$('sqQuickAnswer').value.slice(0,-1);received();}
  }
 });
 document.addEventListener('visibilitychange',()=>{
  if(!active()||!session?.state||session.state.resolved)return;
  const st=session.state;
  if(document.hidden)st.hiddenAt=performance.now();
  else if(st.hiddenAt){st.start+=Math.max(0,performance.now()-st.hiddenAt);st.hiddenAt=0;}
 });
 return {start,close,isActive:active,reset:close};
}
