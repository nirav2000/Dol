// Authoritative local round and score ledger. Scoped to the same learner as the legacy game.
// No past session details are invented from the old round counter.
const integer=(value,fallback=0)=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):fallback;
export function createRoundLedger({storage,key,legacy={},recordedSessions=0}){
 const get=()=>{try{return JSON.parse(storage.getItem(key))}catch{return null}};
 const existing=get();
 const oldRound=Math.max(1,integer(legacy.round,1)),oldScore=integer(legacy.score);
 const historyCount=integer(recordedSessions);
 const fresh={
   version:1,round:oldRound,score:oldScore,
   allTimeScore:oldScore,completedRounds:historyCount,
   // A historical round counter is a position, not evidence of completed sessions.
   legacyRoundsIndicated:Math.max(0,oldRound-1-historyCount),
   lastSessionCount:historyCount
 };
 const data=existing?.version===1?{
   ...fresh,...existing,
   round:Math.max(1,integer(existing.round,oldRound)),
   score:integer(existing.score,oldScore),
   allTimeScore:Math.max(integer(existing.allTimeScore,oldScore),integer(existing.score,oldScore)),
   completedRounds:Math.max(integer(existing.completedRounds),historyCount),
   legacyRoundsIndicated:integer(existing.legacyRoundsIndicated),
   lastSessionCount:Math.max(integer(existing.lastSessionCount),historyCount)
 }:fresh;
 // Session history can be restored from cloud; never decrease the known completed total.
 data.completedRounds=Math.max(data.completedRounds,historyCount);
 data.lastSessionCount=Math.max(data.lastSessionCount,historyCount);
 const save=()=>storage.setItem(key,JSON.stringify(data));
 function score(value){
   const next=integer(value,data.score),delta=next-data.score;
   data.score=next;
   data.allTimeScore=Math.max(0,data.allTimeScore+delta);
   save();
 }
 function round(value){data.round=Math.max(1,integer(value,1));save();}
 function finish(){data.completedRounds++;save();}
 function resetRounds(){data.round=1;save();}
 function resetScores(){data.round=1;data.score=0;save();}
 // Preserve lifetime numbers when a learning-record clear is requested.
 function updateHistory(count){const value=integer(count);if(value>data.lastSessionCount){data.completedRounds+=value-data.lastSessionCount;data.lastSessionCount=value;save();}}
 save();
 return {data,save,score,round,finish,resetRounds,resetScores,updateHistory};
}
