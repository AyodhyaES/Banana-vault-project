// Banana Mystery Vault - Express server (needs Node 18+)
// Interoperability: this server calls Marc Conrad's Banana API and keeps the solutions private.
require('dotenv').config();   // loads settings from the .env file
const express = require('express'), //Creates the backend server and API routes.
  path = require('path'), //Handles file and folder paths.
  banana = require('./banana');//Imports your Banana API and puzzle-checking functions.
const app = express();//Creates the Express application.

//Middleware configuration
app.use(express.json()); //reads JSON data sent by the frontend.
app.use(require('cookie-parser')()); //reads cookies from incoming requests.
app.use(express.static(path.join(__dirname, 'public'))); //serves frontend files from the public folder.
// Attempt limiter: at most "max" attempts per IP number in the time window.
// The IP numbers are kept only in memory for that time and are never saved.
const limiter = (max, windowMs, message) => {
  const hits = new Map(); // ip -> list of attempt times

  // Forget old IP numbers every minute.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of hits)
      if (times.every(t => now - t >= windowMs)) hits.delete(ip);
  }, 60000).unref();

  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);

    if (recent.length >= max)
      return res.status(429).json({ error: message });

    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
};

// Sign-up: 10 attempts per IP in 10 minutes.
app.post('/api/register', limiter(10, 10 * 60 * 1000,
  'Too many sign-up attempts. Please try again in a few minutes.'));

// Login (password and emailed code): 15 attempts per IP in 10 minutes, to stop code guessing.
app.post('/api/login', limiter(15, 10 * 60 * 1000,
  'Too many login attempts. Please try again in a few minutes.'));

// Email verification: 15 code tries and 5 "new code" requests per IP in 10 minutes.
app.post('/api/verify-email', limiter(15, 10 * 60 * 1000,
  'Too many attempts. Please try again in a few minutes.'));
app.post('/api/resend-code', limiter(5, 10 * 60 * 1000,
  'Too many requests for a new code. Please try again in a few minutes.'));

// "Resend code" for the login one-time code: 5 requests per IP in 10 minutes.
app.post('/api/login/email-code', limiter(5, 10 * 60 * 1000,
  'Too many requests for a new code. Please try again in a few minutes.'));

// Explorer ID preview on the register page: 30 requests per IP in 10 minutes.
app.get('/api/explorer-id', limiter(30, 10 * 60 * 1000,
  'Too many requests. Please try again in a few minutes.'));

app.use('/api', require('./auth'));      // accounts, progress, leaderboard (MongoDB)

// 1) Browser asks for a puzzle: only { id, imageUrl } is sent, never the solution.
app.get('/api/puzzle', async (req, res) => { //The frontend sends a GET request to /api/puzzle.
  try {
     res.json(await banana.newPuzzle()); //The server calls
    } catch (e) {   //await waits for the puzzle request to finish.
      res.status(502).json({  //The puzzle information is returned as JSON.
        error: 'Banana API unavailable' }); }  //If the request fails, the server returns an error with HTTP status 502.
});

// 2) Answer check: the Banana API has no check endpoint, so the server compares with the stored solution.
app.post('/api/answer', (req, res) => {
  const correct = banana.check(  //checks whether the answer is correct.
    req.body.id,  //identifies the puzzle.
    req.body.answer  //contains the submitted answer.
  );
  if (correct === null) 
    return res.status(404).json({ //If the puzzle has expired, the server returns status 404.
      error: 'Puzzle expired' 
    });
  res.json({ correct }); //it returns the result as JSON.
});

// 3) Hint: reveals only parity and a half-range, not the digit.
app.get('/api/hint', (req, res) => {  //The frontend requests a hint using the puzzle ID. 
  const h = banana.hint(req.query.id); //The server calls banana.hint().

  if (!h)
     return res.status(404).json({   //It returns the hint without revealing the complete answer.
        error: 'Puzzle expired'   //If the puzzle has expired, it returns an error.
     });

  res.json({ hint: h });
});

// Starting the server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `Banana Mystery Vault on http://localhost:${PORT}`
  );

  console.log('Authentication routes loaded.');
});