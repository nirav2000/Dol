import {VERSION} from './release.mjs';
const newer=(a,b)=>{if(!/^\d+\.\d+\.\d+$/.test(a))return false;const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;};
export function initReleaseUI({safeToReload=()=>true}={}) {
 document.body.dataset.dolVersion=VERSION;
 for(const label of document.querySelectorAll('[data-dol-version]'))label.textContent='Dol v'+VERSION;
 const base=new URL('./',import.meta.url),scope=base.pathname;
 navigator.serviceWorker?.getRegistration(scope).then(reg=>reg?.update()).catch(()=>{});
 fetch(new URL('version.json',base),{cache:'no-store',signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null).then(info=>{
  if(!info||!newer(info.version,VERSION))return;
  const banner=document.createElement('div');banner.className='dol-release-banner';banner.setAttribute('role','status');
  const text=document.createElement('span');text.textContent='Dol v'+info.version+' is available. You are running v'+VERSION+'.';
  const button=document.createElement('button');button.className='secondary';button.type='button';button.textContent='Update app';
  button.onclick=async()=>{
   if(!safeToReload()){text.textContent='Finish your current round first, then update. Your saved learning record will be kept.';return;}
   if(navigator.onLine===false){text.textContent='Connect to the internet before updating.';return;}
   button.disabled=true;
   try{const reg=await navigator.serviceWorker?.getRegistration(scope);await reg?.update();}catch{}
   location.reload();
  };
  banner.append(text,button);document.querySelector('.shell main')?.before(banner);
 }).catch(()=>{});
}
