import {factorPairs} from './logic.mjs';
const KEY='dol-fact-evidence-v1',PREF='dol-auto-difficulty-v1';
const stages=[['foundation',24],['fluency',144],['systematic',256],['strategic',512],['expert',1024]];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const pairKey=(a,b)=>Math.min(a,b)+'x'+Math.max(a,b);
export function createInsights({getState,refresh}){
 let events=read(KEY,[]),auto=read(PREF,true),lastAt=performance.now(),mistakes=0,assisted=false,level=read('dol-adaptive-level-v1',0),reason='Beginning with foundation numbers; accuracy and independent recall determine progression.';
 const section=document.createElement('section');section.className='insight-section';section.innerHTML='<div class="insight-header"><h2>Multiplication fact map</h2><p>Each square shows the product. Colours reflect your own attempts, not a fixed multiplication-table rainbow.</p></div><div class="insight-legend"><span>● Not attempted</span><span>● Needs practice</span><span>● Developing</span><span>● Confident</span></div><div class="insight-grid-wrap"><div id="insightGrid" class="insight-grid" role="group" aria-label="Multiplication fact confidence chart"></div></div><p id="factDetail" class="muted">Select any square to see its history and next steps.</p><p id="adaptiveExplanation" class="muted"></p>';
 document.getElementById('progressView').append(section);
 const concepts=document.createElement('section');concepts.className='insight-section';concepts.innerHTML='<h2>Concepts practised</h2><p>Tap a concept to inspect attempts, mistakes and support used.</p><div id="conceptList" class="concept-list"></div><p id="conceptDetail" class="muted"></p>';section.before(concepts);
 const config=document.createElement('label');config.className='check';config.innerHTML='<input type="checkbox" id="adaptiveToggle"> Adapt difficulty and number limit automatically';document.querySelector('.controls').append(config);
 const glossary=document.createElement('section');glossary.className='insight-section glossary';glossary.innerHTML='<h2>Mathematical vocabulary</h2><p>Learn the precise language of factors and multiplication.</p><div class="glossary-grid"></div>';document.getElementById('learnView').append(glossary);
 const terms=[
 ['Factor','A whole number that divides another whole number exactly, with no remainder.','7 is a factor of 112 because 112 ÷ 7 = 16.'],
 ['Factor pair','Two whole numbers whose product is the target number.','7 and 16 form a factor pair of 112.'],
 ['Factorise','Write a number as a product of factors.','112 = 7 × 16.'],
 ['Prime factorisation','Express a number as a product of prime numbers.','112 = 2 × 2 × 2 × 2 × 7.'],
 ['Multiple','A result of multiplying a number by a whole number.','112 is a multiple of 7.'],
 ['Product','The result of multiplication.','The product of 7 and 16 is 112.'],
 ['Quotient','The result of division.','112 ÷ 7 has quotient 16.'],
 ['Divisor','A number used to divide another number.','7 is the divisor in 112 ÷ 7.'],
 ['Dividend','The number being divided.','112 is the dividend in 112 ÷ 7.'],
 ['Remainder','What is left when division does not make exact groups.','113 ÷ 7 leaves remainder 1.'],
 ['Divisibility','Whether a number can be divided exactly by another whole number.','112 is divisible by 7.'],
 ['Prime number','A whole number greater than 1 with exactly two positive factors.','7 is prime; 1 is not.'],
 ['Composite number','A whole number greater than 1 with more than two positive factors.','12 is composite.'],
 ['Square number','The product of a whole number multiplied by itself.','49 = 7 × 7.'],
 ['Common factor','A factor shared by two or more numbers.','4 is a common factor of 12 and 20.'],
 ['Greatest common factor','The largest positive factor shared by two numbers.','GCF(12,20) = 4.'],
 ['Array','A rectangular arrangement of objects in equal rows and columns.','3 rows of 4 show 3 × 4 = 12.'],
 ['Factor rainbow','A diagram connecting matching small and large factors.','For 12: 1–12, 2–6 and 3–4.']
 ];for(const [title,meaning,example] of terms){const article=document.createElement('article');article.innerHTML='<h3></h3><p></p><small></small>';article.querySelector('h3').textContent=title;article.querySelector('p').textContent=meaning;article.querySelector('small').textContent=example;glossary.querySelector('.glossary-grid').append(article);}
 function status(a,b){const key=pairKey(a,b),arr=events.filter(e=>e.key===key&&e.outcome==='correct'),attempts=events.filter(e=>e.key===key),ind=arr.filter(e=>!e.assisted&&e.errors===0&&e.ms!==null),recent=ind.slice(-3),threshold=12000;
  if(!attempts.length)return {kind:'unknown',label:'Not attempted',arr,attempts};
  if(recent.length>=3&&recent.every(e=>e.ms<=threshold)&&!attempts.slice(-3).some(e=>e.outcome!=='correct'||e.assisted))return {kind:'strong',label:'Confident',arr,attempts};
  if(ind.length>=1&&attempts.slice(-2).some(e=>e.outcome==='correct'&&!e.assisted))return {kind:'developing',label:'Developing',arr,attempts};
  return {kind:'weak',label:'Needs practice',arr,attempts};
 }
 function grid(){const target=document.getElementById('insightGrid');target.replaceChildren();for(let a=1;a<=12;a++)for(let b=1;b<=12;b++){const s=status(a,b),button=document.createElement('button');button.type='button';button.className='fact-cell '+s.kind;button.textContent=a*b;button.title=a+' × '+b+': '+s.label;button.setAttribute('aria-label',a+' times '+b+', '+s.label);button.onclick=()=>{const tries=s.attempts.length,fast=s.arr.filter(e=>!e.assisted&&e.errors===0&&e.ms!==null&&e.ms<=12000).length;document.getElementById('factDetail').textContent=a+' × '+b+' = '+(a*b)+' · '+s.label+' · '+tries+' logged attempts · '+fast+' independent correct responses within 12 seconds. '+(tries?'Most recent: '+new Date(s.attempts.at(-1).at).toLocaleString():'This fact has not yet been assessed.');};target.append(button);}}
 function conceptsView(){const c=document.getElementById('conceptList');c.replaceChildren();const grouped=new Map();for(const e of events){for(const id of [e.key&&'Multiplication: '+e.key,e.divisor&&'Divisibility by '+e.divisor,e.outcome==='missed'&&'Completeness: missed pairs'].filter(Boolean)){if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(e);}}
 for(const [name,items] of [...grouped].sort((a,b)=>a[0].localeCompare(b[0]))){const b=document.createElement('button');b.type='button';b.className='concept-button';b.textContent=name+' ('+items.length+')';b.onclick=()=>{const ok=items.filter(x=>x.outcome==='correct'),help=ok.filter(x=>x.assisted);document.getElementById('conceptDetail').textContent=name+': '+items.length+' recorded events, '+ok.length+' correct, '+help.length+' assisted; '+items.filter(x=>x.outcome==='incorrect'||x.outcome==='missed').length+' errors/misses. Latest: '+new Date(items.at(-1).at).toLocaleString();};c.append(b);}
 if(!grouped.size)c.textContent='No detailed factor evidence yet. New attempts will appear here.';}
 function summary(){grid();conceptsView();document.getElementById('adaptiveExplanation').textContent='Adaptive level '+(level+1)+' of 5: '+stages[level][0]+' (limit '+stages[level][1]+'). '+reason+' Repeated numbers are limited where possible; weaker multiplication facts receive extra practice.';}
 function record(pair,outcome,{ms=null,hints=false,errors=0,target=null}={}){if(!pair||!pair.length)return;const [a,b]=pair.map(Number);if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<1||b<1)return;const e={id:crypto.randomUUID?.()||Date.now()+'-'+Math.random(),at:Date.now(),key:pairKey(a,b),divisor:Math.min(a,b),target:target||a*b,outcome,assisted:!!hints,errors,ms:ms===null?null:Math.round(ms)};events.push(e);if(events.length>10000)events=events.slice(-10000);save(KEY,events);}
 function answer(pair,outcome,help){const elapsed=Math.max(1,performance.now()-lastAt);if(outcome==='incorrect'){mistakes++;record(pair,'incorrect',{ms:elapsed,errors:mistakes,target:getState().target});}else if(outcome==='correct'){record(pair,'correct',{ms:elapsed,hints:help||assisted,errors:mistakes,target:getState().target});lastAt=performance.now();mistakes=0;assisted=false;}}
 function start(){lastAt=performance.now();mistakes=0;assisted=false;}
 function help(){assisted=true;}
 function finish(state){for(const [a,b] of state.pairs)if(!state.found.has(a+'-'+b))record([a,b],'missed',{ms:null,target:state.target});if(!auto)return;
 const completed=events.filter(e=>e.outcome==='correct'||e.outcome==='missed').slice(-40);const correct=completed.filter(e=>e.outcome==='correct'&&!e.assisted&&e.errors===0),slow=correct.filter(e=>e.ms!==null&&e.ms>18000);
 if(completed.length<10){reason='Collecting evidence: '+completed.length+' of 10 factor-pair observations.';return;}
 const ratio=correct.length/completed.length;const current=level;
 if(ratio>=.85&&slow.length/Math.max(1,correct.length)<.35&&completed.length>=20&&level<4){level++;reason='Promoted after strong independent accuracy and pace across recent factor pairs.';}
 else if(ratio<.48&&level>0){level--;reason='Moved to simpler numbers because recent independent accuracy needs reinforcement.';}
 else reason='Holding this level: '+Math.round(ratio*100)+'% recent independent, error-free factor-pair responses; '+slow.length+' slower responses.';
 if(level!==current)save('dol-adaptive-level-v1',level);
 }
 function choose(){if(!auto)return null;const [stage,limit]=stages[level];const state=getState();state.stage=stage;state.limit=limit;const weak=events.filter(e=>e.outcome==='incorrect'||e.outcome==='missed'||e.assisted).slice(-30).map(e=>Number(e.key?.split('x')[0])).filter(x=>x>=2&&x<=12);const preferred=weak.length?weak[Math.floor(Math.random()*weak.length)]:null;const seen=events.slice(-15).map(e=>e.target);const candidates=[];for(let n=2;n<=limit;n++){const pairs=factorPairs(n);if(stage==='foundation'&&pairs.length>5)continue;if(stage==='fluency'&&!pairs.some(([a,b])=>a<=12&&b<=12))continue;if(preferred&&!pairs.some(([a,b])=>a===preferred||b===preferred))continue;if(n===state.previous)continue;candidates.push(n);}
 if(preferred&&candidates.length){const fresh=candidates.filter(n=>!seen.includes(n));const list=fresh.length?fresh:candidates;return {number:list[Math.floor(Math.random()*list.length)],reason:'Revisiting the '+preferred+' times table with '+(level<=1?'simpler':'appropriate')+' factor pairs.'};}
 return null;}
 function render(){config.querySelector('input').checked=auto;const state=getState(),running=['running','paused'].includes(state.phase);config.querySelector('input').disabled=running;if(auto&&!running){state.stage=stages[level][0];state.limit=stages[level][1];document.getElementById('stageSelect').value=state.stage;document.getElementById('limitSelect').value=state.limit;}document.getElementById('stageSelect').disabled=running||auto;document.getElementById('limitSelect').disabled=running||auto;}
 config.querySelector('input').onchange=e=>{auto=e.target.checked;save(PREF,auto);render();refresh();};
 return {start,answer,help,finish,choose,render,summary,record,get events(){return events;},get auto(){return auto;},get level(){return level;}};
}
