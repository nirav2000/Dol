import {teachingLesson,squareBounds,candidateStep,candidateResult,pairsFor,pairKey,whole} from './teaching-model.mjs';
import {el,button,mountQuestion} from './teaching-question.mjs';
import {installSquareWorkshop} from './square-workshop.mjs';
const HISTORY_KEY = 'dol-teaching-history-v1';
function cleanHistory(value) {
  return {schema: 1, events: (Array.isArray(value?.events) ? value.events : []).filter(e => e && typeof e.skill === 'string' && typeof e.correct === 'boolean' && Number.isFinite(e.at)).slice(-500), support: (Array.isArray(value?.support) ? value.support : []).filter(e => e && typeof e.skill === 'string' && Number.isFinite(e.at)).slice(-300)};
}
export function createTeachingCoach({getState, pause, focusAnswer = () => {}, learning, storageScope = k => k, holdTime = () => {}, releaseTime = () => {}, onLearningRecord = () => {}, navigateToLearn = () => {}}) {
  let saved; try {saved = JSON.parse(localStorage.getItem(storageScope(HISTORY_KEY)));} catch {}
  let history = cleanHistory(saved), lesson = null, index = 0, cards = new Map(), roundKey = '', ownedPause = false, held = false;
  const exposures = new Map();
  if (!document.querySelector('[data-dol-teaching-css]')) document.head.append(el('link', {rel: 'stylesheet', href: new URL('./teaching.css', import.meta.url).href, 'data-dol-teaching-css': ''}));
  const dialog = el('dialog', {id: 'strategyHintDialog', class: 'strategy-dialog teaching-dialog', 'aria-labelledby': 'coachHeading'});
  dialog.innerHTML = '<div class="coach-header"><div><p class="eyebrow" id="coachTarget"></p><h2 id="coachHeading" tabindex="-1">Let\u2019s work it out.</h2></div><button id="coachClose" type="button" class="secondary" aria-label="Close help and return to the board">Close</button></div><p id="coachProgress" class="small muted"></p><div id="coachStep"></div><div id="coachRoutes" class="teaching-routes"></div><details id="coachApproach"><summary>Choose a different approach</summary><div class="coach-factor-picker"><label for="coachFactor">A factor to explore</label><input id="coachFactor" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"><button id="coachExplore" type="button" class="secondary">Test this factor</button><button id="coachPartner" type="button" class="secondary">Find its partner</button></div><p id="coachPickerMessage" class="small muted" role="status"></p><div id="coachOtherRoutes" class="teaching-routes"></div></details><p class="small muted" id="coachNote">Help is part of learning. These activities do not change game points or mistakes.</p><div class="teaching-actions"><button id="coachBack" type="button" class="secondary">Back</button><button id="coachNext" type="button" class="secondary">Start the suggested steps</button><button id="coachTry" type="button" class="primary">Let me try on my board</button></div>';
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  const progress = el('section', {id: 'teachingSummary', class: 'insight-section'}); document.getElementById('progressView')?.append(progress);
  function save() {try {localStorage.setItem(storageScope(HISTORY_KEY), JSON.stringify(history));} catch {}}
  function record(result, source = 'guided', target = lesson?.target) {
    const event = {at: Date.now(), skill: result.step.skill, target, correct: result.correct, hints: result.hints || 0, source, evidence: source === 'guided' ? 'guided-application' : result.hints ? 'supported-practice' : 'practice-before-extra-help'};
    history.events.push(event); history.events = history.events.slice(-500); save(); summary();
    try {learning?.record({concept: 'teaching:' + event.skill, correct: event.correct, hints: source === 'guided' ? Math.max(1, event.hints) : event.hints, mode: source === 'guided' ? 'teaching' : 'square-practice', context: {target, evidence: event.evidence, skill: event.skill}}); onLearningRecord();} catch (error) {console.warn('Teaching record remains saved locally.', error?.message);}
  }
  function support(step, kind, count, source = 'guided') {
    history.support.push({at: Date.now(), skill: step.skill, kind, count, source}); history.support = history.support.slice(-300); save();
    if (source === 'guided') expose(step.scope, kind === 'worked-example' ? 2 : 1, step.skill);
  }
  function summary() {
    const own = history.events.filter(e => e.source === 'square-practice' && e.correct && !e.hints).length;
    progress.replaceChildren(el('h2', {}, 'Learning steps'), el('p', {}, 'Guided work and square practice are kept separate from your factor score. These counts describe practice, not mastery.'), el('p', {}, `${history.events.length} first attempts recorded; ${own} square-practice answers correct before extra help.`));
    const grid = el('div', {class: 'teaching-evidence'});
    for (const [label, skills] of [['Choosing divisors', ['divisibility']], ['Calculating partners', ['division-chunks', 'division-adjust', 'multiplication-fact', 'partner']], ['Regrouping factors', ['regrouping', 'halve-double']], ['Squares and stopping points', ['square-recall', 'square-boundary']]]) {
      const events = history.events.filter(e => skills.includes(e.skill));
      grid.append(el('p', {}, `${label}: ${events.filter(e => e.correct).length} correct first responses from ${events.length} attempts. ${events.filter(e => e.source === 'guided').length} were guided steps.`));
    }
    progress.append(grid);
  }
  const workshop = installSquareWorkshop({record, supported: support, learning, onLearningRecord, navigateToLearn, storageScope});
  dialog.querySelector('#coachNote').after(button('Learn square numbers & square roots →', () => {close();navigateToLearn();workshop.focus();}, {id:'coachSquareLink',class:'text-button'}));
  function identity() {const s = getState(); return `${s.round}:${s.target}`;}
  function expose(scope = [], level = 1, skill = 'factorisation') {
    for (const key of scope) if (!getState().found.has(key)) {
      const previous = exposures.get(key); exposures.set(key, {level: Math.max(previous?.level || 0, level), skill});
    }
  }
  function cardState(step) {if (!cards.has(step.id)) cards.set(step.id, {}); return cards.get(step.id);}
  function navigation() {
    const step = lesson.steps[index], state = cardState(step), free = ['intro', 'info'].includes(step.type);
    $('coachBack').disabled = index === 0;
    $('coachNext').hidden = index === lesson.steps.length - 1 || (!free && !state.resolved);
    $('coachNext').textContent = step.type === 'intro' ? 'Teach me the quickest move' : 'Next step';
  }
  function replace(options = {}, skipIntro = false) {
    lesson = teachingLesson(getState().target, getState().found, options); cards = new Map(); index = skipIntro ? 1 : 0; $('coachPickerMessage').textContent = ''; $('coachApproach').open = false; paint();
  }
  // Suggestions are recomputed against the actual accepted board pairs on each opening.
  // Present different mental methods for *different* missing pairs.
  function paintRoutes() {
    const choices = lesson?.choices || [];
    const other = [
      ['Explore prime pieces in depth', 'prime-pieces'],
      ['Find where the search stops', 'boundary'],
      ['Check every first-factor candidate', 'search']
    ];
    for (const id of ['coachRoutes','coachOtherRoutes']) {
      const root = $(id);
      root.replaceChildren();
      for (const choice of choices) root.append(button(
        choice.title + ' · ' + choice.teaser,
        () => replace({route: choice.route}, true),
        {'data-route': choice.route, 'aria-label': choice.title + ': ' + choice.teaser}
      ));
      if (id === 'coachRoutes') {
        root.append(button('Check candidates systematically',()=>replace({route:'search'},true),{'data-route':'search'}));
      } else {
        for (const [title,route] of other) root.append(button(title,()=>replace({route},true),{'data-route':route}));
      }
    }
  }
  function renderSearch(step, state) {
    const limit = squareBounds(lesson.target).limit;
    state.checked ||= new Set(lesson.found.map(key => Number(key.split('-')[0])).filter(k => k <= limit));
    const root = $('coachStep'); root.replaceChildren(el('h3', {id: 'coachTitle', tabindex: '-1'}, step.title), el('p', {id: 'coachPrompt'}, step.prompt));
    const count = el('p', {id: 'coachSearchCount', role: 'status'}), grid = el('div', {class: 'candidate-grid', role: 'group', 'aria-label': 'First-factor candidates'}), activity = el('div', {id: 'coachCandidateExercise'});
    function refresh() {
      state.resolved = state.checked.size === limit;
      count.textContent = state.resolved ? `All ${limit} candidates checked. Every pair has a first factor at or below ${limit}, so no additional pair can hide beyond this boundary.` : `${state.checked.size} of ${limit} candidates checked. Finding the boundary alone does not complete the search.`;
      for (const b of grid.children) {const checked = state.checked.has(Number(b.dataset.candidate)); b.dataset.checked = String(checked); b.setAttribute('aria-label', `${b.dataset.candidate}${checked ? ', checked' : ', not checked'}`);}
      navigation();
    }
    for (let k = 1; k <= limit; k++) grid.append(button(String(k), () => {
      const candidate = candidateStep(lesson.target, k); state.tests ||= {}; state.tests[k] ||= {};
      expose(candidate.scope, 1, candidate.skill);
      mountQuestion(activity, candidate, {prefix: 'candidate', state: state.tests[k], onResult: result => record(result), onSupport: (kind, amount) => support(candidate, kind, amount), onSolved: () => {state.checked.add(k); refresh();}});
    }, {'data-candidate': k}));
    root.append(count, grid, activity); refresh();
  }
  function paint() {
    if (!lesson) return; const step = lesson.steps[index], state = cardState(step);
    $('coachTarget').textContent = `WORKING ON ${lesson.target}`;
    $('coachProgress').textContent = step.type === 'intro'
      ? `${lesson.board.known} of ${lesson.board.total} found · ${lesson.board.missing} remaining`
      : `Step ${index} of ${lesson.steps.length - 1} · stop whenever you are ready`;
    paintRoutes();
    $('coachRoutes').hidden = step.type !== 'intro';
    // The opening menu carries no assistance. Actual scaffolds apply only to affected, unfinished pairs.
    expose(step.scope, 1, step.skill);
    if (step.type === 'search') renderSearch(step, state);
    else mountQuestion($('coachStep'), step, {prefix: 'coach', state, onResult: result => record(result), onSupport: (kind, count) => support(step, kind, count), onSolved: navigation});
    navigation(); $('coachNote').textContent = `${getState().mode === 'timed' ? 'The clock is paused while help is open. ' : ''}Help is part of learning. These activities do not change game points or mistakes.`;
  }
  function tidy(resume = true) {
    document.body.classList.remove('strategy-help-open');
    document.getElementById('helpToggle')?.setAttribute('aria-expanded', 'false');
    if (held) {releaseTime('hint'); held = false;}
    const s = getState(), shouldResume = resume && ownedPause && s.mode === 'timed' && s.phase === 'paused' && s.view === 'play'; ownedPause = false;
    if (shouldResume) pause(); if (resume && getState().view === 'play') focusAnswer();
  }
  function close(resume = true) {tidy(resume); if (dialog.open) dialog.close();}
  function open() {
    const s = getState(); if (s.view !== 'play' || !['running', 'paused'].includes(s.phase) || dialog.open) return;
    if (roundKey !== identity()) resetRound();
    if (!lesson || lesson.found.length !== s.found.size || lesson.found.some(key => !s.found.has(key))) replace();
    ownedPause = s.mode === 'timed' && s.phase === 'running'; if (ownedPause) pause();
    holdTime('hint'); held = true; paint(); document.activeElement?.blur(); document.body.classList.add('strategy-help-open'); dialog.showModal();
    document.getElementById('helpToggle')?.setAttribute('aria-expanded', 'true'); $('coachHeading').focus({preventScroll: true}); sizeDialog();
  }
  function resetRound() {close(false); exposures.clear(); cards = new Map(); lesson = null; index = 0; roundKey = identity();}
  function render() {if (roundKey !== identity()) resetRound(); if (dialog.open && !['running', 'paused'].includes(getState().phase)) close(false);}
  function sizeDialog() {if (dialog.open) dialog.style.maxHeight = Math.max(160, (window.visualViewport?.height || innerHeight) - 24) + 'px';}
  window.visualViewport?.addEventListener('resize', sizeDialog, {passive: true});
  dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
  dialog.addEventListener('close', () => {if (!dialog.open && held) tidy();});
  dialog.addEventListener('keydown', event => {if (event.key !== 'Escape') event.stopPropagation();});
  $('coachClose').onclick = () => close(); $('coachTry').onclick = () => close();
  $('coachNext').onclick = () => {if (index < lesson.steps.length - 1) {index++; paint(); $('coachTitle')?.focus({preventScroll: true});}};
  $('coachBack').onclick = () => {if (index > 0) {index--; paint();}};
  function explore(partner = false) {
    const value = $('coachFactor').value.trim(), k = Number(value);
    try {if (!/^\d+$/.test(value)) throw Error(); whole(k);} catch {$('coachPickerMessage').textContent = 'Choose a whole-number candidate from 1 to 1024.'; return;}
    replace({candidate: k}, true);
    if (partner && candidateResult(getState().target, k).divides && lesson.steps.length > 2) {index = 2; paint();}
  }
  $('coachExplore').onclick = () => explore(); $('coachPartner').onclick = () => explore(true);
  $('coachFactor').addEventListener('keydown', event => {if (event.key === 'Enter') {event.preventDefault(); explore();}});
  document.getElementById('helpToggle')?.setAttribute('aria-controls', 'strategyHintDialog');
  summary();
  return {open, close, render, resetRound, isOpen: () => dialog.open,
    viewChanged() {if (getState().view === 'progress') summary(); if (['learn','progress'].includes(getState().view)) workshop.refresh(); if (dialog.open && getState().view !== 'play') close(false);},
    openSquareStudio() {if(dialog.open)close();navigateToLearn();workshop.focus();},
    openSquareQuick() {if(dialog.open)close();navigateToLearn();workshop.startQuick();},
    assistanceFor: pair => exposures.get(pairKey(...pair))?.level || 0,
    accepted(pair) {const info = exposures.get(pairKey(...pair)); if (info) try {learning?.record({concept: 'technique-use:' + info.skill, correct: true, hints: info.level, mode: getState().mode, context: {target: getState().target, pair: pairKey(...pair), evidence: 'supported-application'}});} catch {}},
    export: () => history,
    resetProgress() {history = cleanHistory(null); save(); summary(); workshop.reset();}
  };
}
