// Real touchscreen and keyboard baselines with persistence and matched comparison.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});

async function doCheckpoint(page,{withMistake=false}={}){
 for(let step=0;step<35;step++){
  const target=await page.locator('#speedTarget').textContent();
  assert.ok(/^\d{1,3}$/.test(target),'number-copy target is visible');
  await page.waitForTimeout(6);
  const digits=step===5&&withMistake?'0':target;
  if(step===6&&withMistake){
   await page.locator('#speedPad [data-speed-key="9"]').click();
   await page.locator('#speedPad [data-speed-key="clear"]').click();
  }
  for(const digit of digits){
   await page.locator('#speedPad [data-speed-key="'+digit+'"]').click();
  }
  await page.locator('#speedPad [data-speed-key="action"]').click();
 }
 await page.locator('#speedResults').waitFor({state:'visible',timeout:10000});
}
for(const [engineName,engine,viewport] of [
 ['chromium',chromium,{width:390,height:844}],
 ['webkit',webkit,{width:834,height:1194}]
]){
 const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
 try{
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:viewport.width===390,serviceWorkers:'block'});
  await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(new URL('speed-keying.html',base).href,{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(await page.locator('#speedSetup').isVisible(),true);
   await page.locator('#speedMethod').selectOption('touch');
   assert.match(await page.locator('#speedDeviceLabel').textContent(),/touchscreen|Touchscreen/i);
   await page.locator('#speedLayout').selectOption('ttrs');
   await page.locator('#speedTtrs').fill('3.10');
   await page.locator('#speedStart').click();
   const keys=await page.locator('#speedPad button').evaluateAll(buttons=>buttons.map(x=>x.dataset.speedKey));
   assert.deepEqual(keys,['1','2','3','4','5','6','7','8','9','clear','0','action']);
   assert.equal(await page.locator('#speedPhase').textContent(),'WARM-UP · NOT SCORED');
   const last=await page.locator('#speedPad button').last().boundingBox();
   assert.ok(last&&last.width>=50&&last.height>=55,'touch keypad remains practical');
   await doCheckpoint(page,{withMistake:true});
   assert.match(await page.locator('#speedResultSub').textContent(),/ttrs pad/i);
   assert.match(await page.locator('#speedTtrsComparison').textContent(),/3.10s/);
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('dol-speed-keying-checkpoints-v1')||'[]'));
   assert.equal(state.length,1);
   assert.equal(state[0].trials.length,30);
   assert.equal(state[0].summary.correct,29);
   assert.equal(state[0].summary.qualified,true);
   assert.equal(state[0].summary.corrections,1);
   assert.ok(state[0].trials.every(t=>Number.isFinite(t.totalMs)&&t.totalMs>=0));
   assert.ok(state[0].trials.every(t=>t.source==='touch'));
   assert.equal(state[0].ttrsAvgSec,3.10);
   assert.equal(await page.locator('#speedHistory .history-item').count(),1);
   await page.screenshot({path:'artifacts/speed-keying-'+engineName+'-'+viewport.width+'.png',fullPage:true});
   await page.locator('#speedAgain').click();
   await page.locator('#speedStart').click();
   await doCheckpoint(page);
   assert.match(await page.locator('#speedComparisonText').textContent(),/2 matching checkpoints/);
   const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('dol-speed-keying-checkpoints-v1')));
   assert.equal(after.length,2);
   assert.equal(after[1].summary.correct,30);
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(await page.locator('#speedHistory .history-item').count(),2,'history survives reload');
   assert.equal(await page.locator('#speedMethod').inputValue(),'touch','touch method survives reload');
   assert.equal(await page.locator('#speedLayout').isEnabled(),true,'saved touch method leaves the keypad selectable');
   assert.equal(await page.locator('#speedLayout').inputValue(),'ttrs','setting is saved in Dol');
   await page.locator('#speedLayout').selectOption('physical');
   await page.locator('#speedStart').click();
   const physical=await page.locator('#speedPad button').evaluateAll(buttons=>buttons.map(x=>x.dataset.speedKey));
   assert.deepEqual(physical,['7','8','9','4','5','6','1','2','3','clear','0','action']);
   assert.equal(await page.locator('#speedHistory .history-item').count(),2,'switching keypad never changes saved history');
   page.once('dialog',dialog=>dialog.accept());
   await page.locator('#speedCancel').click();
   assert.equal(await page.locator('#speedSetup').isVisible(),true,'cancel avoids saving incomplete checkpoint');
   // Hardware entry remains usable without clicking or tapping an on-screen pad.
   await page.locator('#speedMethod').selectOption('hardware');
   await page.locator('#speedStart').click();
   assert.equal(await page.locator('#speedPad').isVisible(),false,'physical keyboard mode hides the touch keys');
   const warmup=await page.locator('#speedTarget').textContent();
   await page.keyboard.type(warmup);
   assert.equal(await page.locator('#speedTyped').textContent(),warmup);
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#speedCounter').textContent(),'2 of 5');
   page.once('dialog',dialog=>dialog.accept());
   await page.locator('#speedCancel').click();
   assert.equal(await page.locator('#speedSetup').isVisible(),true);
   assert.equal(await page.locator('#speedHistory .history-item').count(),2,'partial hardware test is not saved');
   assert.deepEqual(errors,[],'no browser errors');
   console.log('PASS speed keying baseline',engineName,viewport.width);
  }finally{await context.close();}
 }finally{await browser.close();}
}
