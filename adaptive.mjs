import {factorPairs} from './logic.mjs';
export const STAGES=[
  {id:'foundation',label:'Foundation',max:24,minPairs:1},
  {id:'fluency',label:'Times tables',max:144,minPairs:2},
  {id:'systematic',label:'Systematic search',max:256,minPairs:4},
  {id:'strategic',label:'Strategic factors',max:512,minPairs:4},
  {id:'expert',label:'Expert',max:1024,minPairs:4}
];
export function primeFactors(n){const out=[];let x=n;for(let p=2;p*p<=x;p++)while(x%p===0){out.push(p);x/=p;}if(x>1)out.push(x);return out;}
export function isPrime(n){return Number.isInteger(n)&&n>=2&&primeFactors(n).length===1;}
export function multiplicationFacts(n){return factorPairs(n).filter(([a,b])=>a<=12&&b<=12).map(([a,b])=>a+'x'+b);}
export function requiredConcepts(n){
  const pairs=factorPairs(n),concepts=new Set(['factor:one','factor:pair']);
  for(const [a,b] of pairs){
    if(a<=12&&b<=12)concepts.add('fact:'+a+'x'+b);
    if(a<=12)concepts.add('div:'+a);
  }
  if(n%2===0)concepts.add('rule:even');
  if(n%3===0)concepts.add('rule:three');
  if(n%5===0)concepts.add('rule:five');
  if(Number.isInteger(Math.sqrt(n)))concepts.add('square');
  if(primeFactors(n).length>=3)concepts.add('strategy:decompose');
  return [...concepts];
}
export function describeDifficulty(n){
  const pairs=factorPairs(n),factors=primeFactors(n);
  const large=pairs.filter(([a,b])=>a>12||b>12).length;
  const unfamiliar=factors.filter(p=>p>7).length;
  const square=Number.isInteger(Math.sqrt(n));
  const score=Math.round(pairs.length*2+large*1.6+unfamiliar*2+(square?1:0)+Math.log2(n)/3);
  return {score,pairCount:pairs.length,largePairs:large,primeFactors:factors,square,concepts:requiredConcepts(n)};
}
export function stageCandidates(stageId='foundation',maxOverride=1024){
  const stage=STAGES.find(x=>x.id===stageId)||STAGES[0];
  const max=Math.min(stage.max,maxOverride);
  const out=[];
  for(let n=2;n<=max;n++){
    const count=factorPairs(n).length;
    if(count>=stage.minPairs && (stageId!=='foundation'||count<=5) && (stageId!=='fluency'||multiplicationFacts(n).length>0))out.push(n);
  }
  return out;
}
export function chooseAdaptiveNumber({stage='foundation',limit=1024,history={},learningState=null,previous=null,random=Math.random}={}){
  let list=stageCandidates(stage,limit).filter(n=>n!==previous);
  if(!list.length)list=stageCandidates(stage,limit);
  if(!list.length)throw new RangeError('No eligible numbers');
  const targetDifficulty={foundation:5,fluency:10,systematic:15,strategic:20,expert:28}[stage]||5;
  const weights=list.map(n=>{
    const d=describeDifficulty(n);
    const seen=history[n]||{};
    const errorRate=(seen.attempts||0)>0 ? 1-(seen.correct||0)/seen.attempts : 0;
    const overdue=seen.nextDue&&seen.nextDue<=Date.now()?1:0;
    const challenge=1/(1+Math.abs(d.score-targetDifficulty)/6);
    const observed=d.concepts.map(id=>learningState?.concepts?.[id]).filter(Boolean);
    const weakFacts=observed.length ? observed.reduce((sum,c)=>sum+(1-(c.mastery||0)),0)/observed.length : .45;
    const factReview=1+weakFacts*.8;
    const penalty=(seen.recentlySeen||0)>0?.25:1;
    return Math.max(.01,(.35+challenge*2+errorRate*2+overdue)*penalty*factReview);
  });
  const total=weights.reduce((a,b)=>a+b,0);
  let pick=Math.min(.999999999,Math.max(0,random()))*total;
  for(let i=0;i<list.length;i++){pick-=weights[i];if(pick<0)return list[i];}
  return list.at(-1);
}
export function factorCheck(n,k){
  const valid=Number.isInteger(k)&&k>0&&n%k===0;
  return {valid,other:valid?n/k:null,remainder:n%k};
}
export function factorHints(n,k){
  if(!Number.isInteger(k)||k<1)return ['Choose a positive whole number to test.'];
  const yes=n%k===0,other=yes?n/k:null;
  const list=[
    'A factor divides the target exactly, leaving no remainder. Could '+k+' do that?',
    k===1?'One is a factor of every positive whole number.':k===2?'Check whether the last digit is even.':k===3?'Add the digits. Is that sum divisible by 3?':k===5?'Does the number end in 0 or 5?':k===10?'Does the number end in 0?':'Think of a multiple of '+k+' near '+n+'.',
    'Try division: '+n+' ÷ '+k+'. What whole number, if any, makes '+n+'?',
    yes?'The division is exact: '+n+' ÷ '+k+' = '+other+'.':'It leaves a remainder of '+(n%k)+', so '+k+' is not a factor.',
    yes?'The pair is '+k+' × '+other+' = '+n+'.':'Try another candidate. The answer must divide '+n+' with no remainder.'
  ];
  return list;
}
export const TECHNIQUES=[
 {id:'one',title:'Start with 1',level:'Essential',detail:'Every positive whole number has the pair 1 × itself. This is always a valid first pair.',example:'1 × 112 = 112'},
 {id:'two',title:'Even or odd?',level:'Essential',detail:'An even number is divisible by 2. Check the last digit (0, 2, 4, 6 or 8).',example:'112 ÷ 2 = 56'},
 {id:'three',title:'Divisible by 3 and 9',level:'Essential',detail:'Add the digits. If their sum is divisible by 3 or 9, the number is too.',example:'126: 1+2+6=9, so 3 and 9 divide 126'},
 {id:'five',title:'Divisible by 5 and 10',level:'Essential',detail:'A number ending in 0 or 5 is divisible by 5. Ending in 0 means divisible by 10.',example:'120 ÷ 5 = 24'},
 {id:'four',title:'Divisible by 4',level:'Important',detail:'Check the last two digits. If they make a multiple of 4, the entire number is divisible by 4.',example:'316: 16 ÷ 4 = 4'},
 {id:'six',title:'Divisible by 6',level:'Important',detail:'A number is divisible by 6 when it is divisible by both 2 and 3.',example:'114 is even; 1+1+4=6'},
 {id:'eight',title:'Divisible by 8',level:'Important',detail:'Check the last three digits (or repeatedly halve an even number three times).',example:'112 ÷ 8 = 14'},
 {id:'eleven',title:'Divisible by 11',level:'Extension',detail:'Take the difference between the sums of alternating digits. A multiple of 11 (including zero) means divisibility by 11.',example:'121: (1+1)-2=0'},
 {id:'twelve',title:'Divisible by 12',level:'Extension',detail:'A number divisible by both 3 and 4 is divisible by 12.',example:'144: digit sum 9; last two digits 44'},
 {id:'seven',title:'Testing 7',level:'Extension',detail:'Use known multiples of 7 or subtract twice the last digit from the remaining number repeatedly. The resulting number is divisible by 7 exactly when the original is.',example:'112 → 11−2×2 = 7'},
 {id:'double',title:'Halve and double',level:'Fast strategy',detail:'If one factor is even, halve it and double the other. This preserves the product and can generate new pairs very quickly. It does NOT necessarily find every pair: check other divisors too.',example:'2 × 56 → 4 × 28 → 8 × 14'},
 {id:'split',title:'Split into easier multiples',level:'Fast strategy',detail:'Break a division into chunks of known multiplication facts, then combine the quotients.',example:'112 ÷ 7 = (70+42) ÷ 7 = 10+6 = 16'},
 {id:'inverse',title:'Multiplication and division',level:'Essential',detail:'Multiplication and division undo one another. If a × b = n, then n ÷ a = b.',example:'7 × 16 = 112; 112 ÷ 7 = 16'},
 {id:'rainbow',title:'Factor rainbow',level:'Systematic',detail:'Write small factors in ascending order and their matching large factors in descending order. Connect each pair with an arc.',example:'1—112, 2—56, 4—28, 7—16, 8—14'},
 {id:'stop',title:'Know when to stop',level:'Systematic',detail:'Check divisors only up to the square root. Beyond that you would repeat reversed pairs. For a square, count its middle pair only once.',example:'√112 ≈ 10.6; check 1 to 10'},
 {id:'prime',title:'Prime factor tree',level:'Advanced',detail:'Split a composite number into prime factors. Combine them to generate divisors systematically.',example:'112 = 2×2×2×2×7'},
 {id:'squares',title:'Square numbers',level:'Important',detail:'Learn squares through 12². A perfect square has a middle pair such as 6×6 and an odd number of distinct positive factors.',example:'36 = 6×6'},
 {id:'arrays',title:'Build arrays',level:'Visual',detail:'Arrange counters in equal rows. Each rectangular arrangement shows a factor pair.',example:'24 counters: 1×24, 2×12, 3×8, 4×6'},
 {id:'line',title:'Skip-count on a number line',level:'Visual',detail:'Make jumps of the candidate factor. If you land exactly on the target, it is a factor.',example:'0, 7, 14, …, 112'},
 {id:'completeness',title:'Prove you found them all',level:'Systematic',detail:'Test every possible divisor from 1 through floor(√n). That is the reliable way to ensure no pair is missed.',example:'For 112 test 1–10'},
 {id:'facts',title:'Memorise multiplication facts',level:'Essential',detail:'Recall multiplication and related division facts up to 12×12, especially less familiar 6s, 7s, 8s and 9s. Do not memorise every target’s factor list.',example:'7×8=56, 56÷7=8'},
 {id:'primes',title:'Recognise primes',level:'Important',detail:'A prime has exactly two positive factors: 1 and itself. Recognise primes to at least 19, then build toward 100.',example:'2,3,5,7,11,13,17,19'},
 {id:'distinguish',title:'Factors versus multiples',level:'Essential',detail:'Factors divide a number exactly; multiples are products of that number and whole numbers.',example:'4 is a factor of 12; 12 is a multiple of 4'}
];
