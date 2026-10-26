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
