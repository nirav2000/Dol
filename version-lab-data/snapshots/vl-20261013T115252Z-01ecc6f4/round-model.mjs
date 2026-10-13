/** Domain-specific review scoring, diagram models and safe auto-advance. */
export const pairKey = (a,b) => `${Math.min(a,b)}-${Math.max(a,b)}`;
export function pairsOf(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1024) throw new RangeError('Choose a whole number from 1 to 1024.');
  const pairs=[];
  for(let a=1;a*a<=n;a++) if(n%a===0) pairs.push([a,n/a]);
  return pairs;
}
export function reviewScore(pairs, selected) {
  const valid=new Set(pairs.map(([a,b])=>pairKey(a,b)));
  const count=[...new Set(selected)].filter(k=>valid.has(k)).length;
  const bonus=valid.size>0 && count===valid.size ? 2 : 0;
  return {count,total:valid.size,bonus,points:count+bonus};
}
export function rainbowModel(n) {
  const pairs=pairsOf(n), factors=[...new Set(pairs.flat())].sort((a,b)=>a-b);
  return {n,pairs,factors,square:Number.isInteger(Math.sqrt(n))};
}
export function arrayModel(n,rows) {
  pairsOf(n);
  if(!Number.isSafeInteger(rows)||rows<1||rows>1024)throw new RangeError('Choose 1 to 1024 rows.');
  const columns=Math.floor(n/rows),remainder=n%rows;
  return {n,rows,columns,remainder,used:rows*columns,exact:remainder===0};
}
/** The host holds this timer when the page is hidden or the learner is reviewing. */
export function createAutoAdvance({onNext,onTick=()=>{},now=()=>performance.now(),setIntervalFn=setInterval,clearIntervalFn=clearInterval}={}) {
  let pending=false,remaining=0,deadline=0,timer=null;
  const holds=new Set();
  const stop=()=>{if(timer!==null)clearIntervalFn(timer);timer=null;};
  const read=()=>({pending,remainingMs:pending&&!holds.size?Math.max(0,deadline-now()):remaining,held:holds.size>0,reasons:[...holds]});
  const emit=()=>onTick(read());
  const tick=()=>{
    if(!pending||holds.size)return;
    remaining=Math.max(0,deadline-now());
    if(remaining<=0){stop();pending=false;emit();onNext?.();}else emit();
  };
  const run=()=>{if(!pending||holds.size)return;deadline=now()+remaining;stop();timer=setIntervalFn(tick,100);emit();};
  return {
    arm(ms,initialHolds=[]){stop();holds.clear();for(const h of initialHolds)holds.add(h);pending=true;remaining=Math.max(0,Number(ms)||0);deadline=now()+remaining;run();emit();},
    hold(reason='review'){if(!pending||holds.has(reason))return;if(!holds.size)remaining=Math.max(0,deadline-now());holds.add(reason);stop();emit();},
    release(reason='review'){if(!holds.delete(reason))return;run();emit();},
    cancel(){stop();pending=false;remaining=0;holds.clear();emit();},
    snapshot:read,
    dispose(){stop();pending=false;holds.clear();}
  };
}
