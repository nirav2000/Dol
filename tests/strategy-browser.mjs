import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:568}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
  await context.addInitScript(()=>{localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-focus-immersive-opt-in-v2','true');localStorage.setItem('dol-auto-difficulty-v1','false');localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'practice',stage:'expert',limit:1024,sound:false}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.locator('#startButton').click();
  assert.equal(await page.locator('#helpSection').isVisible(),false);
  const phone=viewport.width<500;
  const help=page.locator(phone?'#roundBarHint':'#helpToggle');
  assert.equal(await help.isVisible(),true,'interactive help is accessible');
  if(phone){
    assert.equal(await page.locator('#helpToggle').isVisible(),false,'legacy floating Hint cannot block the keypad');
    // Tiny screens require scrolling the compact teaching toolbar ABOVE the dock.
    if(viewport.height<=690)await help.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
    const b=await help.boundingBox();
    assert.ok(b&&b.height>=30,'real teaching control has a usable touch target');
  }
  await help.click();assert.equal(await page.locator('#strategyHintDialog').isVisible(),true);
  await page.locator('#coachNext').click();await page.locator('#coachTry').click();assert.equal(await page.locator('#strategyHintDialog').isVisible(),false);
  await page.locator('#finishButton').click();
  if(viewport.width<500){const action=page.locator('#mobileKeypad [data-key="action"]');assert.equal(await action.getAttribute('aria-label'),'Next question');await action.click();}
  else await page.locator('#startButton').click();
  await page.locator('#finishButton').click();
  await page.locator('#menuReveal').dispatchEvent('click');await page.locator('[data-view="learn"]').dispatchEvent('click');await page.locator('#techniqueStart').click();
  assert.equal(await page.locator('#strategyView').isVisible(),true);
  for(let i=0;i<5;i++){
   await page.locator('#strategyOptions button').first().click();
   if(await page.locator('#strategyNext').isVisible())await page.locator('#strategyNext').click();
   else await page.locator('#strategySkip').click();
  }
  assert.equal(await page.locator('#strategyResult').isVisible(),true);
  await page.locator('#strategyExit').click();assert.equal(await page.locator('#playView').isVisible(),true);
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
console.log('Strategy browser smoke passed');
