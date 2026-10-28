import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkItems} from '../improvement/check.mjs';
import {factorPairs} from '../logic.mjs';
const expected=JSON.parse(fs.readFileSync('version.json','utf8')).version;
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const viewport of [{width:390,height:844},{width:834,height:1194},{width:1194,height:834}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width!==1194,isMobile:viewport.width===390,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],requests=[];
  const press=async selector=>{const el=typeof selector==='string'?page.locator(selector):selector;await (viewport.width===390||viewport.width===834?el.tap():el.click());};
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('requestfailed',r=>{if(new URL(r.url()).origin===new URL(base).origin)requests.push(r.url()+': '+r.failure()?.errorText)});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  // HTML can render before the module handlers are attached, especially after
  // a fast WebKit reload. Wait for the actual application-ready signal.
  await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
  await page.locator('#startButton').waitFor({state:'visible',timeout:30000});
  assert.equal((await page.locator('.version').textContent()).trim(),'Dol v'+expected);
  assert.equal((await page.locator('footer [data-dol-version]').textContent()).trim(),'Dol v'+expected);
  assert.ok(await page.locator('#startButton').isEnabled());
  const progressNav=page.locator('[data-view="progress"]');
  if(await page.evaluate(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('focus-menu-revealed'))){await press('#menuReveal');assert.equal(await page.locator('#menuReveal').getAttribute('aria-expanded'),'true');}
  await press(progressNav);
  await page.locator('#improvementPanel').waitFor({state:'attached',timeout:30000});
  assert.equal(await page.locator('#improvementDimensions article').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
  await press('#improvementStartCheck');
  await page.locator('#checkStage').selectOption('foundation');
  await press('#checkBegin');
  await page.getByLabel('First check factor').fill('1');
  await press('#checkClose');
  await press('#improvementStartCheck');
  assert.equal(await page.getByLabel('First check factor').inputValue(),'1','Draft survives closing and reopening');
  await press('#checkHint');assert.ok(await page.locator('#checkHintText').isVisible());await press('#checkHint');
  for(const [index,item] of checkItems('foundation',0).entries()){
    if(index<4){for(const [a,b] of factorPairs(item.target)){
      await page.getByLabel('First check factor').fill(String(a));
      await page.getByLabel('Second check factor').fill(String(b));
      await press('.check-entry button');
    }}else await press(page.locator('.check-options button').nth(item.correct));
    await press('#checkNext');
  }
  await press(page.getByRole('button',{name:'Back to my progress'}));
  const checkEvidence=await page.evaluate(()=>{
    const raw=localStorage.getItem('dol-improvement-v1:guest');
    const data=raw?JSON.parse(raw):null;
    return {status:document.querySelector('#evidenceSyncStatus')?.textContent,body:document.querySelector('#checkBody')?.textContent?.slice(0,350),
      chunks:data?Object.values(data.chunks).map(c=>c.events.filter(e=>e.kind==='check')):[],buffer:data?.buffer?.events?.filter(e=>e.kind==='check')||[],
      history:document.querySelector('#improvementCheckHistory')?.textContent};
  });
  console.log('PROGRESS CHECK EVIDENCE',JSON.stringify(checkEvidence));console.log('PAGE ERRORS',JSON.stringify(errors));
  assert.match(await page.locator('#improvementCheckHistory').textContent(),/100% correct submissions/);
  const duplicates=await page.locator('[id]').evaluateAll(els=>{const ids=els.map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
  assert.deepEqual(duplicates,[],'No duplicate element IDs');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
  await page.screenshot({path:'artifacts/progress-'+name.toLowerCase()+'-'+viewport.width+'.png',fullPage:true});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
  await page.locator('#startButton').waitFor({state:'visible'});
  if(await page.evaluate(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('focus-menu-revealed')))await press('#menuReveal');
  await press('[data-view="progress"]');
  await page.locator('#improvementStartCheck').waitFor({state:'visible'});
  assert.match(await page.locator('#improvementCheckHistory').textContent(),/100% correct submissions/,'Completed check survives reload');
  assert.deepEqual(errors,[],'JavaScript errors');assert.deepEqual(requests,[],'Local failed requests');
  console.log('PASS',name,viewport.width,'release, game, progress, layout');await context.close();
 } }finally{await browser.close();}
}
