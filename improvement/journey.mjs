// Dated learning journey. Historical scores without timestamps are not assigned invented dates.
import {normaliseEvents,normaliseRounds,normaliseCheck} from './model.mjs';
const localDay=t=>{const d=new Date(t);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();};
const weekStart=t=>{const d=new Date(localDay(t));d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getTime();};
export function buildJourney({rounds=[],events=[],checks=[]}={},now=Date.now()){
 const rs=normaliseRounds(rounds).filter(r=>r.timestamp<=now);
 const es=normaliseEvents(events).filter(e=>e.at<=now);
 const cs=checks.map(normaliseCheck).filter(Boolean).filter(c=>c.at<=now);
 const moments=[...rs.map(r=>r.timestamp),...es.map(e=>e.at),...cs.map(c=>c.at)].filter(t=>t>0);
 if(!moments.length)return {startedAt:null,lastAt:null,activeDays:0,rounds:0,observations:0,checks:0,weeks:[],totalWeeks:0,daysElapsed:0};
 const startedAt=Math.min(...moments),lastAt=Math.max(...moments);
 const activeDays=new Set(moments.map(localDay)).size;
 const firstWeek=weekStart(startedAt),lastWeek=weekStart(lastAt),totalWeeks=Math.round((lastWeek-firstWeek)/(7*86400000))+1;
 const aggregate=new Map();
 const add=(time,kind)=>{const k=weekStart(time);if(!aggregate.has(k))aggregate.set(k,{start:k,rounds:0,observations:0,checks:0});aggregate.get(k)[kind]++;};
 rs.forEach(r=>add(r.timestamp,'rounds'));
 es.forEach(e=>add(e.at,'observations'));
 cs.forEach(c=>add(c.at,'checks'));
 const weeks=[];
 // Cap chart to the latest 26 weeks, while preserving the true first activity date.
 for(let i=Math.max(0,totalWeeks-26);i<totalWeeks;i++){
  const start=new Date(firstWeek);start.setDate(start.getDate()+i*7);const stamp=start.getTime();
  weeks.push(aggregate.get(stamp)||{start:stamp,rounds:0,observations:0,checks:0});
 }
 return {startedAt,lastAt,activeDays,rounds:rs.length,observations:es.length,checks:cs.length,weeks,totalWeeks,daysElapsed:Math.max(0,Math.floor((localDay(lastAt)-localDay(startedAt))/86400000))};
}
