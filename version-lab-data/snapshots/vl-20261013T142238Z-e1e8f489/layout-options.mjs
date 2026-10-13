// Dol layout experiments: independent display state, shared maths/scoring engine.
// Layout and palette persist locally and can be changed without resetting a round.
export function createLayoutOptions({getState}){
 const choices=['classic','pairboard'];
 const palettes=['mono','slate','playful'];
 const key='dol-layout-preferences-v1';
 const body=document.body,play=document.getElementById('playView');
 const number=document.querySelector('#playView .number-tile');
 const numberSection=document.querySelector('#playView .number-section');
 const layoutSelect=document.getElementById('layoutChoice');
 const paletteSelect=document.getElementById('paletteChoice');
 let saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 let layout=choices.includes(saved.layout)?saved.layout:'classic';
 let palette=palettes.includes(saved.palette)?saved.palette:'mono';
 const board=document.createElement('section');
 board.id='layoutPairBoard';board.className='layout-pair-board';board.hidden=true;
 board.setAttribute('aria-label','All factor pairs');
 const header=document.createElement('div');header.className='layout-board-head';
 const heading=document.createElement('strong');heading.textContent='FACTOR PAIRS';
 const status=document.createElement('span');status.id='layoutPairStatus';
 header.append(heading,status);
 const grid=document.createElement('div');grid.className='layout-pair-grid';grid.id='layoutPairGrid';
 board.append(header,grid);number.after(board);
 const switcher=document.createElement('div');switcher.className='layout-switcher';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Practice layout');
 const prev=document.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label','Use Classic layout');
 const name=document.createElement('span');name.className='layout-switch-label';
 const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label','Use Pair Board layout');
 switcher.append(prev,name,next);number.append(switcher);
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify({layout,palette}));}catch{}};
 function apply(announce){
   body.dataset.dolLayout=layout;body.dataset.dolPalette=palette;
   if(layoutSelect)layoutSelect.value=layout;
   if(paletteSelect)paletteSelect.value=palette;
   name.textContent=layout==='pairboard'?'Pair Board':'Classic';
   prev.disabled=layout==='classic';next.disabled=layout==='pairboard';
   switcher.setAttribute('aria-label','Practice layout: '+name.textContent+'. Swipe horizontally on the number to change.');
   persist();sync();
   document.dispatchEvent(new CustomEvent('dol-layoutchange',{detail:{layout,palette}}));
   if(announce){const label=document.getElementById('layoutAnnouncement');if(label)label.textContent=name.textContent+' layout, '+palette+' palette';}
 }
 function setLayout(value,announce=true){if(!choices.includes(value)||layout===value)return;layout=value;apply(announce);}
 function setPalette(value){if(!palettes.includes(value)||palette===value)return;palette=value;apply(false);}
 function chip(a,b,credited,finished,key){
   const el=document.createElement(finished?'button':'div');
   el.className='layout-pair-chip'+(credited?' credited':finished?' missed':'');
   const aSpan=document.createElement('span');aSpan.textContent=a;
   const times=document.createElement('span');times.className='times';times.textContent='×';
   const bSpan=document.createElement('span');bSpan.textContent=b;
   el.append(aSpan,times,bSpan);
   if(finished){
     el.type='button';el.dataset.pairKey=key;el.setAttribute('aria-pressed',String(credited));
     el.setAttribute('aria-label',a+' times '+b+'. '+(credited?'Credited, tap to remove point':'Not credited, tap to award point'));
     el.addEventListener('click',()=>{
       const original=Array.from(document.querySelectorAll('#answerReview [data-review-pair]')).find(button=>button.dataset.reviewPair===key);
       if(original){original.click();sync();}
     });
   }
   return el;
 }
 function sync(){
   const s=getState();
   const isPairBoard=layout==='pairboard'&&s.view==='play';
   board.hidden=!isPairBoard||s.phase==='ready'||!s.target;
   if(board.hidden)return;
   const finished=s.phase==='finished',correct=s.found.size,total=s.pairs.length;
   if(finished){grid.style.setProperty('--board-columns','3');return;}
   grid.hidden=false;grid.className='layout-pair-grid';
   status.textContent=correct+' / '+total+' found';
   // Allocate slots for every pair so the whole board is visible without scrolling.
   const pairs=finished?s.pairs:Array.from(s.found,(key)=>key.split('-').map(Number));
   const visible=s.showCount||finished?total:Math.max(correct,1);
   grid.style.setProperty('--board-columns',visible>12?'4':'3');
   const retained=document.activeElement?.dataset?.pairKey;
   const items=[];
   for(const pair of pairs){
     const a=pair[0],b=pair[1],key=a+'-'+b;
     let credited=s.found.has(key);
     if(finished){
       const control=Array.from(document.querySelectorAll('#answerReview [data-review-pair]')).find(b=>b.dataset.reviewPair===key);
       if(control)credited=control.getAttribute('aria-pressed')==='true';
     }
     items.push(chip(a,b,credited,finished,key));
   }
   for(let i=items.length;i<visible;i++){
     const blank=document.createElement('div');blank.className='layout-pair-chip empty';
     blank.textContent='? × ?';blank.setAttribute('aria-label','Pair not found');items.push(blank);
   }
   grid.replaceChildren(...items);
   if(retained)grid.querySelector('[data-pair-key="'+retained+'"]')?.focus({preventScroll:true});
 }
 prev.addEventListener('click',()=>setLayout('classic'));
 next.addEventListener('click',()=>setLayout('pairboard'));
 layoutSelect?.addEventListener('change',e=>setLayout(e.target.value));
 paletteSelect?.addEventListener('change',e=>setPalette(e.target.value));
 // Only swipe over the number tile, not the keypad or answer/review controls.
 // Vertical scrolling, small movement and diagonal gestures never change layout.
 let touch=null;
 number.addEventListener('touchstart',e=>{
   if(e.touches.length!==1||e.target.closest('button,input,select,a')){touch=null;return;}
   const t=e.touches[0];touch={x:t.clientX,y:t.clientY,time:Date.now()};
 },{passive:true});
 number.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
 number.addEventListener('touchend',e=>{
   if(!touch||!e.changedTouches.length)return;
   const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y,elapsed=Date.now()-touch.time;
   touch=null;
   if(elapsed>700||Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.65)return;
   setLayout(dx<0?'pairboard':'classic');
 },{passive:true});
 apply(false);
 return {sync,getLayout:()=>layout,getPalette:()=>palette};
}
