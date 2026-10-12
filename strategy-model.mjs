// App-local strategy content. Recognition is NOT evidence of factor fluency.
import {factorPairs} from './logic.mjs';
const times=' \u00d7 ',divide=' \u00f7 ',minus=' \u2212 ';
export const strategyNames={one:'Start with 1',two:'Even or odd',three:'Digit sums',five:'Last-digit checks',four:'Halve twice',eleven:'The 11 test',split:'Split the division',double:'Halve and double',systematic:'Systematic search',stop:'Know when to stop'};
export const normalPair=pair=>[...pair].sort((a,b)=>a-b).join('-');
const positive=n=>Number.isSafeInteger(n)&&n>0;
function requireNumber(n){if(!positive(n))throw new RangeError('Use a positive whole number.');}
export function elevenCheck(n){
  requireNumber(n);
  const groups=[[],[]];[...String(n)].forEach((d,i)=>groups[i%2].push(Number(d)));
  const sums=groups.map(g=>g.reduce((a,b)=>a+b,0)),difference=Math.abs(sums[0]-sums[1]);
  return {groups,sums,difference,divisible:difference%11===0};
}
export function halvingWork(n){
  requireNumber(n);if(n%2)return `${n} is odd: halving it does not give a whole number.`;
  const tens=Math.floor(n/10)*10,ones=n%10;
  return tens&&ones?`${n} = ${tens} + ${ones}. Half of ${tens} is ${tens/2}; half of ${ones} is ${ones/2}. Add them: ${tens/2} + ${ones/2} = ${n/2}.`:`${n}${divide}2 = ${n/2}.`;
}
export function divisionChunks(n,k){
  requireNumber(n);requireNumber(k);
  const quotient=Math.floor(n/k),remainder=n%k;
  const first=quotient>=10?Math.floor(quotient/10)*10:Math.floor(quotient/2);
  const second=quotient-first;
  return {quotient,remainder,first,second,firstProduct:first*k,remaining:n-first*k,secondProduct:second*k};
}
export function divisibilityRule(n,k){
  requireNumber(n);requireNumber(k);
  const digits=[...String(n)].map(Number),sum=digits.reduce((a,b)=>a+b,0),last=n%10,lastTwo=n%100,lastThree=n%1000;
  let id='split',rule=`Use multiples of ${k} to check whether the division is exact.`,work=`We need whole groups of ${k}, with nothing left over.`;
  if(k===1){id='one';rule='Every positive whole number has 1 as a factor.';work=`One group of ${n} makes ${n}.`;}
  if(k===2){id='two';rule='A number is divisible by 2 when its last digit is 0, 2, 4, 6 or 8.';work=`${n} ends in ${last}, which is ${n%2?'odd':'even'}.`;}
  if(k===3||k===9){id='three';rule=`Add all the digits. The number is divisible by ${k} exactly when that sum is divisible by ${k}.`;work=`${digits.join(' + ')} = ${sum}. ${sum} ${sum%k?'is not':'is'} a multiple of ${k}.`+(sum>=10?` You may add again: ${[...String(sum)].join(' + ')} = ${[...String(sum)].map(Number).reduce((a,b)=>a+b,0)}. This second addition is optional: ${sum} already tells us whether ${k} divides ${n}.`:'');}
  if(k===5||k===10){id='five';rule=k===5?'A number ending in 0 or 5 is divisible by 5.':'A number ending in 0 is divisible by 10.';work=`The last digit of ${n} is ${last}.`;}
  if(k===4){id='four';rule='Halve twice. Both halvings must give whole numbers. Equivalently, check that the last two digits make a multiple of 4.';work=n%2?`${n} is odd, so even the first halving is not exact.`:n%4?`${n}${divide}2 = ${n/2}, which is odd. The second halving is not exact.`:`${n}${divide}2 = ${n/2}; then ${n/2}${divide}2 = ${n/4}. Two exact halvings mean division by 4. Last-two-digits check: ${lastTwo}${divide}4 = ${lastTwo/4}.`;}
  if(k===6){id='three';rule='A number is divisible by 6 only when it is divisible by BOTH 2 and 3.';work=`${n} is ${n%2?'odd':'even'}. Its digit sum is ${sum}, which ${sum%3?'is not':'is'} divisible by 3.`;}
  if(k===8){rule='Check the last three digits (the whole number for a shorter number). They must be divisible by 8. Three exact halvings also test division by 8.';work=`Check ${lastThree}${divide}8; an exact whole-number result is needed.`;}
  if(k===12){rule='Check BOTH divisibility by 3 and divisibility by 4.';work=`The digit sum is ${sum}; the last two digits make ${lastTwo}. Both tests must pass.`;}
  if(k===11){
    id='eleven';const c=elevenCheck(n),a=c.groups[0].join(' + '),b=c.groups[1].join(' + ')||'0';
    rule='Add the 1st, 3rd, 5th ... digits. Separately add the 2nd, 4th, 6th ... digits. Subtract the smaller total from the larger. If the difference is 0, 11, 22, 33 ... the original number is divisible by 11. Zero counts: 11 \u00d7 0 = 0.';
    work=`(${a}) = ${c.sums[0]}; (${b}) = ${c.sums[1]}. Difference: ${Math.max(...c.sums)}${minus}${Math.min(...c.sums)} = ${c.difference}. ${c.divisible?`${c.difference} is ${c.difference===0?'zero':'a multiple of 11'}, so 11 divides ${n}.`:`${c.difference} is neither zero nor a multiple of 11, so 11 does not divide ${n}.`} This test does not calculate the partner.`;
  }
  return {id,rule,work,divisible:n%k===0};
}
const step=(title,text,equation='')=>({title,text,equation});
export function factorLesson(n,k){
  requireNumber(n);requireNumber(k);
  const r=divisibilityRule(n,k),c=divisionChunks(n,k),exact=c.remainder===0;
  const lesson={kind:'factor',technique:r.id,target:n,candidate:k,pairKey:exact?normalPair([k,c.quotient]):null,partnerIndex:3,steps:[]};
  if(k===1){lesson.partnerIndex=1;lesson.steps=[step('Start with one','Every positive whole number can be written as 1 times itself. What is the partner of 1 here?'),step('One group is enough',`One group of ${n} makes ${n}.`, `1${times}${n} = ${n}`)];return lesson;}
  lesson.steps=[step(`Could ${k} be a factor?`,`First check whether ${k} divides ${n} exactly. Finding whether it divides and calculating its partner are two separate jobs.`),step(k===11?'The 11 rule, including zero':'A useful test',r.rule),step('Apply the test',r.work)];
  if(!exact){
    lesson.steps.push(step('Check the remainder',`${k}${times}${c.quotient} = ${k*c.quotient}. There are ${c.remainder} left over, so ${k} is not a factor. Trying a candidate is exploration, not a marked mistake.`,`${n} = ${k}${times}${c.quotient} + ${c.remainder}`));
    return lesson;
  }
  lesson.steps.push(step('Now find the partner',`How many groups of ${k} make ${n}? Split ${n} into comfortable multiples of ${k}; then add the numbers of groups.`,`${n}${divide}${k} = ?`));
  lesson.steps.push(step('Take an easy chunk',`${k}${times}${c.first} = ${c.firstProduct}. Subtract that from ${n}: ${n}${minus}${c.firstProduct} = ${c.remaining}. Now work out how many more groups of ${k} fit.`,`${n} = ${c.firstProduct} + ${c.remaining}`));
  lesson.steps.push(step('Put the chunks together',`${k}${times}${c.second} = ${c.secondProduct}. There were ${c.first} groups in the first chunk and ${c.second} in the second: ${c.first} + ${c.second} = ${c.quotient}. So the partner is ${c.quotient}; we calculated it, not guessed it.`,`${k}${times}${c.quotient} = ${n}`));
  return lesson;
}
export function transformationLesson(n,source,direction=1){
  requireNumber(n);
  const [a,b]=source;if(!positive(a)||!positive(b)||a*b!==n)throw new RangeError('The source pair must make the target.');
  const doubled=direction===1?a:b,halved=direction===1?b:a;
  if(halved%2)throw new RangeError('Only halve an even factor.');
  const next=[doubled*2,halved/2],key=normalPair(next);
  return {kind:'transform',technique:'double',target:n,source:[a,b],pairKey:key,candidate:null,partnerIndex:2,steps:[
    step('Use a pair you already know',`You have ${a}${times}${b}. One side is even. Can you make a different pair without changing the product?`,`${a}${times}${b} = ${n}`),
    step('Balance the two changes',`Double ${doubled} and halve ${halved}. Multiplying one side by 2 and dividing the other by 2 cancel out, so the product stays the same.`,`(${doubled}${times}2)${times}(${halved}${divide}2) = ${n}`),
    step('Work out the half',halvingWork(halved),`${halved}${divide}2 = ${halved/2}`),
    step('Complete the new pair',`${doubled}${times}2 = ${next[0]}. Pair that with ${next[1]}: ${next[0]}${times}${next[1]} = ${n}.${next[0]>next[1]?' Writing the smaller number first gives '+key.replace('-',times)+'. It is the same pair, not an extra one.':''} Halving and doubling can find more pairs, but it does not prove you have found every pair.`,key.replace('-',times)+` = ${n}`)
  ]};
}
export function suggestLesson(n,found=new Set()){
  requireNumber(n);const pairs=factorPairs(n),missing=pairs.filter(p=>!found.has(normalPair(p)));
  if(!missing.length)return null;
  if(!found.has(`1-${n}`))return factorLesson(n,1);
  // Only use pairs actually entered; never assume an unseen intermediate pair is known.
  for(const pair of [...found].reverse().map(k=>k.split('-').map(Number))){
    if(pair.length!==2||pair[0]*pair[1]!==n)continue;
    for(const direction of [1,-1]){
      const even=direction===1?pair[1]:pair[0];if(even%2)continue;
      const lesson=transformationLesson(n,pair,direction);
      if(!found.has(lesson.pairKey))return lesson;
    }
  }
  const order=[2,5,10,3,9,4,6,8,11,12,7];
  missing.sort((a,b)=>{const rank=k=>order.includes(k)?order.indexOf(k):order.length+k;return rank(a[0])-rank(b[0]);});
  return factorLesson(n,missing[0][0]);
}
export function emptyStrategyHistory(){return {schema:1,choices:[],hints:[],sessions:[]};}
export function cleanStrategyHistory(value){
  if(value?.schema!==1)return emptyStrategyHistory();
  return {schema:1,choices:(Array.isArray(value.choices)?value.choices:[]).filter(e=>e&&e.technique&&['direct','valid','retry'].includes(e.rating)).slice(-500),hints:(Array.isArray(value.hints)?value.hints:[]).filter(e=>e&&e.technique&&positive(e.target)).slice(-300),sessions:(Array.isArray(value.sessions)?value.sessions:[]).slice(-100)};
}
const option=(id,label,rating,feedback)=>({id,label,rating,feedback});
function techniqueCard(id,n,found){
  const card={id:`${id}:${n}`,technique:id,target:n,context:'',prompt:'Which move would help?',options:[]};
  const known=[...found].map(k=>k.split('-').map(Number)).filter(p=>p[0]*p[1]===n);
  if(id==='eleven'){
    card.context=`You want to check whether 11 divides ${n}. You do not need its partner yet.`;
    card.options=[option('alternate','Compare the sums of alternating digits','direct',divisibilityRule(n,11).work),option('divide',`Divide ${n} by 11 and check for a remainder`,'valid','Yes. Exact division also tests divisibility. The alternating-digit check can be a quicker first test.'),option('sum','Add all the digits and test the sum for 11','retry','Adding ALL the digits is the familiar test for 3 or 9, not 11. For 11, compare two alternating groups.')];
  }else if(id==='double'){
    const usable=p=>p[1]%2===0&&p[0]*2!==p[1];
    const source=[...known].reverse().find(p=>usable(p)&&p[0]>1)||factorPairs(n).find(p=>usable(p)&&p[0]>1)||factorPairs(n).find(usable);
    if(!source)return null;const [a,b]=source;card.context=`You already know ${a}${times}${b} = ${n}. You want a different pair, keeping the product unchanged.`;
    card.options=[option('balance','Double one side and halve the even side','direct',`${a}${times}2 = ${a*2}; ${b}${divide}2 = ${b/2}. The product stays ${n}.`),option('systematic','Test other possible divisors systematically','valid','That also works. Halving and doubling makes direct use of the even factor you already have.'),option('both','Halve both sides of the pair','retry','Halving both sides divides the product by 4. To keep the product unchanged, balance a halving with a doubling.')];
  }else if(id==='split'){
    const k=n%11===0?11:factorPairs(n).find(p=>p[0]>1)?.[0];if(!k||k===n)return null;
    const c=divisionChunks(n,k);card.context=`You know ${k} is a factor of ${n}. You still need to calculate its partner.`;
    card.options=[option('chunks',`Split ${n} into easy multiples of ${k}`,'direct',`${n} = ${c.firstProduct} + ${c.secondProduct} = ${k}${times}${c.first} + ${k}${times}${c.second}. Add the groups: ${c.first} + ${c.second} = ${c.quotient}.`),option('division',`Use exact written division: ${n}${divide}${k}`,'valid','Yes. Written division calculates the partner too. Choosing manageable chunks is another way to do that division.'),option('test','Repeat the divisibility test; that gives the partner','retry','A divisibility test tells you whether the division is exact, not its quotient. You still need to calculate how many groups fit.')];
  }else if(id==='four'){
    card.context=`You want to test whether 4 divides ${n}.`;
    card.options=[option('twice','Halve twice; both results must be whole numbers','direct',divisibilityRule(n,4).work),option('last-two','Check whether the last two digits make a multiple of 4','valid','That is also a valid test for 4. The last two digits must form an exact multiple of 4.'),option('once','Check that the number is even; that is enough','retry','Being even only guarantees divisibility by 2. For 4, a second exact halving is needed. For example, 6 is even but is not divisible by 4.')];
  }else if(id==='stop'){
    const cap=Math.floor(Math.sqrt(n));card.context=`For ${n}, you have checked EVERY whole-number candidate from 1 through ${cap}, keeping every exact pair. Are any more first factors needed?`;
    card.options=[option('bound',`Stop: ${cap+1}${times}${cap+1} is already bigger than ${n}`,'direct',`A new pair cannot have both factors at least ${cap+1}: their product would be at least ${(cap+1)**2}. Larger first factors only reverse pairs you already checked.${cap*cap===n?' Include '+cap+times+cap+' once.':''}`),option('continue',`Continue checking all the way to ${n}`,'valid','That would still check every possibility, but it is unnecessary. You have already reached the point where pairs would start reversing.'),option('primes','Checking only the prime first factors would also list every pair','retry','Prime tests can help factorise a number, but do not directly list every pair. Composite factors and combinations matter too.')];
  }else if(id==='systematic'){
    card.context=`You have found some pairs for ${n}, but are unsure whether any are missing.`;
    card.options=[option('order','Track possible first factors in order, up to the crossing point','direct','Yes. Record each candidate checked, keep exact pairs, and stop when the first factor would exceed its partner.'),option('combinations','Prime-factorise, then generate every combination','valid','That is another complete method, provided every distinct combination is included. It needs more bookkeeping.'),option('three','Stop as soon as three pairs have been found','retry','Numbers have different numbers of pairs. Finding three pairs does not establish that none are missing.')];
  }else if(id==='two'||id==='five'||id==='three'){
    const k={two:2,five:5,three:3}[id],r=divisibilityRule(n,k);card.context=`You want a quick test for whether ${k} divides ${n}.`;
    const label={two:'Check whether the last digit is even',five:'Check whether it ends in 0 or 5',three:'Add the digits; test whether the sum is divisible by 3'}[id];
    card.options=[option('rule',label,'direct',r.work),option('divide',`Divide by ${k} and check for a remainder`,'valid','Exact division works too. The digit test can answer this particular question with less calculation.'),option('guess','Look at the size of the number and estimate','retry','Size alone cannot show that a division is exact. Use a rule or check for a remainder.')];
  }else if(id==='one'){
    card.context=`A new round starts with ${n}. You want one pair that is guaranteed to work.`;
    card.options=[option('one','Use 1 and the number itself','direct',`1${times}${n} = ${n}. Every positive whole number has this pair.`),option('divide',"Divide the target by 1 to find 1's partner",'valid','Yes. Dividing by 1 leaves the target unchanged, so it gives the same guaranteed pair.'),option('zero','Use 0 and the number itself','retry','Multiplying by 0 makes 0, not this positive target.')];
  }else return null;
  return card;
}
export function makeTechniqueSession({target=24,found=new Set(),limit=1024,stage='expert',history=emptyStrategyHistory(),random=Math.random}={}){
  const max=Math.max(2,Math.min(1024,Number(limit)||1024)),basic=stage==='foundation';
  const ids=basic?['one','two','three','five','four','double','systematic']:Object.keys(strategyNames);
  const examples=[12,18,20,24,26,36,48,68,72,96,108,121,132,187,231,242,316,374,627,748,936];
  const safeHistory=cleanStrategyHistory(history),recent=safeHistory.choices.slice(-12).map(c=>c.cardId),pool=[];
  for(const id of ids){
    for(const n of [...new Set([target,...examples])].filter(n=>positive(n)&&n<=max)){
      const card=techniqueCard(id,n,n===target?found:new Set());if(!card)continue;
      const tries=safeHistory.choices.filter(c=>c.technique===id),wrong=tries.filter(c=>c.rating==='retry').length;
      const hint=safeHistory.hints.slice(-5).some(h=>h.technique===id&&h.target===n);
      const jitter=Math.max(0,Math.min(.999999,random()));
      card.priority=(hint?5:0)+(tries.length?wrong/tries.length*3:1.5)+(n===target?1:0)-(recent.includes(card.id)?2:0)+jitter;
      pool.push(card);
    }
  }
  pool.sort((a,b)=>b.priority-a.priority);const chosen=[],used=new Set(),numbers=new Set();
  // Link the first move to recent work; use different numbers to test transfer.
  for(const card of pool){if(used.has(card.technique)||numbers.has(card.target))continue;used.add(card.technique);numbers.add(card.target);chosen.push(card);if(chosen.length===5)break;}
  if(chosen.length<5)for(const card of pool){if(used.has(card.technique))continue;used.add(card.technique);chosen.push(card);if(chosen.length===5)break;}
  return chosen.map(card=>({...card,options:shuffle(card.options,random)}));
}
export function shuffle(values,random=Math.random){const out=[...values];for(let i=out.length-1;i>0;i--){const r=Math.max(0,Math.min(.999999,random())),j=Math.floor(r*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function recordChoice(history,card,choice,at=Date.now()){
  const selected=card.options.find(o=>o.id===choice);if(!selected)throw new RangeError('Choose one of the offered techniques.');
  const data=cleanStrategyHistory(history);data.choices.push({cardId:card.id,technique:card.technique,target:card.target,choice,rating:selected.rating,at});data.choices=data.choices.slice(-500);return data;
}
