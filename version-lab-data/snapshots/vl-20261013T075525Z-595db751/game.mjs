import {factorPairs,selectNumber,assessPair,formatTime} from './logic.mjs';

const byId = id => document.getElementById(id);
const KEY = 'dol-factor-frenzy-v1';
const DEFAULTS = { limit:128, duration:60, showCount:true, sound:true, round:1, score:0 };

function loadPreferences() {
  let value = {};
  try { value = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  return {
    limit: [64,128,256,512,1024].includes(value.limit) ? value.limit : DEFAULTS.limit,
    duration: [30,60,90].includes(value.duration) ? value.duration : DEFAULTS.duration,
    showCount: typeof value.showCount === 'boolean' ? value.showCount : typeof value.showcount === 'boolean' ? value.showcount : DEFAULTS.showCount,
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULTS.sound,
    round: Number.isSafeInteger(value.round) && value.round >= 1 ? value.round : DEFAULTS.round,
    score: Number.isSafeInteger(value.score) && value.score >= 0 ? value.score : DEFAULTS.score
  };
}
const state = {
  ...loadPreferences(),
  phase: 'ready', // ready | running | paused | finished
  target: null,
  previous: null,
  pairs: [],
  found: new Set(),
  startedWithScore: 0,
  remainingMs: 0,
  deadline: 0,
  ticker: null,
  feedback: '',
  feedbackType: '',
  result: null
};
state.remainingMs = state.duration * 1000;

function save() {
  try {
    const {limit,duration,showCount,sound,round,score} = state;
    localStorage.setItem(KEY,JSON.stringify({limit,duration,showCount,sound,round,score}));
  } catch {}
}

function audioFeedback(success) {
  if (!state.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const ctx = new Audio(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = success ? 690 : 230;
    gain.gain.value = .035;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .09);
    osc.onended = () => ctx.close();
  } catch {}
}

function updateClock() {
  byId('timerValue').textContent = formatTime(state.remainingMs);
  const fraction = Math.max(0, Math.min(1, state.remainingMs/(state.duration*1000)));
  byId('timeFill').style.width = (100 * fraction).toFixed(2) + '%';
  const progress = byId('timeProgress');
  progress.setAttribute('aria-valuemax',String(state.duration));
  progress.setAttribute('aria-valuenow',String(Math.ceil(state.remainingMs/1000)));
  progress.setAttribute('aria-valuetext',formatTime(state.remainingMs)+' remaining');
}

function renderPairSlots() {
  const slots = byId('pairSlots');
  slots.replaceChildren();
  if (!state.showCount && state.found.size === 0) {
    slots.hidden = true;
    return;
  }
  slots.hidden = false;
  const visible = [...state.found];
  if (state.showCount) {
    while (visible.length < state.pairs.length) visible.push(null);
  }
  for (const key of visible) {
    const item = document.createElement('div');
    item.className = 'pair-slot' + (key ? ' solved' : '');
    if (key) {
      const [a,b] = key.split('-');
      item.textContent = a + ' × ' + b;
      item.setAttribute('aria-label','Found '+a+' times '+b);
    } else {
      item.textContent = '?  ×  ?';
      item.setAttribute('aria-label','Pair not found yet');
    }
    slots.append(item);
  }
}

function renderReview() {
  const review = byId('answerReview');
  review.replaceChildren();
  const found = state.found;
  for (const [a,b] of state.pairs) {
    const key = a+'-'+b;
    const chip = document.createElement('span');
    chip.className = 'review-chip' + (found.has(key) ? '' : ' missed');
    chip.textContent = (found.has(key) ? '✓ ' : '○ ') + a + ' × ' + b;
    review.append(chip);
  }
  const {total,correct,earned,reason} = state.result;
  byId('finishHeading').textContent = correct === total ? 'All pairs found!' : reason === 'time' ? 'Time is up!' : 'Round complete';
  byId('roundPoints').textContent = '+'+earned+' '+(earned===1?'point':'points');
  byId('finishMessage').textContent = correct===total
    ? `Excellent! You found all ${total} pairs and earned the +2 bonus.`
    : `You found ${correct} of ${total} pairs. The dashed answers are those you missed.`;
}

function render() {
  const inRound = state.phase === 'running' || state.phase === 'paused';
  document.querySelectorAll('button[data-setting]').forEach(button => {
    const active = Number(button.dataset.value) === state[button.dataset.setting];
    button.setAttribute('aria-pressed',String(active));
    button.classList.toggle('selected',active);
    button.disabled = inRound;
  });
  byId('showCount').checked = state.showCount;
  byId('sound').checked = state.sound;
  byId('settingsNote').textContent = inRound ? 'Game mode, players and range unlock between rounds.' : '';
  byId('roundValue').textContent = state.round;
  byId('scoreValue').textContent = state.score;
  byId('challengeLabel').textContent = state.phase==='ready' ? 'A NUMBER IS WAITING' : state.phase==='finished' ? 'ROUND COMPLETE' : state.phase==='paused' ? 'ROUND PAUSED' : 'FIND EVERY FACTOR PAIR OF';
  const numberEl = byId('numberValue');
  numberEl.textContent = state.target === null ? '?' : String(state.target);
  numberEl.classList.toggle('question-mark',state.target === null);
  byId('pausedOverlay').hidden = state.phase !== 'paused';
  updateClock();
  byId('startButton').hidden = inRound;
  byId('startButton').textContent = state.phase==='finished' ? 'Next round' : 'Show number & start';
  byId('pauseButton').hidden = !inRound;
  byId('pauseButton').textContent = state.phase==='paused' ? 'Resume' : 'Pause';
  byId('finishButton').hidden = !inRound;
  byId('readyPanel').hidden = state.phase !== 'ready';
  byId('activePanel').hidden = !inRound;
  byId('finishedPanel').hidden = state.phase !== 'finished';
  if (inRound) {
    const left = state.pairs.length - state.found.size;
    byId('foundHeading').textContent = state.found.size + ' found';
    byId('pairCount').hidden = !state.showCount;
    byId('pairCount').textContent = left + (left===1 ? ' pair to find' : ' pairs to find');
    byId('pairInput').disabled = state.phase==='paused';
    byId('addButton').disabled = state.phase==='paused';
    const feedback = byId('entryFeedback');
    feedback.textContent = state.phase==='paused' ? 'Timer paused. Press Resume to continue.' : state.feedback;
    feedback.className = 'entry-feedback' + (state.phase==='paused' ? '' : state.feedbackType ? ' '+state.feedbackType : '');
    renderPairSlots();
  }
  if (state.phase==='finished' && state.result) renderReview();
}

function stopTicker() {
  if (state.ticker !== null) clearInterval(state.ticker);
  state.ticker = null;
}

function endRound(reason) {
  if (state.phase!=='running' && state.phase!=='paused') return;
  stopTicker();
  const total = state.pairs.length,correct=state.found.size;
  if (correct===total) state.score+=2; // exactly once, since the phase changes below
  state.result = {reason,total,correct,earned:state.score-state.startedWithScore};
  state.phase='finished';
  if (reason==='time') state.remainingMs=0;
  save();
  render();
}

function refreshTimer() {
  if (state.phase!=='running') return;
  state.remainingMs = Math.max(0,state.deadline - performance.now());
  if (state.remainingMs <= 0) {
    endRound('time');
  } else {
    updateClock();
  }
}

function startRound() {
  if (state.phase==='running' || state.phase==='paused') return;
  if (state.phase==='finished') state.round += 1;
  state.previous = state.target;
  state.target = selectNumber(state.limit,state.previous);
  state.pairs = factorPairs(state.target);
  state.found = new Set();
  state.result = null;
  state.feedback = '';
  state.feedbackType = '';
  state.startedWithScore = state.score;
  state.remainingMs = state.duration*1000;
  state.deadline = performance.now()+state.remainingMs;
  state.phase='running';
  byId('pairInput').value='';
  save();
  render();
  stopTicker();
  state.ticker=setInterval(refreshTimer,100);
  byId('pairInput').focus({preventScroll:true});
}

function togglePause() {
  if (state.phase==='running') {
    refreshTimer();
    if (state.phase!=='running') return;
    stopTicker();
    state.phase='paused';
  } else if (state.phase==='paused') {
    state.deadline = performance.now()+state.remainingMs;
    state.phase='running';
    state.ticker=setInterval(refreshTimer,100);
  } else return;
  render();
  if (state.phase==='running') byId('pairInput').focus({preventScroll:true});
}

function handleAnswer(event) {
  event.preventDefault();
  if (state.phase!=='running') return;
  refreshTimer();
  if (state.phase!=='running') return;
  const input=byId('pairInput');
  const check=assessPair(input.value,state.target,state.found);
  state.feedback=check.message;
  state.feedbackType=check.status==='correct'?'success':'error';
  if (check.status!=='correct') {
    audioFeedback(false);
    render();
    input.focus({preventScroll:true});
    input.select();
    return;
  }
  state.found.add(check.key);
  state.score += 1;
  audioFeedback(true);
  input.value='';
  save();
  if (state.found.size === state.pairs.length) {
    endRound('complete');
  } else {
    render();
    input.focus({preventScroll:true});
  }
}

function resetScores() {
  if ((state.phase==='running'||state.phase==='paused') && !window.confirm('End this round and reset the score?')) return;
  stopTicker();
  state.phase='ready';
  state.target=null;
  state.previous=null;
  state.pairs=[];
  state.found=new Set();
  state.result=null;
  state.feedback='';
  state.feedbackType='';
  state.round=1;
  state.score=0;
  state.remainingMs=state.duration*1000;
  byId('pairInput').value='';
  save();
  render();
}

document.querySelectorAll('button[data-setting]').forEach(button=>{
  button.addEventListener('click',()=>{
    if (state.phase==='running'||state.phase==='paused') return;
    const value=Number(button.dataset.value), field=button.dataset.setting;
    if (!['limit','duration'].includes(field)) return;
    state[field]=value;
    if (field==='duration') state.remainingMs=value*1000;
    save();
    render();
  });
});
byId('showCount').addEventListener('change',event=>{state.showCount=event.target.checked;save();render();});
byId('sound').addEventListener('change',event=>{state.sound=event.target.checked;save();render();});
byId('startButton').addEventListener('click',startRound);
byId('pauseButton').addEventListener('click',togglePause);
byId('finishButton').addEventListener('click',()=>endRound('manual'));
byId('answerForm').addEventListener('submit',handleAnswer);
byId('resetScores').addEventListener('click',resetScores);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) refreshTimer();});
document.addEventListener('keydown',event=>{
  if (event.key==='Escape' && (state.phase==='running'||state.phase==='paused')) {
    event.preventDefault();
    togglePause();
  }
});
render();
