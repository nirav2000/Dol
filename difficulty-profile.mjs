// Resume adaptive difficulty from already completed rounds, never from score alone.
// Successful targets are locally/account-scoped and include supported completion.
export function inferEntryLevel(numberHistory={}){
  if(!numberHistory||typeof numberHistory!=='object')return 0;
  const completed=Object.entries(numberHistory).filter(([value,record])=>{
    const n=Number(value);
    return Number.isInteger(n)&&n>=2&&n<=1024&&record&&Number.isFinite(record.correct)&&record.correct>0;
  }).map(([value])=>Number(value));
  let level=0;
  for(const [candidate,minimum] of [[1,25],[2,145],[3,257],[4,513]]){
    if(completed.filter(n=>n>=minimum).length>=2)level=candidate;
  }
  return level;
}
