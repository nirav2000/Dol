import {rainbowModel,arrayModel,pairKey} from './round-model.mjs';
const NS='http://www.w3.org/2000/svg';
const make=(tag,attrs={},text)=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;};
const svg=(tag,attrs={},text)=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;};
/** Reusable domain-specific visual view. It never awards points or modifies learner records. */
export function createVisualTools(root,{demo=false,onAssist=()=>{},onInteract=()=>{},onUsePair=()=>{}}={}){
  const prefix=root.id;
  root.classList.add('visual-tools');
  root.innerHTML=`<header class="visual-heading"><div><p class="eyebrow">SEE THE STRUCTURE</p><h2>${demo?'Visual playground':'Make the factors visible'}</h2></div><span class="pill" data-target></span></header>
    ${demo?'<form class="visual-target-form"><label>Explore a number <input type="number" min="1" max="1024" value="24" inputmode="numeric" required></label><button class="secondary" type="submit">Show number</button><span class="small muted" role="status" data-error></span></form>':''}
    <div class="visual-tabs" role="group" aria-label="Visual technique"><button class="secondary" type="button" data-kind="rainbow">Factor rainbow</button><button class="secondary" type="button" data-kind="arrays">Arrays</button><button class="text-button" type="button" data-close hidden>Hide visuals</button></div>
    <p class="visual-intro small muted">Connect factor partners with arcs, or arrange the number into equal rows.</p>
    <section data-canvas hidden aria-label="Interactive factor visual"><div class="rainbow-tools"><button type="button" class="secondary" data-reveal>Reveal complete rainbow · uses help</button></div><div class="array-controls" hidden><label for="${prefix}-rows">Number of rows</label><button type="button" class="secondary" data-minus aria-label="One fewer row">−</button><input id="${prefix}-rows" type="number" min="1" max="1024" value="2" inputmode="numeric"><button type="button" class="secondary" data-plus aria-label="One more row">+</button><button type="button" class="secondary" data-rotate>Rotate array</button><button type="button" class="secondary" data-next>Next factor pair →</button><label class="check"><input type="checkbox" data-dots> Show every counter</label></div><p data-equation class="visual-equation" role="status" aria-live="polite"></p><div data-diagram class="diagram-scroll" tabindex="0" aria-label="Factor diagram; wide diagrams can be scrolled"></div><p data-explanation class="small muted"></p><div class="visual-pairs" role="group" aria-label="Choose a factor pair"></div><button type="button" class="secondary" data-use hidden>Put this pair in the answer box</button></section>`;
  const q=s=>root.querySelector(s);
  let data={n:24,roundId:null,found:new Set(),finished:demo,paused:false},lastRound,kind='rainbow',open=demo,revealed=false,selected=null,rows=2,allDots=false;
  const active=()=>!demo&&!data.finished;
  const assist=()=>{if(active())onAssist();};
  const interact=()=>onInteract();
  function show(next){if(data.paused)return;kind=next;open=true;interact();if(kind==='arrays')assist();render();}
  root.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.kind)));
  q('[data-close]').addEventListener('click',()=>{open=false;interact();render();});
  q('[data-reveal]').addEventListener('click',()=>{if(data.paused)return;revealed=true;assist();interact();render();});
  const rowInput=q('#'+prefix+'-rows');
  function changeRows(value){if(data.paused)return;const r=Number(value);if(!Number.isInteger(r)||r<1||r>data.n){rowInput.setCustomValidity('Use a whole number between 1 and '+data.n+'.');rowInput.reportValidity();return;}rowInput.setCustomValidity('');rows=r;assist();interact();render();}
  rowInput.addEventListener('change',()=>changeRows(rowInput.value));
  q('[data-minus]').addEventListener('click',()=>changeRows(Math.max(1,rows-1)));
  q('[data-plus]').addEventListener('click',()=>changeRows(Math.min(data.n,rows+1)));
  q('[data-rotate]').addEventListener('click',()=>{const m=arrayModel(data.n,rows);if(m.exact)changeRows(m.columns);});
  q('[data-next]').addEventListener('click',()=>{const p=rainbowModel(data.n).pairs;const i=p.findIndex(([a,b])=>pairKey(a,b)===pairKey(rows,Math.floor(data.n/rows)));changeRows(p[(i+1)%p.length][0]);});
  q('[data-dots]').addEventListener('change',e=>{allDots=e.target.checked;interact();render();});
  q('[data-use]').addEventListener('click',()=>{if(!active()||data.paused)return;const m=arrayModel(data.n,rows);if(m.exact){assist();onUsePair([Math.min(m.rows,m.columns),Math.max(m.rows,m.columns)]);}});
  if(demo){q('form').addEventListener('submit',e=>{e.preventDefault();const input=q('form input');const n=Number(input.value);try{rainbowModel(n);q('[data-error]').textContent='';update({n,roundId:n,found:new Set(),finished:true});open=true;render();}catch(err){q('[data-error]').textContent=err.message;}});}
  function renderRainbow(){
    const model=rainbowModel(data.n),complete=demo||data.finished||revealed;
    const pairs=complete?model.pairs:model.pairs.filter(([a,b])=>data.found.has(pairKey(a,b)));
    const diagram=q('[data-diagram]'),buttons=q('.visual-pairs');diagram.replaceChildren();buttons.replaceChildren();
    q('[data-reveal]').hidden=complete;q('[data-use]').hidden=true;
    if(!pairs.length){q('[data-equation]').textContent='A pair makes a connection.';q('[data-explanation]').textContent='Find a pair first, or reveal the complete rainbow. No missing answers are shown until you ask.';return;}
    const factors=[...new Set(pairs.flat())].sort((a,b)=>a-b);
    const keys=pairs.map(([a,b])=>pairKey(a,b));if(!keys.includes(selected))selected=keys[0];
    const width=Math.max(420,factors.length*48),height=225,baseline=185;
    const x=n=>factors.length===1?width/2:28+factors.indexOf(n)*(width-56)/(factors.length-1);
    const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,width,height,role:'img','aria-label':`Factor rainbow for ${data.n}. ${complete?'All factor pairs.':'Only discovered pairs.'}`});
    chart.classList.add('rainbow-svg');
    for(let i=0;i<pairs.length;i++){
      const [a,b]=pairs[i],key=pairKey(a,b),left=x(a),right=x(b);
      const d=a===b?`M ${left} ${baseline-8} C ${left-30} ${baseline-65}, ${left+30} ${baseline-65}, ${left} ${baseline-8}`:`M ${left} ${baseline-8} Q ${(left+right)/2} ${baseline-150+i*18} ${right} ${baseline-8}`;
      const arc=svg('path',{d,class:'factor-arc'+(key===selected?' selected':''),'data-pair':key});
      chart.append(arc);
    }
    for(const factor of factors){chart.append(svg('rect',{x:x(factor)-21,y:baseline-4,width:42,height:34,rx:8,class:'rainbow-label-bg'}),svg('text',{x:x(factor),y:baseline+19,'text-anchor':'middle',class:'rainbow-label'},factor));}
    diagram.append(chart);
    for(const [a,b] of pairs){const key=pairKey(a,b),button=make('button',{type:'button',class:'visual-pair-button','aria-pressed':key===selected},`${a} × ${b}`);button.disabled=data.paused;button.addEventListener('click',()=>{selected=key;interact();render();});buttons.append(button);}
    const [a,b]=selected.split('-').map(Number);
    q('[data-equation]').textContent=`${a} × ${b} = ${data.n}`;
    q('[data-explanation]').textContent=(a===b?`${data.n} is a square. The middle factor ${a} partners itself and is counted once. `:'Smaller factors increase from the left while their partners decrease from the right. ')+(complete?'Each arc links one distinct pair. A reversed pair is the same arc.':'Only the pairs you have already found are displayed. Reveal the complete rainbow to see the rest.');
  }
  function renderArray(){
    const m=arrayModel(data.n,rows);rowInput.value=rows;rowInput.max=data.n;
    q('[data-rotate]').disabled=!m.exact||data.paused;q('[data-minus]').disabled=rows<=1||data.paused;q('[data-plus]').disabled=rows>=data.n||data.paused;
    q('.visual-pairs').replaceChildren();
    q('[data-equation]').textContent=m.exact?`${m.rows} rows × ${m.columns} in each row = ${data.n}`:`${m.rows} rows × ${m.columns} = ${m.used}, with ${m.remainder} left over`;
    const grouped=!allDots&&m.columns>40,unit=grouped?(m.columns>400?100:10):1;
    const perRow=[];let left=m.columns;while(left>=unit&&unit>1){perRow.push(unit);left-=unit;}while(left>0){perRow.push(1);left--;}
    const cell=grouped?35:18,gap=grouped?26:18,width=Math.max(240,perRow.length*cell+32),height=Math.max(70,rows*gap+34+(m.remainder?54:0));
    const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,width,height,role:'img','aria-label':`${m.rows} equal rows of ${m.columns}. ${m.remainder} left over. Total ${data.n}.`});
    chart.classList.add('array-svg');
    for(let row=0;row<rows;row++)for(let col=0;col<perRow.length;col++){
      const value=perRow[col],x=16+col*cell,y=16+row*gap;
      if(value===1){chart.append(svg('circle',{cx:x+cell/2,cy:y+gap/2,r:5,class:'array-unit'}));}
      else{chart.append(svg('rect',{x:x+1,y,width:cell-3,height:gap-3,rx:4,class:'array-group'}),svg('text',{x:x+cell/2,y:y+16,'text-anchor':'middle',class:'array-group-label'},value));}
    }
    if(m.remainder){chart.append(svg('text',{x:16,y:rows*gap+47,class:'array-remainder'},`${m.remainder} left over — not an exact rectangle`));}
    const diagram=q('[data-diagram]');diagram.replaceChildren(chart);
    diagram.dataset.used=m.used;diagram.dataset.remainder=m.remainder;
    q('[data-explanation]').textContent=(m.exact?`${rows} is a factor because every counter fits into the equal rows with none left over.`:`${rows} is not a factor of ${data.n}: ${m.used} counters fit and ${m.remainder} remain.`)+(grouped?` Each labelled block represents ${unit} counters; each dot represents one. Choose “Show every counter” for individual dots.`:' Each dot is one counter.')+' Wide or tall arrays can be scrolled. Rotate an exact array to see why reversed pairs count once.';
    q('[data-use]').hidden=demo||data.finished||!m.exact;q('[data-use]').disabled=data.paused;
  }
  function render(){
    q('[data-target]').textContent=data.n;q('[data-canvas]').hidden=!open;q('[data-close]').hidden=!open||demo;
    q('.visual-intro').hidden=open;
    root.querySelectorAll('[data-kind]').forEach(b=>{b.setAttribute('aria-pressed',open&&b.dataset.kind===kind);b.disabled=data.paused;});
    q('.rainbow-tools').hidden=kind!=='rainbow';q('.array-controls').hidden=kind!=='arrays';
    root.querySelectorAll('[data-canvas] input,[data-reveal],[data-next]').forEach(e=>e.disabled=data.paused);
    if(open){if(kind==='rainbow')renderRainbow();else renderArray();}
  }
  function update(next){
    const roundChanged=lastRound!==next.roundId;data={...data,...next};data.found=new Set(next.found||[]);
    if(roundChanged){lastRound=next.roundId;rows=Math.min(2,data.n);selected=null;revealed=false;open=demo;kind='rainbow';}
    if(demo)q('form input').value=data.n;root.hidden=false;render();
  }
  return {update,show,hide(){open=false;render();},reset(){lastRound=undefined;open=demo;},getState:()=>({kind,open,rows,revealed})};
}
