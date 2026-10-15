import {factorPairs,assessPair} from '../logic.mjs';
import {createActiveClock} from './clock.mjs';
export const CHECK_VERSION=1;
export const CHECK_LEVELS={foundation:'Foundation',fluency:'Times tables',systematic:'Systematic',strategic:'Strategic',expert:'Expert'};
const packs={foundation:[[12,9,10,17],[18,4,14,19]],fluency:[[48,36,77,53],[80,100,91,59]],systematic:[[180,144,143,197],[252,196,187,199]],strategic:[[360,324,221,311],[420,400,299,313]],expert:[[720,625,437,659],[840,729,589,661]]};
export function checkItems(stage='foundation',form=0) {
  const targets=(packs[stage]||packs.foundation)[form===1?1:0],n=stage==='foundation'?18:stage==='fluency'?117:657;
  return [...targets.map(target=>({kind:'pairs',target,prompt:'Find every factor pair of '+target,hint:'Start with 1 \u00d7 '+target+'. Try possible smaller factors in order, up to '+Math.floor(Math.sqrt(target))+'. A whole-number quotient gives the partner. Reversed pairs only count once.'})),
    {kind:'rule9',target:n,prompt:'Which test tells you whether '+n+' is divisible by 9?',options:['Check whether its final digit is 9.','Add all its digits and check whether the sum is divisible by 9.','Check only whether it is even.'],correct:1,hint:'Add all the digits. If their sum is a multiple of 9, the original number is divisible by 9. For '+n+', the digit sum is '+String(n).split('').reduce((s,d)=>s+Number(d),0)+'.'},
    {kind:'stop',target:targets[0],prompt:'When can you stop looking for new factor pairs?',options:['After trying every possible smaller factor up to and including the square root.','As soon as you have found one pair.','After checking only even factors.'],correct:0,hint:'Beyond the square root, pairs are reversed versions of earlier pairs. Check every possible smaller factor through the square root, including the middle square pair when it exists.'}];
}
const inputType=()=>globalThis.matchMedia?.('(pointer: coarse)').matches?'touch-form':'keyboard-form';
function safeDraft(d) {
  return d && d.version===1 && d.stage in CHECK_LEVELS && [0,1].includes(d.form) && Number.isInteger(d.cursor) && d.cursor>=0 && d.cursor<6 && Array.isArray(d.responses) && d.responses.length<=6 && d.responses.every(r=>r&&typeof r.help==='boolean'&&Array.isArray(r.pairs)&&r.pairs.every(k=>/^\d+-\d+$/.test(k))&&Number.isInteger(r.correct)&&r.correct>=0&&Number.isInteger(r.errors)&&r.errors>=0&&Number.isFinite(r.ms)&&r.ms>=0);
}
export function createProgressCheck({store,defaultStage=()=> 'foundation',onDone=()=>{},canStart=()=>true}={}) {
  const dialog=document.createElement('dialog');dialog.id='improvementCheck';dialog.className='improvement-dialog';dialog.setAttribute('aria-labelledby','checkTitle');
  dialog.innerHTML='<header><div><p class="eyebrow">OPTIONAL PROGRESS CHECK</p><h2 id="checkTitle">Explore what feels familiar</h2></div><button class="secondary" type="button" id="checkClose">Save &amp; close</button></header><p class="improvement-help">Hints are welcome. They never deduct points. There is no countdown, and these checks do not change your game score or difficulty.</p><div id="checkBody"></div><p id="checkFeedback" role="status" aria-live="polite"></p>';
  document.body.append(dialog);const body=dialog.querySelector('#checkBody'),feedback=dialog.querySelector('#checkFeedback'),clock=createActiveClock();
  let draft=null,returnFocus=null;clock.hold('closed');
  const response=()=>draft?.responses[draft.cursor];
  function save(){const r=response();if(r){r.ms+=clock.elapsed();clock.reset();}if(draft)store.setDraft(draft);}
  function close(){save();clock.hold('closed');dialog.close();returnFocus?.focus?.({preventScroll:true});}
  dialog.querySelector('#checkClose').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  const hidden=()=>document.hidden?clock.hold('hidden'):clock.release('hidden');document.addEventListener('visibilitychange',hidden);
  window.addEventListener('blur',()=>clock.hold('blur'));window.addEventListener('focus',()=>clock.release('blur'));
  function finish(){
    clock.hold('done');save();
    const completed={kind:'check',id:draft.id,version:1,stage:draft.stage,form:draft.form,complete:true,at:Date.now(),startedAt:draft.startedAt,input:draft.input,
      responses:draft.responses.map(r=>({kind:r.kind,target:r.target,correct:r.correct,errors:r.errors,help:r.help,ms:Math.round(r.ms),pairs:r.pairs,done:r.done}))};
    store.append({checks:[completed]});store.setDraft(null);draft=null;
    body.replaceChildren();const title=document.createElement('h3');title.textContent='All six activities explored.';
    const summary=document.createElement('p'),good=completed.responses.reduce((s,r)=>s+r.correct,0),mistakes=completed.responses.reduce((s,r)=>s+r.errors,0),helped=completed.responses.filter(r=>r.help).length;
    summary.textContent=good+' correct submissions from '+(good+mistakes)+' attempts. You explored '+helped+' activities with support; those correct answers count equally. This is a reference point, not a grade.';
    const button=document.createElement('button');button.type='button';button.className='primary';button.textContent='Back to my progress';button.onclick=close;body.append(title,summary,button);feedback.textContent='Check saved. Compare the same level and set in Progress.';onDone(completed);store.sync({pull:false});button.focus();
  }
  function render(){
    if(!draft)return;feedback.textContent='';body.replaceChildren();
    const item=checkItems(draft.stage,draft.form)[draft.cursor];
    let r=response();if(!r){r={kind:item.kind,target:item.target,correct:0,errors:0,help:false,ms:0,pairs:[],done:false,left:'',right:''};draft.responses.push(r);}
    clock.reset();clock.release('hint');clock.release('done');if(r.done)clock.hold('done');store.setDraft(draft);
    const step=document.createElement('p');step.className='check-step';step.textContent='Activity '+(draft.cursor+1)+' of 6 \u00b7 '+CHECK_LEVELS[draft.stage]+' \u00b7 Set '+(draft.form?'B':'A');
    const title=document.createElement('h3');title.textContent=item.prompt;
    const hintButton=document.createElement('button');hintButton.type='button';hintButton.className='secondary';hintButton.id='checkHint';hintButton.textContent='Explore a hint';hintButton.setAttribute('aria-expanded','false');
    const hint=document.createElement('p');hint.className='check-hint';hint.id='checkHintText';hint.hidden=true;hint.textContent=item.hint;hintButton.setAttribute('aria-controls','checkHintText');
    hintButton.onclick=()=>{hint.hidden=!hint.hidden;hintButton.setAttribute('aria-expanded',String(!hint.hidden));hintButton.textContent=hint.hidden?'Explore a hint':'Back to the question';if(hint.hidden)clock.release('hint');else{r.help=true;clock.hold('hint');}for(const control of body.querySelectorAll('.check-entry input,.check-entry button,.check-options button'))control.disabled=!hint.hidden||r.done;save();};
    body.append(step,title,hintButton,hint);
    const next=document.createElement('button');next.id='checkNext';next.type='button';next.className='primary';next.textContent=draft.cursor===5?'Finish check':'Next activity';next.hidden=!r.done;
    next.onclick=()=>{save();if(draft.cursor===5){finish();return;}draft.cursor++;store.setDraft(draft);render();};
    if(item.kind==='pairs'){
      const form=document.createElement('form');form.className='check-entry';form.innerHTML='<label>First factor<input name="left" inputmode="numeric" pattern="[0-9]*" aria-label="First check factor" autocomplete="off"></label><span aria-hidden="true">\u00d7</span><label>Second factor<input name="right" inputmode="numeric" pattern="[0-9]*" aria-label="Second check factor" autocomplete="off"></label><button class="primary" type="submit">Add pair</button>';
      form.noValidate=true;form.elements.left.value=r.left||'';form.elements.right.value=r.right||'';
      for(const field of ['left','right'])form.elements[field].oninput=()=>{r[field]=form.elements[field].value.slice(0,7);save();};
      const solved=document.createElement('p');solved.className='check-pairs';solved.id='checkPairs';
      const update=()=>{solved.textContent=(r.pairs.length?r.pairs.map(p=>p.replace('-',' \u00d7 ')).join(' \u00b7 ')+' \u2014 ':'')+r.pairs.length+' of '+factorPairs(item.target).length+' pairs';form.hidden=r.done;next.hidden=!r.done;};
      form.onsubmit=e=>{
        e.preventDefault();if(r.done)return;
        const left=form.elements.left.value.trim(),right=form.elements.right.value.trim(),result=assessPair(left+'x'+right,item.target,new Set(r.pairs));
        if(!left||!right||result.status==='invalid'||result.status==='duplicate'){feedback.textContent=!left&&!right?'':result.message;return;}
        if(result.status==='incorrect'){r.errors++;feedback.textContent='Not quite. Try another pair, or explore a hint.';}
        else{r.correct++;r.pairs.push(result.key);r.left='';r.right='';form.elements.left.value='';form.elements.right.value='';r.done=r.pairs.length===factorPairs(item.target).length;feedback.textContent=r.done?'Every factor pair found.':'That pair works.';if(r.done)clock.hold('done');}
        save();update();if(r.done)next.focus();else form.elements.left.focus();
      };
      body.append(form,solved);update();
    }else{
      const choices=document.createElement('div');choices.className='check-options';
      item.options.forEach((label,i)=>{const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;button.disabled=r.done;button.onclick=()=>{if(r.done)return;if(i===item.correct){r.correct++;r.done=true;clock.hold('done');feedback.textContent='Yes. '+item.hint;for(const b of choices.children)b.disabled=true;next.hidden=false;next.focus();}else{r.errors++;feedback.textContent='Not quite. Explore a hint or try another explanation.';}save();};choices.append(button);});body.append(choices);
    }
    body.append(next);
  }
  function open(){
    if(!canStart())return;returnFocus=document.activeElement;dialog.showModal();clock.release('closed');clock.release('done');clock.reset();hidden();
    draft=store.getDraft();
    if(safeDraft(draft)){if(draft.input!==inputType())draft.input='mixed';render();return;}
    draft=null;body.innerHTML='<p>Four factor-pair activities and two method questions. Choose a level you are comfortable with. Sets A and B offer variety, but are not assumed to be equally difficult: comparisons always match the same level and set.</p><label class="check-setup">Challenge level<select id="checkStage"></select></label><button id="checkBegin" type="button" class="primary">Start check</button>';
    const select=body.querySelector('#checkStage');for(const [key,label] of Object.entries(CHECK_LEVELS)){const option=document.createElement('option');option.value=key;option.textContent=label;select.append(option);}select.value=defaultStage() in CHECK_LEVELS?defaultStage():'foundation';
    body.querySelector('#checkBegin').onclick=()=>{const stage=select.value,n=store.snapshot().checks.filter(c=>c.stage===stage).length;draft={id:crypto.randomUUID(),version:1,stage,form:n%2,cursor:0,responses:[],startedAt:Date.now(),input:inputType()};render();};feedback.textContent='';
  }
  return {open,close};
}
