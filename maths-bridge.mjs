// Dol -> Beyond 100 conceptual link, independent of scoring, round state and Firebase.
const LAB='https://nirav2000.github.io/beyond100/';
const getNumber=()=>{
 const n=Number(document.getElementById('numberValue')?.textContent?.trim());
 return Number.isInteger(n)&&n>=2&&n<=1024?n:null;
};
function urlFor(n,technique='equal-groups'){
 const u=new URL(LAB);
 u.searchParams.set('lab','1');
 u.searchParams.set('source','dol');
 u.searchParams.set('technique',technique);
 if(n!=null)u.searchParams.set('number',String(n));
 u.hash='thinking-lab';
 return u.href;
}
function link(label,classes){
 const a=document.createElement('a');a.textContent=label;a.className=classes;
 a.target='_blank';a.rel='noopener noreferrer';a.href=urlFor(getNumber());
 a.style.cssText='display:inline-flex;align-items:center;min-height:44px;max-width:100%;padding:10px 13px;border:1px solid #7fb1a5;border-radius:11px;color:#d3fff0;background:#223d39;text-decoration:underline;text-underline-offset:3px;font-weight:750;font-size:14px;line-height:1.35';
 return a;
}
function setup(){
 const number=document.getElementById('numberValue'),play=document.querySelector('#playView .number-section'),learn=document.getElementById('learnView');
 if(!number||!play||!learn||document.getElementById('dolExploreMathLink'))return;
 const active=link('Explore the maths behind this','dol-maths-explore');active.id='dolExploreMathLink';
 active.setAttribute('aria-label','Explore the mathematical thinking behind this factor challenge in Beyond 100');
 // Keep the target tile and round controls untouched: geometry tests depend on them.
 const footer=document.querySelector('#playView .bottom-bar');
 const wrap=document.createElement('div');wrap.style.cssText='display:flex;justify-content:center;max-width:100%;margin:10px 0';wrap.appendChild(active);
 if(footer)footer.appendChild(wrap);else play.appendChild(wrap);
 const guide=link('Explore more maths techniques in Beyond 100','dol-maths-guide');guide.id='dolMathsGuideLink';
 guide.href=urlFor(null,'double-half');
 const guideWrap=document.createElement('div');guideWrap.style.cssText='margin:13px 0 16px';
 guideWrap.appendChild(guide);learn.querySelector('.page-head')?.after(guideWrap);
 const update=()=>{
  const n=getNumber();active.href=urlFor(n);active.textContent=n===null?'Explore the maths behind factor pairs':'Explore the maths behind '+n;
  active.title=n===null?'Open the Maths Thinking Lab':'Open the interactive factor-pair explorer for '+n;
 };
 const observer=new MutationObserver(update);
 observer.observe(number,{characterData:true,childList:true,subtree:true});update();
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
