/* Regression for the original Oct 13 Prime Rainbow Ribbon, square-number
   geometry, successful factor rewards, and uninterrupted Focus viewport.
   A passing generic animation smoke test is not enough. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
import {chooseAdaptiveNumber} from '../adaptive.mjs';
import {testNetwork} from './browser-network.mjs';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
function seedFor(target,stage='foundation',limit=24){
  const pick=n=>chooseAdaptiveNumber({stage,limit,random:()=>n});
  let lo=0,hi=1;
  for(let k=0;k<28;k++){
    const middle=(lo+hi)/2;
    if(pick(middle)<target)lo=middle;else hi=middle;
  }
  const start=hi;
  lo=hi;hi=1;
  for(let k=0;k<28;k++){
    const middle=(lo+hi)/2;
    if(pick(middle)<=target)lo=middle;else hi=middle;
  }
  const seed=(start+hi)/2;
  assert.equal(pick(seed),target,'target '+target+' is eligible');
  return seed;
}
const cases=[
 {name:'prime',target:13,seed:seedFor(13),pairs:[[1,13]]},
 {name:'square',target:16,seed:seedFor(16),pairs:[[1,16],[2,8],[4,4]]},
 {name:'large-board',target:288,seed:seedFor(288,'strategic',512),
  pairs:[[1,288],[2,144],[4,72],[8,36],[16,18],[9,32]]}
];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
 try{
  for(const c of cases){
   const context=await browser.newContext({
     viewport:{width:390,height:844},isMobile:true,hasTouch:true,
     serviceWorkers:'block',reducedMotion:'no-preference'
   });
   await testNetwork(context,{base,apps:process.env.APPS_CHECKOUT||'Apps-shared'});
   await context.addInitScript(({seed,c})=>{
     Math.random=()=>seed;
     localStorage.setItem('dol-focus-immersive-opt-in-v2','true');
     localStorage.setItem('dol-focus-mode-v1','true');
     localStorage.setItem('dol-auto-difficulty-v1','false');
     localStorage.setItem('dol-round-tools-v1',JSON.stringify({autoNext:false}));
     localStorage.setItem('dol-layout-preferences-v1',JSON.stringify({layout:'pairboard',palette:'mono'}));
     localStorage.setItem('dol-learning-settings-v2',JSON.stringify({
       mode:c.name==='large-board'?'timed':'guided',
       stage:c.name==='large-board'?'strategic':'foundation',
       limit:c.name==='large-board'?512:24,
       duration:90,showCount:true,sound:false
     }));
   },{seed:c.seed,c:{name:c.name}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body?.dataset.dolReady==='true',{},{timeout:55000});
    await page.locator('#startButton').tap();
    assert.equal(Number(await page.locator('#numberValue').textContent()),c.target);
    const submit=async ([a,b])=>page.evaluate(([a,b])=>{
      document.getElementById('pairInput').value=a+'x'+b;
      document.getElementById('answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    },[a,b]);
    await submit(c.pairs[0]);
    if(c.name==='prime'){
      assert.equal(await page.locator('#playView .number-tile .prime-ribbon .prime-bubble').textContent(),'✦ PRIME');
      assert.match(await page.locator('#playView .number-tile .prime-ribbon').evaluate(e=>getComputedStyle(e,'::before').animationName),/dolPrimeBorder/);
      assert.ok(await page.locator('#layoutPairGrid .review-pair.credited .number-celebration--prime').count()>0,
        'prime review tile must retain full celebration after render');
    }else{
      assert.ok(await page.locator('#layoutPairGrid .layout-pair-chip .number-celebration--correct').count()>0,
        'each correct pair gets a visible, animated outline and sparks');
      assert.match(await page.locator('#layoutPairGrid .number-celebration--correct').first().evaluate(e=>getComputedStyle(e).animationName),/numberCelebrate/);
      for(const pair of c.pairs.slice(1))await submit(pair);
      if(c.name==='square'){
        assert.equal(await page.locator('#playView .number-tile .square-bloom-label').textContent(),'4 × 4 = 16');
        assert.equal(await page.locator('#playView .number-tile .square-bloom-cells i').count(),4,
          'square celebration must reveal a recognisable geometric square');
        assert.match(await page.locator('.square-bloom').evaluate(e=>getComputedStyle(e).animationName),/dolSquareBloom/);
        assert.ok(await page.locator('#layoutPairGrid .review-pair .number-celebration--square').count()>0);
      }else{
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const geometry=await page.evaluate(()=>{
          const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
          const board=document.getElementById('layoutPairBoard');
          return {target:rect('.number-tile'),timer:rect('.timer-line'),board:rect('#layoutPairBoard'),
            keypad:rect('#mobileEntry'),scrollHeight:board.scrollHeight,clientHeight:board.clientHeight,
            scrollY:scrollY};
        });
        assert.ok(geometry.target.bottom<=geometry.timer.top+2,'timer is below visible target: '+JSON.stringify(geometry));
        assert.ok(geometry.timer.bottom<=geometry.board.top+3,'timer is above growing factor board: '+JSON.stringify(geometry));
        assert.ok(geometry.board.bottom<=geometry.keypad.top+10,'board does not run behind keypad: '+JSON.stringify(geometry));
        assert.ok(geometry.scrollHeight>geometry.clientHeight+20,'nine-pair board scrolls internally: '+JSON.stringify(geometry));
        await page.evaluate(()=>{
          const board=document.getElementById('layoutPairBoard');
          board.scrollTop=board.scrollHeight;
        });
        const scrolled=await page.evaluate(()=>({
          scrollY,boardScroll:document.getElementById('layoutPairBoard').scrollTop,
          targetTop:document.querySelector('.number-tile').getBoundingClientRect().top,
          timerTop:document.querySelector('.timer-line').getBoundingClientRect().top
        }));
        assert.ok(scrolled.boardScroll>0,'learner can scroll the factor list separately');
        assert.ok(Math.abs(scrolled.targetTop-geometry.target.top)<=2&&Math.abs(scrolled.timerTop-geometry.timer.top)<=2,
          'scrolling the board never loses target or timer');
        await page.locator('#finishButton').tap();
        const footer=await page.locator('#mobileEntry').evaluate(el=>({
          color:getComputedStyle(el,'::before').backgroundColor,
          label:getComputedStyle(el,'::after').content,
          bottom:parseFloat(getComputedStyle(el,'::before').bottom)
        }));
        assert.notEqual(footer.color,'rgba(0, 0, 0, 0)','review Next must have an opaque footer');
        assert.ok(footer.label.includes('6 / 9'),'footer keeps round summary visible');
        const next=await page.locator('#mobileKeypad [data-key="action"]').boundingBox();
        assert.ok(next&&next.y>=0&&next.y+next.height<=844,'Next stays visible, away from review text');
      }
    }
    await page.screenshot({path:'artifacts/celebration-'+name+'-'+c.name+'.png'});
    assert.deepEqual(errors,[],'no runtime errors during '+c.name);
    console.log('PASS celebration regression',name,c.name,c.target);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
