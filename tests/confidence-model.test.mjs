import assert from 'node:assert/strict';
import test from 'node:test';
import {DAY_MS,factStatus,pairKey,speedStats,speedGroups} from '../confidence-model.mjs';
const t=Date.UTC(2026,0,1),key=pairKey(8,3);
const e=(day,ms=8000,outcome='correct',assisted=false,errors=0)=>({key,at:t+day*DAY_MS,ms,outcome,assisted,errors});
test('fluency needs three fast clean responses; assisted, mistakes and slow answers do not qualify',()=>{
 assert.equal(factStatus([e(0)],key).kind,'developing');
 assert.equal(factStatus([e(0),e(.01),e(.02)],key).kind,'fluent');
 assert.equal(factStatus([e(0),e(.01,13000),e(.02)],key).kind,'developing');
 assert.equal(factStatus([e(0),e(.01,8000,'correct',true),e(.02)],key).kind,'developing');
 assert.equal(factStatus([e(0),e(.01,8000,'correct',false,1),e(.02)],key).kind,'developing');
});
test('week and month require new clean attempts; historical level survives error',()=>{
 const initial=[e(0),e(.01),e(.02)];
 assert.equal(factStatus(initial,key,t+60*DAY_MS).kind,'fluent');
 assert.equal(factStatus([...initial,e(7.01)],key).kind,'fluent');
 const week=[...initial,e(7.03)];
 assert.equal(factStatus(week,key).kind,'confident');
 assert.equal(factStatus([...week,e(30.03)],key).kind,'mastered');
 const slip=factStatus([...week,e(30.03),e(31,9000,'incorrect')],key);
 assert.equal(slip.kind,'mastered');assert.equal(slip.needsReview,true);
 assert.equal(factStatus([...initial,e(7.03,9000,'correct',true)],key).kind,'fluent');
});
test('speed statistics use quartiles and trend; factor family includes either operand',()=>{
 const events=[e(0,1000),e(1,2000),e(2,3000),e(3,4000),e(4,5000),e(5,6000),e(6,7000,'correct',true)];
 const s=speedStats(events);assert.equal(s.count,6);assert.equal(s.median,3.5);assert.equal(s.q1,2.25);assert.equal(s.q3,4.75);assert.equal(s.trendSeconds,3);
 assert.equal(speedGroups(events,'fact').length,1);
 assert.equal(speedGroups(events,'factor').length,2);
 assert.equal(speedGroups(events,'factor').find(g=>g.label==='Factor 3').stats.count,6);
});
