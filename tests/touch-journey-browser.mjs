import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const version=JSON.parse(fs.readFileSync('version.json','utf8')).version;
fs.mkdirSync('artifacts',{recursive:true});
const cases=[{width:390,height:844,layout:'classic'},{width:390,height:844,layout:'pairboard'},{width:834,height:1194,layout:'pairboard'},{width:1194,height:834,layout:'pairboard'}];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const scenario of cases){
  const phone=scenario.width===390;
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},hasTouch:true,isMobile:phone,serviceWorkers:'block'});
  await context.addInitScript(({layout})=>{
   localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-focus-immersive-opt-in-v2','true');
   localStorage.setItem('dol-auto-difficulty-v1','false');
   localStorage.setItem('dol-tablet-keypad-v1','true');
   localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout,palette:'mono'}));
   localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
   if(localStorage.getItem('dol-release-test-seeded'))return;
   const rounds=[],events=[],now=Date.now();
   for(let i=0;i<6;i++){
    const startedAt=now-(21-i*4)*86400000,id='seed-round-'+i;
    rounds.push({id,timestamp:startedAt+30000,startedAt,mode:'practice',target:12,correct:i<3?1:3,total:3,hints:0,durationMs:30000,activeMs:30000,timing:'active-v1',input:'phone-pad',showCount:true,detailed:true});
    ['1x12','2x6','3x4'].forEach((key,j)=>events.push({kind:'pair',id:'seed-'+i+'-'+j,at:startedAt+10000+j*5000,key,target:12,outcome:i<3&&j>0?'missed':'correct',assisted:false,errors:0,ms:i<3?8000:3000,roundId:id,mode:'practice',input:'phone-pad',position:j,showCount:true,timing:'active-v1'}));
   }
   localStorage.setItem('dol-improvement-v1:guest',JSON.stringify({schema:1,chunks:{history:{schema:1,id:'history',createdAt:now,source:'release-test',events,sessions:rounds}},uploaded:[],buffer:{events:[],sessions:[]},draft:null}));
   localStorage.setItem('dol-release-test-seeded','yes');
  },scenario);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.dolReady==='true');
   await page.locator('#improvementStartCheck').waitFor({state:'attached'});
   assert.equal((await page.locator('footer [data-dol-version]').textContent()).trim(),'Dol v'+version);
   await page.locator('#startButton').tap();
   const root=phone?'#mobileKeypad':'.tablet-pad-grid',attribute=phone?'data-key':'data-tablet-key';
   const key=k=>page.locator(root+' ['+attribute+'="'+k+'"]');
   const field=phone?page.locator('#mobileFirst'):page.locator('.tablet-pad-fields button').first();
   await key('1').waitFor({state:'visible'});
   await key('1').tap();await key('1').tap();
   assert.equal(await field.textContent(),'11','rapid repeated touches register exactly once each');
   await key('clear').tap();await key('clear').tap();
   const captured=await page.evaluate(({root,attribute})=>{
    const one=document.querySelector(root+' ['+attribute+'="2"]'),two=document.querySelector(root+' ['+attribute+'="3"]');
    one.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:101,isPrimary:true,button:0}));
    two.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:102,isPrimary:false,button:0}));
    const ack=two.classList.contains('key-captured');
    two.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
    document.querySelector(root+' ['+attribute+'="8"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
    return ack;
   },{root,attribute});
   assert.equal(captured,true,'captured contact has immediate visible feedback');
   assert.equal(await field.textContent(),'23','overlapping contacts count; compatibility and retargeted clicks do not');
   await key('clear').tap();await key('clear').tap();
   await key('1').tap({position:{x:4,y:4}});
   assert.equal(await field.textContent(),'1','tap near the key edge is accepted');
   await key('action').tap();
   const target=(await page.locator('#numberValue').textContent()).trim();
   for(const digit of target)await key(digit).tap();
   await key('action').tap();
   assert.equal(await page.locator('#pairSlots .slot.solved').count(),1,'one pair submitted once');
   await page.locator('#menuReveal').tap();
   await page.locator('#focusToggle').tap();
   assert.equal(await page.evaluate(()=>document.body.classList.contains('focus-mode')),false,'exit focus responds to a real touch');
   await page.locator('[data-view="progress"]').tap();
   assert.equal(await page.locator('#progressView').isVisible(),true);
   await page.locator('#journeyFacts').waitFor({state:'visible'});
   assert.equal(await page.locator('#journeyFacts .journey-stat').count(),4);
   assert.ok(await page.locator('#journeyWeeks .journey-week').count()>=3,'dated multi-week history is visualised');
   assert.match(await page.locator('#journeyChange').textContent(),/Accuracy|Complete rounds|Matched solving pace/);
   assert.equal(await page.locator('#insightGrid .fact-cell').count(),144);
   assert.ok(await page.locator('#insightGrid .fact-cell').evaluateAll(els=>els.some(e=>parseFloat(e.style.getPropertyValue('--fact-progress'))>0)));
   assert.equal(await page.locator('#improvementPanel').count(),1,'no competing legacy progress panel');
   const duplicateIds=await page.locator('[id]').evaluateAll(els=>{const ids=els.map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
   assert.deepEqual(duplicateIds,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no page-level horizontal overflow');
   await page.screenshot({path:'artifacts/journey-'+name+'-'+scenario.width+'-'+scenario.layout+'.png',fullPage:true});
   const before=await page.locator('#journeyFacts').textContent();
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.dolReady==='true');
   if(await page.evaluate(()=>document.body.classList.contains('focus-mode')))await page.locator('#menuReveal').tap();
   await page.locator('[data-view="progress"]').tap();
   await page.locator('#journeyFacts').waitFor({state:'visible'});
   assert.equal(await page.locator('#journeyFacts').textContent(),before,'saved history survives reload');
   assert.deepEqual(errors,[],'no JavaScript errors');
   console.log('PASS touch/journey',name,scenario.width,scenario.layout,version);
  }catch(error){await page.screenshot({path:'artifacts/failure-touch-'+name+'-'+scenario.width+'-'+scenario.layout+'.png',fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close();}
 }}finally{await browser.close();}
}
