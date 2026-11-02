// Fixed number-copy checkpoint. Separate from Dol maths recall/scoring.
export const CHECKPOINT_VERSION=1;
export const WARMUP_TARGETS=Object.freeze(['7','42','108','3','96']);
export const CHECKPOINT_TARGETS=Object.freeze([
 '7','36','108','8','24','72','3','144','56','9',
 '12','48','6','84','120','2','63','27','5','45',
 '132','4','81','96','18','15','11','54','99','88'
]);
export const MIN_COMPARABLE_ACCURACY=.9;
export const MAX_SAVED_CHECKPOINTS=120;

// Same 30 answers on every checkpoint. Only their order changes to avoid
// memorising the next prompt. Composition stays identical for comparison.
export function checkpointPlan(runNumber=0){
 const out=[...CHECKPOINT_TARGETS];
 let seed=(0x9e3779b9+(Math.max(0,runNumber|0)*0x85ebca6b))>>>0;
 for(let i=out.length-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);
  [out[i],out[j]]=[out[j],out[i]];
 }
 return out;
}
export function median(xs){
 const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
 if(!a.length)return null;
 const middle=Math.floor(a.length/2);
 return a.length%2?a[middle]:(a[middle-1]+a[middle])/2;
}
export function percentile(xs,q){
 const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
 if(!a.length)return null;
 return a[Math.max(0,Math.min(a.length-1,Math.ceil(q*a.length)-1))];
}
export function summariseTrials(trials){
 const rows=Array.isArray(trials)?trials:[];
 const valid=rows.filter(x=>x&&Number.isFinite(x.totalMs)&&x.totalMs>=0);
 const correct=valid.filter(x=>x.correct);
 const byDigits=[1,2,3].map(digits=>{
  const subset=correct.filter(x=>String(x.target).length===digits);
  return {digits,correct:subset.length,medianMs:median(subset.map(x=>x.totalMs))};
 });
 const count=valid.length,accurate=correct.length;
 const firstTry=correct.filter(x=>!(x.backspaces>0)).length;
 const total=correct.map(x=>x.totalMs);
 return {
  count,correct:accurate,accuracy:count?accurate/count:0,
  firstTryAccuracy:count?firstTry/count:0,
  medianMs:median(total),p90Ms:percentile(total,.90),
  medianReactionMs:median(correct.map(x=>x.reactionMs)),
  medianEntryMs:median(correct.map(x=>x.entryMs)),
  corrections:valid.reduce((n,x)=>n+(x.backspaces||0),0),
  byDigits,qualified:count===CHECKPOINT_TARGETS.length&&firstTry/count>=MIN_COMPARABLE_ACCURACY
 };
}
export function sameSetup(a,b){
 if(!a||!b)return false;
 return a.version===b.version&&a.device===b.device&&
  a.orientation===b.orientation&&a.method===b.method&&
  a.layout===b.layout&&a.technique===b.technique;
}
export function matchingHistory(history,reference){
 return (Array.isArray(history)?history:[]).filter(x=>
  x?.summary?.count===CHECKPOINT_TARGETS.length&&sameSetup(x,reference));
}
export function compareCheckpoints(history,reference){
 const relevant=matchingHistory(history,reference);
 const baseline=relevant.find(x=>x.summary.qualified)||relevant[0]||null;
 const latest=relevant.at(-1)||null;
 const before=baseline?.summary.medianMs,after=latest?.summary.medianMs;
 const improvementPercent=Number.isFinite(before)&&before>0&&Number.isFinite(after)?
  (before-after)/before*100:null;
 return {baseline,latest,count:relevant.length,improvementPercent};
}
export function storageKey(accountId='guest'){
 return 'dol-speed-keying-checkpoints-v1'+(accountId&&accountId!=='guest'?':account:'+accountId:'');
}
export function normaliseCheckpoints(value){
 if(!Array.isArray(value))return [];
 return value.filter(v=>v?.version===CHECKPOINT_VERSION&&v?.id&&
  Array.isArray(v.trials)&&v.trials.length===CHECKPOINT_TARGETS.length&&v.summary&&
  Number.isFinite(v.startedAt)).slice(-MAX_SAVED_CHECKPOINTS);
}
