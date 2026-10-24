import test from 'node:test';
import assert from 'node:assert/strict';
import {squareMemory,squareQuestion,squareReview,squareSummary,squareDeck,chooseSquareFacts,SQUARE_BANDS,REVIEW_DAYS} from '../square-learning-model.mjs';

const DAY=86400000;
const AT=Date.UTC(2026,9,24,12);
const item=(n,t,{correct=true,hints=0}={})=>({concept:'square:'+n,correct,hints,timestamp:t});
test('complete squares curriculum with correct roots, odd-number differences and factor-search limits',()=>{
  assert.equal(SQUARE_BANDS.length,3);
  assert.deepEqual(REVIEW_DAYS,[1,3,7,14,30]);
  for(let n=1;n<=32;n++){
    const m=squareMemory(n);
    assert.equal(m.square,n*n);
    assert.equal(m.gap,2*n-1);
    assert.equal(m.previous+m.gap,n*n);
    assert.equal(squareQuestion(n,'square').answer,n*n);
    assert.equal(squareQuestion(n,'root').answer,n);
    assert.equal(squareQuestion(n,'neighbour').answer,2*n-1);
    assert.equal(squareQuestion(n,'area').answer,n*n);
    assert.equal(squareQuestion(n,'boundary').answer,Math.floor(Math.sqrt(m.boundaryTarget)));
    assert.ok(m.boundaryTarget<=1024);
  }
  assert.match(squareMemory(15).strategy,/append 25/);
  assert.match(squareMemory(18).strategy,/400/);
  assert.match(squareMemory(25).strategy,/625/);
  assert.match(squareMemory(32).boundary,/INCLUDING|Include/);
  assert.throws(()=>squareMemory(33),/root/);
  assert.throws(()=>squareQuestion(9,'unknown'),/Unknown/);
});
test('first clean recall due next day; early grinding does not boost a retention interval',()=>{
  const first=item(17,AT);
  assert.equal(squareReview([],17,AT).seen,false);
  const next=squareReview([first],17,AT);
  assert.equal(next.due,false);
  assert.equal(next.nextDue,AT+DAY);
  assert.equal(next.streak,1);
  assert.equal(squareReview([first],17,AT+DAY).due,true);
  const tooSoon=item(17,AT+3600000);
  const early=squareReview([first,tooSoon],17,AT+3600000);
  assert.equal(early.nextDue,AT+DAY);
  assert.equal(early.streak,1);
  const second=item(17,AT+DAY);
  const scheduled=squareReview([first,tooSoon,second],17,AT+DAY);
  assert.equal(scheduled.streak,2);
  assert.equal(scheduled.nextDue,AT+4*DAY);
});
test('spaced reviews advance through 1, 3, 7, 14, 30 days; mistakes and support reset the count',()=>{
  let t=AT;const events=[];
  for(let i=0;i<5;i++){
    events.push(item(8,t));
    const review=squareReview(events,8,t);
    assert.equal(review.streak,i+1);
    assert.equal(review.nextDue,t+REVIEW_DAYS[i]*DAY);
    t=review.nextDue;
  }
  assert.equal(squareReview(events,8,t-1).due,false);
  assert.equal(squareReview(events,8,t).due,true);
  const corrected=[...events,item(8,t,{correct:false}),item(8,t+500,{correct:true,hints:1})];
  const after=squareReview(corrected,8,t+1000);
  assert.equal(after.streak,0);
  assert.equal(after.nextDue,t+500+DAY);
});
test('review selections ignore new material and choose oldest-due first',()=>{
  const events=[item(6,AT-2*DAY),item(9,AT-4*DAY),item(12,AT)];
  const due=squareSummary(events,AT);
  assert.equal(due.seen,3);assert.equal(due.due,2);
  const review=squareDeck({band:'foundation',mode:'review',events,now:AT});
  assert.deepEqual(review.map(q=>q.n),[9,6]);
  assert.ok(review.every(q=>q.kind==='square'));
  assert.deepEqual(chooseSquareFacts({mode:'review',events:[],now:AT}),[]);
});
test('inverse and application skills also become due without falsely increasing square recall',()=>{
 const events=[item(6,AT-3*DAY),{concept:'square-root:6',correct:true,hints:0,timestamp:AT-3*DAY},{concept:'square-boundary:6',correct:true,hints:0,timestamp:AT}];
 const status=squareSummary(events,AT);
 assert.equal(status.seen,1);
 assert.equal(status.due,2);
 assert.deepEqual(squareDeck({mode:'review',events,now:AT}).map(q=>q.kind),['square','root']);
});
test('guided lessons include explanations, inverse questions, factor-search limits and applications',()=>{
  const guided=squareDeck({band:'extension',selected:15,mode:'learn',events:[],now:AT,random:()=>0});
  assert.equal(guided.length,5);
  assert.equal(guided[0].n,15);
  assert.deepEqual(guided.map(q=>q.kind),['square','square','root','boundary','area']);
  const mixed=squareDeck({band:'challenge',selected:32,mode:'mixed',events:[],now:AT,random:()=>0.2});
  assert.equal(mixed.length,10);
  assert.ok(mixed.some(q=>q.kind==='neighbour'));
  assert.ok(mixed.some(q=>q.kind==='boundary'));
});
