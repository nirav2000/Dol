import test from 'node:test';
import assert from 'node:assert/strict';
import {inferEntryLevel} from '../difficulty-profile.mjs';
import {stageCandidates,chooseAdaptiveNumber} from '../adaptive.mjs';

test('resume challenge from demonstrated successful factor work',()=>{
  assert.equal(inferEntryLevel({}),0);
  assert.equal(inferEntryLevel({'7':{correct:20}}),0);
  assert.equal(inferEntryLevel({'120':{correct:2},'128':{correct:1}}),1);
  assert.equal(inferEntryLevel({'150':{correct:1},'240':{correct:1}}),2);
  assert.equal(inferEntryLevel({'300':{correct:1},'400':{correct:1}}),3);
  assert.equal(inferEntryLevel({'600':{correct:1},'840':{correct:2}}),4);
  assert.equal(inferEntryLevel({'900':{correct:0},'1000':{correct:0}}),0);
  assert.equal(inferEntryLevel(null),0);
});
test('advanced stages do not revert to trivial primes',()=>{
  for(const [stage,min] of [['systematic',36],['strategic',144],['expert',256]]){
    const list=stageCandidates(stage);
    assert.ok(list.length>20);
    assert.ok(list.every(n=>n>=min));
    for(const random of [0,.19,.4,.8,.99]){
      const n=chooseAdaptiveNumber({stage,previous:list[0],random:()=>random});
      assert.ok(n>=min);
      assert.notEqual(n,list[0]);
    }
  }
});
