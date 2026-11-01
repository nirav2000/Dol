// Real browser: opt-in ribbon, settings persistence, timer-only swipes,
// correct-pair reset, timed pause, and fixed mobile review controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';

const seed=Array.from({length:10000},(_,i)=>i/10000).find(r=>
  chooseAdaptiveNumber({stage:'foundation',limit:64,random:()=>r})===12);
assert.notEqual(seed,undefined);
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
  try{
    for(const viewport of [{width:390,height:844,phone:true},{width:834,height:1194,phone:false}]){
      const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
      await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
      await context.addInitScript(seed=>{
        Math.random=()=>seed;
        localStorage.setItem('dol-focus-mode-v1','false');
        localStorage.setItem('dol-focus-immersive-opt-in-v2','false');
        localStorage.setItem('dol-auto-difficulty-v1','false');
        localStorage.setItem('dol-tablet-keypad-v1','true');
        localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
        localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'mono'}));
        localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:64,sound:false}));
      },seed);
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const keyRoot=viewport.phone?'#mobileKeypad':'.tablet-pad-grid';
      const keyAttr=viewport.phone?'data-key':'data-tablet-key';
      const key=k=>page.locator(keyRoot+' ['+keyAttr+'="'+k+'"]');
      const ribbon=page.locator('#practiceTimerRibbon');
      async function swipe(selector,from,to){
        await page.locator(selector).evaluate((el,{from,to})=>{
          const y=el.getBoundingClientRect().top+18;
          el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:41,isPrimary:true,clientX:from,clientY:y}));
          el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:41,isPrimary:true,clientX:to,clientY:y}));
        },{from,to});
      }
      try{
        await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
        await page.waitForFunction(()=>document.body.dataset.dolReady==='true',{},{timeout:60000});
        assert.equal(await page.locator('body').getAttribute('data-dol-timer-style'),'classic');
        await page.locator('[data-view=settings]').click();
        await page.locator('#timerStyleChoice').selectOption('ribbon');
        assert.equal(await page.locator('#timerStylePreview').getAttribute('data-style'),'ribbon');
        await page.locator('[data-view=play]').click();
        await page.locator('#startButton').click();
        await ribbon.waitFor({state:'visible'});
        assert.equal(await page.locator('#numberValue').textContent(),'12');
        const positions=await page.evaluate(()=>{
          const r=document.querySelector('#practiceTimerRibbon').getBoundingClientRect();
          const n=document.querySelector('#playView .number-tile').getBoundingClientRect();
          return {timer:{top:r.top,bottom:r.bottom,width:r.width},number:{top:n.top,bottom:n.bottom}};
        });
        assert.ok(positions.timer.width>=viewport.width*.35,'timer is wide and legible');
        assert.ok(positions.timer.bottom<=positions.number.top+2,'timer is above the number: '+JSON.stringify(positions));
        await page.waitForFunction(()=>parseFloat(document.querySelector('#practiceTimerElapsed').textContent)>1.1,{},{timeout:5000});
        const elapsedBefore=parseFloat(await page.locator('#practiceTimerElapsed').textContent());
        await key('1').tap();await key('action').tap();await key('1').tap();await key('2').tap();await key('action').tap();
        assert.equal(await page.locator('#pairSlots .slot.solved').count(),1);
        const elapsedAfter=parseFloat(await page.locator('#practiceTimerElapsed').textContent());
        assert.ok(elapsedAfter<elapsedBefore,'accepted pair resets stopwatch '+JSON.stringify({elapsedBefore,elapsedAfter}));
        await page.screenshot({path:'artifacts/timer-gradient-'+name+'-'+viewport.width+'.png',fullPage:true});
        await swipe('#practiceTimerRibbon',280,130);
        assert.equal(await page.locator('body').getAttribute('data-dol-timer-style'),'classic');
        assert.equal(await ribbon.isVisible(),false);
        assert.equal(await page.locator('#timerStyleChoice').inputValue(),'classic');
        await swipe('#playView .number-section>.timer-line',130,280);
        assert.equal(await page.locator('body').getAttribute('data-dol-timer-style'),'ribbon');
        assert.equal(await ribbon.isVisible(),true);
        assert.equal(await page.locator('#pairSlots .slot.solved').count(),1,'styling does not reset learning');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no horizontal overflow');
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>document.body.dataset.dolReady==='true',{},{timeout:60000});
        assert.equal(await page.locator('body').getAttribute('data-dol-timer-style'),'ribbon','setting survives reload');
        await page.locator('#startButton').click();
        await page.locator('#finishButton').click();
        const frozen=await page.locator('#practiceTimerElapsed').textContent();
        await page.waitForTimeout(160);
        assert.equal(await page.locator('#practiceTimerElapsed').textContent(),frozen,'review freezes per-pair timer');
        if(viewport.phone){
          const next=key('action');
          assert.equal(await next.isVisible(),true);
          const r=await next.boundingBox();
          assert.ok(r&&r.y>=0&&r.y+r.height<=viewport.height+2,'review Next is still reachable');
        }
        // Switch into Timed mode without depending on the compact setup overlay.
        await page.locator('[data-mode=timed]').evaluate(el=>el.click());
        await page.locator('#startButton').evaluate(el=>el.click());
        assert.equal(await ribbon.isVisible(),true);
        assert.match(await page.locator('#timerValue').textContent(),/\d+:\d+/,'round countdown is retained');
        await page.waitForFunction(()=>parseFloat(document.querySelector('#practiceTimerElapsed').textContent)>.1,{},{timeout:5000});
        await page.locator('#pauseButton').click();
        const paused=await page.locator('#practiceTimerElapsed').textContent();
        await page.waitForTimeout(160);
        assert.equal(await page.locator('#practiceTimerElapsed').textContent(),paused,'Pause stops per-pair timer');
        await page.locator('#pauseButton').click();
        await page.waitForFunction(before=>parseFloat(document.querySelector('#practiceTimerElapsed').textContent)>before,
          parseFloat(paused),{timeout:5000});
        assert.deepEqual(errors,[],'no JavaScript errors');
        console.log('PASS Gradient Ribbon and timer swipe',name,viewport.width);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
