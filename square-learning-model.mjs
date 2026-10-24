// Square curriculum and spaced retrieval. Pure functions: use the shared Learning SDK for persistence/sync.
import {squareBounds} from './teaching-model.mjs';

export const SQUARE_BANDS = Object.freeze([
  {id:'foundation',from:1,to:12,label:'1–12 · foundations'},
  {id:'extension',from:13,to:20,label:'13–20 · mental strategies'},
  {id:'challenge',from:21,to:32,label:'21–32 · factor-search fluency'}
]);
export const REVIEW_DAYS = Object.freeze([1,3,7,14,30]);
const DAY = 86400000;
const HOUR = 3600000;
export const squareConcept = n => 'square:' + n;
export function validSquare(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 32) throw new RangeError('A square root from 1 to 32 is required.');
  return n;
}
export function squareMemory(n) {
  validSquare(n);
  const previous = (n-1)**2, square=n*n, gap=2*n-1;
  const near = Math.round(n/10)*10;
  const d=n-near;
  const base=near*near;
  const anchors = [1,2,3,4,5,10,11,12,15,20,25,30,32];
  let strategy;
  if (n%10===5 && n>=15) {
    const tens=Math.floor(n/10);
    strategy = n+' ends in 5: multiply '+tens+' × '+(tens+1)+' = '+(tens*(tens+1))+' and append 25. So '+n+'² = '+square+'. This shortcut is for whole numbers ending in 5.';
  } else if (n>5 && Math.abs(d)<=3 && near>0 && d!==0) {
    strategy = 'Use '+near+'² = '+base+'. ('+near+(d>0?' + ':' − ')+Math.abs(d)+')² = '+base+(d>0?' + ':' − ')+Math.abs(2*near*d)+' + '+(d*d)+' = '+square+'. Both the middle adjustment and the small square matter.';
  } else if (anchors.includes(n)) {
    strategy = 'Memorise '+n+'² = '+square+' as an anchor. Picture a '+n+' by '+n+' square; use this fact to work out nearby squares.';
  } else {
    strategy = 'Start at '+(n-1)+'² = '+previous+'. The next square adds '+(n-1)+' + '+n+' = '+gap+'; '+previous+' + '+gap+' = '+square+'.';
  }
  const boundaryTarget=n===32?1024:n*n+n;
  const bounds=squareBounds(boundaryTarget);
  const boundary = bounds.exact
    ? 'For '+boundaryTarget+', the root is exactly '+bounds.limit+'. Include the middle pair '+bounds.limit+' × '+bounds.limit+' once.'
    : 'For '+boundaryTarget+', '+n+'² = '+square+' < '+boundaryTarget+' < '+(n+1)+'² = '+((n+1)**2)+'. Check first-factor candidates only through '+n+'; larger partners are still discovered.';
  return {
    n,square,previous,gap,strategy,
    neighbouring:'('+(n-1)+')² = '+previous+'; add the next odd number, '+gap+', to get '+square+'.',
    visual:'A '+n+' × '+n+' grid has '+square+' tiles. Starting from '+(n-1)+' × '+(n-1)+' adds '+gap+' new tiles: a row and a column sharing one corner.',
    inverse:'Because '+n+' × '+n+' = '+square+', √'+square+' = '+n+'. A square root asks for the side of a square with that area.',
    boundary, boundaryTarget,
    useCase:'A square garden '+n+' metres on each side has an area of '+square+' m², not '+(2*n)+' m². Side × side gives area.',
    caution:'The last digit of a square is a clue, not proof of the square root. Use a known square or calculate to check.'
  };
}
export function squareQuestion(n,kind='square') {
  const m=squareMemory(n), b=squareBounds(m.boundaryTarget);
  if(kind==='square')return {n,kind,concept:squareConcept(n),answer:m.square,prompt:'What is '+n+'²?',hint:(n-1)+'² = '+m.previous+'. What odd number comes next?',steps:m.neighbouring+' '+m.strategy,context:'Square recall'};
  if(kind==='root')return {n,kind,concept:'square-root:'+n,answer:n,prompt:'What is √'+m.square+'?',hint:'Which whole number multiplied by itself makes '+m.square+'?',steps:m.inverse,context:'Inverse: square roots'};
  if(kind==='neighbour')return {n,kind,concept:'square-pattern:'+n,answer:m.gap,prompt:'How much do you add to '+(n-1)+'² to reach '+n+'²?',hint:'A new row and column add '+(n-1)+' + '+n+' tiles.',steps:m.neighbouring,context:'Odd-number pattern'};
  if(kind==='boundary')return {n,kind,concept:'square-boundary:'+n,answer:b.limit,prompt:'When listing factor pairs of '+m.boundaryTarget+', what is the largest whole-number first factor you need to check?',hint:'Find two consecutive squares around '+m.boundaryTarget+'. Include the root itself if exact.',steps:m.boundary,context:'Apply to factorisation'};
  if(kind==='area')return {n,kind,concept:'square-area:'+n,answer:m.square,prompt:'A square garden is '+n+' m long and '+n+' m wide. What is its area in m²?',hint:'Area of a square = side × side (not 4 × side).',steps:m.useCase,context:'Real-world use'};
  throw new RangeError('Unknown square activity: '+kind);
}
// Reconstruct reviews from the same SDK concept events that synchronise across devices.
// Retries in one sitting do not count as days of retention.
export function squareReview(events,n,now=Date.now(),kind='square') {
  validSquare(n);
  const concept=squareQuestion(n,kind).concept;
  const rows=(Array.isArray(events)?events:[])
    .filter(e=>e?.concept===concept&&Number.isFinite(e.timestamp))
    .sort((a,b)=>a.timestamp-b.timestamp);
  if(!rows.length)return {n,seen:false,due:false,nextDue:null,streak:0,attempts:0,correct:0,assisted:0,status:'New'};
  let streak=0,nextDue=0,latest=0,correct=0,assisted=0,successes=0;
  for(const e of rows) {
    latest=e.timestamp;
    if(!e.correct || Number(e.hints)>0) {
      streak=0;nextDue=latest+DAY;
      if(e.correct) assisted++;
    } else {
      correct++;
      if(!nextDue||latest>=nextDue-HOUR) {
        streak=Math.min(streak+1,REVIEW_DAYS.length);
        nextDue=latest+DAY*REVIEW_DAYS[streak-1];
        successes++;
      }
    }
  }
  return {n,seen:true,due:nextDue<=now,nextDue,streak,attempts:rows.length,correct,assisted,successes,
    lastSeen:latest,status:nextDue<=now?'Review due':streak>=4?'Retaining':'Practising'};
}
export function squareSummary(events,now=Date.now()) {
  const facts=Array.from({length:32},(_,i)=>squareReview(events,i+1,now));
  const skills=Array.from({length:32},(_,i)=>i+1).flatMap(n=>['square','root','boundary','neighbour','area'].map(kind=>({...squareReview(events,n,now,kind),kind}))).filter(f=>f.seen);
  return {facts,skills,seen:facts.filter(f=>f.seen).length,due:skills.filter(f=>f.due).length,
    retaining:facts.filter(f=>f.streak>=4).length,nextDue:skills.filter(f=>f.nextDue>now).reduce((x,f)=>Math.min(x,f.nextDue),Infinity)};
}
export function chooseSquareFacts({band='foundation',mode='learn',selected=null,events=[],count=5,now=Date.now(),random=Math.random}={}) {
  const range=SQUARE_BANDS.find(b=>b.id===band)||SQUARE_BANDS[0];
  const numbers=mode==='review' ? Array.from({length:32},(_,i)=>i+1) : Array.from({length:range.to-range.from+1},(_,i)=>i+range.from);
  let rows=numbers.map(n=>squareReview(events,n,now));
  if(mode==='review')rows=rows.filter(f=>f.due).sort((a,b)=>a.nextDue-b.nextDue);
  else {
    rows=rows.map(f=>({...f,rank:(f.seen? (f.due?0:2):1)+random()*0.25}))
      .sort((a,b)=>a.rank-b.rank);
    if(selected>=range.from&&selected<=range.to)rows=[rows.find(f=>f.n===selected),...rows.filter(f=>f.n!==selected)];
  }
  return rows.filter(Boolean).slice(0,Math.max(0,Math.min(32,count))).map(f=>f.n);
}
export function squareDeck({band='foundation',mode='learn',selected=null,events=[],now=Date.now(),random=Math.random}={}) {
  if(mode==='review')return squareSummary(events,now).skills.filter(f=>f.due).sort((a,b)=>a.nextDue-b.nextDue).slice(0,10).map(f=>squareQuestion(f.n,f.kind));
  const numbers=chooseSquareFacts({band,mode,selected,events,now,random,count:mode==='mixed'?10:5});
  const kinds=mode==='mixed'?['square','root','square','boundary','neighbour','area','square','root','square','boundary']
    :['square','square','root','boundary','area'];
  if(!numbers.length)return [];
  return kinds.map((kind,i)=>squareQuestion(numbers[i%numbers.length],kind));
}
