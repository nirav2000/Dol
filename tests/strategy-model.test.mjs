import test from 'node:test';
import assert from 'node:assert/strict';
import {elevenCheck,divisibilityRule,divisionChunks,factorLesson,transformationLesson,suggestLesson,makeTechniqueSession,recordChoice,emptyStrategyHistory} from '../strategy-model.mjs';
test('11 rule includes both zero and nonzero multiples',()=>{
 assert.deepEqual(elevenCheck(748).sums,[15,4]);assert.equal(elevenCheck(748).difference,11);assert.equal(elevenCheck(748).divisible,true);
 assert.deepEqual(elevenCheck(187).sums,[8,8]);assert.equal(elevenCheck(187).difference,0);assert.equal(elevenCheck(187).divisible,true);
 assert.equal(elevenCheck(123).divisible,false);
 assert.match(divisibilityRule(187,11).rule,/Zero counts/);
});
test('partner is calculated separately and explained in chunks',()=>{
 const c=divisionChunks(748,11);assert.deepEqual([c.first,c.second,c.quotient,c.remainder],[60,8,68,0]);
 const lesson=factorLesson(748,11);assert.equal(lesson.pairKey,'11-68');assert.equal(lesson.steps.length,6);
 assert.match(lesson.steps[5].text,/60 \+ 8 = 68/);
 assert.equal(factorLesson(187,11).pairKey,'11-17');
 assert.equal(factorLesson(748,13).pairKey,null);
});
test('derive higher pairs without guessing 17',()=>{
 const a=transformationLesson(748,[11,68]);assert.equal(a.pairKey,'22-34');
 const b=transformationLesson(748,[22,34]);assert.equal(b.pairKey,'17-44');
 assert.match(b.steps[2].text,/34/);
 assert.equal(suggestLesson(748,new Set(['1-748','11-68'])).pairKey,'22-34');
});
test('technique choices count alternative valid methods but not guesses',()=>{
 const cards=makeTechniqueSession({target:748,limit:1024,stage:'expert',random:()=>.4});
 assert.equal(cards.length,5);assert.equal(new Set(cards.map(c=>c.technique)).size,5);
 assert.equal(new Set(cards.map(c=>c.target)).size,5);
 for(const card of cards){assert.equal(card.options.length,3);assert.ok(card.options.some(o=>o.rating==='direct'));assert.ok(card.options.some(o=>o.rating==='valid'));assert.ok(card.options.some(o=>o.rating==='retry'));}
 const card=cards[0],choice=card.options.find(o=>o.rating==='valid');
 assert.equal(recordChoice(emptyStrategyHistory(),card,choice.id).choices[0].rating,'valid');
});
test('11 test works for arbitrary positive integers',()=>{
 for(let n=1;n<=1024;n++)assert.equal(elevenCheck(n).divisible,n%11===0);
});
