import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundLedger} from '../round-ledger.mjs';
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};}
test('legacy score and round survive migration without invented sessions',()=>{
 const db=storage(),ledger=createRoundLedger({storage:db,key:'a',legacy:{round:25,score:158},recordedSessions:0});
 assert.equal(ledger.data.round,25);assert.equal(ledger.data.score,158);
 assert.equal(ledger.data.allTimeScore,158);assert.equal(ledger.data.completedRounds,24);
 assert.equal(ledger.data.legacyRoundsIndicated,24);
 assert.equal(ledger.data.lastSessionCount,0);
});
test('reset preserves lifetime counters, and reload retains both',()=>{
 const db=storage(),ledger=createRoundLedger({storage:db,key:'a',legacy:{round:25,score:158},recordedSessions:0});
 ledger.score(162);ledger.finish();ledger.round(26);
 ledger.resetRounds();assert.equal(ledger.data.round,1);assert.equal(ledger.data.completedRounds,25);
 ledger.resetScores();assert.equal(ledger.data.score,0);assert.equal(ledger.data.allTimeScore,162);
 const again=createRoundLedger({storage:db,key:'a',legacy:{round:1,score:0},recordedSessions:1});
 assert.equal(again.data.completedRounds,25);assert.equal(again.data.allTimeScore,162);
 again.updateHistory(1);assert.equal(again.data.completedRounds,25);
});
test('accounts remain isolated and cloud history only adds new evidence',()=>{
 const db=storage();
 const guest=createRoundLedger({storage:db,key:'guest',legacy:{round:3,score:8},recordedSessions:1});
 const account=createRoundLedger({storage:db,key:'account',legacy:{round:1,score:0},recordedSessions:0});
 guest.updateHistory(3);guest.updateHistory(3);assert.equal(guest.data.completedRounds,4);
 assert.equal(account.data.completedRounds,0);
});
