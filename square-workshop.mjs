import {rootPractice} from './teaching-model.mjs';
import {installSquareStudio} from './square-learning-studio.mjs';
import {el,button,mountQuestion} from './teaching-question.mjs';
export function installSquareWorkshop({record = () => {}, supported = () => {}, learning=null, onLearningRecord=()=>{}, navigateToLearn=()=>{}, storageScope=k=>k} = {}) {
  const host = document.getElementById('learnView'); if (!host) return {reset() {}};
  const section = el('section', {id: 'squareWorkshop', class: 'square-workshop', 'aria-labelledby': 'squareWorkshopTitle'});
  section.innerHTML = '<p class="eyebrow">SQUARES &amp; SEARCH LIMITS</p><h2 id="squareWorkshopTitle">Know where to stop.</h2><p>You do not need a decimal square root to find every factor pair. Find the neighbouring squares instead.</p><div class="square-example"><strong>For 595: 24\u00b2 = 576 &lt; 595 &lt; 625 = 25\u00b2</strong><p>So 24 &lt; \u221a595 &lt; 25. Check whole-number first factors from 1 through <strong>24</strong>. The factor 35 can still appear: it is the partner of 17.</p></div><details id="squareWhy"><summary>Why does the square root give a stopping point?</summary><p>Imagine a factor pair a \u00d7 b = N. If both factors were greater than \u221aN, multiplying them would give more than N. So at least one factor is at or below \u221aN. Finding that smaller factor finds its larger partner too.</p><p><strong>Include the boundary for exact squares:</strong> for 625, test through 25, including 25 \u00d7 25. Reversing a pair does not make a new pair.</p><p><strong>Test all candidates, not just primes, when listing every pair.</strong> For 36, both 4 \u00d7 9 and 6 \u00d7 6 matter. Testing only primes is a different method, used to build a prime decomposition.</p></details><details id="squareMethods"><summary>How can I find squares quickly?</summary><p><strong>1. Recall useful anchors.</strong> Start with squares 1\u00b2 to 12\u00b2. Then learn 15\u00b2 = 225, 20\u00b2 = 400, 25\u00b2 = 625 and 30\u00b2 = 900. Squares through 32\u00b2 = 1024 cover every Dol target.</p><p><strong>2. Move to a neighbouring square.</strong> (k + 1)\u00b2 = k\u00b2 + 2k + 1. From 20\u00b2 = 400, add 41 to get 21\u00b2 = 441. The next additions are 43, 45, 47: 22\u00b2 = 484, 23\u00b2 = 529, 24\u00b2 = 576.</p><p><strong>3. Work back from a nearby anchor.</strong> 24\u00b2 = (25 - 1)\u00b2 = 625 - 50 + 1 = 576. Do not just subtract 1 from 625: both sides of the square change.</p><p><strong>4. Narrow the interval.</strong> 595 lies between 20\u00b2 and 25\u00b2. Testing 24\u00b2 gives 576, so the exact integer search limit is 24. An estimate such as \u221a595 \u2248 24.4 is optional, not necessary.</p></details><details id="squareReference"><summary>Square-number reference: 1 to 100</summary><div class="square-reference"></div></details><div class="square-practice"><h3>Practise recall and finding the boundary</h3><p>Five untimed questions, alternating square recall with search limits. Ask for help freely; worked examples and your own answers are recorded separately.</p><label for="squareBand">Practice range</label><select id="squareBand"><option value="12">Squares 1\u201312: foundations</option><option value="20">Squares 1\u201320: building fluency</option><option value="32">Squares 1\u201332: all Dol targets</option></select><button id="squareStart" type="button" class="primary">Start five questions</button><p id="squareCount" class="eyebrow"></p><div id="squareExercise"></div><div class="teaching-routes"><button id="squareNext" type="button" class="primary" hidden>Next question</button><button id="squareSkip" type="button" class="text-button" hidden>Skip this question</button></div><p id="squareResult" role="status" aria-live="polite"></p></div>';
  for (let k = 1; k <= 100; k++) section.querySelector('.square-reference').append(el('span', {}, `${k}\u00b2 = ${k * k}`));
  host.querySelector('.page-head').after(section);
  const studio=installSquareStudio({section,learning,onLearningRecord,navigateToLearn,storageScope});
  const $ = id => section.querySelector('#' + id); let session = null;
  function paint() {
    if (!session) return;
    if (session.index >= session.cards.length) {
      $('squareExercise').replaceChildren(); $('squareCount').textContent = 'PRACTICE COMPLETE'; $('squareNext').hidden = true; $('squareSkip').hidden = true;
      const own = session.results.filter(r => r.correct && !r.hints).length, helped = session.results.filter(r => r.correct && r.hints).length;
      const retry = session.results.filter(r => !r.correct).length;
      const shown = session.states.filter(s => s.shown).length, skipped = session.states.filter(s => !s.recorded && !s.shown).length;
      $('squareResult').textContent = `${own} first answers correct before extra help; ${helped} correct after a nudge; ${retry} first attempts needed another try; ${shown} worked examples; ${skipped} skipped. This is a practice record, not a mastery judgement.`;
      $('squareStart').textContent = 'Another five questions'; $('squareStart').disabled = false; $('squareBand').disabled = false; return;
    }
    const step = session.cards[session.index], state = session.states[session.index];
    $('squareCount').textContent = `QUESTION ${session.index + 1} OF 5`; $('squareNext').hidden = !state.resolved; $('squareSkip').hidden = !!state.resolved;
    mountQuestion($('squareExercise'), step, {prefix: 'square', state,
      onResult: result => {session.results.push(result); record(result, 'square-practice', step.target);},
      onSupport: (kind, count) => supported(step, kind, count, 'square-practice'),
      onSolved: () => {$('squareNext').hidden = false; $('squareSkip').hidden = true;}
    });
  }
  $('squareStart').onclick = () => {
    const band = Number($('squareBand').value); session = {index: 0, cards: Array.from({length: 5}, (_, i) => rootPractice(i, band)), states: Array.from({length: 5}, () => ({})), results: []};
    $('squareResult').textContent = ''; $('squareStart').disabled = true; $('squareBand').disabled = true; paint();
  };
  function next() {if (session) {session.index++; paint();}}
  $('squareNext').onclick = next; $('squareSkip').onclick = next;
  return {focus:studio.focus,startQuick:studio.startQuick,openReview:studio.openReview,refresh:studio.refresh,reset() {session = null; $('squareExercise').replaceChildren(); $('squareResult').textContent = ''; $('squareCount').textContent = ''; $('squareNext').hidden = true; $('squareSkip').hidden = true; $('squareStart').disabled = false; $('squareBand').disabled = false; studio.reset();}};
}
