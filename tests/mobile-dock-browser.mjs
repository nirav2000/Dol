import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const same=(a,b,label)=>{assert.ok(a&&b,label+' visible');for(const k of ['x','y','width','height'])assert.ok(Math.abs(a[k]-b[k])<1,label+' '+k+': '+a[k]+' vs '+b[k]);};
try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:640,height:900},{width:844,height:390}]){
  const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await ctx.addInitScript(()=>{localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-auto-difficulty-v1','false');localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'systematic',limit:128,sound:false,showCount:true}));localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  assert.ok(await page.locator('#startButton').isVisible(),'Start visible');
  await page.locator('#startButton').tap();
  const action=page.locator('#mobileKeypad [data-key="action"]');
  const before=await action.boundingBox();
  assert.ok(before&&before.height>=56);
  await page.evaluate(()=>{window.originalAction=document.querySelector('#mobileKeypad [data-key="action"]');});
  await page.locator('#mobileKeypad [data-key="1"]').tap();await page.locator('#mobileKeypad [data-key="1"]').tap();
  assert.equal(await page.locator('#mobileFirst').textContent(),'11','rapid repeated taps');
  await page.locator('#mobileKeypad [data-key="clear"]').tap();await page.locator('#mobileKeypad [data-key="clear"]').tap();
  await page.locator('#finishButton').tap();
  assert.equal(await action.getAttribute('aria-label'),'Next question');
  same(before,await action.boundingBox(),'play/review');
  assert.equal(await page.evaluate(()=>window.originalAction===document.querySelector('#mobileKeypad [data-key="action"]')),true,'one persistent button');
  assert.equal(await page.locator('#mobileEntry button:visible').count(),1,'no invisible keypad');
  const dock=await page.locator('#mobileEntry').boundingBox();
  assert.ok(dock.height<=before.height+1,'no reserved keypad rows');
  const reserve=await page.locator('#playView').evaluate(e=>parseFloat(e.style.getPropertyValue('--mobile-dock-height')));
  assert.ok(reserve<=before.height+1,'scroll clearance only one key');
  assert.ok(before.y>=0&&before.y+before.height<=viewport.height+1);
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  same(before,await action.boundingBox(),'scroll');
  const evidence=await page.locator('#reviewEvidence').boundingBox();
  assert.ok(evidence&&evidence.y+evidence.height<=before.y-4,'review scrolls clear');
  if(viewport.width===390)await page.screenshot({path:'artifacts/mobile-dock-review.png'});
  const round=Number(await page.locator('#roundValue').textContent());
  await action.tap();
  assert.equal(Number(await page.locator('#roundValue').textContent()),round+1);
  same(before,await action.boundingBox(),'next question');
  assert.equal(await action.textContent(),'×');
  assert.equal(await page.locator('#mobileEntry button:visible').count(),14);
  await page.locator('#finishButton').tap();
  await page.setViewportSize(viewport.width===844?{width:390,height:700}:{width:844,height:390});
  // Resize placement settles across two animation frames; capture the new geometry after those frames.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  await page.waitForFunction(()=>{const r=document.querySelector('#mobileKeypad [data-key="action"]')?.getBoundingClientRect();return r&&r.y>=0&&r.bottom<=innerHeight+1;},{},{timeout:3000});const rotated=await action.boundingBox();assert.ok(rotated&&rotated.y>=0);
  await action.tap();const afterRotate=await action.boundingBox();if(Math.abs(rotated.y-afterRotate.y)>1)console.error('Rotation action geometry',JSON.stringify({viewport,rotated,afterRotate,metrics:await page.evaluate(()=>({innerHeight,clientHeight:document.documentElement.clientHeight,visualHeight:visualViewport?.height,visualOffset:visualViewport?.offsetTop,screenHeight:screen.height,dock:document.getElementById('mobileEntry').getBoundingClientRect().toJSON(),top:document.getElementById('mobileEntry').style.top,scrollY}))}));same(rotated,afterRotate,'rotation');
  await page.locator('#finishButton').tap();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#activePanel').isVisible(),'keyboard Enter');
  assert.deepEqual(errors,[]);
  console.log('PASS mobile dock',viewport.width,viewport.height);
  await ctx.close();
 }
}finally{await browser.close();}
