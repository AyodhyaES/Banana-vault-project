# 🍌 Banana Mystery Vault

An interactive mystery puzzle adventure game powered by the **Banana API**.
Solve banana puzzles, collect keys and coins, and open the story vaults.

Built with HTML5, CSS3, JavaScript, Node.js, Express.js and MongoDB.

**Module:** CIS046-3 Software for Enterprise (AY 26/27)
**Student:** Ayodhya Eishani Senarathna Lakmana Arachchige (2623053)

**Live front-end:** https://ayodhyaes.github.io/Banana-vault-project/

> **Note:** the GitHub Pages link shows the front-end only. It cannot run the
> server or the database, so it uses local practice puzzles and keeps accounts
> in the browser only. For the full game (Banana API puzzles, MongoDB accounts
> and the shared leaderboard) run the project locally as described below.

---

## ✨ Features

- Username and password registration and login
- Secure password hashing with bcrypt
- Login session with a signed JWT in an httpOnly cookie (7 days)
- Unique Explorer ID, avatar selection and badges
- Three adventure levels
- Live Banana API puzzles (the server keeps the solution secret)
- Local practice puzzles (Six Equations) when the API is unavailable
- 45-second timer for each puzzle, with best times for each level
- Coins, lives, hints and collectible keys
- Story Vault Boxes with a special bonus (free hint, extra life or 500 points)
- Vault PIN made from the solved puzzle answers, entered automatically
- Banana win sound (Web Audio API) with falling bananas, and a sound on/off button
- Player progress saved in MongoDB
- Leaderboard (username, avatar, Explorer ID, vaults completed and score)
- Sign-up limit: 10 attempts per IP number in 10 minutes
- Responsive design for phones and computers

---

## 🔌 APIs used

| API | Where | What it does |
| --- | --- | --- |
| **Banana API** — https://marcconrad.com/uob/banana/doc.php | Server (`banana.js`) | Gives a puzzle image and its solution digit. The server stores the solution and sends the browser only `{ id, imageUrl }`. The answer is checked on the server. |
| **Web Audio API** | Browser (`script.js`) | `AudioContext`, oscillators and gain nodes create the banana win sound and the other sound effects. |

### REST routes of this project

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/puzzle` | GET | New Banana puzzle (`id` and `imageUrl` only) |
| `/api/answer` | POST | Check an answer (`id`, `answer`) |
| `/api/hint?id=...` | GET | Hint (odd/even and a half-range, never the digit) |
| `/api/register` | POST | Create an account |
| `/api/login` | POST | Log in |
| `/api/logout` | POST | Log out (clears the cookie) |
| `/api/me` | GET | Current player |
| `/api/progress` | PUT | Save player progress |
| `/api/leaderboard` | GET | Top players |
| `/api/health` | GET | Server and database status |

---

## 🛠️ Technologies

- HTML5, CSS3, JavaScript
- Node.js (**18 or newer**) and Express.js
- MongoDB and Mongoose
- Banana API and Web Audio API
- bcryptjs (password hashing)
- jsonwebtoken (JWT) and cookie-parser
- dotenv (environment variables)

---

## 📁 Project structure

```
Banana-vault-project/
├── server.js        Express server, Banana puzzle routes, sign-up limit
├── auth.js          Register, login, progress and leaderboard routes
├── banana.js        Banana API helper (solutions stay on the server)
├── db.js            MongoDB connection and Player model
├── public/          Front-end served by the server
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── images/
├── .env.example     Example settings (copy to .env)
└── package.json
```

A copy of the front-end files is kept in the repository root for GitHub Pages.

---

## 🚀 Installation and setup

### 1. Clone the repository

```bash
git clone https://github.com/AyodhyaES/Banana-vault-project.git
cd Banana-vault-project
```

### 2. Install dependencies

```bash
npm install
```

If packages are missing, install them directly:

```bash
npm install express dotenv cookie-parser bcryptjs jsonwebtoken mongoose
```

### 3. Configure environment variables

Copy `.env.example` to `.env`.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mac/Linux:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/banana_vault
JWT_SECRET=your_private_secret
```

Use your own long, random JWT secret. **Never upload `.env` to GitHub.**

### 4. Configure MongoDB

Use MongoDB Community Server locally, or MongoDB Atlas with your own
connection string in `MONGODB_URI`.

### 5. Start the application

```bash
npm start
```

This runs `node server.js`. Open the game at:

http://localhost:3000

Check the server and database connection at:

http://localhost:3000/api/health

Expected response:

```json
{ "ok": true, "db": true }
```

---

## 🔒 Security notes

- Passwords are hashed with bcrypt and never stored as plain text.
- The login token is a signed JWT in an httpOnly cookie that lasts 7 days.
- Banana puzzle solutions stay on the server; the browser never receives them.
- Sign-up attempts are limited to 10 per IP number in 10 minutes. IP numbers
  are kept only in memory for that time and are not saved to the database.
- Ideas for the future: check every reward on the server to stop cheating,
  and a shared online leaderboard with more players.

---

## 🧰 Troubleshooting

**`EADDRINUSE` / port 3000 already in use** — an old server is still running.
Stop it with `Ctrl + C` in its terminal, or on Windows run:

```powershell
taskkill /IM node.exe /F
```

Then start the server again.

**`fetch is not defined`** — update Node.js to version 18 or newer.

**"Database not connected"** — start MongoDB and check `MONGODB_URI` in `.env`.

---

## 🙏 Credits

Puzzles from the **Banana API** by Marc Conrad:
https://marcconrad.com/uob/banana/doc.php