import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CHECKPOINT_VERSION,WARMUP_TARGETS,CHECKPOINT_TARGETS,checkpointPlan,
 summariseTrials,sameSetup,compareCheckpoints,normaliseCheckpoints,storageKey
} from '../speed-keying-model.mjs';
test('a checkpoint always asks 30 TTRS-sized answers in a new but comparable order',()=>{
 assert.equal(WARMUP_TARGETS.length,5);
 assert.equal(CHECKPOINT_TARGETS.length,30);
 assert.deepEqual([1,2,3].map(n=>CHECKPOINT_TARGETS.filter(x=>x.length===n).length),[8,18,4]);
 const first=checkpointPlan(0),second=checkpointPlan(1);
 assert.deepEqual([...first].sort(),[...CHECKPOINT_TARGETS].sort());
 assert.deepEqual([...second].sort(),[...CHECKPOINT_TARGETS].sort());
 assert.notDeepEqual(first,second);
 assert.deepEqual(first,checkpointPlan(0),'checkpoint ordering is reproducible');
 assert.ok(CHECKPOINT_TARGETS.every(s=>/^\d{1,3}$/.test(s)&&Number(s)>=1&&Number(s)<=144));
});
test('summary rewards accuracy rather than fast wrong submissions',()=>{
 const rows=CHECKPOINT_TARGETS.map((target,i)=>({
  target,entered:i===0?'0':target,correct:i!==0,totalMs:200+i*10,
  reactionMs:100,entryMs:100+i*10,backspaces:i===3?1:0
 }));
 const stats=summariseTrials(rows);
 assert.equal(stats.count,30);
 assert.equal(stats.correct,29);
 assert.ok(stats.accuracy>.9);
 assert.ok(stats.firstTryAccuracy>.9);
 assert.equal(stats.qualified,true);
 assert.equal(stats.corrections,1);
 assert.equal(stats.firstTryAccuracy,28/30);
 assert.equal(stats.byDigits.reduce((n,x)=>n+x.correct,0),29);
 assert.ok(stats.medianMs<stats.p90Ms);
 for(let i=0;i<3;i++)rows[i].correct=false;
 assert.equal(summariseTrials(rows).qualified,false);
});
test('comparisons match same device, layout, orientation, technique and method',()=>{
 const make=(id,medianMs,layout='ttrs')=>({
  version:CHECKPOINT_VERSION,id,startedAt:1234,device:'tablet',orientation:'portrait',
  method:'touch',layout,technique:'index',
  trials:Array.from({length:30},()=>({})),
  summary:{count:30,qualified:true,medianMs}
 });
 const a=make('a',1000),different=make('b',250,'physical'),b=make('c',700);
 assert.equal(sameSetup(a,different),false);
 const result=compareCheckpoints([a,different,b],b);
 assert.equal(result.count,2);
 assert.equal(result.baseline.id,'a');
 assert.equal(result.latest.id,'c');
 assert.equal(result.improvementPercent,30);
 const seen=normaliseCheckpoints([a,null,{...b,version:3},b]);
 assert.deepEqual(seen.map(x=>x.id),['a','c']);
 assert.equal(storageKey('guest'),'dol-speed-keying-checkpoints-v1');
 assert.equal(storageKey('abc'),'dol-speed-keying-checkpoints-v1:account:abc');
});
