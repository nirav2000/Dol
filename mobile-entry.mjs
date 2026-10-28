// One persistent mobile dock: full keypad in play, the SAME action key in review.
// Validation, scoring and auto-next remain owned by the existing application.
export function createMobileEntry({getState,submit}){
 const input=document.getElementById('pairInput'),play=document.getElementById('playView');
 const wrap=document.createElement('div');wrap.id='mobileEntry';wrap.className='mobile-entry';wrap.hidden=true;
 wrap.innerHTML='<div class="mobile-entry-label" id="mobileEntryStatus" role="status" aria-live="polite">ENTER A FACTOR PAIR</div><div class="mobile-factors"><button type="button" id="mobileFirst" aria-label="First factor" aria-pressed="true">\u2014</button><span aria-hidden="true">\u00d7</span><button type="button" id="mobileSecond" aria-label="Second factor" aria-pressed="false">\u2014</button></div><div id="mobileKeypad" class="mobile-keypad" role="group" aria-label="Factor keypad"></div>';
 play.append(wrap);
 const first=wrap.querySelector('#mobileFirst'),second=wrap.querySelector('#mobileSecond'),pad=wrap.querySelector('#mobileKeypad');
 const media=window.matchMedia('(max-width:700px) and (pointer:coarse), (max-width:1000px) and (max-height:500px) and (pointer:coarse)');
 let parts=['',''],active=0,lastRound=null;
 const isMobile=()=>document.body.dataset.dolProfile==='phone'||media.matches&&document.body.dataset.dolProfile!=='tablet';
 const enabled=()=>getState().phase==='running'&&getState().view==='play';
 const nextQuestion=()=>{if(getState().phase==='finished'&&getState().view==='play')document.getElementById('startButton').click();};
 function placeDock(){
   if(!isMobile()||wrap.hidden||getState().phase==='finished')return;
   const vv=window.visualViewport,visibleHeight=vv?.height||innerHeight;
   const bottom=innerWidth>innerHeight&&visibleHeight<=500?12:Math.max(64,Math.min(104,visibleHeight*.1));
   const top=Math.max(4,(vv?.offsetTop||0)+visibleHeight-bottom-wrap.getBoundingClientRect().height);
   if(!Number.isFinite(parseFloat(wrap.style.top))||Math.abs(parseFloat(wrap.style.top)-top)>.5)wrap.style.setProperty('top',top+'px','important');
   wrap.style.setProperty('bottom','auto','important');
 }
 function reserveSpace(){
   const height=isMobile()&&!wrap.hidden&&getState().phase!=='finished'?Math.ceil(wrap.getBoundingClientRect().height):0;
   const value=height+'px';
   if(play.style.getPropertyValue('--mobile-dock-height')!==value)play.style.setProperty('--mobile-dock-height',value);
 }
 function updateInput(){if(isMobile())input.value=parts[0]&&parts[1]?parts.join('x'):parts[0]?parts[0]+'x':'';}
 function sync(){
   const state=getState(),finished=state.phase==='finished';
   play.dataset.mobilePhase=state.phase;
   const destination=finished?document.getElementById('finishedPanel'):play;
   if(wrap.parentElement!==destination)destination.append(wrap);
   wrap.hidden=!isMobile()||state.view!=='play'||state.phase==='ready';
   wrap.classList.toggle('is-finished',finished);
   if(finished){wrap.style.removeProperty('top');wrap.style.removeProperty('bottom');}
   const status=wrap.querySelector('#mobileEntryStatus');status.textContent=state.feedback&&state.feedbackType==='error'?state.feedback:'ENTER A FACTOR PAIR';status.classList.toggle('has-error',!!state.feedback&&state.feedbackType==='error');
   first.textContent=parts[0]||'\u2014';second.textContent=parts[1]||'\u2014';
   first.setAttribute('aria-pressed',String(active===0));second.setAttribute('aria-pressed',String(active===1));
   const action=pad.querySelector('[data-key="action"]');
   if(action){action.textContent=finished?'Next question \u21b5':active===0?'\u00d7':'\u21b5';action.setAttribute('aria-label',finished?'Next question':active===0?'Next factor':'Submit factor pair');}
   wrap.querySelectorAll('button').forEach(b=>{b.disabled=finished?(b.dataset.key!=='action'||state.view!=='play'):!enabled();});
   reserveSpace();placeDock();
   const roundKey=state.round+':'+state.target;
   if(isMobile()&&enabled()&&roundKey!==lastRound){
     lastRound=roundKey;
     if(document.body.dataset.dolLayout!=='pairboard')requestAnimationFrame(()=>{if(enabled())window.scrollTo({top:play.offsetTop,behavior:'auto'});});
   }
 }
 const reset=()=>{parts=['',''];active=0;updateInput();sync();};
 const activate=i=>{if(enabled()){active=i;sync();}};
 function press(key){
   if(getState().phase==='finished'){if(key==='action')nextQuestion();return;}
   if(!enabled())return;
   if(key==='clear'){if(parts[active])parts[active]=parts[active].slice(0,-1);else if(active===1)active=0;updateInput();sync();return;}
   if(key==='action'){
     if(active===0){if(parts[0]&&Number(parts[0])>0)active=1;sync();return;}
     if(parts[0]&&parts[1]){input.value=parts.join('x');submit();if(getState().feedbackType==='success'||(getState().phase==='finished'&&getState().result?.reason==='complete'))reset();else sync();}
     return;
   }
   if(/^\d$/.test(key)){if(parts[active].length>=4)return;const value=String(Number(parts[active]+key));if(Number(value)>1024)return;parts[active]=value;updateInput();sync();}
 }
 let lastTouch=-Infinity;
 for(const key of ['1','2','3','4','5','6','7','8','9','clear','0','action']){
   const b=document.createElement('button');b.type='button';b.dataset.key=key;
   b.textContent=key==='clear'?'\u232b':key==='action'?'\u00d7':key;
   b.setAttribute('aria-label',key==='clear'?'Delete digit':key==='action'?'Next factor':'Digit '+key);
   let ackTimer, suppressClick=false, suppressTimer;
   b.addEventListener('pointerdown',e=>{
     // Two-thumb typing can briefly overlap. Secondary touch contacts are real
     // key presses too; requiring isPrimary silently dropped those digits.
     if(e.pointerType==='touch'||e.pointerType==='pen'){
       e.preventDefault();lastTouch=performance.now();suppressClick=true;clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>{suppressClick=false},800);press(key);
       b.classList.add('key-captured');clearTimeout(ackTimer);
       ackTimer=setTimeout(()=>b.classList.remove('key-captured'),165);
     }
   });
   // Suppress the follow-up click, including browser retargeting after a render.
   // New pointerdowns are never debounced; keyboard clicks (detail 0) still work.
   b.addEventListener('click',e=>{if(suppressClick){suppressClick=false;clearTimeout(suppressTimer);e.preventDefault();return;}press(key);});
   pad.append(b);
 }
 first.addEventListener('click',()=>activate(0));second.addEventListener('click',()=>activate(1));
 const focus=()=>{if(isMobile()&&enabled())(active===0?first:second).focus({preventScroll:true});};
 input.addEventListener('focus',()=>{
   if(!isMobile())return;
   const match=input.value.match(/^\s*(\d+)\s*[xX\u00d7*]\s*(\d+)\s*$/);
   if(match){parts=[match[1],match[2]];active=1;}
   input.blur();focus();sync();
 });
 document.addEventListener('keydown',e=>{
   if(e.composedPath().some(n=>n?.dataset?.diagnosticsIgnore)||!isMobile()||e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.isComposing||getState().view!=='play')return;
   const focused=document.activeElement;
   if(focused?.closest?.('.topbar,#helpSection,#roundVisuals,dialog')||focused?.isContentEditable)return;
   if(focused?.matches?.('input,textarea,select')&&focused!==input)return;
   if(getState().phase==='finished'&&e.key==='Enter'){
     if(focused?.matches?.('[data-review-pair],#restoreReview'))return;
     e.preventDefault();e.stopImmediatePropagation();nextQuestion();return;
   }
   if(!enabled())return;
   if(/^\d$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();press(e.key);}
   else if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();press('action');}
   else if(e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();press('clear');}
   else if(e.key==='x'||e.key==='X'||e.key==='*'){e.preventDefault();e.stopImmediatePropagation();if(active===0)press('action');}
 },true);
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(reserveSpace).observe(wrap);
 const settleDock=()=>{placeDock();requestAnimationFrame(()=>requestAnimationFrame(placeDock));};
 window.visualViewport?.addEventListener('scroll',settleDock,{passive:true});
 const visibility=new MutationObserver(sync);
 visibility.observe(play,{attributes:true,attributeFilter:['hidden']});
 visibility.observe(document.getElementById('activePanel'),{attributes:true,attributeFilter:['hidden']});
 media.addEventListener('change',sync);
 window.addEventListener('resize',()=>{reserveSpace();settleDock();});
 window.visualViewport?.addEventListener('resize',()=>{reserveSpace();settleDock();});
 document.addEventListener('dol-layoutchange',sync);
 sync();
 return {reset,sync,focus,isMobile};
}
