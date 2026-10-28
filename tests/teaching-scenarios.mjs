import assert from 'node:assert/strict';
export async function exerciseTeachingHarness(page,label){
 const click=async selector=>{const node=page.locator(selector);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await node.tap();else await node.click();};
 const answer=async(value,prefix='coach')=>{await page.locator('#'+prefix+'Answer').fill(String(value));await click('#'+prefix+'Check');};
 const next=()=>click('#coachNext');
 await page.waitForFunction(()=>window.ready);
 await click('#helpToggle');
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([17,35])),0,'Opening help alone is not assistance');
 assert.ok(await page.locator('#coachTry').isVisible());
 assert.equal(await page.locator('#helpToggle').getAttribute('aria-controls'),'strategyHintDialog');
 assert.match(await page.locator('#coachPrompt').innerText(),/3 of 4 factor pairs found; 1 still missing/);
 assert.match(await page.locator('#coachRoutes [data-route="regroup"]').innerText(),/7 × 85/);
 await next();
 assert.match(await page.locator('#coachPrompt').innerText(),/already found 7 × 85/);
 const beforeBlank=await page.evaluate(()=>events.length);
 await click('#coachCheck');assert.equal(await page.evaluate(()=>events.length),beforeBlank);
 await answer(18);assert.match(await page.locator('#coachFeedback').innerText(),/Not quite/);
 await click('#coachNudge');await answer(17);await next();await answer(35);
 assert.match(await page.locator('#coachFeedback').innerText(),/35 × 17 = 595/);
 assert.deepEqual(await page.evaluate(()=>[state.score,state.mistakes,state.found.size]),[218,0,3]);
 assert.ok(await page.evaluate(()=>tutor.assistanceFor([17,35])>0));
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([5,119])),0);
 // The longer prime-piece lesson remains opt-in; quick advice never forces its many steps.
 await click('#coachApproach summary');await click('#coachOtherRoutes [data-route="prime-pieces"]');
 await next();await click('#coachChoices [data-choice="5"]');await next();
 await answer(20);await next();await answer(3);await next();await answer(17);await next();
 await click('[data-piece="0"]');await click('[data-piece="1"]');
 assert.match(await page.locator('#coachGrouping').innerText(),/35 × 17 = 595/);
 await click('#coachCheck');assert.match(await page.locator('#coachFeedback').innerText(),/discovered 35/);
 await page.screenshot({path:'artifacts/teaching-'+label+'-35.png',fullPage:false});
 assert.deepEqual(await page.evaluate(()=>[state.score,state.mistakes,state.found.size]),[218,0,3]);
 await next();await answer(24);assert.match(await page.locator('#coachFeedback').innerText(),/576 < 595 < 625/);
 await click('#coachTry');assert.equal(await page.evaluate(()=>holds),0);
 await page.evaluate(()=>{state.round++;state.target=625;state.found=new Set(['1-625']);state.mode='timed';state.phase='running';tutor.render();});
 await click('#helpToggle');assert.equal(await page.evaluate(()=>state.phase),'paused');
 await click('#coachApproach summary');await click('#coachOtherRoutes [data-route="boundary"]');await answer(24);assert.ok(await page.locator('#coachReveal').isVisible());await answer(25);
 assert.match(await page.locator('#coachFeedback').innerText(),/INCLUDING 25/);await click('#coachTry');assert.equal(await page.evaluate(()=>state.phase),'running');
 await page.evaluate(()=>{state.phase='paused';});await click('#helpToggle');await click('#coachClose');assert.equal(await page.evaluate(()=>state.phase),'paused','Do not resume a user-paused round');
 await page.evaluate(()=>{state.round++;state.target=36;state.found=new Set(['1-36','2-18','3-12']);state.mode='practice';state.phase='running';tutor.render();});
 await click('#helpToggle');await click('#coachRoutes [data-route="search"]');await answer(6);await next();
 assert.equal(await page.locator('[data-candidate]').count(),6);assert.match(await page.locator('#coachSearchCount').innerText(),/3 of 6/);
 for(const[k,choice]of [[4,'yes'],[5,'no']]){await click(`[data-candidate="${k}"]`);await click(`#candidateChoices [data-choice="${choice}"]`);}
 assert.match(await page.locator('#coachSearchCount').innerText(),/5 of 6/);
 await click('[data-candidate="6"]');await click('#candidateChoices [data-choice="yes"]');assert.match(await page.locator('#coachSearchCount').innerText(),/All 6 candidates/);
 await click('#coachTry');
 await page.evaluate(()=>{state.round++;state.target=595;state.found=new Set(['1-595']);tutor.render();});await click('#helpToggle');
 await click('#coachApproach summary');await page.locator('#coachFactor').fill('3');await click('#coachExplore');await click('#coachChoices [data-choice="no"]');
 assert.match(await page.locator('#coachFeedback').innerText(),/not a factor/);assert.equal(await page.evaluate(()=>tutor.assistanceFor([5,119])),0);await click('#coachTry');
 // Six genuine completed pairs, including BOTH 3 × 330 and 6 × 165.
 await page.evaluate(()=>{state.round++;state.target=990;state.found=new Set(['1-990','2-495','3-330','6-165','9-110','22-45']);state.mode='practice';state.phase='running';tutor.render();});
 await click('#helpToggle');
 assert.match(await page.locator('#coachPrompt').innerText(),/6 of 12 factor pairs found; 6 still missing/);
 assert.match(await page.locator('#coachProgress').innerText(),/6 of 12 found/);
 assert.equal(await page.locator('#coachRoutes button[data-route="shortcut"]').count(),1);
 assert.equal(await page.locator('#coachRoutes button[data-route="reuse"]').count(),1);
 assert.equal(await page.locator('#coachRoutes button[data-route="regroup"]').count(),1);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([3,330])),0);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([6,165])),0);
 await click('#coachRoutes [data-route="shortcut"]');
 assert.match(await page.locator('#coachPrompt').innerText(),/divide 990 by 10/);
 await answer(99);
 assert.match(await page.locator('#coachFeedback').innerText(),/10 × 99 = 990/);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([10,99])),1);
 await click('#coachApproach summary');await click('#coachOtherRoutes [data-route="reuse"]');
 assert.match(await page.locator('#coachPrompt').innerText(),/already found 22 × 45/);
 await answer(11);await next();await answer(90);
 assert.match(await page.locator('#coachFeedback').innerText(),/11 × 90 = 990/);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([11,90])),1);
 await click('#coachApproach summary');await click('#coachOtherRoutes [data-route="regroup"]');
 assert.match(await page.locator('#coachPrompt').innerText(),/already found 3 × 330/);
 await answer(33);await next();await answer(30);
 assert.match(await page.locator('#coachFeedback').innerText(),/30 × 33 = 990/);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([30,33])),1);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([3,330])),0);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([6,165])),0);
 assert.deepEqual(await page.evaluate(()=>[state.score,state.mistakes,state.found.size]),[218,0,6]);
 await click('#coachApproach summary');await page.locator('#coachFactor').fill('165');await click('#coachExplore');
 assert.match(await page.locator('#coachPrompt').innerText(),/already found 165 × 6/);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([6,165])),0);
 await click('#coachTry');assert.equal(await page.evaluate(()=>holds),0);
 // Reverse regrouping: the only nontrivial missing pair of 567 is 7 × 81.
 await page.evaluate(()=>{state.round++;state.target=567;state.found=new Set(['3-189','9-63','21-27']);state.mode='practice';state.phase='running';tutor.render();});
 await click('#helpToggle');
 assert.match(await page.locator('#coachPrompt').innerText(),/3 of 5 factor pairs found; 2 still missing/);
 await click('#coachRoutes [data-route="regroup"]');
 assert.match(await page.locator('#coachPrompt').innerText(),/already found 21 × 27/);
 await answer(7);await next();await answer(81);
 assert.match(await page.locator('#coachFeedback').innerText(),/81 × 7 = 567/);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([7,81])),1);
 assert.equal(await page.evaluate(()=>tutor.assistanceFor([21,27])),0);
 assert.equal(await page.evaluate(()=>state.score),218);
 await click('#coachTry');
 await click('#squareReference summary');assert.equal(await page.locator('.square-reference span').count(),100);await click('#squareReference summary');
 await click('#squareStart');
 for(let i=0;i<5;i++){
  if(i===2){await click('#squareReveal');await click('#squareNext');continue;}
  if(i===3){await click('#squareSkip');continue;}
  if(i===1)await click('#squareNudge');
  const prompt=await page.locator('#squarePrompt').innerText();
  const recall=prompt.match(/What is (\d+)/);const target=prompt.match(/bigger than (\d+)/);
  await answer(recall?Number(recall[1])**2:Math.floor(Math.sqrt(Number(target[1]))),'square');await click('#squareNext');
 }
 assert.match(await page.locator('#squareResult').innerText(),/2 first answers correct before extra help; 1 correct after a nudge/);
 assert.match(await page.locator('#squareResult').innerText(),/1 worked examples; 1 skipped/);
 assert.deepEqual(await page.evaluate(()=>[state.score,state.mistakes]),[218,0]);
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('dol-teaching-history-v1')).events.length>0));
 assert.equal(await page.evaluate(()=>holds),0);
 await page.locator('#squareWorkshop').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/teaching-${label}-squares.png`});
}
export async function exerciseTeachingApp(page,label){
 const click=async selector=>{const n=page.locator(selector);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await n.tap();else await n.click();};
 const navigate=async view=>{const menu=page.locator('#menuReveal');if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')!=='true')await click('#menuReveal');await click(`[data-view="${view}"]`);};
 await page.locator('#startButton').waitFor();await click('#startButton');
 const target=Number(await page.locator('#numberValue').innerText()),score=await page.locator('#scoreValue').innerText();
 const viewport=page.viewportSize(),small=viewport.width<=700&&viewport.height<=690;
 const trigger=small?'#mobileEntryStatus':viewport.width<=700?'#roundBarHint':'#helpToggle';
 await click(trigger);await page.locator('#coachHeading').waitFor();
 assert.match(await page.locator('#coachHeading').innerText(),/work it out/);
 await click('#coachNext');
 const expected=await page.evaluate(async number=>(await import('./teaching-model.mjs')).teachingLesson(number,new Set()).steps[1].answer,target);
 await page.locator('#coachAnswer').fill(String(expected));await click('#coachCheck');
 assert.match(await page.locator('#coachFeedback').innerText(),new RegExp(String(target)));
 await click('#coachTry');assert.equal(await page.locator('#scoreValue').innerText(),score);
 assert.equal(await page.locator('#strategyHintDialog').isVisible(),false);
 await navigate('learn');await page.locator('#squareWorkshop').waitFor();assert.match(await page.locator('#squareWorkshop').innerText(),/595/);
 await click('#squareStart');await click('#squareReveal');assert.ok(await page.locator('#squareNext').isVisible());await click('#squareNext');
 await page.screenshot({path:`artifacts/teaching-${label}-app.png`,fullPage:false});
 await navigate('play');assert.equal(await page.locator('#scoreValue').innerText(),score);
}
