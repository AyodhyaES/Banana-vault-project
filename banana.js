// Banana API helper: puzzles are fetched here, the solution stays on the server.
const crypto = require('crypto');
const API = process.env.BANANA_API_URL || 'https://marcconrad.com/uob/banana/api.php?out=json';
const TTL = 10 * 60 * 1000;
const puzzles = new Map();                       // id -> { solution, expires }

async function fetchBanana() {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(API, { signal: ctl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('Banana API status ' + r.status);
    const d = await r.json();                    // { question: <image url>, solution: <digit> }
    const solution = Number(d.solution);
    if (!d.question || Number.isNaN(solution)) throw new Error('Unexpected Banana API response');
    return { question: d.question, solution };
  } finally { clearTimeout(timer); }
}
const store = solution => { const id = crypto.randomUUID(); puzzles.set(id, { solution, expires: Date.now() + TTL }); return id; };

// A game puzzle: the browser gets only { id, imageUrl }.
async function newPuzzle() { const p = await fetchBanana(); return { id: store(p.solution), imageUrl: p.question }; }

// One attempt per puzzle. Returns true / false, or null if the puzzle expired or does not exist.
function check(id, answer) {
  const p = puzzles.get(id);
  if (!p || p.expires < Date.now()) return null;
  puzzles.delete(id);
  return Number(answer) === p.solution;
}
function hint(id) {
  const p = puzzles.get(id);
  return p ? `The digit is ${p.solution % 2 ? 'odd' : 'even'} and ${p.solution < 5 ? 'less than 5' : '5 or more'}.` : null;
}
setInterval(() => { for (const [k, v] of puzzles) if (v.expires < Date.now()) puzzles.delete(k); }, 60000);
module.exports = { newPuzzle, check, hint };
