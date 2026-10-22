import test from 'node:test';
import assert from 'node:assert/strict';
import {whole,pairsFor,primePieces,squareBounds,boundaryExplanation,groupPieces,teachingLesson,assessStep,rootPractice,pairKey,divisionSteps,candidateResult,revealFor} from '../teaching-model.mjs';
test('595: grouping 5 and 7 discovers 35, with partner 17',()=>{
 assert.deepEqual(primePieces(595),[5,7,17]);
 const g=groupPieces([5,7,17],[0,1]);assert.equal(g.a,35);assert.equal(g.b,17);assert.equal(g.key,'17-35');
 assert.deepEqual(pairsFor(595),[[1,595],[5,119],[7,85],[17,35]]);
});
test('reuse actual board work; teach 119 as 70 plus 49, not unexplained division',()=>{
 const l=teachingLesson(595,new Set(['1-595','5-119','7-85']));
 assert.deepEqual(l.steps[0].scope,[]);assert.equal(l.steps[0].type,'intro');
 assert.equal(l.steps.find(s=>s.id==='choose-119').answer,'7');
 assert.equal(l.steps.find(s=>s.id==='remain-119-7').answer,49);
 assert.equal(l.steps.find(s=>s.id==='groups-119-7').answer,7);
 assert.equal(l.steps.find(s=>s.id==='partner-119-7').answer,17);
 assert.ok(!l.steps.some(s=>s.id==='near-595-5'));
 const regroup=l.steps.find(s=>s.type==='group');assert.deepEqual(regroup.scope,['17-35']);assert.ok(assessStep(regroup,[0,1]).correct);
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
  for(const route of ['suggest','regroup','reuse','boundary','search']){
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
