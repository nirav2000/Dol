import {factorPairs} from '../logic.mjs';
export const DAY = 86400000;
export const validId = s => typeof s === 'string' && /^[a-zA-Z0-9._-]{1,160}$/.test(s) && !['__proto__','constructor','prototype'].includes(s);
const finite = n => typeof n === 'number' && Number.isFinite(n);
const time = n => finite(n) && n > 0;
const targetOK = n => Number.isInteger(n) && n >= 2 && n <= 1024;
const modeOK = s => ['guided','practice','timed'].includes(s);
const int = n => Number.isInteger(n) && n >= 0;
export const canonical = value => JSON.stringify(value, (_k,v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b))) : v);
export function stableId(value) {
  const text = canonical(value); let a = 2166136261, b = 5381;
  for (let i=0;i<text.length;i++) { a = Math.imul(a ^ text.charCodeAt(i),16777619); b = Math.imul(b,33) ^ text.charCodeAt(i); }
  return 'legacy-' + (a>>>0).toString(16) + '-' + (b>>>0).toString(16);
}
export function normaliseEvent(e) {
  if (!e || !time(e.at) || !targetOK(e.target) || !['correct','incorrect','missed'].includes(e.outcome)) return null;
  const match = /^(\d+)x(\d+)$/.exec(String(e.key||''));
  if (!match || !match.slice(1).every(n => Number.isSafeInteger(+n) && +n > 0 && +n <= 1000000)) return null;
  const [a,b] = match.slice(1).map(Number).sort((x,y)=>x-y);
  if (e.outcome !== 'incorrect' && a*b !== e.target) return null;
  const item = {kind:'pair',id:validId(e.id)?e.id:stableId(e),at:e.at,key:a+'x'+b,divisor:a,target:e.target,outcome:e.outcome,
    assisted:!!e.assisted,errors:int(e.errors)?e.errors:0,ms:finite(e.ms)&&e.ms>=0?e.ms:null};
  for (const k of ['roundId','mode','stage','input','timing','position','showCount']) if (e[k] !== undefined) item[k]=e[k];
  return item;
}
export const roundSignature = r => canonical([r.timestamp,r.mode,r.target,r.correct,r.total,r.hints,r.durationMs]);
export function normaliseRound(r) {
  if (!r || !time(r.timestamp) || !targetOK(r.target) || !modeOK(r.mode) || !int(r.correct) || r.total!==factorPairs(r.target).length || r.correct>r.total) return null;
  const row = {id:validId(r.id)?r.id:stableId(roundSignature(r)),timestamp:r.timestamp,mode:r.mode,target:r.target,correct:r.correct,total:r.total,
    hints:int(r.hints)?Math.min(r.hints,r.correct):0,durationMs:finite(r.durationMs)&&r.durationMs>=0?r.durationMs:0};
  for (const k of ['startedAt','stage','showCount','activeMs','input','timing','detailed','reason']) if (r[k] !== undefined) row[k]=r[k];
  return row;
}
export function normaliseCheck(c) {
  if (!c || c.kind!=='check' || !validId(c.id) || c.version!==1 || !time(c.at) || !c.complete || !['foundation','fluency','systematic','strategic','expert'].includes(c.stage) || ![0,1].includes(c.form) || !Array.isArray(c.responses) || c.responses.length!==6) return null;
  if (!c.responses.every(r=>r && int(r.correct) && int(r.errors) && typeof r.help==='boolean' && finite(r.ms) && r.ms>=0 && r.done)) return null;
  return JSON.parse(JSON.stringify(c));
}
export function normaliseEvents(rows=[]) { const map=new Map();for(const raw of rows){const e=normaliseEvent(raw);if(e)map.set(e.id,e);}return [...map.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)); }
export function normaliseRounds(rows=[]) { const map=new Map();for(const raw of rows){const r=normaliseRound(raw);if(r){const key=roundSignature(r);if(!map.has(key)||r.detailed)map.set(key,r);}}return [...map.values()].sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id)); }
export function quantile(sorted,q) { if(!sorted.length)return null;const x=(sorted.length-1)*q,lo=Math.floor(x);return sorted[lo]+(sorted[Math.ceil(x)]-sorted[lo])*(x-lo); }
export function distribution(values) { const a=values.filter(finite).sort((x,y)=>x-y);return a.length?{n:a.length,min:a[0],q1:quantile(a,.25),median:quantile(a,.5),q3:quantile(a,.75),max:a.at(-1)}:null; }
const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
const dateOf = r => r.at || r.timestamp;
// Equal weight for each exact context; varying mixes of easy/hard questions cannot
// create an improvement. Windows within each context never overlap.
export function compareMatched(rows,keyOf,valueOf,{minimum=2,maximum=10,aggregate=mean}={}) {
  const groups=new Map();
  for(const r of rows){const key=keyOf(r),v=valueOf(r);if(!key||!finite(v))continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({r,v});}
  const matches=[];
  for(const [key,items] of groups){
    items.sort((a,b)=>dateOf(a.r)-dateOf(b.r));const n=Math.min(maximum,Math.floor(items.length/2));if(n<minimum)continue;
    const first=items.slice(0,n),last=items.slice(-n),before=aggregate(first.map(x=>x.v)),after=aggregate(last.map(x=>x.v));
    matches.push({key,before,after,n,first:first.map(x=>x.r),last:last.map(x=>x.r),beforeDistribution:distribution(first.map(x=>x.v)),afterDistribution:distribution(last.map(x=>x.v))});
  }
  if(!matches.length)return null;
  const first=matches.flatMap(g=>g.first),last=matches.flatMap(g=>g.last);
  const range=rows=>[Math.min(...rows.map(dateOf)),Math.max(...rows.map(dateOf))];
  return {before:mean(matches.map(g=>g.before)),after:mean(matches.map(g=>g.after)),n:matches.reduce((s,g)=>s+g.n,0),groups:matches,firstRange:range(first),lastRange:range(last),days:new Set([...first,...last].map(r=>Math.floor(dateOf(r)/DAY))).size};
}
function attachEvents(rounds,events) {
  const linked=new Map(rounds.map(r=>[r.id,[]])),byId=new Set(rounds.map(r=>r.id));
  for(const e of events){
    if(e.roundId){if(byId.has(e.roundId))linked.get(e.roundId).push(e);continue;}
    // Legacy sessions only have end timestamps. Require a unique target/time match;
    // never attribute one event to two rounds or turn absent events into successes.
    const candidates=rounds.filter(r=>r.target===e.target&&e.at<=r.timestamp&&e.at>= (r.startedAt||r.timestamp-r.durationMs));
    if(candidates.length===1)linked.get(candidates[0].id).push(e);
  }
  return rounds.map(r=>{
    const ev=linked.get(r.id),correct=ev.filter(e=>e.outcome==='correct').length,missed=ev.filter(e=>e.outcome==='missed').length,wrong=ev.filter(e=>e.outcome==='incorrect').length;
    const covered=correct===r.correct && missed===r.total-r.correct;
    return {...r,accuracy:covered&&correct+wrong?correct/(correct+wrong)*100:null};
  });
}
export function patterns(n) {
  const pairs=factorPairs(n),names=[];
  if(pairs.length===1)names.push('Prime numbers');
  if(Number.isInteger(Math.sqrt(n)))names.push('Square numbers');
  if(n>1&&(n&(n-1))===0)names.push('Powers of two');
  if(pairs.length>=5)names.push('Many factor pairs');
  if(pairs.some(([a,b])=>a>1&&b>12))names.push('Beyond times tables');
  if(n%9===0)names.push('Multiples of nine');
  return names;
}
export function improvementSummary({rounds=[],events=[],checks=[]}={},now=Date.now()) {
  events=normaliseEvents(events).filter(e=>e.at<=now);rounds=normaliseRounds(rounds).filter(r=>r.timestamp<=now);
  const linked=attachEvents(rounds,events),context=r=>[r.target,r.mode,r.showCount??'legacy'].join('|');
  const accuracy=compareMatched(linked,context,r=>r.accuracy);
  const completeness=compareMatched(rounds,context,r=>100*Number(r.correct===r.total));
  const paceRows=events.filter(e=>e.outcome==='correct'&&e.errors===0&&e.timing==='active-v1'&&finite(e.ms)&&e.ms>0&&['keyboard','phone-pad','tablet-pad'].includes(e.input)&&int(e.position)&&modeOK(e.mode)&&typeof e.showCount==='boolean');
  const pace=compareMatched(paceRows,e=>[e.target,e.key,e.position,e.mode,e.input,e.assisted?'supported':'solo',e.showCount].join('|'),e=>e.ms/1000,{minimum:3,aggregate:a=>distribution(a).median});
  const support=new Map(),familiar=new Map(),last=new Map(),week=new Set(),month=new Set(),refreshed=new Set();
  for(const e of events){
    if(e.outcome==='correct'&&e.assisted)support.set(e.key,e.at);
    if(e.outcome==='correct'&&!e.assisted&&e.errors===0&&support.has(e.key)&&e.at-support.get(e.key)>=DAY)familiar.set(e.key,e.at);
    const gap=last.has(e.key)?e.at-last.get(e.key):0;
    if(e.outcome==='correct'&&gap>=7*DAY){if(e.assisted||e.errors>0)refreshed.add(e.key);else{week.add(e.key);if(gap>=30*DAY)month.add(e.key);}}
    last.set(e.key,e.at);
  }
  const count=Math.min(20,Math.floor(rounds.length/2)),first=rounds.slice(0,count),recent=count?rounds.slice(-count):[];
  const breadth=rs=>[...new Set(rs.flatMap(r=>patterns(r.target)))];
  const evidence=[accuracy,completeness,pace].filter(Boolean),wellRepeated=evidence.some(x=>x.n>=20&&x.days>=3&&x.groups.length>=3);
  let headline='Your learning record is growing.',detail='More comparable practice will reveal changes; missing evidence is not zero progress.';
  if(completeness&&completeness.after-completeness.before>=5){headline='You are finding every pair more reliably.';detail='This compares the same targets and game modes. Answers found with help count fully.';}
  else if(accuracy&&accuracy.after-accuracy.before>=5){headline='You are getting more factor pairs right.';detail='This compares the same targets and game modes, including answers reached with support.';}
  else if(pace&&pace.after<pace.before*.9&&accuracy&&accuracy.after>=accuracy.before-1){headline='Familiar factor pairs are taking less time.';detail='Matched active solving times are lower, with no fall in matched accuracy in these observations.';}
  else if(familiar.size){headline='Skills explored with help are becoming familiar.';detail='You have returned to some facts on a later day and solved them independently. Hints remain welcome.';}
  else if(evidence.length){headline='Your comparable practice is taking shape.';detail='See each dimension below. A steady result is different from a missing comparison.';}
  return {headline,detail,quality:wellRepeated?'Repeated observations':evidence.length?'Early indication':'Building a baseline',accuracy,completeness,pace,
    familiarity:{count:familiar.size,keys:[...familiar.keys()]},retention:{week:week.size,month:month.size,refreshed:refreshed.size},
    breadth:{before:breadth(first),after:breadth(recent),count,targets:new Set(recent.map(r=>r.target)).size},
    coverage:{rounds:rounds.length,events:events.length,legacyTimes:events.filter(e=>finite(e.ms)&&e.timing!=='active-v1').length},
    checks:checks.map(normaliseCheck).filter(Boolean).sort((a,b)=>a.at-b.at)};
}
export function compareChecks(checks) {
  const rows=checks.map(normaliseCheck).filter(Boolean).sort((a,b)=>a.at-b.at),latest=rows.at(-1);if(!latest)return null;
  const compatible=c=>c.version===latest.version&&c.stage===latest.stage&&c.form===latest.form;
  const earlier=rows.slice(0,-1).find(compatible);
  const accuracy=c=>{const right=c.responses.reduce((s,r)=>s+r.correct,0),wrong=c.responses.reduce((s,r)=>s+r.errors,0);return right+wrong?100*right/(right+wrong):null;};
  const sameTiming=c=>['keyboard-form','touch-form'].includes(latest.input)&&c.input===latest.input&&c.responses.every((r,i)=>r.help===latest.responses[i].help&&r.errors===0&&latest.responses[i].errors===0);
  const timed=rows.slice(0,-1).find(c=>compatible(c)&&sameTiming(c));
  return {latest,earlier,before:earlier?accuracy(earlier):null,after:accuracy(latest),pace:timed?{before:timed.responses.reduce((s,r)=>s+r.ms,0)/1000,after:latest.responses.reduce((s,r)=>s+r.ms,0)/1000}:null};
}
