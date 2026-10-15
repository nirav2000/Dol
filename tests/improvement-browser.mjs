import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const width of [390,834,1194]){
  const page=await browser.newPage({viewport:{width,height:width===834?1194:844},hasTouch:true,isMobile:width===390});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#startButton').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(5, 5, 5)');
  assert.equal((await page.locator('.version').textContent()).trim(),'Dol v2.7.2');
  await page.locator('[data-view="progress"]').click();
  await page.locator('#improvementPanel').waitFor({state:'attached',timeout:25000});
  assert.equal(await page.locator('#improvementDimensions article').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
  assert.deepEqual(errors,[]);
  await page.close();console.log(name,width,'startup and progress passed');
 } }finally{await browser.close();}
}
