import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const seed=Array.from({length:10000},(_,i)=>i/10000).find(r=>chooseAdaptiveNumber({stage:'foundation',limit:64,random:()=>r})===12);
assert.notEqual(seed,undefined,'deterministic composite target seed');
fs.mkdirSync('artifacts',{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  for(const [layout,viewport] of [['pairboard',{width:390,height:844}],['classic',{width:390,height:844}],['pairboard',{width:834,height:1194}]]){
   const phone=viewport.width===390;
   const context=await browser.newContext({viewport,isMobile:phone,hasTouch:true,serviceWorkers:'block',reducedMotion:'no-preference'});
   await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
   await context.addInitScript(({seed,layout})=>{
     Math.random=()=>seed;
     localStorage.setItem('dol-focus-immersive-opt-in-v2','true');
     localStorage.setItem('dol-focus-mode-v1','true');
     localStorage.setItem('dol-auto-difficulty-v1','false');
     localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
     localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout,palette:'mono'}));
     localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:64,showCount:true,sound:false}));
   },{seed,layout});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('focus-mode')),true);
    await page.locator('#startButton').click();
    assert.equal(Number(await page.locator('#numberValue').textContent()),12);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const send=async (a,b)=>page.evaluate(([a,b])=>{
       const input=document.querySelector('#pairInput');
       input.value=a+'x'+b;
       document.querySelector('#answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    },[a,b]);
    await send(1,12);
    const pair=await page.locator('.factor-target-burst:not(.is-complete)').evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {name:s.animationName,rect:{top:r.top,bottom:r.bottom,height:r.height},label:el.textContent,animations:el.getAnimations().length};
    });
    assert.match(pair.label,/1 × 12/,'pair feedback is readable on the target');
    assert.match(pair.name,/dolFactorTargetFade/,'a real CSS animation runs in Focus');
    if(phone)assert.match(await page.locator('#mobileEntry .mobile-keypad [data-key="action"]').evaluate(el=>getComputedStyle(el).animationName),
      /dolDockAccepted/,'success also animates the on-screen fixed keypad');
    assert.ok(pair.animations>0,'factor animation is running rather than merely having a class');
    assert.ok(pair.rect.height>20&&pair.rect.top>=-2&&pair.rect.bottom<=viewport.height+3,'animation is visible within viewport');
    const selected=layout==='pairboard'?'#layoutPairGrid .layout-pair-chip.credited.pair-discovery':'#pairSlots .slot.solved.pair-discovery';
    assert.ok(await page.locator(selected).count()>0,'discovered pair is animated on the factor board');
    await send(2,6);await send(3,4);
    assert.equal(await page.locator('#playView').getAttribute('data-mobile-phase'),'finished');
    const completion=await page.locator('.factor-target-burst.is-complete').evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {kind:el.dataset.kind,label:el.textContent,name:s.animationName,duration:s.animationDuration,top:r.top,bottom:r.bottom};
    });
    assert.equal(completion.kind,'composite');
    assert.match(completion.label,/ALL PAIRS FOUND/);
    assert.match(completion.name,/dolFactorTargetFade/);
    assert.equal(completion.duration,'5s','completion animation honours the configured five seconds');
    assert.ok(completion.top>=-2&&completion.bottom<=viewport.height+3,'completion celebration is immediately visible');
    const decorations=page.locator((layout==='pairboard'?'#layoutPairGrid':'#answerReview')+' .number-celebration');
    assert.equal(await decorations.count(),3,'each completed pair gets its own number celebration');
    assert.equal(await decorations.first().evaluate(el=>getComputedStyle(el).animationDuration),'5s');
    if(phone){
      const next=page.locator('#mobileKeypad [data-key="action"]');
      const r=await next.boundingBox();
      assert.ok(r&&r.y>=0&&r.y+r.height<=viewport.height+1,'Next remains accessible during the celebration');
      assert.match(await next.evaluate(el=>getComputedStyle(el).animationName),/dolDockAccepted/,
        'the still-visible Next action celebrates completion');
    }
    await page.screenshot({path:'artifacts/focus-animations-'+engineName+'-'+layout+'-'+viewport.width+'.png'});
    assert.deepEqual(errors,[],'no browser exceptions in animated Focus flow');
    console.log('PASS Focus factor animations',engineName,layout,viewport.width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
