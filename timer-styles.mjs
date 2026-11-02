import {createPracticeStopwatch,formatPracticeElapsed,nextTimerStyle,RIBBON_RANGE_MS,TIMER_STYLES} from './timer-styles-model.mjs';

const STORAGE_KEY='dol-timer-style-v1';

// The visual timer has no access to learning records, scoring or the round deadline.
export function createTimerStyles({getState}){
  const section=document.querySelector('#playView .number-section');
  const tile=section?.querySelector('.number-tile');
  const classic=section?.querySelector('.timer-line');
  const choice=document.getElementById('timerStyleChoice');
  const preview=document.getElementById('timerStylePreview');
  const announcement=document.getElementById('timerStyleAnnouncement');
  if(!section||!tile||!classic||!choice)return {sync(){},reset(){}};

  const ribbon=document.createElement('div');
  ribbon.id='practiceTimerRibbon';
  ribbon.className='practice-timer-ribbon';
  ribbon.setAttribute('role','group');
  ribbon.setAttribute('aria-label','Time spent on current factor pair. Swipe left or right to change the timer style.');
  ribbon.tabIndex=0;
  ribbon.hidden=true;
  ribbon.innerHTML='<div class="ribbon-timer-heading"><strong>SECONDS PER FACTOR PAIR</strong><div class="ribbon-timer-actions"><output id="practiceTimerElapsed" aria-live="off">0.00s</output><button id="ribbonTimerSwitch" type="button" aria-label="Switch to Classic timer">↔ Style</button></div></div>'+
    '<div class="ribbon-timer-scale" aria-hidden="true"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>'+
    '<div class="ribbon-timer-track" aria-hidden="true"><div class="ribbon-timer-fill"></div><span class="ribbon-timer-thumb"></span></div>';
  section.insertBefore(ribbon,tile);
  const output=ribbon.querySelector('#practiceTimerElapsed');
  const clock=createPracticeStopwatch();
  let style='classic';
  try{const saved=localStorage.getItem(STORAGE_KEY);if(TIMER_STYLES.includes(saved))style=saved;}catch{}
  let frame=0;

  function paint(){
    const elapsed=clock.elapsedMs();
    ribbon.style.setProperty('--ribbon-progress',Math.min(100,elapsed/RIBBON_RANGE_MS*100)+'%');
    ribbon.dataset.overRange=String(elapsed>RIBBON_RANGE_MS);
    const label=formatPracticeElapsed(elapsed);
    if(output.textContent!==label)output.textContent=label;
    // Preserve the round countdown in timed Focus; untimed Focus shows pair time.
    if(getState().mode!=='timed'){
      const hud=document.getElementById('focusRoundHud');
      if(hud&&!hud.hidden){
        const time=hud.querySelector('#focusHudTime');
        if(time&&time.textContent!==label)time.textContent=label;
      }
    }
  }
  function onFrame(){
    frame=0;
    if(style!=='ribbon'||!clock.isRunning())return;
    paint();
    frame=requestAnimationFrame(onFrame);
  }
  function sync(){
    const state=getState();
    clock.setRunning(state.phase==='running'&&state.view==='play'&&!document.hidden);
    document.body.dataset.dolTimerStyle=style;
    document.body.dataset.dolTimerMode=state.mode;
    const showing=style==='ribbon'&&state.view==='play'&&state.phase!=='ready';
    ribbon.hidden=!showing;
    choice.value=style;
    if(preview){
      preview.dataset.style=style;
      preview.setAttribute('aria-label','Preview of '+(style==='ribbon'?'Gradient Ribbon':'Classic')+' timer');
    }
    if(showing)paint();
    if(showing&&clock.isRunning()){
      if(!frame)frame=requestAnimationFrame(onFrame);
    }else if(frame){cancelAnimationFrame(frame);frame=0;}
  }
  function setStyle(value,announce=true){
    if(!TIMER_STYLES.includes(value)||value===style)return;
    style=value;
    try{localStorage.setItem(STORAGE_KEY,style);}catch{}
    if(announcement&&announce)announcement.textContent=(style==='ribbon'?'Gradient Ribbon':'Classic')+' selected. Swipe across the timer to switch styles.';
    sync();
  }
  function cycle(direction){setStyle(nextTimerStyle(style,direction));}
  function reset(){clock.reset();if(style==='ribbon')paint();}

  // Timer-only swiping avoids the existing number-tile layout gesture.
  function swipeOn(element){
    if(!element)return;
    let origin=null;
    element.addEventListener('pointerdown',event=>{
      origin=null;
      if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
      if(event.target instanceof Element&&event.target.closest('button,input,select,a'))return;
      origin={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()};
    });
    element.addEventListener('pointercancel',()=>{origin=null;});
    element.addEventListener('pointerup',event=>{
      const start=origin;origin=null;
      if(!start||start.id!==event.pointerId)return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(performance.now()-start.time>850||Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.5)return;
      cycle(dx<0?1:-1);
      event.preventDefault();
    });
  }
  swipeOn(ribbon);
  swipeOn(classic);
  swipeOn(preview);
  ribbon.addEventListener('keydown',event=>{
    if(event.target!==ribbon||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();cycle(event.key==='ArrowLeft'?-1:1);
  });
  ribbon.querySelector('#ribbonTimerSwitch').addEventListener('click',()=>cycle(1));
  choice.addEventListener('change',event=>setStyle(event.target.value));
  document.addEventListener('visibilitychange',sync);
  sync();
  return {sync,reset,elapsedMs:()=>clock.elapsedMs(),getStyle:()=>style};
}
