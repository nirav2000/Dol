import {factorPairs} from './logic.mjs';
import {divisibilityRule} from './strategy-model.mjs';
const $=id=>document.getElementById(id);
function explanation(n,a,b){
 if(a===1)return ['Start with 1',`Every number has 1 as a factor: 1 × ${n}.`];
 if(a===2)return ['Even number',`${n} ends in an even digit. Halve it to get ${b}.`];
 if(a===3||a===9){const digits=[...String(n)].map(Number),sum=digits.reduce((x,y)=>x+y,0);let s=`${digits.join(' + ')} = ${sum}. ${sum} is divisible by ${a===9?9:3}.`;if(sum>=10){const root=[...String(sum)].map(Number).reduce((x,y)=>x+y,0);s+=` You can also add again: ${[...String(sum)].join(' + ')} = ${root}, but this second addition is optional.`;}return ['Digit-sum test',s+ ` Therefore ${n} ÷ ${a} = ${b}.`];}
 if(a===6)return ['Combine 2 and 3',`${n} is even and its digits sum to a multiple of 3. Because 2 and 3 have no common factor, it is divisible by 6. ${n} ÷ 6 = ${b}.`];
 if(a===11){const r=divisibilityRule(n,11);return ['The 11 test',r.work+` Then ${n} ÷ 11 = ${b}.`];}
 const pairs=factorPairs(n);for(const [x,y] of pairs){if(x===a&&y===b)continue;if(x*2===a&&y%2===0&&y/2===b)return ['Double and halve',`Start with ${x} × ${y}. Double ${x} to ${a} and halve ${y} to ${b}; the product stays ${n}.`];}
 if(a%3===0&&n%3===0)return ['Build with 3',`Try dividing a known factor pair by 3 on one side and multiplying by 3 on the other. Check: ${a} × ${b} = ${n}.`];
 return ['Find the partner',`Test ${a} as a divisor, then calculate ${n} ÷ ${a} = ${b}. Check by multiplying back.`];
}
export function initFactorPatterns(){
 const finished=$('finishedPanel');if(!finished)return;
 const section=document.createElement('section');section.className='pattern-explorer';section.innerHTML='<button type="button" id="patternToggle" class="secondary" aria-expanded="false">Explore how the pairs connect ↓</button><div id="patternBody" hidden><p class="muted small">Tap a pair to see a way to discover it. These explanations never change your score.</p><div id="patternGrid" class="pattern-grid"></div><div id="patternDetail" class="pattern-detail" role="status" aria-live="polite"></div><p class="muted small">To know you are finished, check possible smaller factors only up to √n. Every larger factor has a smaller partner.</p></div>';finished.append(section);
 const toggle=$('patternToggle'),body=$('patternBody'),grid=$('patternGrid'),detail=$('patternDetail');
 toggle.addEventListener('click',()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));toggle.textContent=body.hidden?'Explore how the pairs connect ↓':'Hide factor patterns ↑';if(!body.hidden)draw();});
 function draw(){
 const n=Number($('numberValue')?.textContent);if(!Number.isSafeInteger(n)||n<1)return;
 grid.replaceChildren();const pairs=factorPairs(n);
 pairs.forEach(([a,b],i)=>{const button=document.createElement('button');button.type='button';button.className='pattern-pair';button.textContent=`${a} × ${b}`;button.addEventListener('click',()=>{grid.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');const [title,text]=explanation(n,a,b);detail.replaceChildren();const heading=document.createElement('strong');heading.textContent=title;const para=document.createElement('p');para.textContent=text;detail.append(heading,para);});grid.append(button);if(i===0)queueMicrotask(()=>button.click());});
 }
 const observer=new MutationObserver(()=>{if(!finished.hidden&&!body.hidden)draw();});
 observer.observe(finished,{attributes:true,attributeFilter:['hidden']});
}
