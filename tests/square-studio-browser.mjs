import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {testNetwork} from './browser-network.mjs';

const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const live=base.startsWith('https:');
fs.mkdirSync('artifacts',{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
 try{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:834,height:1194},{width:1194,height:834}]){
   const context=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900,serviceWorkers:'block'});
   try{
    await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
    await context.addInitScript(()=>{if(localStorage.getItem('dol-focus-mode-v1')===null)localStorage.setItem('dol-focus-mode-v1','false');});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(20000);
    await page.goto(base,{waitUntil:'networkidle',timeout:45000});
    await page.locator('[data-dol-version]').first().waitFor();
    const score=await page.locator('#scoreValue').innerText();
    await page.locator('#readySquareLesson').click();
    assert.equal(await page.locator('#learnView').isVisible(),true,'Ready-screen square link opens Learn');
    assert.equal(await page.locator('#squareStudio').isVisible(),true,'Square-number studio is mounted');
    assert.equal(await page.locator('#sqFactMap .sq-fact').count(),12);
    await page.locator('#sqLessonTabs [data-sq-tab="visual"]').click();
    assert.equal(await page.locator('.sq-tile-grid .sq-tile').count(),36,'6x6 area model');
    assert.equal(await page.locator('.sq-tile.added').count(),11,'2n-1 new tiles');
    await page.locator('#sqLessonTabs [data-sq-tab="roots"]').click();
    assert.match(await page.locator('#sqLessonContent').innerText(),/factorisation/);
    await page.locator('#sqTestFact').click();
    assert.equal(await page.locator('#sqQuiz').isVisible(),true);
    const answer=async value=>{
      await page.locator('#sqAnswer').fill(String(value));
      await page.locator('#sqCheck').click();
    };
    await answer(36);
    assert.match(await page.locator('#sqFeedback').innerText(),/Correct/);
    await page.locator('#sqNext').click();
    assert.match(await page.locator('#sqQuizPrompt').innerText(),/√36/);
    await answer(6);
    await page.locator('#sqNext').click();
    assert.match(await page.locator('#sqQuizPrompt').innerText(),/42/);
    await answer(6);
    await page.locator('#sqNext').click();
    assert.equal(await page.locator('#sqComplete').isVisible(),true);
    assert.match(await page.locator('#sqSeen').innerText(),/1\/32/);
    assert.equal(await page.locator('#scoreValue').innerText(),score,'Lessons never change factor-game points');
    const squareCard=page.locator('#memoryList .clickable-learning-card');
    assert.equal(await squareCard.count(),1,'The original square memory card must open the course');
    await squareCard.click();
    assert.equal(await page.locator('#sqLesson').isVisible(),true,'Tapping the whole square card opens a real lesson');
    await squareCard.focus();await squareCard.press('Enter');
    assert.equal(await page.locator('#sqLesson').isVisible(),true,'Square card works with a keyboard');
    const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('apps-learning-v1:dol:local')||'null'));
    assert.ok(evidence?.events?.some(e=>e.concept==='square:6'&&e.correct),'Square fact recorded in shared Learning SDK');
    assert.ok(evidence?.events?.some(e=>e.concept==='square-root:6'&&e.correct),'Inverse question has distinct evidence');
    await page.locator('#sqBands button').nth(1).click();
    assert.equal(await page.locator('#sqFactMap .sq-fact').count(),8,'Band changes interactive board');
    await page.locator('#sqFactMap .sq-fact').nth(2).click();
    assert.match(await page.locator('#sqLessonTitle').innerText(),/15² = 225/);
    await page.locator('#sqLessonTabs [data-sq-tab="memory"]').click();
    assert.match(await page.locator('#sqLessonContent').innerText(),/append 25/);
    await page.locator('#sqStartMixed').click();
    assert.equal(await page.locator('#sqQuiz').isVisible(),true);
    await page.locator('#sqSkip').click();
    await page.locator('#sqCloseQuiz').click();
    assert.equal(await page.locator('#sqQuiz').isVisible(),false);
    await page.locator('[data-view="progress"]').click();
    assert.equal(await page.locator('#squareProgress').isVisible(),true);
    await page.locator('#sqProgressAction').click();
    assert.equal(await page.locator('#learnView').isVisible(),true);
    // Move exactly one recorded square event back in time to exercise the due workflow.
    await page.evaluate(()=>{
      const k='apps-learning-v1:dol:local';
      const v=JSON.parse(localStorage.getItem(k));
      v.events.filter(e=>e.concept==='square:6').forEach(e=>{e.timestamp=Date.now()-2*86400000;});
      localStorage.setItem(k,JSON.stringify(v));
    });
    await page.reload({waitUntil:'networkidle'});
    await page.locator('#readySquareLesson').click();
    assert.match(await page.locator('#sqReview').innerText(),/Review due · 1/);
    await page.locator('#sqReview').click();
    assert.match(await page.locator('#sqQuizPrompt').innerText(),/6²/);
    await page.locator('#sqHint').click();
    await answer(36);
    assert.match(await page.locator('#sqFeedback').innerText(),/worked out with help/);
    await page.locator('#sqNext').click();
    assert.equal(await page.locator('#sqComplete').isVisible(),true);
    assert.equal(await page.locator('#scoreValue').innerText(),score);
    await page.evaluate(()=>localStorage.setItem('dol-focus-mode-v1','true'));
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#readySquareLesson').isVisible(),true,'Square course entry remains visible with Focus mode on');
    await page.locator('#readySquareLesson').click();
    assert.equal(await page.locator('#squareStudio').isVisible(),true,'Focus-mode CTA opens the course');
    assert.deepEqual(errors,[],name+' '+viewport.width+'x'+viewport.height+' browser exceptions');
    await page.screenshot({path:'artifacts/squares-'+name+'-'+viewport.width+'x'+viewport.height+(live?'-live':'')+'.png',fullPage:false});
    console.log('PASS squares '+name+' '+viewport.width+'x'+viewport.height+(live?' live':''));
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
