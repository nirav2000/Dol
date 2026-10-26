import test from 'node:test';
import assert from 'node:assert/strict';
import {boardStatus,boardSuggestions,planBoardShortcut,planBoardReuse,planBoardRegroup} from '../board-aware-help.mjs';
const key=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');

test('990 shows all six remaining pairs without suggesting known 3 x 330 or 6 x 165',()=>{
 const found=new Set(['1-990','2-495','3-330','6-165','9-110','22-45']);
 const plan=boardSuggestions(990,found);
 assert.equal(plan.total,12);assert.equal(plan.knownCount,6);assert.equal(plan.missingCount,6);
 assert.deepEqual(plan.missing,[[5,198],[10,99],[11,90],[15,66],[18,55],[30,33]]);
 assert.equal(plan.shortcut.goalKey,'10-99');
 assert.deepEqual(plan.balance.from,[22,45]);assert.deepEqual(plan.balance.to,[11,90]);
 assert.deepEqual(plan.regroup.from,[3,330]);assert.equal(plan.regroup.divisor,10);
 assert.equal(plan.regroup.goalKey,'30-33');
 assert.equal(new Set(plan.choices.map(x=>x.goalKey)).size,3);
});
test('595 chooses the easier 7 x 85 divided by 5 rather than repeating solved pairs',()=>{
 const found=new Set(['1-595','5-119','7-85']), plan=boardSuggestions(595,found);
 assert.equal(plan.missingCount,1);
 assert.deepEqual(plan.regroup.from,[7,85]);
 assert.equal(plan.regroup.divisor,5);
 assert.equal(plan.regroup.goalKey,'17-35');
 assert.equal(plan.balance,null);
 assert.equal(plan.shortcut,null);
});
test('every suggested plan genuinely targets an unsolved pair for all supported numbers',()=>{
 for(let n=1;n<=1024;n++){
  const all=[];for(let a=1;a*a<=n;a++)if(n%a===0)all.push([a,n/a]);
  const foundSets=[new Set(),new Set([key(1,n)]),
    new Set(all.slice(0,4).map(pair=>key(...pair))),
    new Set(all.map(pair=>key(...pair)))];
  for(const found of foundSets){
   const plan=boardSuggestions(n,found),expected=boardStatus(n,found);
   assert.equal(plan.knownCount,expected.knownCount);
   assert.equal(plan.missingCount,expected.missingCount);
   const keys=plan.choices.map(x=>x.goalKey);
   assert.equal(keys.length,new Set(keys).size,'Distinct strategies must reach distinct new pairs');
   for(const goalKey of keys){
    assert.equal(found.has(goalKey),false,'No known pair should be re-taught as new');
    assert.ok(all.some(pair=>key(...pair)===goalKey),'Every goal must be a real factor pair');
   }
   if(!expected.missingCount) assert.equal(keys.length,0);
  }
 }
});
test('plans evolve immediately as more game pairs are accepted',()=>{
 const found=new Set(['1-990','2-495','3-330','6-165','9-110','22-45']);
 assert.equal(planBoardShortcut(990,found).goalKey,'10-99');
 found.add('10-99');
 assert.equal(planBoardShortcut(990,found).goalKey,'5-198');
 assert.equal(planBoardReuse(990,found).goalKey,'11-90');
 found.add('11-90');
 assert.notEqual(planBoardReuse(990,found)?.goalKey,'11-90');
 const regroup=planBoardRegroup(990,found,new Set(['5-198']));
 assert.notEqual(regroup?.goalKey,'5-198');
});

test('567 can regroup backwards: divide 21 by 3 and multiply 27 by 3 to find 7 x 81',()=>{
 const found=new Set(['3-189','9-63','21-27']);
 const p=boardSuggestions(567,found);
 assert.equal(p.total,5);
 assert.equal(p.knownCount,3);
 assert.equal(p.missingCount,2);
 const move=planBoardRegroup(567,found);
 assert.deepEqual(move.from,[21,27]);
 assert.equal(move.splitIndex,0);
 assert.equal(move.divisor,3);
 assert.deepEqual(move.to,[7,81]);
 assert.equal(move.goalKey,'7-81');
});
test('greedy suggested moves eventually complete every target from 1 through 1024',()=>{
 const key=p=>p.slice().sort((a,b)=>a-b).join('-');
 for(let n=1;n<=1024;n++){
  const pairs=boardStatus(n,new Set()).missing;
  for(const found of [
   new Set(),new Set(pairs.slice(0,4).map(key)),
   new Set(pairs.filter((_,i)=>i%2===0).map(key))
  ]){
   let success=false;
   for(let i=0;i<=pairs.length;i++){
    const plan=boardSuggestions(n,found);
    if(!plan.missingCount){success=true;break;}
    assert.ok(plan.choices.length,'There must be a remaining move for '+n);
    const goal=plan.choices[0].goalKey;
    assert.equal(found.has(goal),false,'Never repeat a known pair for '+n);
    found.add(goal);
   }
   assert.ok(success,'Every pair must be discoverable for '+n);
  }
 }
});

test('identity route works for 1 and primes, and disappears once completed',()=>{
 for(const n of [1,7,13,17,23,1019]){
  const found=new Set(),first=boardSuggestions(n,found);
  assert.equal(first.shortcut.goalKey,key(1,n));
  assert.equal(first.shortcut.divisor,1);
  found.add(key(1,n));
  const after=boardSuggestions(n,found);
  assert.equal(after.shortcut,null);
  if(n===1||[7,13,17,23,1019].includes(n))assert.equal(after.missingCount,0);
 }
});
