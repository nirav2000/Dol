// Same numeric actions on both layouts, with a locally saved visual order.
export const STANDARD_NUMPAD_KEYS=Object.freeze(['7','8','9','4','5','6','1','2','3','clear','0','action']);
export const TTRS_NUMPAD_KEYS=Object.freeze(['1','2','3','4','5','6','7','8','9','clear','0','action']);
export const KEYPAD_STORAGE_KEY='dol-keypad-layout-v1';
export function getKeypadLayout(){
 try{return localStorage.getItem(KEYPAD_STORAGE_KEY)==='ttrs'?'ttrs':'physical';}catch{return 'physical';}
}
export const getKeypadKeys=()=>getKeypadLayout()==='ttrs'?TTRS_NUMPAD_KEYS:STANDARD_NUMPAD_KEYS;
export function reorderKeypad(root,attribute){
 if(!root)return;
 const buttons=new Map([...root.querySelectorAll('button['+attribute+']')].map(b=>[b.getAttribute(attribute),b]));
 if(buttons.size!==12)return;
 for(const key of getKeypadKeys()){const button=buttons.get(key);if(button)root.append(button);}
}
export function initKeypadPreference(){
 const select=document.getElementById('keypadLayoutChoice');
 if(!select)return;
 const apply=()=>{
  const layout=getKeypadLayout();
  select.value=layout;document.body.dataset.dolKeypadLayout=layout;
  reorderKeypad(document.getElementById('mobileKeypad'),'data-key');
  reorderKeypad(document.querySelector('.tablet-pad-grid'),'data-tablet-key');
  document.dispatchEvent(new CustomEvent('dol-keypad-layoutchange',{detail:{layout}}));
 };
 select.addEventListener('change',()=>{
  try{localStorage.setItem(KEYPAD_STORAGE_KEY,select.value==='ttrs'?'ttrs':'physical');}catch{}
  apply();
 });
 apply();
}
