// Pure teaching models. A supported answer is not evidence of fluent recall.
export const MAX_TARGET = 1024;
export const pairKey = (a, b) => [a, b].sort((x, y) => x - y).join('-');
const mul = ' \u00d7 ', div = ' \u00f7 ';
export function whole(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_TARGET) throw new RangeError('Choose a whole number from 1 to 1024.');
  return n;
}
export function pairsFor(n) {
  whole(n); const pairs = [];
  for (let k = 1; k * k <= n; k++) if (n % k === 0) pairs.push([k, n / k]);
  return pairs;
}
export function primePieces(n) {
  whole(n); const pieces = [];
  for (let p = 2; p * p <= n; p++) while (n % p === 0) { pieces.push(p); n /= p; }
  if (n > 1) pieces.push(n);
  return pieces;
}
export function squareBounds(n) {
  whole(n); const lower = Math.floor(Math.sqrt(n)), exact = lower * lower === n;
  return { n, lower, upper: exact ? lower : lower + 1, lowSquare: lower * lower, highSquare: exact ? n : (lower + 1) ** 2, exact, limit: lower };
}
export function boundaryExplanation(n) {
  const b = squareBounds(n);
  return b.exact
    ? `${b.lower}${mul}${b.lower} = ${n}. The square root is exactly ${b.lower}. Check first factors up to AND INCLUDING ${b.lower}; the square pair counts once.`
    : `${b.lower}\u00b2 = ${b.lowSquare} and ${b.upper}\u00b2 = ${b.highSquare}. Since ${b.lowSquare} < ${n} < ${b.highSquare}, ${b.lower} < \u221a${n} < ${b.upper}. Check whole-number first factors through ${b.lower}, inclusive. No decimal root is needed.`;
}
export function ruleFor(n, k) {
  whole(n); whole(k);
  const ds = [...String(n)].map(Number), sum = ds.reduce((a, b) => a + b, 0);
  if (k === 1) return 'One times a whole number gives that same number.';
  if (k === 2) return `${n} ends in ${n % 10}. Only numbers ending in 0, 2, 4, 6 or 8 divide exactly by 2.`;
  if (k === 3 || k === 9) return `Add the digits: ${ds.join(' + ')} = ${sum}. Test whether ${sum} is a multiple of ${k}.`;
  if (k === 5 || k === 10) return `${n} ends in ${n % 10}. Multiples of ${k} end in ${k === 5 ? '0 or 5' : '0'}.`;
  if (k === 4) return `Check the last two digits, ${n % 100}. Or halve twice; both results must be whole numbers.`;
  if (k === 6) return `${n} must pass BOTH the 2 test and the 3 test. It is ${n % 2 ? 'odd' : 'even'} and its digit sum is ${sum}.`;
  if (k === 8) return `Check the last three digits, ${n % 1000}. Or halve three times, keeping whole numbers each time.`;
  if (k === 11) {
    const sums = [0, 0]; ds.forEach((v, i) => sums[i % 2] += v);
    return `Add alternate digits separately: ${sums[0]} and ${sums[1]}. Their difference is ${Math.abs(sums[0] - sums[1])}. Zero or a multiple of 11 passes. This tests divisibility, not the partner.`;
  }
  if (k === 7) return `Use familiar multiples of 7, such as 70. Another test: remove the last digit, double it, and subtract from the remaining number. For ${n}: ${Math.floor(n / 10)} - ${2 * (n % 10)} = ${Math.floor(n / 10) - 2 * (n % 10)}. Test that result for divisibility by 7 (zero counts). This test does not give the quotient.`;
  return `Use familiar multiples of ${k}. The division must leave no remainder; being near a multiple is not enough.`;
}
export function candidateResult(n, k) {
  whole(n); whole(k);
  const q = Math.floor(n / k), remainder = n % k;
  return { divides: remainder === 0, quotient: q, remainder, key: remainder ? null : pairKey(k, q), explanation: remainder ? `${k}${mul}${q} = ${k * q}, with ${remainder} left over. So ${k} is not a factor of ${n}.` : `${k}${mul}${q} = ${n}, with nothing left over. So ${k} is a factor.` };
}
const question = (id, skill, title, prompt, answer, hints, feedback, extra = {}) => ({ id, skill, title, prompt, answer, hints, feedback, type: 'number', scope: [], ...extra });
const scopeFor = (n, k) => n % k === 0 ? [pairKey(k, n / k)] : [];
export function divisionSteps(n, k, scope = scopeFor(n, k)) {
  whole(n); whole(k); const q = Math.floor(n / k), r = n % k;
  if (r) return [candidateStep(n, k)];
  if (k === 1) return [question(`one-${n}`, 'partner', 'One group of the number', `1${mul}? = ${n}. What is the missing factor?`, n, ['Multiplying by 1 leaves the other number unchanged.'], `1${mul}${n} = ${n}.`, { scope })];
  if (q === 1) return [question(`self-${n}`, 'partner', 'One whole group', `${n}${div}${k} = ?`, 1, ['How many whole groups of a number make that same number?'], `${k}${mul}1 = ${n}.`, { scope })];
  if (k === 5 && n >= 50 && n % 50) {
    const nearby = Math.ceil(n / 50) * 50, groups = nearby / 5, difference = nearby - n, fewer = difference / 5;
    return [
      question(`near-${n}-5`, 'division-adjust', 'Start with a friendly number', `${nearby} is close to ${n}. How many fives make ${nearby}?`, groups, [`Divide ${nearby} by 10, then double the result to divide by 5.`], `${nearby}${div}5 = ${groups}. Now adjust back to ${n}.`, { scope }),
      question(`adjust-${n}-5`, 'division-adjust', 'Adjust the number of groups', `${n} is ${difference} less than ${nearby}. How many groups of 5 must we remove?`, fewer, [`Work out ${difference}${div}5. Remove groups, not ${difference} groups.`], `Remove ${fewer} group${fewer === 1 ? '' : 's'} of 5.`, { scope }),
      question(`partner-${n}-5`, 'partner', 'Finish the division', `We had ${groups} groups and removed ${fewer}. How many groups remain?`, q, [`Calculate ${groups} - ${fewer}.`], `${n}${div}5 = ${q}. Check: ${q}${mul}5 = ${n}.`, { scope })
    ];
  }
  const first = q >= 10 ? Math.floor(q / 10) * 10 : Math.floor(q / 2), chunk = first * k, remaining = n - chunk, second = q - first;
  return [
    question(`remain-${n}-${k}`, 'division-chunks', 'Take an easy chunk', `${k}${mul}${first} = ${chunk}. What remains from ${n} after taking away ${chunk}?`, remaining, [`Subtract ${chunk} from ${n}.`], `${n} = ${chunk} + ${remaining}. We already have ${first} groups of ${k}.`, { scope }),
    question(`groups-${n}-${k}`, 'multiplication-fact', 'Use a smaller multiplication fact', `${k}${mul}? = ${remaining}. How many more groups of ${k} fit?`, second, [`Count in ${k}s, or use a familiar fact such as ${k}${mul}5 = ${k * 5}, then adjust.`], `${k}${mul}${second} = ${remaining}. That accounts for the rest.`, { scope }),
    question(`partner-${n}-${k}`, 'partner', 'Put the groups together', `There were ${first} groups, then ${second} more. How many altogether?`, q, [`Add the numbers of groups: ${first} + ${second}.`], `${n}${div}${k} = ${q}, because ${k}${mul}(${first} + ${second}) = ${chunk} + ${remaining} = ${n}.`, { scope })
  ];
}
export function candidateStep(n, k) {
  const result = candidateResult(n, k);
  return question(`test-${n}-${k}`, 'divisibility', 'Test a candidate', `Does ${k} divide ${n} exactly?`, result.divides ? 'yes' : 'no', [ruleFor(n, k)], result.explanation, { type: 'choice', choices: ['yes', 'no'], scope: scopeFor(n, k) });
}
export function boundaryStep(n) {
  const b = squareBounds(n);
  return question(`boundary-${n}`, 'square-boundary', 'Where can the search stop?', `What is the largest whole number whose square is no bigger than ${n}? This is the last first-factor candidate to check.`, b.limit,
    ['Find neighbouring square numbers around the target. If the target is a square, include its square-root factor.', 'Useful anchors: 10\u00b2 = 100; 20\u00b2 = 400; 25\u00b2 = 625; 30\u00b2 = 900. Try a nearby square.', boundaryExplanation(n)],
    `${boundaryExplanation(n)} If both factors were greater than the square root, their product would be greater than ${n}. A search limit is not proof that every candidate has been checked.`);
}
export function groupPieces(pieces, indices) {
  if (!Array.isArray(pieces) || !Array.isArray(indices) || indices.some(i => !Number.isInteger(i) || i < 0 || i >= pieces.length) || new Set(indices).size !== indices.length) throw new RangeError('Select each piece at most once.');
  const chosen = new Set(indices), left = [], right = []; pieces.forEach((p, i) => (chosen.has(i) ? left : right).push(p));
  const product = a => a.reduce((x, y) => x * y, 1);
  return { left, right, a: product(left), b: product(right), key: pairKey(product(left), product(right)) };
}
function factorChoice(n, p, scope) {
  const other = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].filter(k => k !== p && n % k !== 0).slice(0, 3);
  const checks = other.filter(k => k < p).map(k => ruleFor(n, k));
  return question(`choose-${n}`, 'divisibility', 'Find a small building block', `Which of these numbers divides ${n} exactly? Test the smaller candidates before guessing a large factor.`, String(p), [...checks, ruleFor(n, p)], `${p} divides ${n}. Now work out how many groups there are; you do not need to know the whole multiplication in advance.`, { type: 'choice', choices: [...other, p].sort((a, b) => a - b).map(String), scope, candidateTarget: n });
}
function chainSteps(n, found) {
  const pieces = primePieces(n), missing = pairsFor(n).filter(([a, b]) => !found.has(pairKey(a, b))), scope = missing.map(([a, b]) => pairKey(a, b));
  const source = pairsFor(n).find(([a, b]) => a > 1 && found.has(pairKey(a, b)) && primePieces(b).length > 1);
  let current = source ? source[1] : n; const steps = [];
  if (source) steps.push({ id: 'known', type: 'info', skill: 'regrouping', title: 'Start from your board', prompt: `You already found ${source[0]}${mul}${source[1]} = ${n}. Keep ${source[0]}, and split ${source[1]} into smaller factors. We will regroup the pieces without changing the product.`, scope: [] });
  for (const p of primePieces(current).slice(0, -1)) {
    steps.push(factorChoice(current, p, scope), ...divisionSteps(current, p, scope)); current /= p;
  }
  if (pieces.length > 1) {
    const smallPrimes = Array.from({ length: Math.floor(Math.sqrt(current)) }, (_, i) => i + 1).filter(k => primePieces(k).length === 1 && k > 1);
    steps.push({ id: `prime-${current}`, type: 'info', skill: 'prime-factors', title: 'Know when to stop splitting', prompt: `${current} is prime: ${smallPrimes.length ? `none of the primes ${smallPrimes.join(', ')} up to its square root divides it` : 'there are no prime candidates at or below its square root'}. Keep it as one building block. The prime pieces of ${n} are ${pieces.join(mul)}.`, scope });
  }
  if (pieces.length > 1 && missing.some(([a]) => a > 1)) steps.push({ id: `regroup-${n}`, skill: 'regrouping', type: 'group', title: 'Build a new factor from the pieces', prompt: `Tap pieces to put them on the left. Unselected pieces make the partner on the right. Find a pair not already on your board. Every piece is used exactly once.`, pieces, found: [...found], scope, hints: ['Combine two small prime pieces; leave the others as the partner.', 'Each piece can be used only once. Repeated primes have separate buttons because they are separate pieces.'] });
  steps.push(boundaryStep(n)); return steps;
}
export function teachingLesson(n, found = new Set(), { route = 'suggest', candidate } = {}) {
  whole(n); const valid = new Set(pairsFor(n).map(([a, b]) => pairKey(a, b))); found = new Set([...found].filter(key => valid.has(key)));
  const missing = pairsFor(n).filter(([a, b]) => !found.has(pairKey(a, b))); let steps = [];
  if (route === 'boundary') steps = [boundaryStep(n)];
  else if (route === 'search') steps = [boundaryStep(n), { id: 'search', type: 'search', skill: 'systematic-search', title: 'Check every first-factor candidate', prompt: 'Test every whole number up to the boundary, not just primes. A composite number can also be a factor. Known pairs are already checked.', scope: [] }];
  else if (route === 'reuse') {
    const source = pairsFor(n).find(([a, b]) => found.has(pairKey(a, b)) && b % 2 === 0 && !found.has(pairKey(a * 2, b / 2)));
    if (source) {
      const [a, b] = source, scope = [pairKey(a * 2, b / 2)];
      steps = [question('double', 'halve-double', 'Balance two changes', `You know ${a}${mul}${b} = ${n}. Double ${a}. What do you get?`, a * 2, [`${a} + ${a}.`], `Now halve the OTHER factor, ${b}, to keep the product unchanged.`, { scope }), question('halve', 'halve-double', 'Keep the same product', `What is half of ${b}?`, b / 2, [`Split ${b} into convenient even parts and halve each part.`], `${a * 2}${mul}${b / 2} = ${n}. Multiplying one side by 2 and dividing the other by 2 cancel out.`, { scope }), boundaryStep(n)];
    } else steps = primePieces(n).length >= 2 ? chainSteps(n, found) : [boundaryStep(n)];
  } else if (candidate !== undefined) {
    whole(candidate); steps = [candidateStep(n, candidate)]; if (n % candidate === 0) steps.push(...divisionSteps(n, candidate));
  } else if (route === 'regroup' && primePieces(n).length >= 2) steps = chainSteps(n, found);
  else if (!found.has(pairKey(1, n))) steps = divisionSteps(n, 1);
  else if (primePieces(n).length >= 3) steps = chainSteps(n, found);
  else if (missing.length) { const k = missing[0][0]; steps = [factorChoice(n, k, scopeFor(n, k)), ...divisionSteps(n, k)]; }
  else steps = [boundaryStep(n)];
  return { target: n, route, found: [...found], steps: [{ id: 'intro', type: 'intro', skill: 'orientation', title: 'Choose the help you need', prompt: found.size ? `You have ${found.size} pair${found.size === 1 ? '' : 's'}. We can build on your work, or you can choose a different approach below.` : 'Start with a nudge, explore a candidate, or check where to stop. You can return to your board at any time.', scope: [] }, ...steps] };
}
export function assessStep(step, value) {
  if (step.type === 'group') {
    const g = groupPieces(step.pieces, value);
    if (!g.left.length || !g.right.length) return { valid: false, correct: false, retry: 'Put at least one piece on each side. An empty group gives the familiar 1 x target pair.' };
    if (step.found.includes(g.key)) return { valid: true, correct: false, duplicate: true, retry: `${g.a}${mul}${g.b} is valid, but it is already on your board. Try another grouping.` };
    return { valid: true, correct: true, group: g, feedback: `(${g.left.join(mul)})${mul}(${g.right.join(mul)}) = ${g.a}${mul}${g.b} = ${g.a * g.b}. We discovered ${g.a} by multiplying the selected pieces, not by guessing.` };
  }
  if (value === null || value === undefined || String(value).trim() === '') return { valid: false, correct: false, retry: 'Enter an answer, ask for a nudge, or return to your board.' };
  if (step.type === 'choice') return { valid: step.choices.includes(String(value)), correct: String(value) === step.answer, feedback: step.feedback };
  if (!/^\d+$/.test(String(value).trim())) return { valid: false, correct: false, retry: 'Use a whole number, with no decimal point.' };
  return { valid: Number.isSafeInteger(Number(value)), correct: Number(value) === step.answer, feedback: step.feedback };
}
export function revealFor(step) {
  if (step.type !== 'group') return `${step.type === 'choice' ? 'Answer' : 'The missing number'}: ${step.answer}. ${step.feedback}`;
  for (let mask = 1; mask < 2 ** step.pieces.length - 1; mask++) {
    const indices = step.pieces.map((_, i) => i).filter(i => mask & (1 << i)), result = assessStep(step, indices);
    if (result.correct) return result.feedback;
  }
  return 'Every grouping gives a pair that is already on your board.';
}
export function rootPractice(index, band = 12, random = Math.random) {
  band = [12, 20, 32].includes(band) ? band : 12; const k = 1 + Math.floor(Math.min(0.999999, Math.max(0, random())) * band);
  if (index % 2 === 0) return question(`square-${k}`, 'square-recall', 'Recall a square', `What is ${k}\u00b2 (${k}${mul}${k})?`, k * k, [`Use a neighbouring square: ${k - 1}\u00b2 = ${(k - 1) ** 2}. The next square adds ${2 * k - 1}.`], `${k}\u00b2 = ${k * k}.`, { target: k * k });
  const n = Math.max(1, Math.min(MAX_TARGET, k * k + [-1, 0, 1][Math.floor(index / 2) % 3])); return { ...boundaryStep(n), target: n };
}
