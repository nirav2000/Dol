import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {testNetwork} from './browser-network.mjs';
import {factorPairs} from '../logic.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const width of [390,834,1194,1440]){
  const context=await browser.newContext({viewport:{width,height:width===834?1194:900},hasTouch:width!==1440,isMobile:width!==1440,serviceWorkers:'block'});
  await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('dol-focus-mode-v1','false'));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('#improvementPanel',{state:'attached',timeout:30000});
  const version=await page.evaluate(()=>document.body.dataset.dolVersion);assert.equal(version,'2.7.0');
  assert.ok((await page.locator('[data-dol-version]').allTextContents()).every(s=>s==='Dol v'+version));
  await page.locator('[data-view="progress"]').click();assert.equal(await page.locator('#improvementDimensions article').count(),6);
  await page.locator('#improvementStartCheck').click();await page.locator('#checkBegin').click();
  await page.getByLabel('First check factor').fill('1');await page.locator('#checkClose').click();
  await page.locator('#improvementStartCheck').click();assert.equal(await page.getByLabel('First check factor').inputValue(),'1');
  await page.locator('#checkHint').click();assert.ok(await page.locator('#checkHintText').isVisible());await page.locator('#checkHint').click();
  const targets=[12,9,10,17];
  for(let i=0;i<6;i++){
   if(i<4){for(const [a,b] of factorPairs(targets[i])){await page.getByLabel('First check factor').fill(String(a));await page.getByLabel('Second check factor').fill(String(b));await page.locator('.check-entry button').click();}}
   else await page.locator('.check-options button').nth(i===4?1:0).click();
   await page.locator('#checkNext').click();
  }
  await page.getByRole('button',{name:'Back to my progress'}).click();
  assert.match(await page.locator('#improvementCheckHistory').textContent(),/100% correct submissions/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.deepEqual(errors,[]);await context.close();console.log('PASS progress check',name,width);
 }}finally{await browser.close();}
}
