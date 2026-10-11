import test from 'node:test';
import assert from 'node:assert/strict';
import {pairsOf,pairKey,reviewScore,rainbowModel,arrayModel,createAutoAdvance} from '../round-model.mjs';
test('review changes recalculate rather than accumulating bonus',()=>{
 const pairs=pairsOf(112),s=new Set();
 assert.deepEqual(reviewScore(pairs,s),{count:0,total:5,bonus:0,points:0});
 pairs.forEach(([a,b])=>s.add(pairKey(a,b)));
 assert.equal(reviewScore(pairs,s).points,7);
 for(let i=0;i<20;i++){s.delete('8-14');assert.equal(reviewScore(pairs,s).points,4);s.add('8-14');assert.equal(reviewScore(pairs,s).points,7);}
 assert.equal(reviewScore(pairs,new Set(['7-16','7-16','9-12'])).points,1);
});
test('rainbow square middle and prime endpoints have no duplicate factors',()=>{
 assert.deepEqual(rainbowModel(36).factors,[1,2,3,4,6,9,12,18,36]);
 assert.equal(rainbowModel(36).pairs.filter(([a,b])=>a===b).length,1);
 assert.deepEqual(rainbowModel(13).factors,[1,13]);assert.deepEqual(rainbowModel(1).factors,[1]);
});
test('arrays account for every counter, including remainders and large targets',()=>{
 assert.deepEqual(arrayModel(112,3),{n:112,rows:3,columns:37,remainder:1,used:111,exact:false});
 assert.deepEqual(arrayModel(112,7),{n:112,rows:7,columns:16,remainder:0,used:112,exact:true});
 for(let n=1;n<=1024;n++)for(const rows of [1,2,3,7,32,1024]){
   const m=arrayModel(n,rows);assert.equal(m.used+m.remainder,n);assert.equal(m.exact,n%rows===0);
 }
 assert.throws(()=>arrayModel(112,0));assert.throws(()=>rainbowModel(0));
});
function fakeClock(){let time=0,id=0;const jobs=new Map();return {now:()=>time,setIntervalFn:fn=>{jobs.set(++id,fn);return id;},clearIntervalFn:id=>jobs.delete(id),advance:ms=>{time+=ms;[...jobs.values()].forEach(fn=>fn());}};}
test('auto-next fires once and manual next cancels it',()=>{
 const clock=fakeClock();let calls=0;const t=createAutoAdvance({...clock,onNext:()=>calls++});
 t.arm(5000);clock.advance(4900);assert.equal(calls,0);clock.advance(100);clock.advance(90000);assert.equal(calls,1);
 t.arm(5000);clock.advance(2000);t.cancel();clock.advance(99999);assert.equal(calls,1);
});
test('hidden, page and review holds preserve the remaining countdown',()=>{
 const clock=fakeClock();let calls=0;const t=createAutoAdvance({...clock,onNext:()=>calls++});
 t.arm(8000);clock.advance(3000);t.hold('hidden');t.hold('review');clock.advance(600000);assert.equal(calls,0);
 t.release('hidden');clock.advance(20000);assert.equal(calls,0);assert.equal(t.snapshot().remainingMs,5000);
 t.release('review');clock.advance(4999);assert.equal(calls,0);clock.advance(1);assert.equal(calls,1);
});
test('rearming discards old timer and can start already hidden',()=>{
 const clock=fakeClock();let calls=0;const t=createAutoAdvance({...clock,onNext:()=>calls++});
 t.arm(3000);t.arm(8000,['hidden']);clock.advance(90000);assert.equal(calls,0);t.release('hidden');clock.advance(8000);assert.equal(calls,1);
 t.arm(1);t.dispose();clock.advance(500);assert.equal(calls,1);
});
