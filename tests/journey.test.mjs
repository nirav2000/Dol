import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJourney} from '../improvement/journey.mjs';
import {factorPairs} from '../logic.mjs';
const at=day=>Date.UTC(2026,8,1+day,12);
const round=(day,n=12)=>({timestamp:at(day),target:n,mode:'guided',correct:1,total:factorPairs(n).length,hints:1,durationMs:10000});
test('journey derives first use and zero-activity weeks from dated history',()=>{
 const s=buildJourney({rounds:[round(0),round(14)]});
 assert.equal(s.startedAt,at(0));assert.equal(s.lastAt,at(14));
 assert.equal(s.activeDays,2);assert.equal(s.rounds,2);
 assert.equal(s.weeks.reduce((n,w)=>n+w.rounds,0),2);
 assert.ok(s.weeks.some(w=>w.rounds===0),'missing weeks are visible as gaps');
});
test('journey deduplicates repeated sessions and never invents time for undated counters',()=>{
 const s=buildJourney({rounds:[round(0),round(0),{mode:'guided',target:12,correct:1,total:3}],events:[]});
 assert.equal(s.rounds,1);assert.equal(s.activeDays,1);
 assert.equal(buildJourney({}).startedAt,null);
});
test('journey includes dated pair evidence when there are no saved rounds',()=>{
 const row={kind:'pair',id:'e1',at:at(4),key:'2x6',target:12,outcome:'correct',assisted:true,errors:0,ms:9000};
 const s=buildJourney({events:[row]});
 assert.equal(s.startedAt,at(4));assert.equal(s.observations,1);
 assert.equal(s.rounds,0);
});
