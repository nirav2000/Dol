// Reproduces the real non-Focus iPhone failure: number 441 collapsed to a
// narrow vertical strip beside Pause and Finish. Assert DOM geometry, not just
// successful rendering. Also run with Focus and after a round review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
// Find the midpoint of 441's entire selection probability interval, not
// the boundary between 440 and 441 (which selects 440 when rounded).
function firstRandomSelectingAtLeast(target){
 let low=0,high=1;
 for(let i=0;i<26;i++){const value=(low+high)/2;const picked=chooseAdaptiveNumber({stage:'strategic',limit:512,random:()=>value});if(picked<target)low=value;else high=value;}
 return high;
}
const seed=(firstRandomSelectingAtLeast(441)+firstRandomSelectingAtLeast(442))/2;
assert.equal(chooseAdaptiveNumber({stage:'strategic',limit:512,random:()=>seed}),441,'deterministic square with five distinct pairs');
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  for(const scenario of [{width:390,height:844,focus:false},{width:390,height:844,focus:true},{width:320,height:568,focus:false},{width:430,height:932,focus:false}]){
   const viewport={width:scenario.width,height:scenario.height};
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
   await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
   await context.addInitScript(({seed,focus})=>{
    Math.random=()=>seed;
    localStorage.setItem('dol-focus-mode-v1',String(focus));
    localStorage.setItem('dol-focus-immersive-opt-in-v2',String(focus));
    localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'playful'}));
    localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'timed',stage:'strategic',limit:512,duration:90,showCount:true,sound:false}));
    localStorage.setItem('dol-auto-difficulty-v1','false');
    localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
   },{seed,focus:scenario.focus});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:60000});
    await page.locator('#startButton').tap();
    assert.equal(await page.locator('#numberValue').textContent(),'441','user sees the actual target');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const metrics=await page.evaluate(()=>{
      const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,display:c.display,overflow:c.overflow,visible:c.visibility}};
      return {screen:{width:innerWidth,height:innerHeight},profile:document.body.dataset.dolProfile,
        phase:document.querySelector('#playView').dataset.mobilePhase,
        target:rect('#playView .number-tile'),number:rect('#numberValue'),
        buttons:rect('#playView .number-section>.action-row'),
        board:rect('#layoutPairBoard'),timer:rect('#playView .number-section>.timer-line'),
        coach:rect('#roundCoachPanel'),toolbar:rect('#roundLearningBar'),
        keypad:rect('#mobileEntry'),entry:rect('#mobileKeypad'),
        documentWidth:document.documentElement.scrollWidth,focus:document.body.classList.contains('focus-mode')};
    });
    const m=metrics;
    assert.ok(m.target&&m.number&&m.buttons&&m.board&&m.keypad,'round has target, controls, board and keypad: '+JSON.stringify(m));
    assert.equal(m.phase,'running');
    assert.ok(m.target.width>=viewport.width*.76,'target must use full phone width, not a narrow strip: '+JSON.stringify(m));
    assert.ok(m.number.width>=90&&m.number.height>=44,'441 is large and legible: '+JSON.stringify(m));
    assert.ok(m.number.left>=m.target.left-1&&m.number.right<=m.target.right+1,'number cannot be clipped by target: '+JSON.stringify(m));
    assert.ok(m.buttons.top>=m.target.bottom-2,'Pause/Finish must sit BELOW the target: '+JSON.stringify(m));
    assert.ok(m.board.top>=m.buttons.bottom-2,'factor board must sit below controls: '+JSON.stringify(m));
    assert.ok(m.board.width>=viewport.width*.76,'board retains usable width: '+JSON.stringify(m));
    assert.ok(m.toolbar.height>=40&&m.toolbar.display!=='none','short teaching toolbar remains accessible');
    if(scenario.focus&&viewport.height>690){
      assert.notEqual(m.coach.display,'none','Focus now teaches via a compact, live context card');
      assert.ok(m.coach.height>=54&&m.coach.height<220,'context card must remain compact: '+JSON.stringify(m));
    }else assert.equal(m.coach.display,'none','normal phone play keeps the old coach collapsed');
    assert.ok(m.documentWidth<=viewport.width+2,'no horizontal overflow');
    assert.ok(m.keypad.top>=-2&&m.keypad.bottom<=viewport.height+2,'keyboard remains inside the phone');
    if(viewport.height>=800)assert.ok(m.target.bottom<=m.keypad.top+2,'target cannot be covered by fixed keypad: '+JSON.stringify(m));
    await page.screenshot({path:'artifacts/target-441-'+engineName+'-'+scenario.width+'-'+(scenario.focus?'focus':'normal')+'.png',fullPage:true});
    await page.locator('#finishButton').tap();
    await page.locator('#mobileKeypad [data-key="action"]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#mobileKeypad [data-key="action"]').isVisible(),true,'next question accessible after review');
    await page.locator('#mobileKeypad [data-key="action"]').tap();
    const nextState=await page.evaluate(()=>({
      phase:document.querySelector('#playView').dataset.mobilePhase,
      round:Number(document.querySelector('#roundValue').textContent),
      target:document.querySelector('#numberValue').textContent,
      keypad:!document.querySelector('#mobileEntry').hidden,
      board:!document.querySelector('#layoutPairBoard').hidden
    }));
    assert.equal(nextState.phase,'running','next round starts: '+JSON.stringify(nextState));
    assert.equal(nextState.round,2,'round counter advances');
    assert.equal(nextState.keypad,true,'new question retains the phone entry pad');
    assert.equal(nextState.board,true,'Pair Board, not the hidden Classic answer panel, is the visible game');
    assert.deepEqual(errors,[],'no runtime errors');
    console.log('PASS target layout 441',engineName,viewport.width,scenario.focus?'focus':'normal',JSON.stringify({targetWidth:m.target.width,numberWidth:m.number.width,boardWidth:m.board.width}));
   }catch(e){await page.screenshot({path:'artifacts/target-441-failure-'+engineName+'-'+scenario.width+'-'+(scenario.focus?'focus':'normal')+'.png',fullPage:true}).catch(()=>{});throw e;}
   finally{await context.close();}
  }
 }finally{await browser.close();}
}
