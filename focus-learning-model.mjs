// Live hints derive from the CURRENT solved board, not static factor lists.
// Every automatic route targets an unsolved pair. Worked answers require a tap.
import {boardSuggestions} from './board-aware-help.mjs';
const key=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
const eq=pair=>pair[0]+' × '+pair[1];
function shortcut(n,m){
 const k=m.divisor,q=m.partner;
 if(k===1)return {kind:'shortcut',id:'identity:'+m.goalKey,goalKey:m.goalKey,
  teaser:'Every number has a factor of 1. What belongs next to 1 to make '+n+'?',
  steps:['Multiplying by 1 does not change a number.','So 1 × ? = '+n+'. What fits?',
   '1 × '+n+' = '+n+'. Enter that pair yourself.']};
 if(k===3||k===9){
  const ds=String(n).split('').map(Number),sum=ds.reduce((a,b)=>a+b,0);
  return {kind:'shortcut',id:'digits:'+m.goalKey,goalKey:m.goalKey,
   teaser:'Try the digit-sum rule: add the digits of '+n+'. What divisor does that suggest?',
   steps:['The digits add up: '+ds.join(' + ')+' = '+sum+'. Is this a multiple of '+k+'?',
    'Yes: '+sum+' is divisible by '+k+'. So '+n+' is too. Find '+n+' ÷ '+k+'.',
    n+' ÷ '+k+' = '+q+'. Check '+k+' × '+q+' = '+n+' and enter it yourself.']};
 }
 if(k===2)return {kind:'shortcut',id:'even:'+m.goalKey,goalKey:m.goalKey,
  teaser:'The final digit is even. Which very small factor should you test?',
  steps:['Even numbers split exactly into two groups.','Halve '+n+' to find the partner for 2.',
    n+' ÷ 2 = '+q+'. Try 2 × '+q+' on your board.']};
 if(k===5||k===10)return {kind:'shortcut',id:'ending:'+m.goalKey,goalKey:m.goalKey,
  teaser:'Look at the last digit of '+n+'. Which divisibility rule could help?',
  steps:['A number ending in '+(k===10?'0':'0 or 5')+' is divisible by '+k+'.',
   'Find '+n+' ÷ '+k+'. What whole number gives the partner?',
   n+' ÷ '+k+' = '+q+'. Check '+k+' × '+q+' = '+n+'.']};
 return {kind:'shortcut',id:'small:'+m.goalKey,goalKey:m.goalKey,
  teaser:'Try a small divisor. Could '+k+' divide '+n+' with no remainder?',
  steps:['Test '+k+' using a familiar multiple.','Work out '+n+' ÷ '+k+' in friendlier chunks.',
    k+' × '+q+' = '+n+'. Check and enter this missing pair.']};
}
function balance(n,m){
 const from=m.from,to=m.to,up=to[0]>from[0],factor=up?to[0]/from[0]:from[0]/to[0];
 return {kind:'balance',id:'balance:'+m.goalKey,goalKey:m.goalKey,from,to,
  teaser:'Reuse '+eq(from)+'. Could you double or regroup one factor and balance the other?',
  steps:['Keep '+n+' unchanged: '+(up?'multiply':'divide')+' the first factor by '+factor+
    ' and '+(up?'divide':'multiply')+' the other by '+factor+'.',
   up?from[0]+' × '+factor+' = '+to[0]+'. Now find '+from[1]+' ÷ '+factor+'.':
      from[0]+' ÷ '+factor+' = '+to[0]+'. Now find '+from[1]+' × '+factor+'.',
   eq(to)+' = '+n+'. This is a NEW pair. Try it yourself.']};
}
function regroup(n,m){
 return {kind:'regroup',id:'regroup:'+m.goalKey,goalKey:m.goalKey,from:m.from,to:m.to,
  teaser:'You found '+eq(m.from)+'. Can you split '+m.splitFactor+' into smaller factors?',
  steps:['Try splitting '+m.splitFactor+' by '+m.divisor+'.',
   m.splitFactor+' = '+m.divisor+' × '+m.partner+'. Move the '+m.divisor+' to the other factor.',
   eq(m.to)+' = '+n+'. Regrouping creates a new pair. Check it yourself.']};
}
function repair(n,found,m){
 const a=Number(m?.a),b=Number(m?.b),product=a*b;
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<=0||b<=0||
    !Number.isSafeInteger(product)||product===n)return null;
 const small=product<n,diff=Math.abs(product-n);
 const ratio=small&&n%product===0?n/product:!small&&product%n===0?product/n:null;
 const options=[];
 if(ratio&&Number.isInteger(ratio)&&ratio>=2&&ratio<=12){
  if(small)options.push([a*ratio,b],[a,b*ratio]);
  else{if(a%ratio===0)options.push([a/ratio,b]);if(b%ratio===0)options.push([a,b/ratio]);}
 }
 const valid=p=>Number.isSafeInteger(p[0])&&Number.isSafeInteger(p[1])&&p[0]>0&&p[1]>0&&p[0]*p[1]===n;
 const missing=options.find(p=>valid(p)&&!found.has(key(...p)));
 const known=options.find(p=>valid(p)&&found.has(key(...p)));
 let teaser=eq([a,b])+' = '+product+', not '+n+'. ',steps;
 if(missing){
  teaser+=(small?'This is too small.':'This is too large.')+' Which factor could you change while keeping the other fixed?';
  steps=['The difference between '+product+' and '+n+' is '+diff+'. Can you spot a scale factor?',
   'One product is '+ratio+' times the other. '+(small?'Multiply':'Divide')+' ONE factor by '+ratio+'.',
   eq(missing)+' = '+n+'. Verify it before entering the pair.'];
 }else if(known){
  teaser+='A corrected pair is ALREADY on your board. Find a different factor rather than repeat it.';
  steps=['The difference from '+n+' is '+diff+'. Your multiplication is useful evidence.',
   'You already have '+eq(known)+'. That explains the scaling, but you need a new pair.',
   'Use the digit sum, a new halve-and-double move or another first factor through √'+n+'.'];
 }else{
  teaser+='Check the product, then adjust one factor towards the target.';
  steps=['You made '+product+'; the difference is '+diff+'.',
   small?'The product is too small. Increase one factor and check again.':'The product is too large. Reduce one factor and check again.',
   'Test a candidate by dividing '+n+'. A genuine factor leaves no remainder.'];
 }
 return {kind:'repair',id:'repair:'+a+'-'+b+':'+found.size,goalKey:missing?key(...missing):null,teaser,steps};
}
export function makeFocusPlan(n,found=new Set(),incorrect=null){
 if(!Number.isInteger(n)||n<1)return {id:'ready',total:0,remaining:0,routes:[]};
 const plan=boardSuggestions(n,found),routes=[];
 const mistake=repair(n,found,incorrect);if(mistake)routes.push(mistake);
 for(const choice of plan.choices){
  let route=null;
  if(choice.route==='shortcut'&&plan.shortcut)route=shortcut(n,plan.shortcut);
  if(choice.route==='reuse'&&plan.balance)route=balance(n,plan.balance);
  if(choice.route==='regroup'&&plan.regroup)route=regroup(n,plan.regroup);
  if(route&&!routes.some(x=>x.goalKey&&x.goalKey===route.goalKey))routes.push(route);
 }
 if(!routes.length&&plan.missing.length){
  const [a,b]=plan.missing[0];
  routes.push({kind:'systematic',id:'systematic:'+key(a,b),goalKey:key(a,b),
   teaser:'Work systematically: which first factor is still untested up to √'+n+'?',
   steps:['You only need to test first factors 1 through '+Math.floor(Math.sqrt(n))+'.',
    'Use division, not guesswork. A factor leaves no remainder.',
    'One missing pair is '+a+' × '+b+'. Check it before entering it.']});
 }
 return {id:n+'|'+[...found].sort().join(',')+'|'+(mistake?mistake.id:''),total:plan.total,
  remaining:plan.missingCount,routes};
}
export function explainPairMotion(n,previousFound,pair){
 const [a,b]=[...pair].sort((x,y)=>x-y);
 if(!Number.isInteger(n)||a*b!==n)return null;
 const moves=[];
 for(const old of previousFound){
  const [x,y]=old.split('-').map(Number);
  if(!x||!y||x*y!==n)continue;
  let factor=0,up=true;
  if(a>x&&a%x===0&&y>b&&y%b===0&&a/x===y/b){factor=a/x;up=true;}
  else if(x>a&&x%a===0&&b>y&&b%y===0&&x/a===b/y){factor=x/a;up=false;}
  if(factor>1)moves.push({factor,up,from:[x,y]});
 }
 moves.sort((x,y)=>x.factor-y.factor||x.from[0]-y.from[0]);
 if(moves.length){
  const {factor,up,from}=moves[0];
  return {kind:'balance',from,to:[a,b],factor,first:up?'×'+factor:'÷'+factor,
   second:up?'÷'+factor:'×'+factor,
   caption:'Both factor pairs make '+n+'. One side scales up as the other scales down.'};
 }
 return {kind:'groups',to:[a,b],totalGroups:a,count:Math.min(a,8),
  caption:a+' groups of '+b+' make '+n+'.'};
}
