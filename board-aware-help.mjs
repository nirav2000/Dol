// Pure, board-aware hint planning. Never suggest a factor pair already on the board.
// Derived suggestions stay private until the learner chooses to work them out.
const key = (a, b) => [a, b].sort((x, y) => x - y).join('-');
const pairs = n => {
  const result = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) result.push([a, n / a]);
  return result;
};
const primesOf = n => {
  const result = [];
  for (let p = 2; p * p <= n; p++) if (n % p === 0) {
    result.push(p);
    while (n % p === 0) n /= p;
  }
  if (n > 1) result.push(n);
  return result;
};

export function boardStatus(n, found = new Set()) {
  const all = pairs(n), known = all.filter(([a, b]) => found.has(key(a, b)));
  const missing = all.filter(([a, b]) => !found.has(key(a, b)));
  return {target: n, total: all.length, knownCount: known.length, missingCount: missing.length, known, missing};
}

// Small, immediately recognizable rules before decomposing large factors.
export function planBoardShortcut(n, found = new Set()) {
  for (const divisor of [10, 5, 2, 3, 9, 11]) {
    if (n % divisor) continue;
    const goalKey = key(divisor, n / divisor);
    if (found.has(goalKey)) continue;
    if (divisor === 10 && n < 20) continue;
    return {kind: 'shortcut', divisor, partner: n / divisor, goalKey,
      label: divisor === 10 ? 'Use the ending zero' :
        divisor === 5 ? 'Use a five-times fact' :
        divisor === 2 ? 'Use an even-number fact' :
        divisor === 3 || divisor === 9 ? 'Use the digit sum' : 'Use the eleven rule'};
  }
  return null;
}

// Move a factor of 2 in opposite directions. Prefer manageable known values.
export function planBoardReuse(n, found = new Set(), avoid = new Set()) {
  const sources = boardStatus(n, found).known.filter(([a]) => a > 1);
  const moves = [];
  for (const from of sources) for (const dividedIndex of [0, 1]) {
    const dividend = from[dividedIndex], multiplier = from[1 - dividedIndex];
    if (dividend % 2) continue;
    const to = [...from]; to[dividedIndex] /= 2; to[1 - dividedIndex] *= 2;
    const goalKey = key(...to);
    if (found.has(goalKey) || avoid.has(goalKey)) continue;
    moves.push({kind: 'balance', from, to, goalKey, dividedIndex, dividend, multiplier, scale: 2});
  }
  moves.sort((x, y) => Math.max(...x.from) - Math.max(...y.from) ||
    Math.max(...x.to) - Math.max(...y.to) || x.dividend - y.dividend);
  return moves[0] || null;
}

// Regroup a known pair by moving a manageable factor from one partner to the other.
export function planBoardRegroup(n, found = new Set(), avoid = new Set()) {
  const status = boardStatus(n, found);
  const known = status.known;
  const sources = [...known.filter(([a]) => a > 1), ...known.filter(([a]) => a === 1)];
  if (!sources.length) sources.push([1, n]);
  const moves = [];
  for (const from of sources) {
    const [a, b] = from;
    const options = [...new Set([10, 5, 3, 2, ...primesOf(b)])];
    for (const divisor of options) {
      if (divisor >= b || b % divisor) continue;
      const partner = b / divisor, goalKey = key(a * divisor, partner);
      if (found.has(goalKey) || avoid.has(goalKey)) continue;
      const simple = divisor === 10 && b % 10 === 0 ? 0 :
        divisor === 5 && b % 5 === 0 ? 1 :
        divisor === 3 ? 2 : divisor === 2 ? 3 : 4;
      moves.push({kind: 'regroup', from, divisor, partner, to: [a * divisor, partner], goalKey,
        fromBoard: found.has(key(a,b)), score: simple * 100 + (a === 1 ? 200 : 0) +
          Math.min(99, Math.floor(Math.log10(b + 1)) * 5)});
    }
  }
  moves.sort((x, y) => x.score - y.score || Math.max(...x.to) - Math.max(...y.to));
  return moves[0] || null;
}

// Distinct routes to distinct uncompleted pairs, never a repeat of an already known answer.
export function boardSuggestions(n, found = new Set()) {
  const status = boardStatus(n, found), taken = new Set();
  const shortcut = planBoardShortcut(n, found);
  if (shortcut) taken.add(shortcut.goalKey);
  const balance = planBoardReuse(n, found, taken);
  if (balance) taken.add(balance.goalKey);
  const regroup = planBoardRegroup(n, found, taken);
  const choices = [
    shortcut && {route: 'shortcut', title: 'Quick mental trick', teaser: shortcut.label, goalKey: shortcut.goalKey},
    balance && {route: 'reuse', title: 'Halve and double', teaser: 'Start from ' + balance.from.join(' × '), goalKey: balance.goalKey},
    regroup && {route: 'regroup', title: 'Split and regroup', teaser: 'Start from ' + regroup.from.join(' × '), goalKey: regroup.goalKey}
  ].filter(Boolean);
  return {...status, shortcut, balance, regroup, choices};
}
