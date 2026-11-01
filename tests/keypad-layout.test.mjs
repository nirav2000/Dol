import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDARD_NUMPAD_KEYS} from '../keypad-layout.mjs';

test('phone and tablet use the physical calculator keypad order',()=>{
  assert.deepEqual(STANDARD_NUMPAD_KEYS,[
    '7','8','9',
    '4','5','6',
    '1','2','3',
    'clear','0','action'
  ]);
  assert.equal(new Set(STANDARD_NUMPAD_KEYS).size,12,'each digit and action occurs once');
  assert.ok(Object.isFrozen(STANDARD_NUMPAD_KEYS),'both devices share one immutable layout');
});
