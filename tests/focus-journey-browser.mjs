/* A real, multi-pair Focus round: numbers/timer, automatic next-move teaching,
   arithmetic correction, visual factor moves, scrolling and review Next.
   Test Chromium and WebKit, phone, small phone and iPad from the same game. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
const pick=r=>chooseAdaptiveNumber({stage:'strategic',limit:512,random:()=>r});
let lo=0,hi=1;
for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(pick(mid)<288)lo=mid;else hi=mid;}
const left=hi;lo=hi;hi=1;
for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(pick(mid)<=288)lo=mid;else hi=mid;}
const seed=(left+hi)/2;
assert.equal(pick(seed),288);
const scenarios=[{width:390,height:844},{width:320,height:568},{width:834,height:1194}];
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const engineBrowser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  for(const viewport of scenarios){
   const phone=viewport.width<=700,small=viewport.height<=690;
   const context=await engineBrowser.newContext({
    viewport,isMobile:phone,hasTouch:true,serviceWorkers:'block',reducedMotion:'no-preference'
   });
   await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
   await context.addInitScript(seed=>{
    Math.random=()=>seed;
    localStorage.setItem('dol-focus-immersive-opt-in-v2','true');
    localStorage.setItem('dol-focus-mode-v1','true');
    localStorage.setItem('dol-auto-difficulty-v1','false');
    localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
    localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'slate'}));
    localStorage.setItem('dol-learning-settings-v2',JSON.stringify({
     mode:'timed',stage:'strategic',limit:512,duration:90,showCount:true,sound:false
    }));
   },seed);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
    await page.locator('#startButton').click();
    assert.equal(await page.locator('#numberValue').textContent(),'288');
    assert.ok(await page.locator('#timerValue').textContent()!=='∞','timed countdown is visible');
    const send=async (a,b)=>page.evaluate(([a,b])=>{
      document.querySelector('#pairInput').value=a+'x'+b;
      document.querySelector('#answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    },[a,b]);
    for(const [a,b] of [[1,288],[2,144],[4,72],[8,36],[16,18],[9,32]])await send(a,b);
    assert.equal(await page.locator('#layoutPairGrid .layout-pair-chip.credited').count(),6);
    const coach=page.locator('#roundCoachPanel');
    if(!small){
      assert.equal(await coach.isVisible(),true,'Focus shows context-sensitive next move');
      assert.match(await page.locator('#roundCoachText').textContent(),/digit-sum/,'3 is suggested from 288, without the answer');
      assert.doesNotMatch(await page.locator('#roundCoachText').textContent(),/96/,'prompt must not expose partner');
      await page.locator('#roundCoachStep').click();
      assert.match(await page.locator('#roundCoachText').textContent(),/2 \+ 8 \+ 8/,'clue actually teaches the 3-rule');
      await page.locator('#roundCoachDifferent').click().catch(()=>{});
    }else{
      assert.equal(await coach.isVisible(),false,'small phone uses the keypad micro-teacher');
      assert.equal(await page.locator('#mobileEntryStatus').getAttribute('role'),'button','micro-teacher can be tapped');
      await page.locator('#mobileEntryStatus').tap();
      assert.equal(await page.locator('#strategyHintDialog').isVisible(),true,'micro-teacher opens the real interactive lesson');
      await page.locator('#coachTry').tap();
      assert.equal(await page.locator('#strategyHintDialog').isVisible(),false);
      assert.match(await page.locator('#roundCoachText').textContent(),/digit-sum/);
      assert.match(await page.locator('#mobileEntryStatus').textContent(),/digit-sum|→|groups of/,
        'short phone shows the suggested thinking or the just-earned maths animation');
    }
    const startScore=Number(await page.locator('#scoreValue').textContent());
    await send(2,72);
    assert.equal(Number(await page.locator('#scoreValue').textContent()),startScore,'wrong answer never earns credit');
    assert.match(await page.locator('#roundCoachText').textContent(),/2 × 72 = 144/,'mistake becomes a mathematical comparison');
    assert.match(await page.locator('#roundCoachText').textContent(),/ALREADY on your board/,'do not re-teach solved pair as new');
    if(!small){
      await page.locator('#roundCoachStep').click();
      assert.match(await page.locator('#roundCoachText').textContent(),/difference/);
    }
    await send(3,96);
    assert.equal(await page.locator('#layoutPairGrid .layout-pair-chip.credited').count(),7);
    if(!small){
      assert.match(await page.locator('#roundCoachText').textContent(),/3 × 96/,'next route reuses accepted pair');
      assert.equal(await page.locator('#roundCoachMotion').isVisible(),true,'real maths animation appears');
      assert.match(await page.locator('#roundCoachMotion').textContent(),/288/);
    }
    await send(6,48);
    assert.equal(await page.locator('#layoutPairGrid .layout-pair-chip.credited').count(),8);
    if(!small)assert.match(await page.locator('#roundCoachText').textContent(),/6 × 48/);
    if(phone){
      await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('.number-tile').getBoundingClientRect().bottom<60);
      await page.waitForFunction(()=>{
        const hud=document.getElementById('focusRoundHud');
        return hud&&!hud.hidden;
      },{},{timeout:6000}).catch(async error=>{
        const details=await page.evaluate(()=>({
          scroll:scrollY,scrollHeight:document.documentElement.scrollHeight,
          target:document.querySelector('.number-tile')?.getBoundingClientRect().toJSON(),
          timer:document.querySelector('.timer-line')?.getBoundingClientRect().toJSON(),
          hudHidden:document.getElementById('focusRoundHud')?.hidden,
          focus:document.body.classList.contains('focus-mode'),
          mobile:document.getElementById('playView').dataset.mobileInput,
          phase:document.getElementById('playView').dataset.mobilePhase
        }));console.error('HUD VISIBILITY DIAGNOSTIC',JSON.stringify(details));throw error;
      });
      assert.equal(await page.locator('#focusRoundHud').isVisible(),true,'target/countdown persists when main content scrolls');
      assert.match(await page.locator('#focusHudTarget').textContent(),/288/);
      assert.match(await page.locator('#focusHudProgress').textContent(),/8 \/ 9/);
      assert.match(await page.locator('#focusRoundHud').textContent(),/ROUND 1 · SCORE/);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    }
    await send(12,24);
    assert.equal(await page.locator('#playView').getAttribute('data-mobile-phase'),'finished');
    assert.equal(await page.locator('#reviewSummary').textContent().then(x=>x.includes('9 of 9')),true);
    if(phone){
      const next=page.locator('#mobileKeypad [data-key="action"]');
      assert.equal(await next.getAttribute('aria-label'),'Next question');
      assert.ok(await next.isVisible(),'fixed Next remains visible');
      assert.ok(await next.evaluate(e=>{const c=getComputedStyle(document.querySelector('#mobileEntry'),'::before');return c.backgroundColor!=='rgba(0, 0, 0, 0)'}),'review footer is opaque');
      const box=await next.boundingBox();
      assert.ok(box&&box.y>=0&&box.y+box.height<=viewport.height+2,'Next is reachable without scrolling');
      await next.tap();
    }else await page.locator('#startButton').click();
    assert.equal(await page.locator('#playView').getAttribute('data-mobile-phase'),'running');
    assert.equal(Number(await page.locator('#roundValue').textContent()),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),true,'no horizontal overflow');
    assert.deepEqual(errors,[],'no browser exceptions');
    await page.screenshot({path:'artifacts/focus-journey-'+engineName+'-'+viewport.width+'.png'});
    console.log('PASS full Focus learning journey',engineName,viewport.width,'round 288');
   }catch(error){
    await page.screenshot({path:'artifacts/focus-journey-failure-'+engineName+'-'+viewport.width+'.png',fullPage:true}).catch(()=>{});
    throw error;
   }finally{await context.close();}
  }
 }finally{await engineBrowser.close();}
}
