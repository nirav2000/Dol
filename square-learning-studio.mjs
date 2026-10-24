import {SQUARE_BANDS,squareMemory,squareQuestion,squareDeck,squareSummary,squareReview,squareConcept} from './square-learning-model.mjs';
import {el,button} from './teaching-question.mjs';

const fmt = time => new Date(time).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const words = n => n === 1 ? 'fact' : 'facts';
export function installSquareStudio({section,learning,onLearningRecord=()=>{},navigateToLearn=()=>{}}={}) {
  if (!section) return {focus(){},refresh(){},reset(){},openReview(){}};
  const studio=el('div',{id:'squareStudio',class:'sq-studio'});
  studio.innerHTML = '<div class="sq-hero"><div><p class="eyebrow">SQUARE NUMBERS · INTERACTIVE COURSE</p><h2>See it. Work it out. Remember it.</h2><p>Learn squares 1²–32² using patterns, visual proofs and real examples. Then retrieve them from memory and return when a review is due.</p><p class="sq-subnote">No timer, no penalties, and hints are always available.</p></div><div class="sq-hero-actions"><button type="button" id="sqStartLesson" class="primary">Start guided lesson →</button><button type="button" id="sqReview" class="secondary">Review due squares</button><button type="button" id="sqStartMixed" class="secondary">Mixed practice · 10</button></div></div>'
  + '<div class="sq-metrics" aria-label="Square-number learning summary"><div><strong id="sqSeen">0/32</strong><span>Squares explored</span></div><div><strong id="sqDueCount">0</strong><span>Due for review</span></div><div><strong id="sqRetaining">0</strong><span>Retained across returns</span></div><div><strong id="sqNextDate">—</strong><span>Next planned review</span></div></div>'
  + '<div class="sq-map-header"><div><h3>Choose a square to learn</h3><p>Every tile opens a lesson. Colour and labels show practice status, not an exam grade.</p></div><label class="sq-hide"><input type="checkbox" id="sqHideAnswers"> Hide answers for self-testing</label></div><div id="sqBands" class="sq-bands" role="group" aria-label="Square-number range"></div><div id="sqFactMap" class="sq-fact-map" role="group" aria-label="Select a square number"></div>'
  + '<section id="sqLesson" class="sq-lesson" aria-labelledby="sqLessonTitle"><div class="sq-lesson-head"><div><p class="eyebrow" id="sqLessonLabel">DISCOVER A SQUARE</p><h3 id="sqLessonTitle">6² = 36</h3><p id="sqLessonSummary"></p></div><button class="primary" type="button" id="sqTestFact">Test me on this square</button></div><div id="sqLessonTabs" class="sq-tabs" role="group" aria-label="Ways to learn"><button type="button" data-sq-tab="memory">Memory techniques</button><button type="button" data-sq-tab="visual">Build the square</button><button type="button" data-sq-tab="roots">Square roots & factors</button><button type="button" data-sq-tab="use">Real-life uses</button></div><div id="sqLessonContent" class="sq-lesson-content"></div></section>'
  + '<section id="sqQuiz" class="sq-quiz" aria-label="Square-number exercises" hidden><div class="sq-quiz-head"><p id="sqQuizCount" class="eyebrow"></p><button type="button" class="text-button" id="sqCloseQuiz">Close practice</button></div><p class="sq-quiz-kind" id="sqQuizKind"></p><h3 id="sqQuizPrompt" tabindex="-1"></h3><form id="sqQuizForm" novalidate><label for="sqAnswer">Your answer</label><div class="sq-answer-line"><input id="sqAnswer" type="text" inputmode="numeric" autocomplete="off" pattern="[0-9]*" maxlength="5" aria-describedby="sqFeedback"><button type="submit" id="sqCheck" class="primary">Check answer</button></div></form><p id="sqFeedback" class="sq-feedback" role="status" aria-live="polite"></p><div class="sq-support"><button type="button" id="sqHint" class="secondary">Give me a clue</button><button type="button" id="sqShowSteps" class="secondary">Show worked answer</button><button type="button" id="sqSkip" class="text-button">Skip</button><button type="button" id="sqNext" class="primary" hidden>Next question →</button></div><div id="sqWorked" class="sq-worked" hidden></div><p class="sq-quiz-footnote">Only attempted answers count as learning evidence. Seeing an example or skipping never counts as knowing the fact.</p></section>'
  + '<div id="sqComplete" class="sq-complete" role="status" hidden></div><p class="sq-review-note">Spaced reviews start the next day, then grow to 3, 7, 14 and 30 days after successful returns. Practising early does not falsely move a review further away. Correct answers reached with help count as useful practice, not independent recall.</p>';
  section.prepend(studio);
  const $ = id => studio.querySelector('#'+id);
  const events=()=>learning?.getState?.().events||[];
  const getStats=()=>squareSummary(events());
  let band='foundation',selected=6,tab='memory',session=null,lastFocused=null;
  const bandFor=n=>SQUARE_BANDS.find(b=>n>=b.from&&n<=b.to)?.id||'foundation';
  function record(q,correct,hints,ms){
    try {
      learning?.record?.({concept:q.concept,correct,hints,mode:'square-studio',durationMs:Math.min(Math.max(0,Math.round(ms)),1200000),context:{target:q.n*q.n,root:q.n,activity:q.kind,evidence:correct?(hints?'supported-retrieval':'retrieved'):'needs-practice'}});
      onLearningRecord();
    } catch(error){console.warn('Square learning evidence could not be saved:',error);}
  }
  function overview() {
    const stats=getStats();
    $('sqSeen').textContent=stats.seen+'/32';$('sqDueCount').textContent=String(stats.due);$('sqRetaining').textContent=String(stats.retaining);
    $('sqNextDate').textContent=Number.isFinite(stats.nextDue)?fmt(stats.nextDue):'—';
    $('sqReview').textContent='Review due · '+stats.due;
    $('sqReview').disabled=!stats.due;
    const bands=$('sqBands');bands.replaceChildren();
    for (const row of SQUARE_BANDS) {
      const due=stats.facts.filter(f=>f.n>=row.from&&f.n<=row.to&&f.due).length;
      const b=button(row.label+(due?' · '+due+' due':''),()=>{band=row.id;selected=Math.max(row.from,Math.min(row.to,selected));overview();paintLesson();},{class:band===row.id?'sq-band active':'sq-band','aria-pressed':band===row.id});
      bands.append(b);
    }
    const map=$('sqFactMap');map.replaceChildren();
    const stage=SQUARE_BANDS.find(b=>b.id===band);
    for(let n=stage.from;n<=stage.to;n++){
      const f=stats.facts[n-1],b=button('',()=>{selected=n;tab='memory';overview();paintLesson();$('sqLesson').scrollIntoView({block:'nearest',behavior:'smooth'});},{class:'sq-fact'+(f.due?' due':f.seen?' seen':' new')+(selected===n?' selected':''),'aria-pressed':selected===n,'aria-label':n+' squared, '+f.status+'. Open the lesson.'});
      b.append(el('strong',{},n+'²'),el('span',{},$('sqHideAnswers').checked?'?':'= '+n*n),el('small',{},f.status));
      map.append(b);
    }
    renderProgress(stats);
  }
  function renderGrid(n){
    const visual=el('div',{class:'sq-grid-frame'}),caption=el('p',{class:'sq-grid-caption'});
    caption.textContent=(n-1)+'² = '+(n-1)**2+' tiles, then add '+(2*n-1)+' coloured tiles to make '+n+'² = '+(n*n)+'.';
    const grid=el('div',{class:'sq-tile-grid',role:'img','aria-label':n+' by '+n+' square; last row and column highlight '+(2*n-1)+' new squares'});
    grid.style.gridTemplateColumns='repeat('+n+',minmax(0,1fr))';
    for(let row=0;row<n;row++)for(let col=0;col<n;col++)grid.append(el('i',{class:'sq-tile'+(row===n-1||col===n-1?' added':'')}));
    visual.append(caption,grid,el('p',{class:'sq-grid-note'},'The corner is shared, so add '+(n-1)+' + '+n+' (not '+n+' + '+n+').'));
    return visual;
  }
  function paintLesson() {
    const m=squareMemory(selected),f=squareReview(events(),selected);
    $('sqLessonTitle').textContent=selected+'² = '+m.square;
    $('sqLessonLabel').textContent=band.toUpperCase()+' · '+f.status.toUpperCase();
    $('sqLessonSummary').textContent='Square means '+selected+' × '+selected+'. The square root of '+m.square+' is '+selected+'.';
    const tabs=$('sqLessonTabs');
    tabs.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.sqTab===tab);b.setAttribute('aria-pressed',String(b.dataset.sqTab===tab));});
    const area=$('sqLessonContent');area.replaceChildren();
    if(tab==='memory'){
      area.append(el('h4',{},'A technique you can actually use'),el('p',{},m.strategy),el('h4',{},'Another route: neighbouring odd numbers'),el('p',{},m.neighbouring));
      area.append(el('p',{class:'sq-step-note'},'Try writing '+selected+'² on paper, covering the answer, saying the strategy aloud, and checking your result. Then test it in Dol.'));
      area.append(el('p',{class:'sq-caution'},m.caution));
    } else if(tab==='visual'){
      area.append(el('p',{},m.visual),renderGrid(selected));
    } else if(tab==='roots'){
      area.append(el('h4',{},'Work backwards'),el('p',{},m.inverse),el('h4',{},'Why this helps in factorisation'),el('p',{},m.boundary),el('p',{class:'sq-step-note'},'Every factor pair has at least one factor at or below the square root. Test all whole-number first factors up to that limit; larger partners appear automatically.'));
    } else {
      area.append(el('h4',{},'Area, not perimeter'),el('p',{},m.useCase),el('h4',{},'From a fact to a factor search'),el('p',{},m.boundary),el('p',{class:'sq-step-note'},'Use this in Dol when deciding which candidates to test and when your search is complete.'));
    }
  }
  function navigateTab(name) {tab=name;paintLesson();}
  $('sqLessonTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>navigateTab(b.dataset.sqTab)));
  function enterQuiz(mode,override=null){
    const cards=override||squareDeck({band,mode,selected,events:events()});
    $('sqComplete').hidden=true;
    if(!cards.length){$('sqComplete').hidden=false;$('sqComplete').textContent='No reviews are due yet. Start a guided lesson or mixed practice, and come back on the review date.';overview();return;}
    lastFocused=document.activeElement;
    session={cards:[...cards],index:0,mode,firstTry:0,helped:0,needsMore:0,skipped:0,shown:0,done:new Set(),results:[]};
    $('sqQuiz').hidden=false;
    paintQuiz();
    $('sqQuiz').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function current(){return session?.cards[session.index];}
  function paintQuiz(){
    if(!session)return;
    if(session.index>=session.cards.length){finishQuiz();return;}
    const q=current();
    session.state={hints:0,failed:false,recordedWrong:false,resolved:false,shown:false,started:performance.now()};
    $('sqQuiz').hidden=false;
    $('sqQuizCount').textContent='QUESTION '+(session.index+1)+' OF '+session.cards.length+' · '+(session.mode==='review'?'SPACED REVIEW':'UNTIMED PRACTICE');
    $('sqQuizKind').textContent=q.context;
    $('sqQuizPrompt').textContent=q.prompt;
    $('sqAnswer').value='';$('sqAnswer').disabled=false;$('sqCheck').disabled=false;$('sqQuizForm').hidden=false;
    $('sqFeedback').textContent='';$('sqHint').textContent='Give me a clue';$('sqWorked').hidden=true;$('sqWorked').replaceChildren();
    $('sqHint').hidden=false;$('sqShowSteps').hidden=false;$('sqSkip').hidden=false;$('sqNext').hidden=true;
    $('sqQuizPrompt').focus({preventScroll:true});
  }
  function resolve({shown=false,correct=false}={}){
    const st=session.state;
    st.resolved=true;st.shown=shown;
    $('sqAnswer').disabled=true;$('sqCheck').disabled=true;
    $('sqHint').hidden=true;$('sqShowSteps').hidden=true;$('sqSkip').hidden=true;
    $('sqNext').hidden=false;
    $('sqNext').textContent=session.index===session.cards.length-1?'See practice summary':'Next question →';
    overview();
  }
  function feedbackDetails(q,shown=false){
    const details=$('sqWorked');details.replaceChildren(el('h4',{},shown?'Worked answer':'Why that works'),el('p',{},q.steps));details.hidden=false;
  }
  function submit(event){
    event.preventDefault();if(!session||session.state.resolved)return;
    const q=current(),st=session.state,value=$('sqAnswer').value.trim();
    if(!/^\d+$/.test(value)){ $('sqFeedback').textContent=value?'Please enter a positive whole number.':'Enter an answer, or use a clue or worked example.';return;}
    const number=Number(value),ms=performance.now()-st.started;
    if(number!==q.answer) {
      if(!st.recordedWrong){record(q,false,st.hints,ms);session.needsMore++;st.recordedWrong=true;}
      st.failed=true;
      $('sqFeedback').textContent='Not quite. '+q.hint+' Try again, or reveal the worked solution.';
      if(!session.done.has(session.index)){session.done.add(session.index);if(!q.retry)session.cards.push({...q,retry:true});}
      $('sqQuizCount').textContent='QUESTION '+(session.index+1)+' OF '+session.cards.length+' · WE WILL REVISIT THIS';
      return;
    }
    const assisted=st.hints>0||st.failed||!!q.retry;
    record(q,true,assisted?Math.max(1,st.hints):0,ms);
    if(assisted)session.helped++;else session.firstTry++;
    session.results.push({kind:q.kind,n:q.n,assisted});
    $('sqFeedback').textContent=assisted?'Correct — worked out with help or after a retry.':'Correct — retrieved from memory!';
    feedbackDetails(q);
    resolve({correct:true});
  }
  function finishQuiz(){
    if(!session)return;
    const done=session;
    session=null;$('sqQuiz').hidden=true;
    $('sqComplete').hidden=false;$('sqComplete').replaceChildren();
    $('sqComplete').append(el('h3',{},'Practice complete'),el('p',{},done.firstTry+' first-try answers · '+done.helped+' answers after support/retry · '+done.needsMore+' first attempts to revisit · '+done.shown+' worked examples · '+done.skipped+' skipped.'));
    $('sqComplete').append(el('p',{},'We revisit missed facts during a session and after a gap. There is no penalty for using a clue. Reviews are scheduled from recorded answers, not merely from opening a card.'));
    $('sqComplete').append(button('Continue learning',()=>{ $('sqComplete').hidden=true;$('sqLesson').scrollIntoView({block:'start',behavior:'smooth'});},{class:'primary'}));
    overview();
    $('sqComplete').scrollIntoView({block:'nearest',behavior:'smooth'});
    lastFocused?.focus?.({preventScroll:true});
  }
  function next(){if(!session)return;session.index++;paintQuiz();}
  $('sqQuizForm').addEventListener('submit',submit);
  $('sqHint').addEventListener('click',()=>{
    if(!session||session.state.resolved)return;
    session.state.hints++;$('sqFeedback').textContent=current().hint+' You can still try the answer yourself.';
    $('sqHint').textContent=session.state.hints>1?'Clue shown':'Another clue?';
  });
  $('sqShowSteps').addEventListener('click',()=>{
    if(!session||session.state.resolved)return;
    const q=current();session.shown++;feedbackDetails(q,true);
    $('sqFeedback').textContent='Here is the worked answer: '+q.answer+'. This was an example, not a successful recall.';
    resolve({shown:true});
  });
  $('sqSkip').addEventListener('click',()=>{if(!session)return;session.skipped++;next();});
  $('sqNext').addEventListener('click',next);
  $('sqCloseQuiz').addEventListener('click',()=>{
    session=null;$('sqQuiz').hidden=true;$('sqComplete').hidden=true;overview();
    lastFocused?.focus?.({preventScroll:true});
  });
  $('sqStartLesson').addEventListener('click',()=>enterQuiz('learn'));
  $('sqStartMixed').addEventListener('click',()=>enterQuiz('mixed'));
  $('sqReview').addEventListener('click',()=>enterQuiz('review'));
  $('sqTestFact').addEventListener('click',()=>enterQuiz('learn',[squareQuestion(selected,'square'),squareQuestion(selected,'root'),squareQuestion(selected,'boundary')]));
  $('sqHideAnswers').addEventListener('change',overview);
  const progress=el('section',{id:'squareProgress',class:'insight-section sq-progress'});
  document.getElementById('progressView')?.append(progress);
  function renderProgress(stats=getStats()){
    progress.replaceChildren(el('h2',{},'Square-number learning pathway'),el('p',{},stats.seen+' of 32 facts practised; '+stats.due+' due now; '+stats.retaining+' retained across spaced returns. Guided help is welcome.'));
    const action=button(stats.due?'Review '+stats.due+' due squares':'Continue square-number lessons',()=>{
      navigateToLearn();
      if(stats.due)openReview();
      else focus();
    },{class:'primary',id:'sqProgressAction'});
    progress.append(action,el('p',{class:'small muted'},'Due dates come from your account-scoped Learning SDK events. Correct answers after support are logged as supported, not as instant fluent recall. Existing factor-round scores do not change.'));
  }
  function focus(){if(session){$('sqQuiz').scrollIntoView({block:'start',behavior:'smooth'});return;}$('sqLesson').scrollIntoView({block:'start',behavior:'smooth'});$('sqLessonTitle').setAttribute('tabindex','-1');$('sqLessonTitle').focus({preventScroll:true});}
  function openReview(){band='foundation';overview();enterQuiz('review');}
  overview();paintLesson();
  return {focus,openReview,refresh(){overview();paintLesson();},reset(){session=null;$('sqQuiz').hidden=true;$('sqComplete').hidden=true;overview();paintLesson();}};
}
