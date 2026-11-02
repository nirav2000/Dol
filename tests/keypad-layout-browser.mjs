// Verify the physical calculator keypad layout, real touch entry and unchanged
// bottom-right action key on phone and tablet in both browser engines.
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {testNetwork} from './browser-network.mjs';

const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
const expected=['7','8','9','4','5','6','1','2','3','clear','0','action'];
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
  try{
    for(const scenario of [{width:390,height:844,phone:true},{width:834,height:1194,phone:false}]){
      const viewport={width:scenario.width,height:scenario.height};
      const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,serviceWorkers:'block'});
      await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
      await context.addInitScript(()=>{
        localStorage.setItem('dol-focus-mode-v1','false');
        localStorage.setItem('dol-focus-immersive-opt-in-v2','false');
        localStorage.setItem('dol-tablet-keypad-v1','true');
        localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
        localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'mono'}));
        localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:128,sound:false}));
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
        await page.waitForFunction(()=>document.body.dataset.dolReady==='true',{},{timeout:60000});
        await page.locator('[data-view="settings"]').click();
        await page.locator('#keypadLayoutChoice').selectOption('ttrs');
        await page.locator('[data-view="play"]').click();
        await page.locator('#startButton').click();
        const ttrsKeys=(scenario.phone?await page.locator('#mobileKeypad [data-key]').evaluateAll(xs=>xs.map(x=>x.dataset.key)):await page.locator('.tablet-pad-grid [data-tablet-key]').evaluateAll(xs=>xs.map(x=>x.dataset.tabletKey)));
        assert.deepEqual(ttrsKeys,['1','2','3','4','5','6','7','8','9','clear','0','action']);
        await page.locator('[data-view="settings"]').click();
        await page.locator('#keypadLayoutChoice').selectOption('physical');
        await page.locator('[data-view="play"]').click();
        const root=scenario.phone?'#mobileKeypad':'.tablet-pad-grid';
        const attr=scenario.phone?'data-key':'data-tablet-key';
        const key=k=>page.locator(root+' ['+attr+'="'+k+'"]');
        const positions=await page.locator(root+' > button').evaluateAll(buttons=>buttons.map(b=>{
          const rect=b.getBoundingClientRect();
          return {key:b.dataset.key||b.dataset.tabletKey,x:rect.x,y:rect.y,width:rect.width,height:rect.height};
        }));
        assert.deepEqual(positions.map(p=>p.key),expected,'keypad order follows the standard numeric keypad');
        for(let row=0;row<4;row++){
          const keys=positions.slice(row*3,row*3+3);
          assert.ok(keys.every(p=>p.width>=44&&p.height>=54),'all touch targets remain usable');
          assert.ok(keys[0].x+20<keys[1].x&&keys[1].x+20<keys[2].x,'every row has three left-to-right columns');
          assert.ok(Math.abs(keys[0].y-keys[1].y)<2&&Math.abs(keys[1].y-keys[2].y)<2,'digits share a visual row');
          if(row)assert.ok(keys[0].y>positions[(row-1)*3].y+20,'rows descend from 7-8-9 to 0');
        }
        const field=page.locator(scenario.phone?'#mobileFirst':'.tablet-pad-fields button:first-child');
        const second=page.locator(scenario.phone?'#mobileSecond':'.tablet-pad-fields button:nth-child(2)');
        await key('7').tap();await key('1').tap();await key('9').tap();
        assert.equal(await field.textContent(),'719','tap order is interpreted in the new visual layout');
        await key('clear').tap();
        assert.equal(await field.textContent(),'71','delete still works');
        await key('0').tap();
        assert.equal(await field.textContent(),'710','zero remains bottom-centre');
        await key('action').tap();
        assert.equal(await key('action').getAttribute('aria-label'),'Submit factor pair','bottom-right key still advances between factors');
        await key('1').tap();
        assert.equal(await second.textContent(),'1','second factor accepts touch');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no horizontal overflow');
        assert.deepEqual(errors,[],'no JavaScript errors');
        console.log('PASS standard number pad',engineName,scenario.phone?'phone':'tablet');
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
