// Mobile-only factor entry. Original answerForm remains the single scoring path.
export function createMobileEntry({getState,submit}){
 const input=document.getElementById('pairInput'),form=document.getElementById('answerForm');
 const wrap=document.createElement('div');wrap.id='mobileEntry';wrap.className='mobile-entry';
 wrap.innerHTML='<div class="mobile-entry-label">ENTER A FACTOR PAIR</div><div class="mobile-factors"><button type="button" id="mobileFirst" aria-label="First factor" aria-pressed="true">—</button><span aria-hidden="true">×</span><button type="button" id="mobileSecond" aria-label="Second factor" aria-pressed="false">—</button></div><div id="mobileKeypad" class="mobile-keypad" role="group" aria-label="Factor keypad"></div>';
 form.after(wrap);
 const first=wrap.querySelector('#mobileFirst'),second=wrap.querySelector('#mobileSecond'),pad=wrap.querySelector('#mobileKeypad');
 let parts=['',''],active=0;
 const enabled=()=>getState().phase==='running'&&getState().view==='play';
 const isMobile=()=>window.matchMedia('(max-width: 700px) and (pointer: coarse)').matches;
 const sync=()=>{first.textContent=parts[0]||'—';second.textContent=parts[1]||'—';first.setAttribute('aria-pressed',String(active===0));second.setAttribute('aria-pressed',String(active===1));input.value=parts[0]&&parts[1]?parts[0]+'x'+parts[1]:parts[0]?parts[0]+'x':'';const action=pad.querySelector('[data-key="action"]');if(action){action.textContent=active===0?'×':'↵';action.setAttribute('aria-label',active===0?'Next factor':'Submit factor pair');}wrap.querySelectorAll('button').forEach(b=>{b.disabled=!enabled();});};
 const reset=()=>{parts=['',''];active=0;sync();};
 const activate=i=>{active=i;sync();};
 function press(key){
   if(!enabled())return;
   if(key==='clear'){parts[active]=parts[active].slice(0,-1);if(!parts[active]&&active===1)active=0;sync();return;}
   if(key==='action'){
     if(active===0){if(parts[0])active=1;sync();return;}
     if(parts[0]&&parts[1]){input.value=parts.join('x');submit();if(getState().phase==='running'&&document.getElementById('entryFeedback').classList.contains('success'))reset();else sync();}
     return;
   }
   if(/^\d$/.test(key)){if(parts[active].length>=4)return;const value=String(Number(parts[active]+key));if(Number(value)>1024)return;parts[active]=value;if(active===0&&value.length>=3)active=1;sync();}
 }
 for(const key of ['1','2','3','4','5','6','7','8','9','clear','0','action']){const b=document.createElement('button');b.type='button';b.dataset.key=key;b.textContent=key==='clear'?'⌫':key==='action'?'×':key;b.setAttribute('aria-label',key==='clear'?'Delete digit':key==='action'?'Next factor':'Digit '+key);b.addEventListener('click',()=>press(key));pad.append(b);}
 first.addEventListener('click',()=>activate(0));second.addEventListener('click',()=>activate(1));
 const originalFocus=()=>{if(isMobile()){document.activeElement?.blur?.();first.focus({preventScroll:true});}};
 input.addEventListener('focus',()=>{if(isMobile())originalFocus();});
 document.addEventListener('keydown',e=>{if(!isMobile()||!enabled()||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;if(document.activeElement?.closest?.('.topbar')||document.activeElement?.closest?.('#helpSection'))return;if(/^\d$/.test(e.key)){e.preventDefault();press(e.key);}else if(e.key==='Enter'){e.preventDefault();press('action');}else if(e.key==='Backspace'){e.preventDefault();press('clear');}else if(e.key==='x'||e.key==='X'||e.key==='*'){e.preventDefault();if(active===0)press('action');}});
 const observer=new MutationObserver(()=>{if(getState().phase==='running'&&parts[0]&&parts[1]&&input.value==='')reset();sync();});observer.observe(document.getElementById('activePanel'),{attributes:true,attributeFilter:['hidden']});
 return {reset,sync,focus:originalFocus,isMobile};
}
