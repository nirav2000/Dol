// Factor Frenzy: independent, testable arithmetic functions.
export function factorPairs(n) {
  if (!Number.isSafeInteger(n) || n < 1) return [];
  const pairs = [];
  for (let a = 1; a <= Math.floor(Math.sqrt(n)); a++) {
    if (n % a === 0) pairs.push([a, n / a]);
  }
  return pairs;
}
export function candidates(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum < 1) return [];
  const values = [];
  for (let n = 2; n <= maximum; n++) {
    if (factorPairs(n).length >= 4) values.push(n);
  }
  return values;
}
export function selectNumber(maximum, previous = null, random = Math.random) {
  const available = candidates(maximum);
  if (!available.length) throw new RangeError("No eligible numbers");
  const choices = available.length > 1 ? available.filter(n => n !== previous) : available;
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
}
export function parsePair(raw) {
  const match = String(raw).trim().match(/^([0-9]+)\s*(?:[x×*]|\s+)\s*([0-9]+)$/i);
  if (!match) return null;
  const a = Number(match[1]), b = Number(match[2]);
  return Number.isSafeInteger(a) && Number.isSafeInteger(b) && a > 0 && b > 0 ? [a, b] : null;
}
export function assessPair(raw, target, found) {
  const pair = parsePair(raw);
  if (!pair) return {status:"invalid", message:"Type two positive whole numbers, for example 4x6."};
  const [a,b] = pair;
  if (a * b !== target) return {status:"incorrect", message:`${a} × ${b} makes ${a*b}, not ${target}.`};
  const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
  if (found.has(key)) return {status:"duplicate", key, message:`${Math.min(a,b)} × ${Math.max(a,b)} is already on your board.`};
  return {status:"correct",key,pair:[Math.min(a,b),Math.max(a,b)],message:`Correct! ${Math.min(a,b)} × ${Math.max(a,b)} = ${target}. +1 point.`};
}
export function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,"0")}`;
}
