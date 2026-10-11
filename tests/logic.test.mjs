import test from 'node:test';
import assert from 'node:assert/strict';
import { factorPairs,candidates,selectNumber,parsePair,assessPair,formatTime } from '../logic.mjs';

test('factor pairs count without reversals and handle squares',()=>{
  assert.deepEqual(factorPairs(112),[[1,112],[2,56],[4,28],[7,16],[8,14]]);
  assert.deepEqual(factorPairs(36),[[1,36],[2,18],[3,12],[4,9],[6,6]]);
});
test('only eligible numbers are selected',()=>{
  for(const max of [64,128,256,512,1024]) {
    const choices=candidates(max);
    assert.ok(choices.length>1);
    for(const n of choices) assert.ok(n<=max && factorPairs(n).length>=4);
    assert.notEqual(selectNumber(max,choices[0],()=>0),choices[0]);
  }
});
test('single expression accepts standard separators',()=>{
  for(const raw of ['3x35','3X35','3 × 35','3*35','3 35']) assert.deepEqual(parsePair(raw),[3,35]);
  for(const raw of ['3x','3x0','-3x35','3.5x2','3','x','123x999999999999999999999']) assert.equal(parsePair(raw),null);
});
test('correctness, explanation and duplicate reversal',()=>{
  assert.equal(assessPair('3x35',112,new Set()).message,'3 × 35 makes 105, not 112.');
  assert.equal(assessPair('14x8',112,new Set(['8-14'])).status,'duplicate');
  assert.equal(assessPair('8x14',112,new Set()).status,'correct');
});
test('seconds display rounds up and clamps at zero',()=>{
  assert.equal(formatTime(60000),'1:00');
  assert.equal(formatTime(40000),'0:40');
  assert.equal(formatTime(39999),'0:40');
  assert.equal(formatTime(-1),'0:00');
});
