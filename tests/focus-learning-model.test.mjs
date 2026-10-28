import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFocusPlan,explainPairMotion} from '../focus-learning-model.mjs';
const key=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
test('288: missing 3, then 6, then 12 are derived from the discovered board',()=>{
 const found=new Set(['1-288','2-144','4-72','8-36','9-32','16-18']);
 const first=makeFocusPlan(288,found);
 assert.equal(first.total,9);assert.equal(first.remaining,3);
 assert.equal(first.routes[0].goalKey,'3-96');
 assert.match(first.routes[0].teaser,/digit-sum/);
 assert.doesNotMatch(first.routes[0].teaser,/96/);
 found.add('3-96');
 const second=makeFocusPlan(288,found);
 assert.equal(second.routes[0].goalKey,'6-48');
 assert.equal(second.routes[0].kind,'balance');
 assert.match(second.routes[0].teaser,/3 × 96/);
 found.add('6-48');
 assert.equal(makeFocusPlan(288,found).routes[0].goalKey,'12-24');
 found.add('12-24');
 assert.equal(makeFocusPlan(288,found).remaining,0);
});
test('mistaken 2x72 teaches why, without treating an already solved correction as new',()=>{
 const found=new Set(['1-288','2-144','4-72','8-36','9-32','16-18']);
 const plan=makeFocusPlan(288,found,{a:2,b:72});
 assert.equal(plan.routes[0].kind,'repair');
 assert.match(plan.routes[0].teaser,/2 × 72 = 144/);
 assert.match(plan.routes[0].teaser,/ALREADY on your board/);
 assert.equal(plan.routes[0].goalKey,null);
 const other=makeFocusPlan(288,new Set(['1-288']),{a:2,b:72}).routes[0];
 assert.equal(other.goalKey,'4-72');
});
test('factor motion depicts equivalent products and rebalancing',()=>{
 const m=explainPairMotion(288,new Set(['3-96']),[6,48]);
 assert.equal(m.kind,'balance');assert.deepEqual(m.from,[3,96]);
 assert.deepEqual(m.to,[6,48]);assert.equal(m.first,'×2');assert.equal(m.second,'÷2');
 const g=explainPairMotion(288,new Set(),[9,32]);
 assert.equal(g.kind,'groups');assert.equal(g.totalGroups,9);assert.equal(g.count,8);
 assert.equal(explainPairMotion(288,new Set(),[2,72]),null);
});
test('all suggested goals are missing valid factors across 1 to 1024',()=>{
 for(let n=1;n<=1024;n++){
  const pairs=[];for(let a=1;a*a<=n;a++)if(n%a===0)pairs.push([a,n/a]);
  const found=new Set(pairs.filter((_,i)=>i%2===0).map(p=>key(...p)));
  const p=makeFocusPlan(n,found);
  assert.equal(p.remaining,pairs.length-found.size);
  assert.ok(p.routes.every(r=>!r.goalKey||!found.has(r.goalKey)),'never repeat discovered pairs: '+n);
  for(const route of p.routes)if(route.goalKey)assert.ok(pairs.some(pair=>key(...pair)===route.goalKey),'real pair: '+n);
  if(!p.remaining)assert.equal(p.routes.length,0);
 }
});
