// Replay archived animation source CSS, at both the original and a current
// revision. Never require historical application code or Firebase credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,webkit} from 'playwright';
const base=process.env.DOL_BASE_URL||'http://127.0.0.1:8000/';
fs.mkdirSync('artifacts',{recursive:true});
const live=base.startsWith('https:');
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});
 try{
  for(const viewport of [{width:390,height:844},{width:1100,height:900}]){
   const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:true,serviceWorkers:'block'});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   try{
    await page.goto(new URL('animation-history.html',base).href,{waitUntil:'domcontentloaded',timeout:55000});
    await page.waitForFunction(()=>document.querySelectorAll('.version-card').length===4,{},{timeout:30000});
    const stats=await page.locator('#historyStats').textContent();
    const archive=await page.evaluate(()=>fetch('./animation-history-data/history.json',{cache:'no-store'}).then(r=>r.json()));
    assert.ok(archive.totalCommits>200,'full Git commit audit, not a selected list: '+archive.totalCommits);
    assert.ok(archive.totalVersions>25,'all version records present: '+archive.totalVersions);
    assert.ok(archive.totalAnimationSignatures>=6,'preserved materially different animation states');
    assert.match(stats,/\d+ Git commits analysed/);
    assert.ok(archive.versions.some(x=>x.version==='2.5.10'));
    assert.ok(archive.commits.some(x=>x.sha.startsWith('ee3c99b8')&&x.kind==='number-type'));
    const servedVersion=await page.evaluate(()=>fetch('./version.json').then(r=>r.json()).then(x=>x.version));
    assert.equal(archive.release,servedVersion,'archive follows the exact deployed app version');
    const c2510=page.locator('.version-card').filter({hasText:'Dol v2.5.10'}),c2511=page.locator('.version-card').filter({hasText:'Dol v2.5.11'});
    assert.equal(await c2510.count(),1,'historical Prime Lab visible by default');
    assert.equal(await c2511.count(),1,'original in-game Rainbow Ribbon shown by default');
    const lframe=c2510.locator('iframe').contentFrame();
    await lframe.locator('.card.rainbow.playing .outline').waitFor({state:'attached'});
    assert.match(await lframe.locator('.card.rainbow.playing .outline').evaluate(e=>getComputedStyle(e).animationName),/outlinePulse/,
      'original v2.5.10 Rainbow Ribbon keyframes run unmodified');
    assert.equal(await lframe.locator('.card.rainbow .star').count(),9,'original Lab has nine colour stars');
    const oldFrame=c2511.locator('iframe').contentFrame();
    await oldFrame.locator('.review-pair.prime-rainbow-celebration').waitFor({state:'attached'});
    assert.equal(await oldFrame.locator('.prime-star').count(),8,'original v2.5.11 has eight historical star locations');
    assert.match(await oldFrame.locator('.review-pair.prime-rainbow-celebration').evaluate(e=>getComputedStyle(e).animationName),/dolPrimeBorder/);
    const labVariant=c2510.locator('select');await labVariant.selectOption('gem-flip');
    await lframe.locator('.card.gem-flip.playing .tile').waitFor({state:'attached'});
    assert.match(await lframe.locator('.card.gem-flip.playing .tile').evaluate(e=>getComputedStyle(e).animationName),/geminiSmoothFlip/);
    await labVariant.selectOption('rainbow');
    await page.locator('#eventSelect').selectOption('square');
    const modern=page.locator('.version-card').last(),modernFrame=modern.locator('iframe').contentFrame();
    await modernFrame.locator('.square-bloom-label').waitFor({state:'attached'});
    assert.equal(await modernFrame.locator('.square-bloom-label').textContent(),'7 × 7 = 49');
    assert.match(await modernFrame.locator('.square-bloom').evaluate(e=>getComputedStyle(e).animationName),/dolSquareBloom/);
    await page.locator('#eventSelect').selectOption('correct');
    await modernFrame.locator('.number-celebration--correct').waitFor({state:'attached'});
    assert.match(await modernFrame.locator('.number-celebration--correct').evaluate(e=>getComputedStyle(e).animationName),/numberCelebrate/);
    await page.locator('#eventSelect').selectOption('prime');
    await modernFrame.locator('.prime-ribbon').waitFor({state:'attached'});
    assert.equal(await modernFrame.locator('.prime-ribbon .prime-star').count(),8);
    // Every single commit, including a version with no animation change, is
    // selectable independently. No app sessions or Firebase script in frames.
    await page.locator('input[value="commits"]').check();
    await page.locator('#historySearch').fill('ee3c99b8');
    await page.locator('.history-row').first().click();
    assert.match(await page.locator('.version-card').last().textContent(),/Number-type factor-card celebrations/);
    const previewSrc=await page.locator('.version-card').last().locator('iframe').getAttribute('srcdoc');
    assert.ok(!/firebase|importScripts\(/i.test(previewSrc||''),'no archived app auth scripts are executed');
    await page.locator('#historySearch').fill('');
    await page.locator('#changesOnly').check();
    const filtered=await page.locator('.history-row').count();
    await page.locator('#changesOnly').uncheck();
    assert.ok((await page.locator('.history-row').count())>filtered,'unchanged commits are available too');
    await page.locator('#restoreDefaults').click();
    await page.locator('#replayAll').click();
    assert.equal(await page.locator('.version-card').count(),4);
    assert.deepEqual(errors,[],'no animation preview JavaScript errors');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'no horizontal overflow');
    await page.screenshot({path:'artifacts/animation-history-'+name+'-'+viewport.width+'.png',fullPage:true});
    console.log('PASS historical animation lab',name,viewport.width,archive.totalCommits,'commits',archive.totalVersions,'versions');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
