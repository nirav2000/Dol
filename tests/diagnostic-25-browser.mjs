import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {testNetwork} from './browser-network.mjs';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8000/';
const seed=Array.from({length:10000},(_,i)=>i/10000).find(random=>chooseAdaptiveNumber({stage:'systematic',limit:256,random:()=>random})===231);
assert.notEqual(seed,undefined);
const results=[];fs.mkdirSync('artifacts',{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const viewport of [{width:1210,height:675},{width:390,height:844},{width:834,height:1194}])for(const layout of ['classic','pairboard']){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await testNetwork(context,{base});
  await context.addInitScript(({seed,layout,focus})=>{
   Math.random=()=>seed;
   localStorage.setItem('dol-focus-mode-v1',String(focus));localStorage.setItem('dol-focus-immersive-opt-in-v2',String(focus));
   localStorage.setItem('dol-auto-difficulty-v1','false');
   localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout,palette:'slate'}));
   localStorage.setItem('dol-tablet-keypad-v1','true');
   localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'timed',stage:'systematic',limit:256,duration:90,sound:false,showCount:true}));
   localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
  },{seed,layout,focus:viewport.width!==1210||layout!=='classic'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base,{waitUntil:'networkidle'});await page.locator('#startButton').click();
   await page.waitForFunction(()=>document.querySelector('#numberValue').textContent==='231');
   const phone=viewport.width===390;
   const action=page.locator(phone?'#mobileKeypad [data-key=action]':'.tablet-pad [data-tablet-key=action]');
   const digit=n=>page.locator(phone?`#mobileKeypad [data-key="${n}"]`:`.tablet-pad [data-tablet-key="${n}"]`);
   async function enter(a,b){for(const n of String(a))await digit(n).tap();await action.tap();for(const n of String(b))await digit(n).tap();await action.tap();console.log('DIAG25 entry',name,viewport.width,layout,a,b,JSON.stringify({heading:await page.locator('#foundHeading').textContent(),feedback:await page.locator('#entryFeedback').textContent(),first:await page.locator('#mobileFirst').textContent(),second:await page.locator('#mobileSecond').textContent(),input:await page.locator('#pairInput').inputValue()}));}
   await enter(1,231);await enter(3,77);await enter(7,33);
   assert.match(await page.locator('#foundHeading').textContent(),/3/);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const before=await action.boundingBox();await page.locator('#finishButton').click();
   await page.waitForSelector('#finishedPanel',{state:'visible'});
   const after=await action.boundingBox();
   if(phone){assert.equal(await page.locator('#mobileEntry').evaluate(e=>e.parentElement?.id),'reviewNextSlot');assert.ok(after.height>=50);}else for(const k of ['x','y','width','height'])assert.ok(Math.abs(before[k]-after[k])<1,'action position '+k+JSON.stringify({before,after}));
   // A native touch click can scroll to Finish. Re-check the complete desktop
   // or tablet board after returning to its initial review position.
   if(!phone){await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
   const selectors=['.number-tile',layout==='pairboard'?'#layoutPairGrid [data-review-pair]':'#answerReview [data-review-pair]'];
   // WebKit can retain a few CSS pixels of sub-pixel native scroll offset.
   // Tolerate up to 8px at the viewport's top edge, but reject actual clipping
   // or any overlap with the persistent Next button.
   const measurement=await page.evaluate(selectors=>{
    const v=visualViewport||{offsetTop:0,offsetLeft:0,width:innerWidth,height:innerHeight};
    const key=document.querySelector('.tablet-pad.is-finished button[data-tablet-key=action],.mobile-entry.is-finished button[data-key=action]');
    const k=key.getBoundingClientRect();
    return [...document.querySelectorAll(selectors.join(','))].map(e=>{
     const r=e.getBoundingClientRect();const overlap=Math.max(0,Math.min(r.right,k.right)-Math.max(r.left,k.left))*Math.max(0,Math.min(r.bottom,k.bottom)-Math.max(r.top,k.top));
     return {text:e.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,inside:r.left>=v.offsetLeft-1&&r.top>=v.offsetTop-8&&r.right<=v.offsetLeft+v.width+1&&r.bottom<=v.offsetTop+v.height+1,overlap};
    });
   },selectors);
   assert.equal(measurement.length,5,'target plus all four factor pairs');
   assert.ok(measurement.every(m=>(phone||m.inside)&&m.overlap<1),JSON.stringify(measurement));
   const dataBefore=await page.evaluate(()=>localStorage.getItem('apps-learning-v1:dol:local'));
   await page.locator(layout==='pairboard'?'#layoutPairGrid [data-review-pair="11-21"]':'#answerReview [data-review-pair="11-21"]').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('apps-learning-v1:dol:local')),dataBefore,'review preserves learner evidence');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`artifacts/issue25-${name}-${viewport.width}-${layout}.png`});
   results.push({engine:name,viewport,layout,phase:'finished',target:231,pairs:4,measurement,actionPreserved:true,learningPreserved:true});
   await action.tap();assert.equal(await page.locator('#roundValue').textContent(),'2');
   console.log('PASS Apps #25',name,viewport.width,layout);
  }catch(e){await page.screenshot({path:`artifacts/issue25-failure-${name}-${viewport.width}-${layout}.png`});throw e;}
  finally{await context.close();}
 }}finally{await browser.close();}
}
fs.writeFileSync('artifacts/issue25-browser.json',JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));
