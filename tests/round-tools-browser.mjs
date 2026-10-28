import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8000/';
const seed=Array.from({length:10000},(_,i)=>i/10000).find(r=>chooseAdaptiveNumber({stage:'systematic',limit:128,random:()=>r})===112);
assert.notEqual(seed,undefined);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts',{recursive:true});
let checks=0;
async function scenario(name,fn){
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(({seed})=>{
   Math.random=()=>seed;
   if(!sessionStorage.getItem('seeded-round-tools')){
     localStorage.setItem('dol-auto-difficulty-v1',JSON.stringify(false));
     localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'systematic',limit:128,duration:30,sound:false,showCount:true}));
     localStorage.setItem('dol-factor-frenzy-v1',JSON.stringify({round:1,score:10}));
     localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false,delay:3}));
     sessionStorage.setItem('seeded-round-tools','yes');
   }
 },{seed});
 if(name!=='focus-first layout, input focus and Enter next')await context.addInitScript(()=>localStorage.setItem('dol-focus-mode-v1','false'));
  else await context.addInitScript(()=>localStorage.setItem('dol-focus-immersive-opt-in-v2','true'));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
   await page.goto(base,{waitUntil:'networkidle'});
   await page.waitForSelector('#autoNext',{state:'attached'});
   await fn(page,context);
   assert.deepEqual(errors,[],name+' has no JavaScript errors');
   checks++;console.log('PASS '+name);
 }catch(e){await page.screenshot({path:'artifacts/failure-'+name.replace(/[^a-z0-9]/gi,'-')+'.png',fullPage:true});console.error(errors);throw e;}
 finally{await context.close();}
}
const start=async p=>{await p.locator('#startButton').click();await p.waitForFunction(()=>document.getElementById('numberValue').textContent==='112');};
const submit=async(p,value)=>{await p.locator('#pairInput').fill(value);await p.locator('#addButton').click();};
const score=async p=>Number(await p.locator('#scoreValue').textContent());
const round=async p=>Number(await p.locator('#roundValue').textContent());
const learningData=async p=>p.evaluate(()=>localStorage.getItem('apps-learning-v1:dol:local'));
try{
 await scenario('large review tiles and honest manual scoring',async p=>{
   await start(p);assert.ok(await p.locator('#numberValue').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=160);
   await submit(p,'1x112');assert.equal(await p.locator('#pairSlots .pair-number').count(),2);
   await p.locator('#finishButton').click();const before=await learningData(p);
   assert.equal(await p.locator('.review-pair').count(),5);assert.equal(await score(p),11);
   await p.locator('[data-review-pair="2-56"]').click();
   assert.equal(await score(p),11,'review explanations never change points');
   assert.match(await p.locator('#patternDetail').textContent(),/2 × 56/);
   await p.locator('#reviewAdjustScore').click();
   for(const key of ['2-56','4-28','7-16','8-14'])await p.locator(`[data-review-pair="${key}"]`).click();
   assert.equal(await score(p),17);assert.match(await p.locator('#reviewSummary').textContent(),/bonus/);
   for(let i=0;i<3;i++){await p.locator('[data-review-pair="8-14"]').click();assert.equal(await score(p),14);await p.locator('[data-review-pair="8-14"]').click();assert.equal(await score(p),17);}
   assert.equal(await learningData(p),before,'Review edits do not rewrite learning');
   await p.locator('#restoreReview').click();assert.equal(await score(p),11);
   await p.locator('[data-review-pair="2-56"]').focus();await p.keyboard.press('Space');assert.equal(await score(p),12);
   await p.screenshot({path:'artifacts/review-desktop.png',fullPage:true});
   for(const width of [390,320]){await p.setViewportSize({width,height:844});await p.waitForTimeout(160);const overflow=await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,offenders:[...document.querySelectorAll('html,body,body *')].filter(e=>{const r=e.getBoundingClientRect();return e.scrollWidth>e.clientWidth+2||r.width&&r.right>innerWidth+2;}).slice(0,30).map(e=>({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className.slice(0,80):'',scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,rect:e.getBoundingClientRect().toJSON()}))}));if(overflow.scrollWidth>overflow.innerWidth+1)console.error('Horizontal overflow evidence',JSON.stringify({width,overflow}));assert.equal(overflow.scrollWidth<=overflow.innerWidth+1,true,'No horizontal page overflow at '+width);assert.ok(await p.locator('#answerReview .review-pair .pair-number').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=21,'visible review pair numerals stay readable on a narrow desktop window');}
   await p.setViewportSize({width:390,height:844});await p.screenshot({path:'artifacts/review-mobile.png',fullPage:true});
 });
 await scenario('automatic next and manual-next cancellation',async p=>{
   await p.locator('#autoNext').check();await p.locator('#autoNextDelay').selectOption('3');await start(p);await p.locator('#finishButton').click();
   await p.waitForFunction(()=>document.getElementById('roundValue').textContent==='2',{},{timeout:7000});assert.equal(await round(p),2);
   await p.locator('#finishButton').click();await p.locator('#startButton').click();assert.equal(await round(p),3);await p.waitForTimeout(3500);assert.equal(await round(p),3);
   await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('#autoNext').isChecked(),true);assert.equal(await p.locator('#autoNextDelay').inputValue(),'3');
 });
 await scenario('review edits and hidden pages hold auto next',async p=>{
   await p.locator('#autoNext').check();await start(p);await p.locator('#finishButton').click();
   await p.locator('[data-review-pair="1-112"]').click();await p.waitForTimeout(3500);assert.equal(await round(p),1);assert.match(await p.locator('#autoNextText').textContent(),/paused/);
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await p.locator('#resumeAutoNext').click();await p.waitForTimeout(3500);assert.equal(await round(p),1);
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
   await p.waitForFunction(()=>document.getElementById('roundValue').textContent==='2',{},{timeout:7000});
   await p.locator('#finishButton').click();await p.locator('[data-view="learn"]').click();await p.waitForTimeout(3500);assert.equal(await round(p),2);
   await p.locator('[data-view="play"]').click();await p.waitForFunction(()=>document.getElementById('roundValue').textContent==='3',{},{timeout:7000});
 });
 await scenario('rainbows handle squares and primes',async p=>{
   await p.locator('[data-view="learn"]').click();const root=p.locator('#learnVisuals');
   await root.locator('form input').fill('36');await root.locator('form button').click();await root.locator('[data-kind="rainbow"]').click();
   assert.equal(await root.locator('.factor-arc').count(),5);assert.equal(await root.locator('.rainbow-label').count(),9);
   assert.equal(await root.locator('.rainbow-label').allTextContents().then(a=>a.filter(s=>s==='6').length),1);
   await root.locator('.visual-pair-button').filter({hasText:'6 × 6'}).click();assert.match(await root.locator('[data-explanation]').textContent(),/partners itself/);
   await p.screenshot({path:'artifacts/rainbow-desktop.png',fullPage:true});
   await root.locator('form input').fill('13');await root.locator('form button').click();assert.equal(await root.locator('.factor-arc').count(),1);
   await root.locator('form input').fill('1');await root.locator('form button').click();assert.equal(await root.locator('.rainbow-label').count(),1);
   assert.equal(await learningData(p),null,'Playground does not write learning records');
 });
 await scenario('arrays show exact groups remainders rotation and 1024 counters',async p=>{
   await p.locator('[data-view="learn"]').click();const root=p.locator('#learnVisuals');
   await root.locator('form input').fill('112');await root.locator('form button').click();await root.locator('[data-kind="arrays"]').click();
   const rows=root.locator('#learnVisuals-rows');await rows.fill('3');await rows.press('Tab');
   assert.match(await root.locator('[data-equation]').textContent(),/111.*1 left over/);assert.equal(await root.locator('[data-rotate]').isDisabled(),true);
   await rows.fill('7');await rows.press('Tab');assert.match(await root.locator('[data-equation]').textContent(),/7 rows × 16/);assert.equal(await root.locator('.array-unit').count(),112);
   await root.locator('[data-rotate]').click();assert.match(await root.locator('[data-equation]').textContent(),/16 rows × 7/);assert.equal(await root.locator('.array-unit').count(),112);
   await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await p.screenshot({path:'artifacts/arrays-mobile.png',fullPage:true});
   await root.locator('form input').fill('1024');await root.locator('form button').click();await root.locator('[data-kind="arrays"]').click();await root.locator('[data-dots]').check();assert.equal(await root.locator('.array-unit').count(),1024);
 });
 await scenario('visual answers remain assisted for the rest of a round',async p=>{
   await p.locator('[data-mode="practice"]').click();await start(p);
   const root=p.locator('#roundVisuals');await root.locator('[data-kind="rainbow"]').click();assert.equal(await root.locator('.factor-arc').count(),0);
   await root.locator('[data-reveal]').click();assert.equal(await root.locator('.factor-arc').count(),5);
   await submit(p,'1x112');await submit(p,'2x56');
   const data=JSON.parse(await learningData(p));const events=data.events.filter(e=>e.concept==='factor:pair'&&e.correct);assert.equal(events.length,2);assert.ok(events.every(e=>e.hints>=1));
   await p.locator('#finishButton').click();assert.match(await p.locator('#reviewEvidence').textContent(),/0 unassisted, 2 assisted/);
 });
 await scenario('focus-first layout, input focus and Enter next',async p=>{
   assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('focus-mode')),true);
   assert.equal(await p.locator('.topbar').evaluate(e=>getComputedStyle(e).transform==='matrix(1, 0, 0, 1, 0, 0)'),false);
   await p.locator('#menuReveal').dispatchEvent('click');assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('focus-menu-revealed')),true);
   await p.locator('#focusToggle').click();assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('focus-mode')),false);
   await p.locator('#focusToggle').click();await start(p);
   assert.equal(await p.locator('#pairInput').evaluate(e=>document.activeElement===e),true);
   await p.locator('#pairInput').fill('1x112');await p.keyboard.press('Enter');
   assert.equal(await p.locator('#pairInput').evaluate(e=>document.activeElement===e),true);
   await p.locator('#finishButton').click();assert.equal(await round(p),1);
   await p.locator('body').click({position:{x:10,y:150}});
   await p.keyboard.press('Enter');assert.equal(await round(p),2);
   assert.equal(await p.locator('#pairInput').evaluate(e=>document.activeElement===e),true);
   await p.reload({waitUntil:'networkidle'});
   assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('focus-mode')),true);
 });
 console.log(`${checks} enhanced browser scenarios passed`);
}finally{await browser.close();}
