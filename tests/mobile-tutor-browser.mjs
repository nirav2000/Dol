import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {testNetwork} from './browser-network.mjs';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});

const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,args:engineName==='chromium'?['--no-sandbox']:[]});
  try{
    for(const viewport of [{width:390,height:844},{width:834,height:1194}]){
      const phone=viewport.width===390;
      const context=await browser.newContext({viewport,hasTouch:true,isMobile:phone,serviceWorkers:'block'});
      await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
      await context.addInitScript(()=>{
        localStorage.setItem('dol-focus-mode-v1','true'); // Old default-on must not hide the new tutor.
        localStorage.setItem('dol-adaptive-level-v1',JSON.stringify(0));
        localStorage.setItem('dol-number-history-v2',JSON.stringify({600:{correct:2,attempts:2},840:{correct:1,attempts:1}}));
        localStorage.setItem('dol-learning-settings-v2',JSON.stringify({mode:'guided',stage:'foundation',limit:128,showCount:true,sound:false}));
        localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
      });
      const page=await context.newPage(),errors=[],networkErrors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('requestfailed',r=>networkErrors.push(r.url()+' '+r.failure()?.errorText));
      page.on('console',m=>{if(m.type()==='error')networkErrors.push('console: '+m.text());});
      try{
        const isReady=()=>page.waitForFunction(()=>document.body.dataset.dolReady==='true',{},{timeout:18000});
        await page.goto(base,{waitUntil:'networkidle',timeout:60000});
        try{await isReady();}
        catch(firstError){
          const diagnostics=await page.evaluate(()=>({
            ready:document.body?.dataset.dolReady,mode:document.readyState,
            scripts:[...document.querySelectorAll('script[src]')].map(e=>e.src),
            loaded:!!document.querySelector('#roundCoachPanel')
          })).catch(e=>({error:String(e)}));
          console.warn('Cold-start recovery: app not ready on first navigation',engineName,viewport.width,JSON.stringify({diagnostics,errors,networkErrors:networkErrors.slice(-12)}));
          // WebKit may lose a third-party module on a cold cache. A single real page
          // reload mirrors how a user refreshes; a persistent load failure remains fatal.
          await page.reload({waitUntil:'networkidle',timeout:60000});
          await isReady();
        }
        assert.equal(await page.evaluate(()=>document.body.classList.contains('focus-mode')),false,'immersive Focus must be opt-in on upgrade');
        assert.equal(await page.locator('[data-view="learn"]').isVisible(),true,'mobile Learn navigation remains available');
        assert.equal(await page.locator('#adaptiveExplanation').count(),1);
        await page.locator('#startButton').click();
        const n=Number(await page.locator('#numberValue').textContent());
        assert.ok(n>=256,'resume at expert challenge; got '+n);
        assert.equal(await page.locator(phone?'#roundLearningBar':'#roundCoachPanel').isVisible(),true,'the appropriate compact-phone or tablet maths tutor is shown during play');
        await page.screenshot({path:'artifacts/mobile-tutor-'+engineName+'-'+viewport.width+'.png',fullPage:true});
        assert.match(await page.locator('#roundCoachBoundary').textContent(),/Search boundary: /);
        await page.locator(phone?'#roundBarHint':'#roundCoachHint').click();
        assert.equal(await page.locator('#strategyHintDialog').isVisible(),true,'interactive steps open from the round');
        await page.locator('#coachTry').click();
        assert.equal(await page.locator('#strategyHintDialog').isVisible(),false);
        const before=Number(await page.locator('#scoreValue').textContent());
        await page.evaluate(()=>{
          document.querySelector('#pairInput').value='1x'+document.querySelector('#numberValue').textContent.trim();
          document.querySelector('#answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        });
        assert.equal(Number(await page.locator('#scoreValue').textContent()),before+1);
        assert.match(await page.locator('#roundCoachCount').textContent(),/1 of /);
        assert.ok(await page.locator('.pair-discovery').count()>0,'correct pair receives an animation without waiting for full round');
        await page.locator(phone?'#roundBarRainbow':'#roundCoachRainbow').click();
        assert.ok(await page.locator('#roundVisuals .factor-arc').count()>0,'rainbow arcs show found pairs');
        await page.locator(phone?'#roundBarArray':'#roundCoachArray').click();
        assert.equal(await page.locator('#roundVisuals .array-svg').count(),1,'live array demonstration opens');
        assert.equal(Number(await page.locator('#scoreValue').textContent()),before+1,'learning visuals do not award game points');
        await page.locator('#finishButton').click();
        assert.equal(await page.locator('#roundMathReflection').isVisible(),true);
        assert.match(await page.locator('#roundMathInsight').textContent(),/To prove the list is complete/);
        await page.locator('#roundMathExplore').click();
        assert.ok(await page.locator('#roundVisuals .factor-arc').count()>0,'completed rainbow opens from round review');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no horizontal page overflow');
        assert.deepEqual(errors,[],'no JavaScript exceptions');
        console.log('PASS guided mobile',engineName,viewport.width,n);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
