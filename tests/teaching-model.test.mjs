import test from 'node:test';
import assert from 'node:assert/strict';
import {whole,pairsFor,primePieces,squareBounds,boundaryExplanation,groupPieces,teachingLesson,assessStep,rootPractice,pairKey,divisionSteps,candidateResult,revealFor} from '../teaching-model.mjs';
test('595: grouping 5 and 7 discovers 35, with partner 17',()=>{
 assert.deepEqual(primePieces(595),[5,7,17]);
 const g=groupPieces([5,7,17],[0,1]);assert.equal(g.a,35);assert.equal(g.b,17);assert.equal(g.key,'17-35');
 assert.deepEqual(pairsFor(595),[[1,595],[5,119],[7,85],[17,35]]);
});
test('595 quickly builds 35 × 17 from an existing pair and retains deep optional teaching',()=>{
 const found=new Set(['1-595','5-119','7-85']), lesson=teachingLesson(595,found);
 assert.deepEqual(lesson.steps.slice(1).map(s=>s.answer),[17,35]);
 assert.match(lesson.steps[1].prompt,/already found 7 × 85/);
 assert.match(lesson.steps[2].feedback,/35 × 17 = 595/);
 assert.ok(lesson.steps.slice(1).every(s=>s.scope[0]==='17-35'));
 const deep=teachingLesson(595,found,{route:'prime-pieces'});
 assert.equal(deep.steps[1].type,'info');
 assert.equal(deep.steps.find(s=>s.id==='choose-85').answer,'5');
 assert.equal(deep.steps.find(s=>s.id==='near-85-5').answer,20);
 assert.equal(deep.steps.find(s=>s.id==='adjust-85-5').answer,3);
 assert.equal(deep.steps.find(s=>s.id==='partner-85-5').answer,17);
 const regroup=deep.steps.find(s=>s.type==='group');
 assert.deepEqual(regroup.scope,['17-35']);
 assert.ok(assessStep(regroup,[0,1]).correct);
});
test('595 divided by 5 uses 600 divided by 5 minus one group',()=>{
 const steps=divisionSteps(595,5);assert.deepEqual(steps.map(s=>s.answer),[120,1,119]);
 assert.match(steps[0].prompt,/600/);assert.match(steps[1].prompt,/5 less/);
});
test('inclusive square boundaries for all supported targets',()=>{
 for(let n=1;n<=1024;n++){
  const b=squareBounds(n);assert.ok(b.limit*b.limit<=n);assert.ok((b.limit+1)**2>n);
  for(const[a,c]of pairsFor(n)){assert.ok(a<=b.limit);assert.equal(a*c,n);}
 }
 for(const[n,k]of [[1,1],[35,5],[36,6],[37,6],[595,24],[625,25],[1024,32]])assert.equal(squareBounds(n).limit,k);
 assert.match(boundaryExplanation(36),/INCLUDING 6/);assert.match(boundaryExplanation(595),/576 < 595 < 625/);
});
test('every generated step is solvable and exposures name real pairs',()=>{
 for(let n=1;n<=1024;n++)for(const known of [new Set(),new Set([pairKey(1,n)]),new Set(pairsFor(n).map(([a,b])=>pairKey(a,b)))]){
  const valid=new Set(pairsFor(n).map(([a,b])=>pairKey(a,b)));
  for(const route of ['suggest','shortcut','regroup','reuse','prime-pieces','boundary','search']){
   const l=teachingLesson(n,known,{route});
   for(const s of l.steps){
    for(const key of s.scope)assert.ok(valid.has(key),`${n}/${s.id}/${key}`);
    if(['number','choice'].includes(s.type))assert.ok(assessStep(s,String(s.answer)).correct,`${n}/${route}/${s.id}`);
    if(s.type==='choice')assert.ok(s.choices.includes(s.answer));
    if(s.type==='group')assert.match(revealFor(s),/discovered/);
   }
  }
 }
});
test('candidate exploration tests divisibility correctly, including candidates above target',()=>{
 for(let n=1;n<=1024;n++)for(const k of [1,2,3,5,7,11,32,1024]){
  const c=candidateResult(n,k);assert.equal(c.divides,n%k===0);assert.equal(c.quotient*k+c.remainder,n);
 }
 const l=teachingLesson(595,new Set(['1-595']),{candidate:3});assert.equal(l.steps[1].answer,'no');assert.deepEqual(l.steps[1].scope,[]);
});
test('repeated primes are distinct tokens; reversed or duplicate pairs are not new',()=>{
 assert.equal(groupPieces([2,2,3],[0,1]).a,4);assert.equal(groupPieces([2,2,3],[0,2]).a,6);
 const s={type:'group',pieces:[2,2,3],found:['2-6']};assert.ok(assessStep(s,[0,2]).duplicate);assert.ok(assessStep(s,[0,1]).correct);
 assert.equal(assessStep(s,[]).valid,false);assert.throws(()=>groupPieces([2,2,3],[0,0]));assert.throws(()=>groupPieces([2],[1]));
});
test('blank and malformed numeric answers are not marked attempts',()=>{
 const q=rootPractice(0,12,()=>0.5);for(const bad of ['',null,' ','2.5','-2','hello'])assert.equal(assessStep(q,bad).valid,false);
 for(const bad of [0,-1,1025,NaN,Infinity,1.5])assert.throws(()=>whole(bad));
});
test('practice covers foundations, extended squares, and maximum 1024',()=>{
 for(const b of [12,20,32]){assert.equal(rootPractice(0,b,()=>0).answer,1);assert.equal(rootPractice(0,b,()=>0.999999).answer,b*b);}
});

