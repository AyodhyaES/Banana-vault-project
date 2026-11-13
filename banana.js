// Banana API helper: puzzles are fetched here, the solution stays on the server.
const crypto = require('crypto'); // Imports Node.js crypto module for generating unique puzzle IDs.
const API = process.env.BANANA_API_URL ||   // External Banana API endpoint.
'https://marcconrad.com/uob/banana/api.php?out=json'; 
const TTL = 10 * 60 * 1000; // Puzzle expiration time: 10 minutes.
const puzzles = new Map();    // Stores puzzle IDs, solutions and expiration times.                   // id -> { solution, expires }

//Fetching puzzle data
async function fetchBanana() {

  // Creates an AbortController to control the request timeout.
  const ctl = new AbortController(), 
   // Automatically cancels the request after 8 seconds.
  timer = setTimeout(() => ctl.abort(), 8000);

  try {  // Sends a request to the external API.
    const r = await fetch(API, { 
      signal: ctl.signal, 
      redirect: 'follow'
     });
    if (!r.ok) // Checks whether the API request was successful.
       throw new Error('Banana API status ' + r.status);
    const d = await r.json();      // Reads the API response as JSON.              
    const solution = Number(d.solution); // Converts the puzzle solution into a number
    
     // Validates the returned question and solution.
    if (!d.question || Number.isNaN(solution)) 
        throw new Error('Unexpected Banana API response');
    
    // Returns the puzzle image URL and correct solution.  
    return { question: d.question, solution };
  } finally { clearTimeout(timer); }  // Clears the timeout after the request finishes.
}

//Storing the puzzle
const store = solution => {
   const id = crypto.randomUUID();  // Generates a unique puzzle ID.
   puzzles.set(id, {   // Stores the solution and expiration time.
    solution, 
    expires: Date.now() + TTL 
  }); 
  return id; 
};

// A game puzzle: the browser gets only { id, imageUrl }.
async function newPuzzle() { 
  const p = await fetchBanana();  // Fetches a new puzzle from the external API.
    return {  // Returns only the puzzle ID and image URL to the browser.
      id: store(p.solution), 
      imageUrl: p.question 
    }; 
  }

// One attempt per puzzle. Returns true / false, or null if the puzzle expired or does not exist.
function check(id, answer) {
  const p = puzzles.get(id);  // Retrieves the puzzle using its unique ID.
  if (!p || p.expires < Date.now()) // Checks whether the puzzle exists or has expired.
    return null;
  puzzles.delete(id); // Deletes the puzzle so it cannot be attempted again.
  return Number(answer) === p.solution; // Compares the submitted answer with the correct solution.
}
function hint(id) { // Generates a hint for the selected puzzle.
  const p = puzzles.get(id); // Retrieves the puzzle information.

  return p // Returns information about the solution if the puzzle exists
  ? `The digit is ${p.solution % 2 ? 'odd' : 'even'} and ${p.solution < 5 ? 'less than 5' : '5 or more'}.`
  : null;
}
// Removes expired puzzles every 60 seconds.
setInterval(() => { 
  for (const [k, v] of puzzles) 
    if (v.expires < Date.now())
       puzzles.delete(k);
       }, 60000);
// Exports the functions so other backend modules can use them.
module.exports = {
   newPuzzle,
    check, 
    hint 
};
