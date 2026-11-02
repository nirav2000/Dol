// Verify stored timing evidence for every submitted pair and preserved mastery.
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const seed=Array.from({length:10000},(_,i)=>i/10000).find(r=>
  chooseAdaptiveNumber({stage:'foundation',limit:64,random:()=>r})===12);
assert.notEqual(seed,undefined);
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
  await context.addInitScript(seed=>{
   Math.random=()=>seed;
   localStorage.setItem('dol-focus-mode-v1','false');
   localStorage.setItem('dol-focus-immersive-opt-in-v2','false');
   localStorage.setItem('dol-auto-difficulty-v1','false');
   localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'mono'}));
   localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:64,sound:false}));
   localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
  },seed);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:60000});
   await page.locator('#startButton').click();
   assert.equal(await page.locator('#numberValue').textContent(),'12');
   const submit=async value=>{
    await page.waitForTimeout(155);
    await page.evaluate(value=>{
     const input=document.querySelector('#pairInput');
     input.value=value;
     document.querySelector('#answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    },value);
   };
   await submit('3x3'); // Incorrect but mathematically well formed.
   await submit('1x12'); // Correct.
   const scoreAfterCorrect=Number(await page.locator('#scoreValue').textContent());
   await submit('1x12'); // Duplicate, not another learning success.
   await submit('1x'); // Incomplete, not another learning misconception.
   assert.equal(Number(await page.locator('#scoreValue').textContent()),scoreAfterCorrect);
   const data=await page.evaluate(()=>{
    const attempts=JSON.parse(localStorage.getItem('dol-pair-attempts-v1')||'[]');
    const learning=JSON.parse(localStorage.getItem('apps-learning-v1:dol:local')||'null');
    return {attempts,events:learning?.events||[]};
   });
   assert.deepEqual(data.attempts.map(x=>x.status),['incorrect','correct','duplicate','invalid']);
   assert.deepEqual(data.attempts.map(x=>x.pair),['3x3','1x12','1x12','1x']);
   assert.ok(data.attempts.every(a=>a.durationMs>=100),'every submitted entry has a real duration');
   assert.ok(data.attempts.every(a=>a.id&&a.roundId&&a.target===12));
   const validEvents=data.events.filter(x=>x.concept==='factor:pair');
   assert.equal(validEvents.length,2,'duplicates and incomplete inputs never alter mastery');
   assert.deepEqual(validEvents.map(x=>x.correct),[false,true]);
   assert.ok(validEvents.every(x=>x.durationMs>0&&x.context.attemptId),
    'durations and identifiers are retained in standard synced Learning SDK events');
   assert.deepEqual(validEvents.map(x=>x.context.attemptId),data.attempts.slice(0,2).map(x=>x.id));
   await page.locator('[data-view=progress]').click();
   assert.match(await page.locator('#pairAttemptSummary').textContent(),/4 recorded submissions.*1 correct.*fastest/);
   assert.equal(await page.locator('#recentPairAttempts .session').count(),4);
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:60000});
   await page.locator('[data-view=progress]').click();
   assert.equal(await page.locator('#recentPairAttempts .session').count(),4,'attempts survive reload');
   assert.deepEqual(errors,[],'browser stays free of JavaScript exceptions');
   console.log('PASS recorded pair times '+engineName);
  }finally{await context.close();}
 }finally{await browser.close();}
}
