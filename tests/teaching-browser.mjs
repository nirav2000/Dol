import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {exerciseTeachingHarness,exerciseTeachingApp} from './teaching-scenarios.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const live=/^https:/.test(base);fs.mkdirSync('artifacts',{recursive:true});
for(const[name,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{for(const viewport of [{width:320,height:568},{width:390,height:844},{width:834,height:1194},{width:1194,height:834}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
  await context.addInitScript(()=>{localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-focus-immersive-opt-in-v2','true');localStorage.setItem('dol-auto-difficulty-v1','false');localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'practice',stage:'foundation',limit:128,sound:false}));});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const label=`${name}-${viewport.width}x${viewport.height}${live?'-live':''}`;
  try{
   if(!live){await page.goto(new URL('tests/teaching-harness.html',base).href);await exerciseTeachingHarness(page,label);}
   await page.goto(base,{waitUntil:'networkidle'});await exerciseTeachingApp(page,label);
   assert.deepEqual(errors,[],`No uncaught exceptions: ${label}`);
   console.log(`PASS teaching ${label}`);
  }catch(error){await page.screenshot({path:`artifacts/teaching-${label}-failure.png`,fullPage:true});throw error;}
  finally{await context.close();}
 }}finally{await browser.close();}
}
console.log('Interactive teaching, score preservation and square-workshop browser checks passed.');
