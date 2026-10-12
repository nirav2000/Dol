// Pure, local-first learning evidence. Older dol-fact-evidence-v1 records remain valid.
export const DAY_MS = 86400000;
export const FAST_MS = 12000;
export const pairKey = (a,b) => Math.min(a,b)+'x'+Math.max(a,b);
const clean = e => e.outcome==='correct' && !e.assisted && Number(e.errors||0)===0;
const fast = e => clean(e) && Number.isFinite(e.ms) && e.ms>=0 && e.ms<=FAST_MS;
const ordered = entries => [...entries].sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0));
export const levelNames = {unknown:'Not attempted',weak:'Needs practice',developing:'Developing',fluent:'Immediate fluency',confident:'Confident',mastered:'Mastered'};
export function factStatus(entries,key,now=Date.now()){
 const attempts=ordered(entries.filter(e=>e.key===key));
 if(!attempts.length)return {kind:'unknown',label:levelNames.unknown,attempts,fluentAt:null,confidentAt:null,masteredAt:null,nextDue:null,needsReview:false,overdue:false};
 let streak=0,fluentAt=null,confidentAt=null,masteredAt=null,everClean=false;
 for(const e of attempts){
  const at=Number(e.at)||0;
  if(clean(e))everClean=true;
  streak=fast(e)?streak+1:0;
  if(fluentAt===null && streak>=3)fluentAt=at;
  // Retention needs a genuinely later successful attempt, not merely elapsed calendar time.
  else if(fluentAt!==null && confidentAt===null && at>=fluentAt+7*DAY_MS && clean(e))confidentAt=at;
  else if(confidentAt!==null && masteredAt===null && at>=Math.max(fluentAt+30*DAY_MS,confidentAt+7*DAY_MS) && clean(e))masteredAt=at;
 }
 const kind=masteredAt!==null?'mastered':confidentAt!==null?'confident':fluentAt!==null?'fluent':everClean?'developing':'weak';
 const nextDue=masteredAt!==null?masteredAt+90*DAY_MS:confidentAt!==null?Math.max(fluentAt+30*DAY_MS,confidentAt+7*DAY_MS):fluentAt!==null?fluentAt+7*DAY_MS:null;
 const last=attempts.at(-1);
 const needsReview=!!last && (last.outcome!=='correct'||last.assisted||Number(last.errors||0)>0);
 return {kind,label:levelNames[kind],attempts,fluentAt,confidentAt,masteredAt,nextDue,needsReview,overdue:nextDue!==null&&now>=nextDue};
}
export function quantile(sorted,q){
 if(!sorted.length)return null;
 const index=(sorted.length-1)*q,lo=Math.floor(index),hi=Math.ceil(index);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);
}
export function speedStats(entries){
 // Timings are intervals from the previous accepted pair, NOT isolated recall-latency.
 const cleanEntries=ordered(entries.filter(e=>clean(e)&&Number.isFinite(e.ms)&&e.ms>=0));
 const times=cleanEntries.map(e=>e.ms/1000).sort((a,b)=>a-b);
 if(!times.length)return null;
 const early=cleanEntries.slice(0,Math.min(3,Math.floor(cleanEntries.length/2))).map(e=>e.ms/1000).sort((a,b)=>a-b);
 const late=cleanEntries.slice(-early.length).map(e=>e.ms/1000).sort((a,b)=>a-b);
 const earlyMedian=cleanEntries.length>=6?quantile(early,.5):null;
 const lateMedian=cleanEntries.length>=6?quantile(late,.5):null;
 return {count:times.length,min:times[0],q1:quantile(times,.25),median:quantile(times,.5),q3:quantile(times,.75),max:times.at(-1),
  trendSeconds:earlyMedian===null?null:lateMedian-earlyMedian,fastCount:times.filter(t=>t<=12).length};
}
export function speedGroups(entries,type='fact'){
 const groups=new Map();
 for(const e of entries){
  if(!clean(e)||!Number.isFinite(e.ms)||e.ms<0)continue;
  const m=/^(\\d+)x(\\d+)$/.exec(String(e.key||''));
  if(!m)continue;
  const a=Number(m[1]),b=Number(m[2]);
  const keys=type==='factor'?[...new Set([a,b].filter(n=>n>=1&&n<=12))].map(n=>({key:'f'+n,label:'Factor '+n,sort:n})):
   a<=12&&b<=12?[{key:pairKey(a,b),label:a+' × '+b,sort:a*100+b}]:[];
  for(const k of keys){if(!groups.has(k.key))groups.set(k.key,{...k,events:[]});groups.get(k.key).events.push(e);}
 }
 return [...groups.values()].map(g=>({...g,stats:speedStats(g.events)})).filter(g=>g.stats);
}
