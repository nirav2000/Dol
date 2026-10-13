import {factorPairs} from './logic.mjs';
import {divisibilityRule,divisionChunks} from './strategy-model.mjs';
const $=id=>document.getElementById(id);
function explanation(n,a,b){
 if(a===1)return ['Start with 1',`Every number has 1 as a factor: 1 × ${n}.`];
 if(a===2)return ['Even number',`${n} ends in an even digit. Halve it to get ${b}.`];
 if(a===3||a===9){const digits=[...String(n)].map(Number),sum=digits.reduce((x,y)=>x+y,0);let s=`${digits.join(' + ')} = ${sum}. ${sum} is divisible by ${a===9?9:3}.`;if(sum>=10){const root=[...String(sum)].map(Number).reduce((x,y)=>x+y,0);s+=` You can also add again: ${[...String(sum)].join(' + ')} = ${root}, but this second addition is optional.`;}return ['Digit-sum test',s+ ` Therefore ${n} ÷ ${a} = ${b}.`];}
 if(a===6)return ['Combine 2 and 3',`${n} is even and its digits sum to a multiple of 3. Because 2 and 3 have no common factor, it is divisible by 6. ${n} ÷ 6 = ${b}.`];
 if(a===18&&n%9===0)return ['Combine independent factors',`${n} is even and divisible by 9. Since 2 and 9 have no prime factors in common, 18 = 2 × 9 divides ${n}. The partner is ${b}.`];
 if(a===27&&n%9===0)return ['An extra factor of 3',`${n} ÷ 9 = ${n/9}. That quotient is also divisible by 3, so ${n} is divisible by 27 = 9 × 3. Divisibility by 9 alone would not guarantee this.`];
 if(a===9&&n%3===0)return ['Factor inheritance',`9 = 3 × 3, so any multiple of 9 is also a multiple of 3. But being divisible by 3 alone does not guarantee divisibility by 9.`];
 if(a===11){const r=divisibilityRule(n,11);return ['The 11 test',r.work+` Then ${n} ÷ 11 = ${b}.`];}
 const pairs=factorPairs(n);for(const [x,y] of pairs){if(x===a&&y===b)continue;if(x*2===a&&y%2===0&&y/2===b)return ['Double and halve',`Start with ${x} × ${y}. Double ${x} to ${a} and halve ${y} to ${b}; the product stays ${n}.`];}
 if(a%3===0&&n%3===0)return ['Build with 3',`Try dividing a known factor pair by 3 on one side and multiplying by 3 on the other. Check: ${a} × ${b} = ${n}.`];
 return ['Find the partner',`Use the worked division below to check whether ${a} divides ${n} without a remainder. The partner is ${b}.`];
}
export function initFactorPatterns(){
 const finished=$('finishedPanel');if(!finished)return;
 const section=document.createElement('section');section.className='pattern-explorer';
 section.innerHTML='<button type="button" id="patternToggle" class="secondary" aria-expanded="false">Show factor patterns ↓</button><div id="patternBody" hidden><p class="muted small">Tap a pair on the existing board to explore its technique without changing your score.</p><div id="patternDetail" class="pattern-detail" role="status" aria-live="polite"></div><p class="muted small">Only check possible smaller factors up to √n. Every larger factor has a smaller partner.</p></div>';
 finished.append(section);
 const toggle=$('patternToggle'),body=$('patternBody'),detail=$('patternDetail');
 let selected=null;
 function root(){return document.body.dataset.dolLayout==='pairboard'?$('layoutPairGrid'):$('answerReview');}
 function showPair(n,a,b,key){
  selected=key;
  const [title,text]=explanation(n,a,b);detail.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=a+' × '+b+' · '+title;
  const para=document.createElement('p');para.textContent=text;detail.append(heading,para);
  const more=document.createElement('button');more.type='button';more.className='pattern-method';more.textContent='How do I test divisibility by '+a+'?';more.setAttribute('aria-expanded','false');
  const work=document.createElement('p');work.hidden=true;const c=divisionChunks(n,a),r=divisibilityRule(n,a);
  work.textContent=r.rule+' '+r.work+' Split '+n+' into '+c.firstProduct+' + '+c.remaining+'. Divide each part by '+a+': '+c.firstProduct+' ÷ '+a+' = '+c.first+' and '+c.remaining+' ÷ '+a+' = '+c.second+'. Add '+c.first+' + '+c.second+' = '+b+'. Check: '+a+' × '+b+' = '+n+'.';
  more.addEventListener('click',()=>{work.hidden=!work.hidden;more.setAttribute('aria-expanded',String(!work.hidden));});detail.append(more,work);
  const source=factorPairs(n).find(([x,y])=>x*2===a&&y%2===0&&y/2===b);
  if(source){const link=document.createElement('p');link.className='pattern-link';link.textContent='↳ '+source[0]+' × '+source[1]+' → '+a+' × '+b+' (double '+source[0]+', halve '+source[1]+')';detail.append(link);}
  document.querySelectorAll('[data-review-pair]').forEach(button=>{if(button.dataset.reviewPair===key)button.dataset.patternSelected='true';else delete button.dataset.patternSelected;});
 }
 function selectFirst(){
  const first=root()?.querySelector('[data-review-pair]');if(!first)return;
  const [a,b]=first.dataset.reviewPair.split('-').map(Number);showPair(Number($('numberValue').textContent),a,b,first.dataset.reviewPair);
 }
 toggle.addEventListener('click',()=>{
  body.hidden=!body.hidden;const open=!body.hidden;
  toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Hide factor patterns ↑':'Show factor patterns ↓';
  if(open){document.body.dataset.dolPatternMode='true';selectFirst();}
  else{delete document.body.dataset.dolPatternMode;document.querySelectorAll('[data-pattern-selected]').forEach(b=>delete b.dataset.patternSelected);}
 });
 document.addEventListener('dol-pattern-select',e=>{if(!body.hidden)showPair(e.detail.n,e.detail.a,e.detail.b,e.detail.key);});
 document.addEventListener('dol-review-rendered',e=>{if(body.hidden)return;const item=root()?.querySelector('[data-review-pair="'+selected+'"]');if(item){const [a,b]=selected.split('-').map(Number);showPair(e.detail.target,a,b,selected);}else selectFirst();});
 new MutationObserver(()=>{if(finished.hidden&&!body.hidden)toggle.click();}).observe(finished,{attributes:true,attributeFilter:['hidden']});
}
