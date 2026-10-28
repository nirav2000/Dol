import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  for(const viewport of [{width:390,height:844},{width:834,height:1194}]){
   const phone=viewport.width===390;
   const context=await browser.newContext({viewport,isMobile:phone,hasTouch:true,serviceWorkers:'block'});
   await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
   await context.addInitScript(()=>{
    localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'slate'}));
    localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
    localStorage.setItem('dol-auto-difficulty-v1','true');
    localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:128,showCount:true,sound:false}));
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
    assert.equal(await page.locator('#challengeOverview').isVisible(),true);
    if(phone)assert.equal(await page.locator('#challengeConfigurator').isVisible(),false,'phone starts compact');
    if(phone)await page.locator('#changeChallenge').click();
    assert.equal(await page.locator('#challengeConfigurator').isVisible(),true);
    assert.equal(await page.locator('#adaptiveToggle').isChecked(),true);
    assert.equal(await page.locator('#stageSelect').isEnabled(),true,'automatic mode does not lock the difficulty selector');
    assert.equal(await page.locator('#limitSelect').isEnabled(),true,'number limit is selectable');
    assert.ok(await page.locator('#limitSelect option[value="144"]').count()>0,'times-table limit exists');
    await page.locator('#stageSelect').selectOption('systematic');
    assert.equal(await page.locator('#adaptiveToggle').isChecked(),false,'changing difficulty switches to custom');
    await page.locator('#limitSelect').selectOption('192');
    assert.equal(await page.locator('#limitSelect').inputValue(),'192');
    assert.match(await page.locator('#challengeSummaryText').textContent(),/Custom Systematic.*192/);
    await page.locator('#changeChallenge').click();
    await page.locator('#startButton').click();
    const n=Number(await page.locator('#numberValue').textContent());
    assert.ok(n>=36&&n<=192,'custom limit and difficulty determine next target: '+n);
    const slots=page.locator('#layoutPairGrid .layout-pair-chip');
    assert.ok(await slots.count()>=4,'factor-pair placeholders remain visible');
    assert.equal(await page.locator('#layoutPairGrid .layout-pair-chip.empty .pair-number').count(),await slots.count()*2,'placeholders have the same number-tile structure');
    const before=await slots.first().boundingBox();
    assert.ok(before.height>=68,'placeholder is large and legible');
    await page.evaluate(()=>{
      document.querySelector('#pairInput').value='1x'+document.querySelector('#numberValue').textContent.trim();
      document.querySelector('#answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
    assert.ok(await page.locator('#layoutPairGrid .layout-pair-chip.credited').count()>0,'solved pairs use the same board');
    assert.ok(await page.locator('#layoutPairGrid .pair-discovery').count()>0,'each correct pair animates');
    const solved=await page.locator('#layoutPairGrid .layout-pair-chip.credited').first().boundingBox();
    assert.ok(Math.abs(before.height-solved.height)<4,'tiles do not change size after discovery');
    if(phone){
      await page.screenshot({path:'artifacts/learning-first-play-'+engineName+'.png',fullPage:true});
    }
    await page.locator('#focusToggle').click();
    assert.equal(await page.evaluate(()=>document.body.classList.contains('focus-mode')),true);
    assert.equal(await page.locator('#roundLearningBar').isVisible(),true,'teaching tools remain in Focus');
    await page.locator('#roundBarRainbow').click();
    assert.equal(await page.locator('#roundVisuals').isVisible(),true,'Focus opens a visible factor rainbow');
    assert.ok(await page.locator('#roundVisuals .factor-arc').count()>0,'discovered pair creates rainbow arc');
    await page.locator('#roundVisualDismiss').click();
    assert.equal(await page.evaluate(()=>document.body.classList.contains('dol-visuals-open')),false);
    await page.locator('#roundBarHint').click();
    assert.equal(await page.locator('#strategyHintDialog').isVisible(),true);
    await page.locator('#coachTry').click();
    assert.equal(await page.locator('#strategyHintDialog').isVisible(),false);
    const beforeReviewScore=Number(await page.locator('#scoreValue').textContent());
    await page.locator('#finishButton').click();
    const review=page.locator('#layoutPairGrid .review-pair');
    const reviewBox=await review.first().boundingBox();
    assert.ok(Math.abs(before.height-reviewBox.height)<4,'review uses the same large factor tile geometry');
    const firstKey=await review.first().getAttribute('data-review-pair');
    await review.first().click();
    assert.equal(Number(await page.locator('#scoreValue').textContent()),beforeReviewScore,'tapping a review pair teaches before editing the score');
    assert.match(await page.locator('#patternDetail').textContent(),/×/,'review opens a mathematical explanation');
    await page.locator('#reviewAdjustScore').click();
    const uncredited=page.locator('#layoutPairGrid .review-pair:not(.credited)').first();
    if(await uncredited.count()){
      await uncredited.click();
      assert.equal(Number(await page.locator('#scoreValue').textContent()),beforeReviewScore+1,'explicit correction changes game score');
    }
    if(phone){
      const next=page.locator('#mobileKeypad [data-key="action"]');
      assert.equal(await page.locator('#mobileEntry').evaluate(e=>e.parentElement?.id),'finishedPanel');
      assert.notEqual(await page.locator('#mobileEntry').evaluate(e=>getComputedStyle(e).position),'fixed','Next action does not cover mathematics');
      await next.scrollIntoViewIfNeeded();
      const rect=await next.boundingBox();
      assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height+1);
      await page.screenshot({path:'artifacts/learning-first-review-'+engineName+'.png',fullPage:true});
      await next.click();
    }else await page.locator('#startButton').click();
    assert.equal(await page.locator('#activePanel').isVisible(),true);
    assert.equal(await page.locator('#limitSelect').inputValue(),'192','custom settings persist');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no horizontal page overflow');
    assert.deepEqual(errors,[],'no JavaScript exceptions');
    console.log('PASS learning-first',engineName,viewport.width,'first target',n,'review key',firstKey);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
