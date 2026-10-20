import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:568}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
  await context.addInitScript(()=>{localStorage.setItem('dol-focus-mode-v1','true');localStorage.setItem('dol-auto-difficulty-v1','false');localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'practice',stage:'expert',limit:1024,sound:false}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.locator('#startButton').click();
  assert.equal(await page.locator('#helpSection').isVisible(),false);
  const help=page.locator('#helpToggle');assert.equal(await help.isVisible(),true);
  if(viewport.width<500){
   const b=await help.boundingBox();if(!(b&&b.y>=0&&b.y+b.height<=viewport.height)){console.error('Hint geometry',JSON.stringify({viewport,b,computed:await help.evaluate(el=>({position:getComputedStyle(el).position,display:getComputedStyle(el).display,bottom:getComputedStyle(el).bottom,offsetParent:el.offsetParent?.className,rect:el.getBoundingClientRect().toJSON()}))}));}assert.ok(b&&b.y>=0&&b.y+b.height<=viewport.height,'Hint reachable on small phone');
   const keypad=await page.locator('#mobileKeypad [data-key="action"]').boundingBox();assert.ok(keypad&&b.y>=keypad.y+keypad.height,'Hint stays below keypad');
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
