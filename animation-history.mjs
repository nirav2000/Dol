/* Dol Animation History Lab.
   Archived styles and reconstructed factor-card markup run in a sandboxed,
   SCRIPT-FREE iframe. Neither historical app code nor account state executes. */
const $=id=>document.getElementById(id);
const list=$('historyList'),grid=$('comparisonGrid');
let catalog=null,mode='versions',changesOnly=false,event='prime';
const pinned=[],cache=new Map();
const LAB=[
 ['rainbow','Rainbow Ribbon'],['orbit','Cosmic Orbit'],
 ['ripple','Prism Ripple'],['quiet','Quiet Sparkle'],
 ['gem-glow','Golden Glow'],['gem-flip','Smooth Flip'],['gem-pop','Elastic Pop']
];
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const child=(tag,klass,text)=>{
 const el=document.createElement(tag);if(klass)el.className=klass;
 if(text!=null)el.textContent=String(text);return el;
};
const date=str=>new Date(str).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const sourceLink=sha=>'https://github.com/nirav2000/Dol/commit/'+encodeURIComponent(sha);
function entryList(){return mode==='commits'?catalog.commits:catalog.versions;}
function entryRecord(entry){return mode==='commits'?entry:catalog.commits.find(c=>c.sha===entry.lastCommit);}
function renderHistory(){
 if(!catalog)return;
 const q=$('historySearch').value.trim().toLowerCase();
 const entries=entryList().filter(x=>{
  if(changesOnly&&!(mode==='commits'?x.changed:x.animationChanges))return false;
  return !q||[x.version,x.sha||x.lastCommit,x.message||'',x.kindLabel||'',x.variantId||''].some(v=>String(v).toLowerCase().includes(q));
 });
 $('historyCount').textContent=entries.length+' / '+entryList().length;
 const frag=document.createDocumentFragment();
 for(const entry of entries){
  const record=entryRecord(entry);if(!record)continue;
  const btn=child('button','history-row');
  btn.type='button';btn.classList.toggle('selected',pinned.some(x=>x.sha===record.sha));
  const heading=child('strong');
  heading.append(child('span',null,'v'+entry.version));
  if(mode==='commits'&&entry.changed)heading.append(child('span','change-mark','● EFFECT CHANGE'));
  else if(mode==='versions'&&entry.animationChanges)heading.append(child('span','change-mark',entry.animationChanges+' EFFECT CHANGE'+(entry.animationChanges===1?'':'S')));
  btn.append(heading);
  btn.append(child('small',null,(mode==='commits'?record.message:record.kindLabel)||'Original app behaviour'));
  btn.append(child('small','minor',date(mode==='commits'?record.date:entry.lastDate)+' · '+record.sha.slice(0,10)+(mode==='versions'?' · '+entry.commitCount+' commit'+(entry.commitCount===1?'':'s'):'')));
  btn.addEventListener('click',()=>addPin(record));
  frag.append(btn);
 }
 list.replaceChildren(frag);
 if(!entries.length)list.append(child('p','history-empty','No matching revisions. Clear the search or switch off “Only animation changes”.'));
}
function addPin(record){
 if(pinned.some(x=>x.sha===record.sha)){
  document.getElementById('card-'+record.sha.slice(0,12))?.scrollIntoView({behavior:'smooth',block:'nearest'});
  return;
 }
 if(pinned.length>=4)pinned.shift();
 pinned.push({sha:record.sha,record,labMode:record.kind==='prime-lab-only'?'rainbow':'live'});
 renderCards();renderHistory();
}
function renderMilestones(){
 pinned.length=0;
 const versions=['2.5.10','2.5.11','2.6.6',catalog.release];
 for(const v of versions){
  const fromVersion=catalog.versions.find(x=>x.version===v);
  const record=catalog.commits.find(x=>x.sha===fromVersion?.lastCommit);
  if(record&&!pinned.some(x=>x.sha===record.sha))pinned.push({sha:record.sha,record,labMode:record.kind==='prime-lab-only'?'rainbow':'live'});
 }
 if(pinned.length<4){for(const r of catalog.commits.filter(x=>x.changed)){if(pinned.length===4)break;if(!pinned.some(x=>x.sha===r.sha))pinned.push({sha:r.sha,record:r,labMode:'live'});}}
 renderCards();renderHistory();
}
function renderCards(){
 grid.replaceChildren();
 if(!pinned.length){grid.append(child('div','empty-selection','Choose any version or commit from the history to see its original factor-card animation.'));return;}
 for(const pin of pinned){
  const {record:r}=pin;
  const card=child('article','version-card');card.id='card-'+r.sha.slice(0,12);
  const head=child('div','card-top');
  const title=child('div');
  title.append(child('p','eyebrow','GIT RECORD · '+date(r.date)),child('h3',null,'Dol v'+r.version),child('p',null,r.kindLabel));
  const remove=child('button','close','×');remove.type='button';remove.title='Remove this version';remove.setAttribute('aria-label','Remove v'+r.version);
  remove.addEventListener('click',()=>{const i=pinned.indexOf(pin);if(i>=0)pinned.splice(i,1);renderCards();renderHistory();});
  head.append(title,remove);card.append(head);
  const meta=child('div','card-meta');
  meta.append(child('span',null,r.sha.slice(0,10)),child('span',null,r.changed?'Effect changed in this commit':'Inherited effect'));
  if(r.labAvailable)meta.append(child('span',null,'Prime Lab preserved'));
  if(r.manifestVersion&&r.manifestVersion!==r.version)meta.append(child('span',null,'File metadata at commit: v'+r.manifestVersion));
  card.append(meta);
  const frame=document.createElement('iframe');frame.className='preview-frame';
  frame.setAttribute('sandbox','');frame.setAttribute('loading','eager');
  frame.title='Archived factor-card animation v'+r.version+' at commit '+r.sha.slice(0,10);
  card.append(frame);
  const controls=child('div','controls');
  const replay=child('button','btn filled','↻ Replay');replay.type='button';replay.addEventListener('click',()=>playPin(pin,frame));
  controls.append(replay);
  if(r.labAvailable){
   const sel=document.createElement('select');sel.setAttribute('aria-label','Animation design for Dol v'+r.version);
   const modes=[...(r.kind==='prime-lab-only'?[]:[['live','As displayed in the game']]),...LAB.map(([kind,label])=>[kind,'Lab · '+label])];
   for(const [value,label] of modes){const opt=document.createElement('option');opt.value=value;opt.textContent=label;sel.append(opt);}
   sel.value=pin.labMode;
   sel.addEventListener('change',()=>{pin.labMode=sel.value;playPin(pin,frame);});
   controls.append(sel);
  }
  card.append(controls);
  const foot=child('div','card-foot');
  const context=child('span','context','Loading archived CSS…');
  const link=document.createElement('a');link.href=sourceLink(r.sha);link.target='_blank';link.rel='noopener noreferrer';link.textContent='View source commit ↗';
  foot.append(context,link);card.append(foot);
  grid.append(card);
  pin.frame=frame;pin.context=context;
  playPin(pin,frame);
 }
}
function snapshot(renderId){
 if(!/^[a-f0-9]{20}$/.test(renderId))return Promise.reject(new Error('Invalid archive entry'));
 if(!cache.has(renderId))cache.set(renderId,fetch('./animation-history-data/effects/'+renderId+'.json').then(r=>{
  if(!r.ok)throw Error('Archive snapshot not published ('+r.status+')');
  return r.json();
 }));
 return cache.get(renderId);
}
function sample(evt){
 if(evt==='prime')return {n:7,a:1,b:7,kind:'prime',complete:true,label:'PRIME'};
 if(evt==='square')return {n:49,a:7,b:7,kind:'square',complete:true,label:'PERFECT SQUARE'};
 if(evt==='power')return {n:8,a:2,b:4,kind:'power',complete:true,label:'POWER OF TWO'};
 if(evt==='complete')return {n:24,a:3,b:8,kind:'composite',complete:true,label:'ALL PAIRS FOUND'};
 return {n:24,a:3,b:8,kind:'correct',complete:false,label:'CORRECT'};
}
function labelForEvent(s,evt){
 const message={
  prime:'Prime number · only one factor pair',
  square:'Perfect square · equal factor pair',
  correct:'Correct discovery · before the round ends',
  power:'Power of 2 · completing all pairs',
  complete:'Composite number · completing all pairs'
 };
 return message[evt]+' · '+s.a+' × '+s.b+' = '+s.n;
}
function sparkDOM(kind,modern=false){
 const positions=modern?[[-42,-24],[0,-36],[42,-24],[42,24],[0,36],[-42,24]]:[[-60,-32],[0,-48],[60,-32],[62,32],[0,48],[-62,32]];
 const colors=['#ffe27e','#70e5ff','#ff85aa','#a7faac','#c2a1ff','#ffb16c'];
 const symbols=kind==='square'?'◆':kind==='power'?'⚡':'✦';
 return positions.map(([x,y],i)=>'<span class="number-celebration-spark" style="--spark-x:'+x+'px;--spark-y:'+y+'px;--spark-color:'+colors[i]+';--spark-delay:'+(.22+i*.06)+'s">'+symbols+'</span>').join('');
}
function primeStars(kind='old'){
 const offsets=kind==='new'?[[-78,-28],[-54,35],[-15,-55],[24,46],[70,-39],[82,16],[-90,8],[42,-61]]:
  [[-64,-36],[0,-54],[66,-34],[78,0],[59,39],[0,52],[-62,39],[-78,0]];
 const oldColors=['#ffe27e','#70e5ff','#ff85aa','#a7faac','#c2a1ff','#ffb16c','#c7fcff','#fff2a3'];
 const newColors=['#ff79af','#ffd260','#7af2b6','#60cbff','#ad8cff'];
 return offsets.map(([x,y],i)=>'<span class="prime-star" style="--star-x:'+x+'px;--star-y:'+y+'px;--star-color:'+(kind==='new'?newColors[i%5]:oldColors[i])+';--star-delay:'+(kind==='new'?.14+i*.09:.48+i*.075)+'s">'+(i%3?'✦':'✧')+'</span>').join('');
}
function originalPrime(s){
 return '<span class="prime-bubble" aria-hidden="true">✦ PRIME</span><span class="prime-stars" aria-hidden="true">'+primeStars()+'</span>';
}
function genericEffect(s,modern=false,label=true){
 return '<span class="number-celebration number-celebration--'+s.kind+'" aria-hidden="true">'+
  (label?'<span class="number-celebration-label">'+
   (s.kind==='prime'?'✦ PRIME':s.kind==='square'?'◆ PERFECT SQUARE':s.kind==='power'?'⚡ POWER OF TWO':s.kind==='composite'?'✦ ALL PAIRS FOUND':'✓ CORRECT')+'</span>':'')+
  '<span class="number-celebration-sparks">'+sparkDOM(s.kind,modern)+'</span></span>';
}
function targetOverlay(s,src){
 const functions=src.functions||{},special=!!functions.showSpecialAchievement;
 const kind=s.kind==='correct'?'pair':s.kind;
 const burst='<div class="factor-target-burst'+(s.complete?' is-complete':'')+'" data-kind="'+kind+'" aria-hidden="true"><b class="factor-target-burst-label">'+
 (s.complete?'✦ '+s.label:s.kind==='square'?'◆ '+s.a+'² = '+s.n:s.a+' × '+s.b+' ✓')+'</b></div>';
 let extra='';
 if(special&&s.kind==='prime'&&s.complete)
  extra='<span class="prime-ribbon" aria-hidden="true"><b class="prime-bubble">✦ PRIME</b><span class="prime-stars">'+primeStars('new')+'</span></span>';
 if(special&&s.kind==='square'&&s.complete)
  extra='<span class="square-bloom" aria-hidden="true"><b class="square-bloom-label">7 × 7 = 49</b><span class="square-bloom-cells"><i style="--square-step:0"></i><i style="--square-step:1"></i><i style="--square-step:2"></i><i style="--square-step:3"></i></span></span>';
 return '<div id="playView"><div class="number-tile"><strong id="numberValue">'+s.n+'</strong>'+burst+extra+'</div></div>';
}
function gameMarkup(src,evt){
 const s=sample(evt),f=src.functions||{},original=!!f.celebratePrimeResult,numberType=!!f.celebrateNumberResult;
 const modern=!!f.showFactorTargetAnimation,canPair=!!f.animateDiscoveredPair;
 let overlay='',tileClass='',target='';
 if(evt==='prime'&&original){tileClass=' prime-rainbow-celebration';overlay=originalPrime(s);}
 if(s.complete&&numberType){overlay=genericEffect(s,!!f.celebrateTile,true);}
 if(!s.complete&&canPair)tileClass+=' layout-pair-chip pair-discovery';
 if(!s.complete&&!!f.celebrateTile)overlay=genericEffect(s,true,false);
 if(modern){
  target=targetOverlay(s,src);
  if(s.complete&&numberType&&f.celebrateTile)overlay=genericEffect(s,true,true);
  if(!s.complete&&f.celebrateTile)overlay=genericEffect(s,true,false);
 }
 const wrapper=!s.complete&&canPair?'layoutPairGrid':'answerReview';
 if(overlay.includes('number-celebration'))tileClass+=' number-celebrating';
 const tile='<div id="'+wrapper+'"><button class="review-pair credited'+tileClass+'" data-review-pair="'+s.a+'-'+s.b+'" data-pair-key="'+s.a+'-'+s.b+'" type="button" tabindex="-1"><span class="pair-number">'+s.a+'</span><span class="pair-times">×</span><span class="pair-number">'+s.b+'</span>'+overlay+'</button></div>';
 const notice=evt==='prime'&&original?'Original v2.5.11 prime result · Rainbow Ribbon':
   !s.complete&&!canPair?'This revision did not animate an individual correct answer':
   !s.complete?'Correct pair animation as defined at this commit':
   !numberType&&!original&&!modern?'No special completion animation at this commit':
   modern?'Target and factor-card effects as at this commit':numberType?'Number-type celebration as at this commit':'Source animation';
 const className=modern?'with-target':'single-card';
 return {body:'<div class="preview-stage '+className+'">'+target+tile+'</div>',notice};
}
function labMarkup(kind){
 const k=LAB.some(x=>x[0]===kind)?kind:'rainbow';
 const rays=[[0,-59],[55,-43],[76,-6],[65,38],[20,58],[-28,55],[-68,25],[-71,-20],[-38,-50]];
 const colors=['#ffe27e','#70e5ff','#ff85aa','#a7faac','#c2a1ff','#ffb16c','#c7fcff','#fff2a3'];
 const count=k==='quiet'?4:k==='rainbow'?9:7;
 const stars=Array.from({length:count},(_,i)=>'<span class="star" style="--color:'+colors[i%colors.length]+';--x:'+rays[i][0]+'px;--y:'+rays[i][1]+'px;--delay:'+(3.2*(.16+i*.025))+'s">'+(i%3?'✦':'✧')+'</span>').join('');
 return '<section class="card '+k+' playing" style="--duration:3.2s"><div class="scene" aria-label="1 times 7; 7 is prime">'+
 '<div class="ring one"></div><div class="ring two"></div><div class="frame"><div class="outline"></div><div class="tile">1 × 7</div></div>'+
 '<div class="bubble">✦ PRIME</div><div class="particles" aria-hidden="true">'+stars+'</div></div></section>';
}
function sandboxDocument(src,evt,labMode){
 const isLab=labMode!=='live'||src.kind==='prime-lab-only';
 const sourceCSS=isLab?src.css?.['prime-animation-lab.css']||'':
  ['styles.css','round-tools.css','focus-mode.css','mobile-entry.css','strategy-coach.css','factor-patterns.css','tablet-keypad.css','layout-options.css','ui/pairboard-phone.css','ui/pairboard-tablet.css','ui/pairboard-desktop.css','mobile-learning.css','mobile-redesign.css','focus-celebrations.css','focus-learning.css'].map(p=>src.css?.[p]||'').join('\n');
 const markup=isLab?labMarkup(labMode==='live'?'rainbow':labMode):gameMarkup(src,evt).body;
 const note=isLab?'Exact archived Prime Lab CSS · '+(LAB.find(x=>x[0]===labMode)?.[1]||'Rainbow Ribbon')+
  ' · original 3.2 s':gameMarkup(src,evt).notice;
 const frameCSS='html{color-scheme:dark;background:#090b0a}*{box-sizing:border-box}body{margin:0;background:#080b09;color:#eefcf0;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.preview-caption{font:800 10px/1.4 system-ui,sans-serif;color:#b6d7c1;letter-spacing:.1px;text-align:center;margin:7px 6px 4px;min-height:14px}.preview-stage{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;min-height:197px;padding:9px 14px 15px}.preview-stage #answerReview{width:100%;max-width:260px;display:flex;align-items:center;justify-content:center;overflow:visible}.preview-stage .review-pair{width:100%;min-height:76px;cursor:default;pointer-events:none}.preview-stage .number-tile{width:250px!important;max-width:95%;height:92px!important;min-height:92px!important;aspect-ratio:auto!important;container-type:normal!important;display:grid;place-items:center;position:relative;border-radius:18px}.preview-stage .number-tile strong{font-size:68px!important;letter-spacing:-.03em!important;line-height:1}.preview-stage .number-tile .factor-target-burst{border-radius:18px}.preview-stage .review-pair .pair-number{font-size:25px}.preview-stage .review-pair .pair-times{font-size:18px}.card{max-width:100%;margin:6px auto;padding:7px!important;border:0!important;background:#080b09!important;overflow:hidden}.card .scene{height:202px!important}.card .frame{top:83px!important}.card .bubble{top:95px!important}.card .ring{top:84px!important}.card .star{top:117px!important}@media(prefers-reduced-motion:reduce){.preview-caption{color:#c7daca}}';
 // Historical CSS remains exact. The final stylesheet only makes a compact
 // card fit the preview frame, without altering the archived keyframes.
 const safeCSS=String(sourceCSS).replace(/<\/style/gi,'<\\/style');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>'+safeCSS+'</style><style>'+frameCSS+'</style></head><body>'+
  '<div class="preview-caption">'+htmlEscape(isLab?'Prime Lab · 1 × 7 = 7':labelForEvent(sample(evt),evt))+'</div>'+markup+
  '<div class="preview-caption">'+htmlEscape(note)+'</div></body></html>';
}
async function playPin(pin,frame){
 const record=pin.record,sha=record.sha,renderId=record.renderId;
 pin.context.textContent='Loading original CSS…';
 try{
  const src=await snapshot(renderId);
  if(!pinned.includes(pin)||pin.frame!==frame)return;
  frame.srcdoc=sandboxDocument(src,event,pin.labMode);
  pin.context.textContent=pin.labMode!=='live'||src.kind==='prime-lab-only'
   ?'Experimental Lab · not automatic in the original game':
   src.kind==='no-special-effect'?'No special event animation at this commit':
   src.kind==='original-prime-ribbon'?'Original in-game Rainbow Ribbon':
   'Replayed from historical commit CSS';
 }catch(error){
  pin.context.textContent='Unavailable: '+error.message;
  frame.srcdoc='<body style="color:#f8dede;background:#180d0d;font:14px system-ui;padding:22px">This historical source snapshot could not be loaded.</body>';
 }
}
async function init(){
 try{
  const response=await fetch('./animation-history-data/history.json',{cache:'no-store'});
  if(!response.ok)throw Error('Archive was not generated ('+response.status+')');
  catalog=await response.json();
  if(!Array.isArray(catalog.versions)||!Array.isArray(catalog.commits)||!catalog.commits.length)throw Error('Incomplete animation archive');
  $('historyStats').replaceChildren();
  for(const val of [
   catalog.totalCommits+' Git commits analysed',
   catalog.totalVersions+' app versions',
   catalog.totalAnimationSignatures+' distinct animation states',
   'Current v'+catalog.release
  ])$('historyStats').append(child('span',null,val));
  renderMilestones();
 }catch(error){
  $('historyStats').textContent='History unavailable: '+error.message;
  list.append(child('p','history-empty','The published archive is missing. See the GitHub Actions deployment check.'));
 }
}
$('historySearch').addEventListener('input',renderHistory);
for(const radio of document.querySelectorAll('input[name=historyMode]'))radio.addEventListener('change',()=>{
 if(!radio.checked)return;mode=radio.value;renderHistory();
});
$('changesOnly').addEventListener('change',e=>{changesOnly=e.target.checked;renderHistory();});
$('eventSelect').addEventListener('change',e=>{event=e.target.value;for(const pin of pinned)playPin(pin,pin.frame);});
$('replayAll').addEventListener('click',()=>{for(const pin of pinned)playPin(pin,pin.frame);});
$('restoreDefaults').addEventListener('click',()=>{if(catalog)renderMilestones();});
init();
