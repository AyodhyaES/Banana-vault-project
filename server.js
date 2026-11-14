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
// Sign-up limit: at most 10 sign-up attempts per IP number in 10 minutes.
// The IP numbers are kept only in memory for the 10 minutes and are never saved.
const SIGNUP_MAX = 10, SIGNUP_WINDOW = 10 * 60 * 1000;
const signups = new Map(); // ip -> list of attempt times

app.post('/api/register', (req, res, next) => {
  const now = Date.now();
  const recent = (signups.get(req.ip) || []).filter(t => now - t < SIGNUP_WINDOW);

  if (recent.length >= SIGNUP_MAX)
    return res.status(429).json({
      error: 'Too many sign-up attempts. Please try again in a few minutes.'
    });

  recent.push(now);
  signups.set(req.ip, recent);
  next();
});

// Forget old IP numbers every minute.
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of signups)
    if (times.every(t => now - t >= SIGNUP_WINDOW)) signups.delete(ip);
}, 60000).unref();

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

//Starting the server
app.listen(
  process.env.PORT || 3000,
  () => console.log(
    'Banana Mystery Vault on http://localhost:' + 
     (process.env.PORT || 3000)
  )
);
