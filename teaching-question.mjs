import {assessStep,groupPieces,revealFor,ruleFor} from './teaching-model.mjs';
export function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(text, action, attrs = {}) {
  const node = el('button', {type: 'button', class: 'secondary', ...attrs}, text); node.addEventListener('click', action); return node;
}
// Shared accessible exercise renderer. No score or round-state mutations.
export function mountQuestion(root, step, {prefix = 'coach', state = {}, onResult = () => {}, onSupport = () => {}, onSolved = () => {}} = {}) {
  state.hints ||= 0; state.selected ||= [];
  root.replaceChildren(el('h3', {id: prefix + 'Title', tabindex: '-1'}, step.title), el('p', {id: prefix + 'Prompt'}, step.prompt));
  if (['info', 'intro'].includes(step.type)) return {state};
  const area = el('div', {class: 'teaching-exercise'}), feedback = el('p', {id: prefix + 'Feedback', class: 'teaching-feedback', role: 'status', 'aria-live': 'polite'});
  let controls = [], input, groupOutput;
  function paint() {
    for (const control of controls) control.disabled = !!state.resolved;
    feedback.textContent = state.feedback || '';
    support.hidden = !!state.resolved;
    if (input && state.value !== undefined) input.value = state.value;
    if (groupOutput) {
      const g = groupPieces(step.pieces, state.selected);
      groupOutput.textContent = `${g.left.join(' \u00d7 ') || '1 (no pieces)'}  |  ${g.right.join(' \u00d7 ') || '1 (no pieces)'}\n${g.a} \u00d7 ${g.b} = ${g.a * g.b}`;
    }
  }
  function submit(value) {
    if (state.resolved) return;
    if (input) state.value = input.value;
    const result = assessStep(step, value);
    if (!result.valid || result.duplicate) {state.feedback = result.retry; paint(); return;}
    if (!state.recorded) {onResult({step, correct: result.correct, hints: state.hints, shown: !!state.shown}); state.recorded = true;}
    state.attempts = (state.attempts || 0) + 1;
    if (result.correct) {state.resolved = true; state.feedback = result.feedback || step.feedback; onSolved();}
    else {
      const specific = step.candidateTarget && /^\d+$/.test(String(value)) ? ruleFor(step.candidateTarget, Number(value)) : '';
      state.feedback = `Not quite yet. ${specific || 'Try the next small step, or ask for a nudge.'} No game points or mistakes change here.`;
    }
    paint();
  }
  if (step.type === 'choice') {
    const choices = el('div', {id: prefix + 'Choices', class: 'teaching-choices', role: 'group', 'aria-label': step.prompt});
    for (const value of step.choices) {
      const control = button(value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value, () => submit(value), {'data-choice': value}); choices.append(control); controls.push(control);
    }
    area.append(choices);
  } else if (step.type === 'group') {
    const pieces = el('div', {class: 'prime-pieces', role: 'group', 'aria-label': 'Select prime pieces for the left factor'});
    step.pieces.forEach((p, index) => {
      const control = button(String(p), () => {
        const selected = new Set(state.selected); selected.has(index) ? selected.delete(index) : selected.add(index); state.selected = [...selected];
        control.setAttribute('aria-pressed', String(selected.has(index))); paint();
      }, {'data-piece': index, 'aria-label': `${p}, piece ${index + 1}. Select for the left factor.`, 'aria-pressed': state.selected.includes(index)});
      pieces.append(control); controls.push(control);
    });
    groupOutput = el('p', {id: prefix + 'Grouping', class: 'coach-equation', 'aria-live': 'polite'});
    const check = button('Check my grouping', () => submit(state.selected), {id: prefix + 'Check', class: 'primary'}); controls.push(check); area.append(pieces, groupOutput, check);
  } else {
    const form = el('form', {class: 'teaching-answer-form', novalidate: ''});
    const label = el('label', {for: prefix + 'Answer'}, 'Your answer');
    input = el('input', {id: prefix + 'Answer', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', maxlength: '8', 'aria-describedby': prefix + 'Feedback'});
    const check = el('button', {type: 'submit', class: 'primary', id: prefix + 'Check'}, 'Check my answer');
    input.addEventListener('input', () => {state.value = input.value;}); form.addEventListener('submit', event => {event.preventDefault(); submit(input.value);});
    form.append(label, input, check); area.append(form); controls.push(input, check);
  }
  const support = el('div', {class: 'teaching-support'}), nudgeText = el('p', {id: prefix + 'NudgeText', class: 'teaching-nudge', role: 'status'});
  function paintSupport() {
    nudgeText.textContent = state.hints ? (step.hints || [])[Math.min(state.hints, step.hints.length) - 1] || '' : '';
    nudgeText.hidden = !nudgeText.textContent;
  }
  const nudge = button('Give me a nudge', () => {
    state.hints = Math.min((step.hints || []).length, state.hints + 1); onSupport('nudge', state.hints); paintSupport();
  }, {id: prefix + 'Nudge', class: 'text-button'});
  const reveal = button('Show a worked answer', () => {
    state.shown = true; state.resolved = true; state.feedback = revealFor(step); onSupport('worked-example', Math.max(1, state.hints)); onSolved(); paint();
  }, {id: prefix + 'Reveal', class: 'text-button'});
  support.append(nudge, reveal, nudgeText); root.append(area, feedback, support); paint(); paintSupport();
  return {state, focus: () => root.querySelector('h3')?.focus({preventScroll: true})};
}
