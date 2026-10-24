// Pure square-number curriculum, including fluent recall scheduling.
// Learning SDK remains the single event store and source for cloud sync.
export const SQUARE_LIMIT=100;
export const SQUARE_BANDS=Object.freeze([
 {id:'foundation',from:1,to:12,label:'1–12 · foundations'},
 {id:'extension',from:13,to:20,label:'13–20 · mental strategies'},
 {id:'challenge',from:21,to:32,label:'21–32 · factor-search fluency'},
 {id:'build',from:33,to:50,label:'33–50 · nearby anchors'},
 {id:'middle',from:51,to:75,label:'51–75 · mirror patterns'},
 {id:'advanced',from:76,to:100,label:'76–100 · near 100'}
]);
export const REVIEW_DAYS=Object.freeze([1,3,7,14,30]);
export const FAST_REVIEW_DAYS=Object.freeze([7,14,30,60,90]);
const DAY=86400000,HOUR=3600000;
export const squareConcept=n=>'square:'+n;
export function validSquare(n){
 if(!Number.isSafeInteger(n)||n<1||n>SQUARE_LIMIT)throw new RangeError('Choose a square root from 1 to 100.');
 return n;
}
function bounds(n){
 if(!Number.isSafeInteger(n)||n<1||n>10000)throw new RangeError('Square search target must be between 1 and 10000.');
 const lower=Math.floor(Math.sqrt(n)),exact=lower*lower===n;
 return {limit:lower,lower,upper:exact?lower:lower+1,exact,lowSquare:lower*lower,highSquare:exact?n:(lower+1)**2};
}
export function mirrorPattern(n){
 validSquare(n);
 const options=[25,50,75,100].map(center=>({center,d:Math.abs(n-center),partner:2*center-n}))
  .filter(x=>x.d>0&&x.partner>=1&&x.partner<=100).sort((a,b)=>a.d-b.d);
 if(!options.length)return null;
 const {center,d,partner}=options[0],low=center-d,high=center+d,difference=high**2-low**2;
 return {center,d,partner,low,high,difference,
  explanation:low+'² = '+low*low+' and '+high+'² = '+high*high+'. Their difference is 4 × '+center+' × '+d+' = '+difference+
  ', a multiple of 100. Both squares therefore end in '+String(n*n%100).padStart(2,'0')+'.'};
}
export function squareMemory(n){
 validSquare(n);
 const previous=(n-1)**2,square=n*n,gap=2*n-1;
 const near=Math.round(n/10)*10,d=n-near,base=near*near;
 const anchors=new Set([1,2,3,4,5,10,11,12,15,20,25,30,40,50,60,75,80,90,100]);
 let strategy;
 if(n%10===5&&n>=15){
  const tens=Math.floor(n/10);
  strategy=n+' ends in 5: multiply '+tens+' × '+(tens+1)+' = '+(tens*(tens+1))+' and append 25. So '+n+'² = '+square+'. This shortcut is for whole numbers ending in 5.';
 }else if(n>5&&Math.abs(d)<=3&&near>0&&d!==0){
  strategy='Use '+near+'² = '+base+'. ('+near+(d>0?' + ':' − ')+Math.abs(d)+')² = '+base+(d>0?' + ':' − ')+Math.abs(2*near*d)+' + '+d*d+' = '+square+'. Both the middle adjustment and the small square matter.';
 }else if(anchors.has(n)){
  strategy='Memorise '+n+'² = '+square+' as an anchor. Picture a '+n+' by '+n+' square; use this fact to work out nearby squares.';
 }else{
  strategy='Start at '+(n-1)+'² = '+previous+'. The next square adds '+(n-1)+' + '+n+' = '+gap+'; '+previous+' + '+gap+' = '+square+'.';
 }
 // Squares to 100 are a maths extension beyond Dol factor-game targets (up to 1024).
 // Do not use the factor-game squareBounds which rejects values above 1024.
 const boundaryTarget=(n===32||n===100)?n*n:n*n+n,b=bounds(boundaryTarget);
 const boundary=b.exact?
  'For '+boundaryTarget+', the root is exactly '+b.limit+'. Include the middle pair '+b.limit+' × '+b.limit+' once.':
  'For '+boundaryTarget+', '+n+'² = '+square+' < '+boundaryTarget+' < '+(n+1)+'² = '+(n+1)**2+'. Check first-factor candidates only through '+n+'; larger partners are still discovered.';
 return {n,square,previous,gap,strategy,
  neighbouring:'('+(n-1)+')² = '+previous+'; add the next odd number, '+gap+', to get '+square+'.',
  visual:'A '+n+' × '+n+' square has '+square+' unit tiles. Starting from '+(n-1)+' × '+(n-1)+' adds '+gap+' new tiles: a row and a column sharing one corner.',
  inverse:'Because '+n+' × '+n+' = '+square+', √'+square+' = '+n+'. A square root asks for the side of a square with that area.',
  boundary,boundaryTarget,mirror:mirrorPattern(n),
  useCase:'A square garden '+n+' metres on each side has an area of '+square+' m², not '+2*n+' m². Side × side gives area.',
  caution:'Matching last digits do not prove two squares are equal. A mirrored pair shares its last two digits, not its whole answer.'};
}
export function squareQuestion(n,kind='square'){
 const m=squareMemory(n),b=bounds(m.boundaryTarget);
 if(kind==='square')return {n,kind,concept:squareConcept(n),answer:m.square,prompt:'What is '+n+'²?',hint:(n-1)+'² = '+m.previous+'. What odd number comes next?',steps:m.neighbouring+' '+m.strategy,context:'Square recall'};
 if(kind==='root')return {n,kind,concept:'square-root:'+n,answer:n,prompt:'What is √'+m.square+'?',hint:'Which whole number multiplied by itself makes '+m.square+'?',steps:m.inverse,context:'Inverse: square roots'};
 if(kind==='neighbour')return {n,kind,concept:'square-pattern:'+n,answer:m.gap,prompt:'How much do you add to '+(n-1)+'² to reach '+n+'²?',hint:'A new row and column add '+(n-1)+' + '+n+' tiles.',steps:m.neighbouring,context:'Odd-number pattern'};
 if(kind==='boundary')return {n,kind,concept:'square-boundary:'+n,answer:b.limit,prompt:'When listing factor pairs of '+m.boundaryTarget+', what is the largest whole-number first factor you need to check?',hint:'Find neighbouring squares around '+m.boundaryTarget+'. Include the root itself for an exact square.',steps:m.boundary,context:'Apply to factorisation'};
 if(kind==='area')return {n,kind,concept:'square-area:'+n,answer:m.square,prompt:'A square garden is '+n+' m long and '+n+' m wide. What is its area in m²?',hint:'Area of a square = side × side (not 4 × side).',steps:m.useCase,context:'Real-world use'};
 if(kind==='mirror'){
  if(!m.mirror)throw new RangeError('No in-range mirror pair for '+n);
  return {n,kind,concept:'square-mirror:'+n,answer:m.mirror.partner,prompt:'Which number mirrors '+n+' around '+m.mirror.center+', so their squares end in the same two digits?',hint:'The numbers are equally far from '+m.mirror.center+'.',steps:m.mirror.explanation,context:'Mirror-square patterns'};
 }
 throw new RangeError('Unknown square activity: '+kind);
}
function groupEvents(events){
 if(events instanceof Map)return events;
 const grouped=new Map();
 for(const e of Array.isArray(events)?events:[]){
  if(!e||typeof e.concept!=='string'||!Number.isFinite(e.timestamp))continue;
  if(!grouped.has(e.concept))grouped.set(e.concept,[]);
  grouped.get(e.concept).push(e);
 }
 return grouped;
}
// Existing square-studio events retain their original 1/3/7/14/30-day progression.
// Only an actual quick, unassisted response may earn 7/14/30/60/90-day gaps.
// Early repetition never moves a due date further away.
export function squareReview(events,n,now=Date.now(),kind='square'){
 validSquare(n);
 const concept=squareQuestion(n,kind).concept;
 const rows=[...(events instanceof Map?events.get(concept)||[]:
  (Array.isArray(events)?events:[]).filter(e=>e?.concept===concept))]
  .filter(e=>Number.isFinite(e.timestamp)).sort((a,b)=>a.timestamp-b.timestamp);
 if(!rows.length)return {n,seen:false,due:false,nextDue:null,streak:0,fastStreak:0,attempts:0,correct:0,assisted:0,status:'New'};
 let streak=0,fastStreak=0,nextDue=0,latest=0,correct=0,assisted=0,successes=0,fast=0;
 for(const e of rows){
  latest=e.timestamp;
  if(!e.correct||Number(e.hints)>0){
   streak=0;fastStreak=0;nextDue=latest+DAY;
   if(e.correct)assisted++;
   continue;
  }
  correct++;
  const fastAnswer=e.mode==='square-fluency'&&Number(e.durationMs)>0&&
   Number(e.durationMs)<=Number(e.context?.fastLimitMs||4000);
  if(!nextDue||latest>=nextDue-HOUR){
   streak=Math.min(streak+1,REVIEW_DAYS.length);
   fastStreak=fastAnswer?Math.min(fastStreak+1,FAST_REVIEW_DAYS.length):0;
   const ordinary=REVIEW_DAYS[streak-1],accelerated=fastStreak?FAST_REVIEW_DAYS[fastStreak-1]:0;
   // A slow quick-drill response needs reinforcement soon, even after older fluent returns.
   const days=e.mode==='square-fluency'&&!fastAnswer?(streak>=3?3:1):Math.max(ordinary,accelerated);
   nextDue=latest+DAY*days;
   successes++;
  }
  if(fastAnswer)fast++;
 }
 return {n,seen:true,due:nextDue<=now,nextDue,streak,fastStreak,attempts:rows.length,correct,assisted,fast,successes,lastSeen:latest,
  status:nextDue<=now?'Review due':fastStreak>=2?'Fluent':streak>=4?'Retaining':'Practising'};
}
export function squareSummary(events,now=Date.now()){
 const index=groupEvents(events);
 const facts=Array.from({length:SQUARE_LIMIT},(_,i)=>squareReview(index,i+1,now));
 const skills=[];
 for(let n=1;n<=SQUARE_LIMIT;n++){
  const kinds=['square','root','boundary','neighbour','area'];
  if(mirrorPattern(n))kinds.push('mirror');
  for(const kind of kinds){
   const f=squareReview(index,n,now,kind);
   if(f.seen)skills.push({...f,kind});
  }
 }
 return {facts,skills,seen:facts.filter(f=>f.seen).length,due:skills.filter(f=>f.due).length,
  retaining:facts.filter(f=>f.fastStreak>=2||f.streak>=4).length,
  fluent:facts.filter(f=>f.fastStreak>=1).length,
  nextDue:skills.filter(f=>f.nextDue>now).reduce((x,f)=>Math.min(x,f.nextDue),Infinity)};
}
export function chooseSquareFacts({band='foundation',mode='learn',selected=null,events=[],count=5,now=Date.now(),random=Math.random}={}){
 const range=SQUARE_BANDS.find(b=>b.id===band)||SQUARE_BANDS[0];
 const numbers=mode==='review'?Array.from({length:SQUARE_LIMIT},(_,i)=>i+1):
  Array.from({length:range.to-range.from+1},(_,i)=>i+range.from);
 let rows=numbers.map(n=>squareReview(events,n,now));
 if(mode==='review')rows=rows.filter(f=>f.due).sort((a,b)=>a.nextDue-b.nextDue);
 else{
  rows=rows.map(f=>({...f,rank:(f.seen?(f.due?0:2):1)+random()*.25})).sort((a,b)=>a.rank-b.rank);
  if(selected>=range.from&&selected<=range.to)rows=[rows.find(f=>f.n===selected),...rows.filter(f=>f.n!==selected)];
 }
 return rows.filter(Boolean).slice(0,Math.max(0,Math.min(SQUARE_LIMIT,count))).map(f=>f.n);
}
export function squareDeck({band='foundation',mode='learn',selected=null,events=[],now=Date.now(),random=Math.random}={}){
 if(mode==='review')return squareSummary(events,now).skills.filter(f=>f.due).sort((a,b)=>a.nextDue-b.nextDue).slice(0,10).map(f=>squareQuestion(f.n,f.kind));
 const numbers=chooseSquareFacts({band,mode,selected,events,now,random,count:mode==='mixed'?10:5});
 const kinds=mode==='mixed'?['square','root','square','boundary','neighbour','area','square','root','square','boundary']:
  ['square','square','root','boundary','area'];
 if(!numbers.length)return [];
 return kinds.map((kind,i)=>squareQuestion(numbers[i%numbers.length],kind));
}
export function quickSquareDeck({upTo=32,events=[],count=10,now=Date.now(),random=Math.random,exclude=[]}={}){
 upTo=[12,20,32,50,75,100].includes(Number(upTo))?Number(upTo):32;
 const ignored=new Set(exclude),indexed=groupEvents(events);
 const choices=Array.from({length:upTo},(_,i)=>squareReview(indexed,i+1,now))
  .filter(f=>!ignored.has(f.n)&&(!f.seen||f.due))
  .map(f=>({...f,rank:f.due?0:f.seen?1:2,tie:random()}))
  .sort((a,b)=>a.rank-b.rank||(a.due&&b.due?a.nextDue-b.nextDue:a.tie-b.tie));
 return choices.slice(0,Math.max(0,Math.min(count,SQUARE_LIMIT))).map(f=>squareQuestion(f.n,'square'));
}
