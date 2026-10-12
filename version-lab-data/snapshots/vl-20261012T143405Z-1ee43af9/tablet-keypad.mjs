// Optional iPad/touch-tablet keypad. The phone dock is deliberately untouched.
export function initTabletKeypad(){
 const play=document.getElementById('playView'),form=document.getElementById('answerForm'),input=document.getElementById('pairInput');
 if(!play||!form||!input)return;
 const media=matchMedia('(pointer:coarse) and (min-width:701px)');
 const bar=document.createElement('div');bar.className='tablet-pad-toolbar';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.setAttribute('aria-expanded','false');toggle.textContent='Show number pad';
 bar.append(toggle);form.append(bar);
 const pad=document.createElement('div');pad.className='tablet-pad';pad.hidden=true;pad.setAttribute('role','group');pad.setAttribute('aria-label','Optional touch number pad');
 const keys=['1','2','3','4','5','6','7','8','9','clear','0','action'];
 let part=0,values=['',''];
 const fields=document.createElement('div');fields.className='tablet-pad-fields';
 const buttons=[0,1].map(i=>{const b=document.createElement('button');b.type='button';b.textContent='—';b.setAttribute('aria-label',i?'Second factor':'First factor');b.onclick=()=>{part=i;sync();};fields.append(b);return b;});
 pad.append(fields);
 const grid=document.createElement('div');grid.className='tablet-pad-grid';pad.append(grid);form.append(pad);
 function sync(){buttons.forEach((b,i)=>{b.textContent=values[i]||'—';b.setAttribute('aria-pressed',String(i===part));});input.value=values[0]&&values[1]?values.join('x'):values[0]?values[0]+'x':'';}
 function visible(){return media.matches&&!form.hidden&&play.querySelector('#activePanel')?.hidden===false;}
 function refresh(){bar.hidden=!visible();if(!visible())pad.hidden=true;else pad.hidden=toggle.getAttribute('aria-expanded')!=='true';}
 function press(k){if(k==='clear'){if(values[part])values[part]=values[part].slice(0,-1);else part=0;sync();return;}if(k==='action'){if(part===0){if(values[0])part=1;sync();return;}if(values[0]&&values[1]){sync();form.requestSubmit();const feedback=document.getElementById('entryFeedback');if(feedback?.classList.contains('success')){values=['',''];part=0;sync();}}return;}if(values[part].length<4&&Number(values[part]+k)<=1024){values[part]=String(Number(values[part]+k));sync();}}
 keys.forEach(k=>{const b=document.createElement('button');b.type='button';b.dataset.key=k;b.textContent=k==='clear'?'⌫':k==='action'?'↵':k;b.setAttribute('aria-label',k==='clear'?'Delete digit':k==='action'?'Next factor or submit':'Digit '+k);b.addEventListener('click',()=>press(k));grid.append(b);});
 toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'Hide number pad':'Show number pad';refresh();});
 const observer=new MutationObserver(refresh);observer.observe(document.getElementById('activePanel'),{attributes:true,attributeFilter:['hidden']});observer.observe(play,{attributes:true,attributeFilter:['hidden']});media.addEventListener('change',refresh);
 input.addEventListener('input',()=>{const match=input.value.match(/^\s*(\d*)\s*[xX×*]\s*(\d*)\s*$/);if(match){values=[match[1],match[2]];part=1;}else{values=[input.value.replace(/\D/g,''),''];part=0;}buttons.forEach((b,i)=>{b.textContent=values[i]||'—';b.setAttribute('aria-pressed',String(i===part));});});
 refresh();
}
