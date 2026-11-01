import test from 'node:test';
import assert from 'node:assert/strict';
import {createPracticeStopwatch,formatPracticeElapsed,nextTimerStyle,RIBBON_RANGE_MS,TIMER_STYLES} from '../timer-styles-model.mjs';

test('timer style cycles without affecting the game',()=>{
  assert.deepEqual(TIMER_STYLES,['classic','ribbon']);
  assert.equal(nextTimerStyle('classic',1),'ribbon');
  assert.equal(nextTimerStyle('ribbon',1),'classic');
  assert.equal(nextTimerStyle('classic',-1),'ribbon');
  assert.equal(nextTimerStyle('bad'),'classic');
  assert.equal(RIBBON_RANGE_MS,6000);
});
test('per-pair stopwatch pauses, resumes, and resets without losing active time',()=>{
  let ms=0;
  const c=createPracticeStopwatch(()=>ms);
  assert.equal(c.elapsedMs(),0);
  c.setRunning(true);ms=475;
  assert.equal(c.elapsedMs(),475);
  c.setRunning(false);ms=1475;
  assert.equal(c.elapsedMs(),475);
  c.setRunning(true);ms=1725;
  assert.equal(c.elapsedMs(),725);
  c.reset();assert.equal(c.elapsedMs(),0);
  ms=2325;assert.equal(c.elapsedMs(),600);
  c.setRunning(false);ms=2825;assert.equal(c.elapsedMs(),600);
});
test('subsecond response times and times beyond the six-second scale remain legible',()=>{
  assert.equal(formatPracticeElapsed(0),'0.00s');
  assert.equal(formatPracticeElapsed(470),'0.47s');
  assert.equal(formatPracticeElapsed(950),'0.95s');
  assert.equal(formatPracticeElapsed(2500),'2.5s');
  assert.equal(formatPracticeElapsed(7420),'7.4s');
  assert.equal(formatPracticeElapsed(-10),'0.00s');
});
