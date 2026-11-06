// Banana Mystery Vault - Express server (needs Node 18+)
// Interoperability: this server calls Marc Conrad's Banana API and keeps the solutions private.
require('dotenv').config();   // loads settings from the .env file
const express = require('express'), path = require('path'), banana = require('./banana');
const app = express();
app.use(express.json());
app.use(require('cookie-parser')());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', require('./auth'));      // accounts, progress, leaderboard (MongoDB)

// 1) Browser asks for a puzzle: only { id, imageUrl } is sent, never the solution.
app.get('/api/puzzle', async (req, res) => {
  try { res.json(await banana.newPuzzle()); } catch (e) { res.status(502).json({ error: 'Banana API unavailable' }); }
});
// 2) Answer check: the Banana API has no check endpoint, so the server compares with the stored solution.
app.post('/api/answer', (req, res) => {
  const correct = banana.check(req.body.id, req.body.answer);
  if (correct === null) return res.status(404).json({ error: 'Puzzle expired' });
  res.json({ correct });
});
// 3) Hint: reveals only parity and a half-range, not the digit.
app.get('/api/hint', (req, res) => {
  const h = banana.hint(req.query.id);
  if (!h) return res.status(404).json({ error: 'Puzzle expired' });
  res.json({ hint: h });
});

app.listen(process.env.PORT || 3000, () => console.log('Banana Mystery Vault on http://localhost:' + (process.env.PORT || 3000)));
