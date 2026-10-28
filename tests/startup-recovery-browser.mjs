import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
    let refused=false;
    await context.route('**/board-aware-help.mjs*',route=>{
      if(!refused){refused=true;return route.fulfill({status:503,contentType:'text/plain',body:'Temporary module outage'});}
      return route.continue();
    });
    await context.addInitScript(()=>localStorage.setItem('dol-startup-check-data','retained'));
    const page=await context.newPage(),navigations=[];
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
    try{
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:45000});
      assert.ok(refused,'fixture interrupted the first module fetch with HTTP 503');
      assert.ok(navigations.length>=2,'startup automatically reloaded after failed module import');
      assert.equal(await page.locator('#dolStartupRecovery').count(),0,'no recovery banner remains after successful restart');
      assert.equal(await page.evaluate(()=>localStorage.getItem('dol-startup-check-data')),'retained','user progress is not touched during recovery');
      assert.equal(await page.locator('[data-view="learn"]').isVisible(),true,'normal learning navigation is restored');
      console.log('PASS startup recovery',name,navigations.length);
    }finally{await context.close();}
  }finally{await browser.close();}
}
