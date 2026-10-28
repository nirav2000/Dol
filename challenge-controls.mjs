// Dol challenge controls: a compact mobile launcher with full, explicit settings.
// This module only presents the existing state; game scoring and selection remain in learning-app.mjs.
export function createChallengeControls({getState,isAdaptive=()=>false}={}){
  const $=id=>document.getElementById(id);
  const head=document.querySelector('#playView .page-head');
  const modes=document.querySelector('#playView .mode-tabs');
  const controls=document.querySelector('#playView .controls');
  const panel=document.createElement('section');
  panel.id='challengeConfigurator';
  panel.className='challenge-configurator';
  panel.setAttribute('aria-label','Choose your challenge');
  const overview=document.createElement('div');
  overview.id='challengeOverview';
  overview.className='challenge-overview';
  overview.innerHTML='<div><span class="challenge-overview-label">YOUR NEXT CHALLENGE</span><strong id="challengeSummaryText"></strong><span id="challengeChangeNote" class="challenge-change-note" role="status"></span></div><button id="changeChallenge" type="button" class="secondary" aria-controls="challengeConfigurator" aria-expanded="false">Change challenge</button>';
  head.after(overview,panel);
  panel.append(modes,controls);
  const button=$('changeChallenge'),summary=$('challengeSummaryText'),note=$('challengeChangeNote');
  const phone=matchMedia('(max-width:700px)');
  let expanded=!phone.matches,explicit=false;
  function setExpanded(open,user=false){
    expanded=!!open;
    if(user)explicit=true;
    panel.hidden=!expanded;
    button.setAttribute('aria-expanded',String(expanded));
    button.textContent=expanded?'Hide settings':'Change challenge';
  }
  button.addEventListener('click',()=>setExpanded(!expanded,true));
  phone.addEventListener('change',()=>{if(!explicit)setExpanded(!phone.matches);});
  function render(){
    const s=getState(),labels={guided:'Guided learning',practice:'Independent practice',timed:'Timed challenge',foundation:'Foundation',fluency:'Times tables',systematic:'Systematic',strategic:'Strategic',expert:'Expert'};
    const detail=isAdaptive()?'Adaptive':'Custom';
    summary.textContent=(labels[s.mode]||'Guided learning')+' · '+detail+' '+(labels[s.stage]||s.stage)+' · up to '+s.limit;
    const active=['running','paused'].includes(s.phase);
    note.textContent=active?'Finish the current round before changing the challenge.':'';
    overview.hidden=s.view!=='play';
    panel.setAttribute('data-round-active',String(active));
  }
  setExpanded(expanded);
  render();
  return {render,expand:()=>setExpanded(true,true),collapse:()=>setExpanded(false,true)};
}