test('990: six found pairs, six missing; fast, balancing and regrouping aim at distinct unknowns',()=>{
 const found=new Set(['1-990','2-495','3-330','6-165','9-110','22-45']);
 const quick=teachingLesson(990,found), balanced=teachingLesson(990,found,{route:'reuse'});
 const regroup=teachingLesson(990,found,{route:'regroup'});
 assert.deepEqual(quick.board,{total:12,known:6,missing:6});
 assert.match(quick.steps[0].prompt,/6 of 12 factor pairs found; 6 still missing/);
 assert.deepEqual(quick.steps.slice(1).map(s=>s.answer),[99]);
 assert.deepEqual(quick.steps[1].scope,['10-99']);
 assert.match(quick.steps[1].feedback,/10 × 99 = 990/);
 assert.deepEqual(balanced.steps.slice(1).map(s=>s.answer),[11,90]);
 assert.deepEqual(balanced.steps[2].scope,['11-90']);
 assert.match(balanced.steps[1].prompt,/already found 22 × 45/);
 assert.deepEqual(regroup.steps.slice(1).map(s=>s.answer),[33,30]);
 assert.deepEqual(regroup.steps[2].scope,['30-33']);
 assert.match(regroup.steps[1].prompt,/already found 3 × 330/);
 assert.deepEqual(quick.choices.map(s=>s.goalKey),['10-99','11-90','30-33']);
 const knownCandidate=teachingLesson(990,found,{candidate:165});
 assert.equal(knownCandidate.steps[1].title,'Already on your board');
 assert.ok(knownCandidate.steps.slice(1).every(s=>s.id!=='partner-990-165'));
 const all=teachingLesson(990,new Set(pairsFor(990).map(pair=>pairKey(...pair))));
 assert.equal(all.board.missing,0);
 assert.ok(all.choices.length===0);
});

test('567 uses reverse regrouping while keeping the known 21 x 27 pair untouched',()=>{
 const found=new Set(['3-189','9-63','21-27']);
 const lesson=teachingLesson(567,found,{route:'regroup'});
 assert.deepEqual(lesson.steps.slice(1).map(s=>s.answer),[7,81]);
 assert.match(lesson.steps[1].prompt,/already found 21 × 27/);
 assert.match(lesson.steps[1].prompt,/Split 21 into groups of 3/);
 assert.match(lesson.steps[2].feedback,/81 × 7 = 567/);
 assert.deepEqual(lesson.steps[1].scope,['7-81']);
 assert.deepEqual(lesson.steps[2].scope,['7-81']);
});
