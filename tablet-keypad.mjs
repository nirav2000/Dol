import {currentProfile} from './device-profile.mjs';
// Optional touch-tablet pad; shares the canonical answer form and scoring.
export function initTabletKeypad(){
 const play=document.getElementById('playView'),form=document.getElementById('answerForm');
 const input=document.getElementById('pairInput'),activePanel=document.getElementById('activePanel');
 const finishedPanel=document.getElementById('finishedPanel'),start=document.getElementById('startButton');
 if(!play||!form||!input||!activePanel||!finishedPanel||!start)return;
 const media={get matches(){return currentProfile()==='tablet';},addEventListener(_name,fn){document.addEventListener('dol-devicechange',fn);}};
 const bar=document.createElement('div');bar.className='tablet-pad-toolbar';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';
 toggle.setAttribute('aria-expanded','false');toggle.textContent='Show number pad';
 bar.append(toggle);form.append(bar);
 const pad=document.createElement('div');pad.className='tablet-pad';pad.hidden=true;
 pad.setAttribute('role','group');pad.setAttribute('aria-label','Optional touch number pad');
 const fields=document.createElement('div');fields.className='tablet-pad-fields';
 let part=0,values=['',''],lastActionRect=null,lastTarget=null,opened=false;
 let preferred=null;try{preferred=localStorage.getItem('dol-tablet-keypad-v1');}catch{}
 if(preferred!==null)opened=preferred==='true';
 const buttons=[0,1].map(i=>{
   const b=document.createElement('button');b.type='button';
   b.setAttribute('aria-label',i?'Second factor':'First factor');
   b.addEventListener('click',()=>{if(activePanel.hidden)return;part=i;sync();});
   fields.append(b);return b;
 });
 pad.append(fields);
 const grid=document.createElement('div');grid.className='tablet-pad-grid';pad.append(grid);form.append(pad);
 const keys=['1','2','3','4','5','6','7','8','9','clear','0','action'];
 const keyButtons=new Map();
 function finished(){return !play.hidden&&!finishedPanel.hidden;}
 function running(){return !play.hidden&&!activePanel.hidden;}
 function isEnabled(){return media.matches&&opened&&(running()||finished());}
 const action=()=>keyButtons.get('action');
 function writeInput(){input.value=values[0]&&values[1]?values.join('x'):values[0]||'';}
 function sync(){
   buttons.forEach((b,i)=>{b.textContent=values[i]||'—';b.setAttribute('aria-pressed',String(i===part));});
   const a=action();if(a){
     a.textContent=finished()?'Next question ↵':part===0?'×':'↵';
     a.setAttribute('aria-label',finished()?'Next question':part===0?'Next factor':'Submit factor pair');
   }
   if(running())writeInput();
 }
 function recordRect(){if(running()&&!pad.hidden&&!pad.classList.contains('is-finished'))lastActionRect=action()?.getBoundingClientRect()||lastActionRect;}
 function refresh(){
   if(preferred===null&&document.body.dataset.dolLayout==='pairboard')opened=true;
   toggle.setAttribute('aria-expanded',String(opened));toggle.textContent=opened?'Hide number pad':'Show number pad';
   if(media.matches&&opened&&(running()||finished()))document.body.dataset.dolTouchpad='tablet';else if(document.body.dataset.dolTouchpad==='tablet')delete document.body.dataset.dolTouchpad;
   bar.hidden=!media.matches||!running();
   if(!isEnabled()){
     pad.hidden=true;pad.classList.remove('is-finished');if(document.body.dataset.dolTouchpad!=='phone')input.readOnly=false;
     if(pad.parentElement!==form)form.append(pad);
     return;
   }
   if(finished()){
     if(!pad.classList.contains('is-finished'))recordRect();
     if(pad.parentElement!==play)play.append(pad);
     pad.classList.add('is-finished');pad.hidden=false;
     if(lastActionRect){
       pad.style.left=lastActionRect.left+'px';pad.style.top=lastActionRect.top+'px';
       pad.style.width=lastActionRect.width+'px';pad.style.height=lastActionRect.height+'px';
     }
   }else{
     if(pad.parentElement!==form)form.append(pad);
     pad.classList.remove('is-finished');pad.style.left='';pad.style.top='';pad.style.width='';pad.style.height='';
     pad.hidden=false;
     input.readOnly=opened&&media.matches;
     if(input.readOnly)input.blur();
     requestAnimationFrame(recordRect);
   }
   sync();
 }
 function nextQuestion(){
   if(!finished())return;
   start.click();
   values=['',''];part=0;lastTarget=null;
   refresh();sync();
 }
 function press(key){
   if(finished()){if(key==='action')nextQuestion();return;}
   if(!running()||input.disabled)return;
   if(key==='clear'){
     if(values[part])values[part]=values[part].slice(0,-1);
     else if(part===1)part=0;
     sync();return;
   }
   if(key==='action'){
     if(part===0){if(values[0]&&Number(values[0])>0)part=1;sync();return;}
     if(values[0]&&values[1]){
       recordRect();writeInput();form.requestSubmit();
       if(document.getElementById('entryFeedback')?.classList.contains('success')||finished()){
         values=['',''];part=0;sync();
       }
       refresh();
     }
     return;
   }
   if(/^\d$/.test(key)&&values[part].length<4){
     const candidate=String(Number(values[part]+key));
     if(Number(candidate)<=1024){values[part]=candidate;sync();}
   }
 }
 let lastTouch=-Infinity;
 keys.forEach(k=>{
   const b=document.createElement('button');b.type='button';b.dataset.tabletKey=k;
   b.setAttribute('aria-label',k==='clear'?'Delete digit':k==='action'?'Next factor':'Digit '+k);
   b.textContent=k==='clear'?'⌫':k==='action'?'×':k;
   let ackTimer;
   b.addEventListener('pointerdown',e=>{
     // Do not wait for a delayed click or discard overlapping second-finger taps.
     if(e.pointerType==='touch'||e.pointerType==='pen'){
       e.preventDefault();lastTouch=performance.now();press(k);
       b.classList.add('key-captured');clearTimeout(ackTimer);
       ackTimer=setTimeout(()=>b.classList.remove('key-captured'),165);
     }
   });
   b.addEventListener('click',e=>{
     if(e.detail>0&&performance.now()-lastTouch<650){e.preventDefault();return;}
     press(k);
   });
   keyButtons.set(k,b);grid.append(b);
 });
 toggle.addEventListener('click',()=>{
   opened=!opened;preferred=String(opened);try{localStorage.setItem('dol-tablet-keypad-v1',preferred);}catch{}toggle.setAttribute('aria-expanded',String(opened));
   toggle.textContent=opened?'Hide number pad':'Show number pad';
   if(opened&&media.matches){input.readOnly=true;input.blur();}
   else input.readOnly=false;
   refresh();
 });
 document.addEventListener('dol-layoutchange',()=>{input.readOnly=opened&&media.matches;if(input.readOnly)input.blur();refresh();});
 const observer=new MutationObserver(()=>{
   const target=document.getElementById('roundValue')?.textContent+':'+document.getElementById('numberValue')?.textContent;
   if(running()&&target!==lastTarget){lastTarget=target;values=['',''];part=0;}
   refresh();
 });
 observer.observe(activePanel,{attributes:true,attributeFilter:['hidden']});
 observer.observe(finishedPanel,{attributes:true,attributeFilter:['hidden']});
 observer.observe(play,{attributes:true,attributeFilter:['hidden']});
 const resize=()=>{if(finished()&&lastActionRect){const width=Math.min(lastActionRect.width,innerWidth-16);pad.style.left=Math.max(8,Math.min(lastActionRect.left,innerWidth-width-8))+'px';pad.style.top=Math.max(8,Math.min(lastActionRect.top,innerHeight-lastActionRect.height-8))+'px';pad.style.width=width+'px';}else recordRect();};
 media.addEventListener('change',refresh);window.addEventListener('resize',resize);
 window.addEventListener('scroll',recordRect,{passive:true});
 input.addEventListener('input',()=>{
   if(!running())return;
   const match=input.value.match(/^\s*(\d*)\s*[xX×*]\s*(\d*)\s*$/);
   if(match){values=[match[1],match[2]];part=1;}
   else{values=[input.value.trim().replace(/\D/g,''),''];part=0;}
   buttons.forEach((b,i)=>{b.textContent=values[i]||'—';b.setAttribute('aria-pressed',String(i===part));});
   syncAction();
 });
 document.getElementById('finishButton')?.addEventListener('pointerdown',recordRect,{passive:true});
 input.addEventListener('focus',()=>{if(isEnabled())input.blur();});
 function syncAction(){const a=action();if(a){a.textContent=finished()?'Next question ↵':part===0?'×':'↵';a.setAttribute('aria-label',finished()?'Next question':part===0?'Next factor':'Submit factor pair');}}
 refresh();sync();
}
