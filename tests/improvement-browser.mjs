import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const expected=JSON.parse(fs.readFileSync('version.json','utf8')).version;
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const viewport of [{width:390,height:844},{width:834,height:1194},{width:1194,height:834}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width!==1194,isMobile:viewport.width===390,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('requestfailed',r=>{if(new URL(r.url()).origin===new URL(base).origin)requests.push(r.url()+': '+r.failure()?.errorText)});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#startButton').waitFor({state:'visible',timeout:30000});
  assert.equal((await page.locator('.version').textContent()).trim(),'Dol v'+expected);
  assert.equal((await page.locator('footer [data-dol-version]').textContent()).trim(),'Dol v'+expected);
  assert.ok(await page.locator('#startButton').isEnabled());
  const progressNav=page.locator('[data-view="progress"]');
  if(!(await progressNav.isVisible())){await page.locator('#menuReveal').click();assert.equal(await page.locator('#menuReveal').getAttribute('aria-expanded'),'true');}
  await progressNav.click();
  await page.locator('#improvementPanel').waitFor({state:'attached',timeout:30000});
  assert.equal(await page.locator('#improvementDimensions article').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
  await page.screenshot({path:'artifacts/progress-'+name.toLowerCase()+'-'+viewport.width+'.png',fullPage:true});
  assert.deepEqual(errors,[],'JavaScript errors');assert.deepEqual(requests,[],'Local failed requests');
  console.log('PASS',name,viewport.width,'release, game, progress, layout');await context.close();
 } }finally{await browser.close();}
}
