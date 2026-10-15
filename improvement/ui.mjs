import {improvementSummary,compareChecks} from './model.mjs';
import {CHECK_LEVELS} from './check.mjs';
const format=(v,unit='')=>v==null?'Collecting evidence':(unit==='s'?v.toFixed(1):Math.round(v))+unit;
const day=t=>new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
const range=a=>a[0]===a[1]?day(a[0]):day(a[0])+' to '+day(a[1]);
const element=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
export function createImprovementUI({getSnapshot,getStatus,startCheck,sync,importGuest,hasGuest,getDraft,canStart}) {
  const root=document.createElement('section');root.id='improvementPanel';root.className='improvement-panel';
  root.innerHTML=`<div class="improvement-heading"><div><p class="eyebrow">YOUR IMPROVEMENT</p><h2>How your learning is changing</h2></div><span id="improvementQuality" class="pill"></span></div>
  <h3 id="improvementHeadline" class="improvement-headline"></h3><p id="improvementExplanation" class="muted"></p>
  <p class="improvement-help"><strong>Hints are part of learning.</strong> Answers reached with help count equally towards accuracy and completeness. We notice when supported exploration becomes familiar, without setting a target to avoid help.</p>
  <div class="evidence-sync"><p id="evidenceSyncStatus" role="status"></p><button class="text-button" id="evidenceSyncNow" type="button">Sync details</button><button class="text-button" id="evidenceImportGuest" type="button" hidden>Import my guest evidence</button></div>
  <p id="improvementCoverage" class="muted small"></p><div id="improvementDimensions" class="improvement-dimensions"></div>
  <section class="improvement-chart"><div class="improvement-chart-head"><h3>Then and now</h3><label>Dimension <select id="improvementDimensionChoice"><option value="accuracy">Accuracy</option><option value="completeness">Completeness</option><option value="pace">Matched pace</option><option value="breadth">Challenge breadth</option></select></label></div><p id="improvementMatchNote" class="muted small"></p><div id="improvementChart"></div><div id="improvementWhiskers"></div><p id="improvementSample" class="muted small"></p></section>
  <section class="improvement-changes"><h3>Where your performance has changed</h3><div class="improvement-filter"><label>Find a target or pair <input id="improvementSearch" type="search" placeholder="e.g. 48 or 6x8"></label><label class="check"><input type="checkbox" id="improvementAll"> Show all</label></div><div id="improvementChanges"></div></section>
  <section class="improvement-check-card"><div><p class="eyebrow">AN OCCASIONAL REFERENCE POINT</p><h3>Check my progress</h3><p>Four factor challenges and two method questions. Untimed, with hints available. Save and return whenever you need to.</p></div><button class="primary" type="button" id="improvementStartCheck">Start a progress check</button><p id="improvementCheckHelp" class="muted small"></p><div id="improvementCheckHistory"></div></section>
  <details class="improvement-method"><summary>How this is measured, and what we cannot conclude</summary><p>Accuracy and completeness compare the same target, game mode and pair-count visibility setting. Each question group has equal weight in both periods. Its first and most recent up to 10 observations are compared, with at least two in each period and no overlap. Accuracy requires complete per-round evidence of correct and missed pairs; blank, incomplete and repeated entries are never mistakes.</p><p>Pace uses at least three correct, error-free responses in each period for exactly the same target, factor pair, position in the round, mode, entry method, hint condition and pair-count setting. Helped answers are compared with helped answers. New active timing excludes hidden tabs, loss of focus, other views, explicit pauses and time inside hint or technique panels. It still includes thinking and number entry: it is not an isolated recall test. Older timings lack this context and are kept, but never mixed into matched pace.</p><p>Challenge breadth compares the first and latest equal-sized groups of up to 20 rounds. Encountering a pattern is not proof of mastering it. Growing familiarity counts a correct, error-free independent answer at least 24 hours after exploring that fact with support. Retention counts correct, error-free independent returns after a gap of at least 7 or 30 days since the previous recorded attempt; supported revisits are shown as refreshers, not failures.</p><p>Recorded changes are not validated assessment scores or proof of a permanent ability change. Small samples are early indications; similar numbers may still differ in difficulty. Missing or unsynchronised history limits what we can conclude. Progress checks compare the same level, question-set version and set. Their pace is compared only when input methods and support conditions match, with no errors in either check.</p></details>`;
  const anchor=document.querySelector('#progressView .dol-progress-sync');if(anchor)anchor.after(root);else document.getElementById('progressView').prepend(root);
  const $=id=>root.querySelector('#'+id);let model=null;
  const definitions=[['accuracy','Accuracy'],['familiarity','Growing familiarity'],['completeness','Completeness'],['pace','Pace'],['breadth','Challenge breadth'],['retention','Retention']];
  for(const [key,title] of definitions){const card=element('article');card.dataset.dimension=key;card.append(element('h3',title),element('strong'),element('small'));$('improvementDimensions').append(card);}
  function status(){
    const s=getStatus();let text=s.accountId==='guest'?'Saved on this device. Sign in to synchronise detailed evidence.':'Saved on this device. Waiting for your account connection.';
    if(!s.durable)text='Some evidence is only in memory: device storage is unavailable. Export the learning record.';
    else if(s.error)text='Saved on this device. Cloud details pending: '+s.error;
    else if(s.busy)text='Synchronising detailed learning evidence...';
    else if(s.connected)text=s.pending?'Saved locally; '+s.pending+' batch(es) waiting to sync.':s.lastSynced?'Detailed evidence synced to your Firebase account.':'Account connected; checking detailed evidence.';
    $('evidenceSyncStatus').textContent=text;$('evidenceSyncNow').hidden=s.accountId==='guest';$('evidenceSyncNow').disabled=s.busy||!s.connected;
    $('evidenceImportGuest').hidden=!s.connected||!hasGuest();
  }
  function comparisonNote(c){return c?c.n+' observations per period across '+c.groups.length+' matching contexts. Earlier: '+range(c.firstRange)+'. Recent: '+range(c.lastRange)+'.':'More repeated, comparable observations are needed. Missing evidence does not mean you have not improved.';}
  function render(){
    model=improvementSummary(getSnapshot());status();const m=model;
    $('improvementQuality').textContent=m.quality;$('improvementHeadline').textContent=m.headline;$('improvementExplanation').textContent=m.detail;
    $('improvementCoverage').textContent=m.coverage.rounds+' detailed round records and '+m.coverage.events+' factor-pair observations available. '+(m.coverage.legacyTimes?m.coverage.legacyTimes+' older timing observations preserved separately from new active timings.':'Existing scores and round totals are unchanged.');
    const data={accuracy:[format(m.accuracy?.after,'%'),m.accuracy?'Then '+format(m.accuracy.before,'%')+' on matching questions. Helped answers count fully.':'Repeated targets and complete attempt records will establish a comparison.'],
      familiarity:[m.familiarity.count+' facts','Supported exploration followed by a later-day independent success. Hints remain welcome.'],
      completeness:[format(m.completeness?.after,'%'),m.completeness?'Then '+format(m.completeness.before,'%')+' of matched rounds with every pair found.':'More repeated targets are needed. Supported completion counts equally.'],
      pace:[format(m.pace?.after,'s'),m.pace?'Then '+format(m.pace.before,'s')+' in the same question and entry conditions.':'Collecting matched active timings; older intervals remain available below.'],
      breadth:[m.breadth.count?m.breadth.after.length+' patterns':'Collecting evidence',m.breadth.count?'Then '+m.breadth.before.length+' patterns. '+m.breadth.targets+' distinct recent targets; encounter is not mastery.':'Equal-sized early and recent round groups will show the variety encountered.'],
      retention:[m.retention.week+' retained facts',m.retention.month+' after 30-day gaps; '+m.retention.refreshed+' supported refreshers after 7-day gaps. In recorded history.']};
    for(const [key,[value,note]] of Object.entries(data)){
      let card=root.querySelector('[data-dimension="'+key+'"]');
      if(!card){card=element('article');card.dataset.dimension=key;card.append(element('h3',definitions.find(([id])=>id===key)?.[1]||key));$('improvementDimensions').append(card);}
      let main=card.querySelector('strong'),detail=card.querySelector('small');
      if(!main){main=element('strong');card.append(main);}
      if(!detail){detail=element('small');card.append(detail);}
      main.textContent=value;detail.textContent=note;
    }
    $('improvementStartCheck').textContent=getDraft()?'Resume my progress check':'Start a progress check';$('improvementStartCheck').disabled=!canStart();
    $('improvementCheckHelp').textContent=canStart()?'Checks do not change scores or adaptive difficulty. Results join your account evidence when signed in.':'Finish the current game round before starting a separate progress check.';
    draw();checkHistory();
  }
  function draw(){
    if(!model)return;const key=$('improvementDimensionChoice').value,area=$('improvementChart'),whiskers=$('improvementWhiskers');area.replaceChildren();whiskers.replaceChildren();
    const m=model,c=m[key],unit=key==='pace'?'s':key==='breadth'?'':'%',values=key==='breadth'?(m.breadth.count?[c.before.length,c.after.length]:null):c?[c.before,c.after]:null;
    $('improvementMatchNote').textContent=key==='pace'?'Same target, pair, order, mode, input method and support condition. Lower times mean less active solving time.':key==='breadth'?'Different patterns encountered, not a measure of mastery.': 'Same target and game mode. Correct answers reached with help count equally.';
    $('improvementSample').textContent=key==='breadth'?(m.breadth.count?'First and latest '+m.breadth.count+' rounds; no overlap.':'More rounds are needed.'):comparisonNote(c);
    if(!values){area.textContent='A fair comparison is not available yet. Your earlier evidence is preserved.';changes();return;}
    const max=unit==='%'?100:Math.max(1,...values);
    values.forEach((v,i)=>{const row=element('div',null,'improvement-bar-row'),track=element('div',null,'improvement-track'),bar=element('div',null,'improvement-bar '+(i?'now':'then'));bar.style.width=Math.min(100,Math.max(0,v/max*100))+'%';track.append(bar);row.append(element('span',i?'Now':'Then'),track,element('b',format(v,unit)));area.append(row);});
    if(key==='pace'){
      whiskers.append(element('p','Paired distributions for up to six matched contexts. Whiskers: range; box: middle half; mark: median.','muted small'));
      for(const g of c.groups.slice(0,6)){
        const item=element('div',null,'improvement-distribution'),title=element('p',g.key.split('|')[1].replace('x',' \u00d7 ')+' for '+g.key.split('|')[0]+' \u00b7 '+g.n+' responses per period');item.append(title);
        const high=Math.max(g.beforeDistribution.max,g.afterDistribution.max,1);
        for(const [i,stats] of [g.beforeDistribution,g.afterDistribution].entries()){
          const row=element('div',null,'improvement-whisker-row'),plot=element('div',null,'improvement-whisker '+(i?'now':'then'));
          plot.setAttribute('role','img');plot.setAttribute('aria-label',(i?'Now':'Then')+': median '+stats.median.toFixed(1)+' seconds, middle half '+stats.q1.toFixed(1)+' to '+stats.q3.toFixed(1)+', range '+stats.min.toFixed(1)+' to '+stats.max.toFixed(1));
          for(const [cls,left,width] of [['range',stats.min,stats.max-stats.min],['box',stats.q1,stats.q3-stats.q1],['median',stats.median,0]]){const mark=element('span',null,cls);mark.style.left=left/high*100+'%';if(width)mark.style.width=width/high*100+'%';plot.append(mark);}
          row.append(element('span',i?'Now':'Then'),plot,element('b',format(stats.median,'s')));item.append(row);
        }
        whiskers.append(item);
      }
    }
    changes();
  }
  function changes(){
    const key=$('improvementDimensionChoice').value,metric=model?.[key],host=$('improvementChanges');host.replaceChildren();
    if(!metric?.groups){host.textContent=key==='breadth'?'Recent patterns: '+(model?.breadth.after.join(', ')||'still collecting evidence'):'As matching observations accumulate, the biggest recorded changes will appear here.';return;}
    const query=$('improvementSearch').value.toLowerCase().replace(/\s|\u00d7/g,'').replaceAll('times','x'),all=$('improvementAll').checked;
    let groups=metric.groups.filter(g=>g.key.toLowerCase().replaceAll('x','').includes(query.replaceAll('x','')));
    groups.sort((a,b)=>Math.abs(b.after-b.before)-Math.abs(a.after-a.before));if(!all)groups=groups.slice(0,10);
    if(!groups.length){host.textContent='No matching groups.';return;}
    for(const g of groups){const row=element('div',null,'improvement-change-row'),target=g.key.split('|')[0],name=key==='pace'?g.key.split('|')[1].replace('x',' \u00d7 ')+' for '+target:'Target '+target,unit=key==='pace'?'s':'%';row.append(element('strong',name),element('span',format(g.before,unit)+' \u2192 '+format(g.after,unit)),element('small',g.n+' observations in each period'));host.append(row);}
  }
  function checkHistory(){
    const checks=getSnapshot().checks,result=compareChecks(checks),host=$('improvementCheckHistory');host.replaceChildren();
    if(!result){host.append(element('p','Your first completed check becomes a reference point.','muted small'));return;}
    const {latest,earlier}=result,help=latest.responses.filter(r=>r.help).length;
    host.append(element('h4','Latest: '+CHECK_LEVELS[latest.stage]+' \u00b7 Set '+(latest.form?'B':'A')));
    host.append(element('p',day(latest.at)+' \u00b7 '+format(result.after,'%')+' correct submissions. '+help+' activities explored with support.'));
    host.append(element('p',earlier?'Same-set accuracy: '+format(result.before,'%')+' on '+day(earlier.at)+' \u2192 '+format(result.after,'%')+' now. One check comparison is an early indication.':'No earlier check of this same level and set yet. Sets alternate A/B; different sets are not treated as equally difficult.','muted small'));
    if(result.pace)host.append(element('p','Matched check solving time: '+format(result.pace.before,'s')+' \u2192 '+format(result.pace.after,'s')+'. Same entry method and support conditions; breaks excluded.','muted small'));
    const detail=element('details'),summary=element('summary','View all '+checks.length+' completed checks');detail.append(summary);
    for(const c of [...checks].reverse()){const p=element('p',day(c.at)+' \u00b7 '+CHECK_LEVELS[c.stage]+' \u00b7 Set '+(c.form?'B':'A')+' \u00b7 '+c.responses.filter(r=>r.help).length+' activities with support','small');detail.append(p);}host.append(detail);
  }
  $('improvementDimensionChoice').onchange=draw;$('improvementSearch').oninput=changes;$('improvementAll').onchange=changes;
  $('evidenceSyncNow').onclick=()=>sync();$('evidenceImportGuest').onclick=()=>{if(confirm('Copy the guest evidence saved on this device into this account? Only continue if it belongs to you. Existing account evidence is kept.'))importGuest();};
  $('improvementStartCheck').onclick=()=>startCheck();
  return {render,status,root};
}
