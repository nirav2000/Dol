import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:640,height:900},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await ctx.addInitScript(()=>{localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-focus-immersive-opt-in-v2','true');localStorage.setItem('dol-auto-difficulty-v1','false');localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'systematic',limit:128,sound:false,showCount:true}));localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
   await page.locator('#startButton').tap();
   const action=page.locator('#mobileKeypad [data-key="action"]');
   const before=await action.boundingBox();
   assert.ok(before&&before.height>=56&&before.y>=0&&before.y+before.height<=viewport.height+1,'the in-round action is thumb-reachable');
   await page.evaluate(()=>window.originalAction=document.querySelector('#mobileKeypad [data-key="action"]'));
   await page.locator('#mobileKeypad [data-key="1"]').tap();await page.locator('#mobileKeypad [data-key="1"]').tap();
   assert.equal(await page.locator('#mobileFirst').textContent(),'11','rapid taps register');
   await page.locator('#mobileKeypad [data-key="clear"]').tap();await page.locator('#mobileKeypad [data-key="clear"]').tap();
   await page.locator('#finishButton').tap();
   assert.equal(await action.getAttribute('aria-label'),'Next question');
   assert.equal(await page.locator('#mobileEntry').evaluate(el=>el.parentElement?.id),'finishedPanel','next action belongs to the review, not a floating overlay');
   assert.equal(await page.locator('#mobileEntry button:visible').count(),1,'only the next button remains');
   assert.equal(await page.evaluate(()=>window.originalAction===document.querySelector('#mobileKeypad [data-key="action"]')),true,'persistent key is reused');
   const geometry=await page.evaluate(()=>{
     const key=document.querySelector('#mobileKeypad [data-key="action"]'),review=document.querySelector('#reviewEvidence'),r=key.getBoundingClientRect(),e=review.getBoundingClientRect();
     return {position:getComputedStyle(document.querySelector('#mobileEntry')).position,above:review.compareDocumentPosition(key)&Node.DOCUMENT_POSITION_FOLLOWING,overlap:Math.max(0,Math.min(r.right,e.right)-Math.max(r.left,e.left))*Math.max(0,Math.min(r.bottom,e.bottom)-Math.max(r.top,e.top)),reserve:parseFloat(document.querySelector('#playView').style.getPropertyValue('--mobile-dock-height'))};
   });
   assert.ok(geometry.above,'review evidence precedes Next');
   assert.notEqual(geometry.position,'fixed','Next scrolls naturally with review');
   assert.equal(geometry.overlap,0,'Next does not cover review copy');
   assert.equal(geometry.reserve,0,'finished review reserves no ghost keypad');
   await action.scrollIntoViewIfNeeded();
   if(viewport.width===390)await page.screenshot({path:'artifacts/mobile-dock-review.png',fullPage:true});
   const round=Number(await page.locator('#roundValue').textContent());
   await action.tap();
   assert.equal(Number(await page.locator('#roundValue').textContent()),round+1);
   assert.equal(await page.locator('#mobileEntry').evaluate(el=>el.parentElement?.id),'playView');
   assert.equal(await page.locator('#mobileEntry button:visible').count(),14);
   assert.equal(await action.textContent(),'×');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no horizontal overflow');
   await page.locator('#finishButton').tap();
   await page.setViewportSize(viewport.width===844?{width:390,height:700}:{width:844,height:390});
   assert.equal(await page.locator('#mobileEntry').evaluate(el=>getComputedStyle(el).position),'static');
   await action.scrollIntoViewIfNeeded();
   await action.tap();
   await page.locator('#finishButton').tap();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#activePanel').isVisible(),true,'Enter advances from review');
   assert.deepEqual(errors,[]);
   console.log('PASS learning-first mobile dock',viewport.width,viewport.height);
  }finally{await ctx.close();}
 }
}finally{await browser.close();}
