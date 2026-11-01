// UI-only active thinking time per accepted factor pair, never the scored round clock.
export const TIMER_STYLES=Object.freeze(['classic','ribbon']);
export const RIBBON_RANGE_MS=6000;
export function nextTimerStyle(current,direction=1){
  const index=TIMER_STYLES.indexOf(current);
  if(index<0)return TIMER_STYLES[0];
  return TIMER_STYLES[(index+Math.sign(direction||1)+TIMER_STYLES.length)%TIMER_STYLES.length];
}
export function formatPracticeElapsed(milliseconds){
  const seconds=Math.max(0,Number.isFinite(milliseconds)?milliseconds:0)/1000;
  return (seconds<1?seconds.toFixed(2):seconds.toFixed(1))+'s';
}
export function createPracticeStopwatch(now=()=>performance.now()){
  let accumulated=0,started=now(),running=false;
  function elapsedMs(){return Math.max(0,accumulated+(running?now()-started:0));}
  function setRunning(active){
    if(!!active===running)return;
    if(running)accumulated=elapsedMs();
    else started=now();
    running=!!active;
  }
  function reset(){accumulated=0;started=now();}
  return {elapsedMs,setRunning,reset,isRunning:()=>running};
}
