# 🍌 Banana Mystery Vault

An interactive mystery puzzle adventure game powered by the **Banana API**.
Solve banana puzzles, collect keys and coins, and open the story vaults.

Built with HTML5, CSS3, JavaScript, Node.js, Express.js and MongoDB.

**Module:** CIS046-3 Software for Enterprise
**Live front-end:** https://ayodhyaes.github.io/Banana-vault-project/

> The GitHub Pages link shows the front-end only. It cannot run the server or the database,
> so it uses local practice puzzles and keeps accounts in the browser only.
> For the full game (Banana API puzzles, email codes, MongoDB accounts) run it locally.

---

## ✨ Features

- Register with a username, **email address**, password and an **avatar**; every player gets a **unique Explorer ID** (for example `BMV-48213`)
- **Email verification at sign-up** (a 6-digit code is emailed before the account works)
- **Email-based two-factor login** in 3 steps:
  1. **Login** with username and password
  2. **Email verification**: a random 6-digit one-time code (valid 5 minutes) is emailed to the registered address
  3. **Access granted**: the login token (JWT, httpOnly cookie, 7 days) is given only after the right code
- Automatic code check when the 6th digit is typed, a "Resend code" button with a countdown, and a code expiry clock
- Passwords hashed with bcrypt; codes stored scrambled; limits on attempts and resend requests
- Live **Banana API** puzzles (the server keeps the solution secret) and local practice puzzles when the API is down
- 45-second timer for every puzzle, best times, coins, lives, hints and keys
- Story Vault Boxes, a vault PIN made from the solved answers, and badges earned by clearing vaults
- Leaderboard, sound effects with the **Web Audio API**
- The puzzle and the countdown fit on one screen (phones and computers)

---

## 🔌 APIs used

| API | Where | What it does |
| --- | --- | --- |
| **Banana API** https://marcconrad.com/uob/banana/doc.php | Server (`banana.js`) | Gives a puzzle picture and its solution. The browser only gets `{ id, imageUrl }`; the answer is checked on the server. |
| **Web Audio API** | Browser (`script.js`) | Makes the banana win sound and other sound effects in code. |
| **SMTP** (Nodemailer) | Server (`mailer.js`) | Sends the sign-up and login codes by email. |

### REST routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/puzzle` | GET | New Banana puzzle (`id` and `imageUrl` only) |
| `/api/answer` | POST | Check an answer |
| `/api/hint?id=...` | GET | Hint (never the digit) |
| `/api/explorer-id` | GET | A free Explorer ID to show on the register page |
| `/api/register` | POST | Create an account and email the sign-up code |
| `/api/verify-email` | POST | Confirm the sign-up code |
| `/api/resend-code` | POST | New sign-up code |
| `/api/login` | POST | Step 1 (password) and step 2 (email code) |
| `/api/login/email-code` | POST | "Resend code" for the login code |
| `/api/logout` | POST | Log out (clears the cookie) |
| `/api/me` | GET | Current player |
| `/api/progress` | PUT | Save player progress |
| `/api/leaderboard` | GET | Top players |
| `/api/health` | GET | Server and database status |

### Limits

| What | Limit |
| --- | --- |
| Login code lifetime | 5 minutes, works once |
| Wrong tries for one code | 5, then a new code is needed |
| Resend code | once per 60 seconds per account |
| Sign-up | 10 attempts per IP in 10 minutes |
| Login | 15 attempts per IP in 10 minutes |
| Resend requests | 5 per IP in 10 minutes |

---

## 📁 Project structure

```
Banana-vault-project/
├── server.js        Express server, Banana puzzle routes, attempt limits
├── auth.js          Register, email codes, login, progress, leaderboard
├── mailer.js        Sends the emails with Nodemailer and explains problems
├── banana.js        Banana API helper (solutions stay on the server)
├── db.js            MongoDB connection and Player model
├── test-email.js    Sends one test email
├── .env.example     Example settings (copy to .env)
└── public/          Front-end served by the server
    ├── index.html
    ├── style.css
    ├── script.js
    └── images/
```

A copy of the front-end files is kept for GitHub Pages.

---

## 🚀 Setup

Needs **Node.js 18 or newer** and **MongoDB**.

```bash
git clone https://github.com/AyodhyaES/Banana-vault-project.git
cd Banana-vault-project
```

### 2. Install dependencies

```bash
npm install
```

If packages are missing:

```bash
npm install express dotenv cookie-parser bcryptjs jsonwebtoken mongoose nodemailer
```

### Settings (`.env`)

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`) and fill it in:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/banana_vault
JWT_SECRET=change_this_to_a_long_random_text

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM="Banana Mystery Vault <yourname@gmail.com>"
```

**Never upload `.env` to GitHub.**

For Gmail: turn on 2-Step Verification, then make an **App password** (Google Account, Security) and write the 16 letters in `SMTP_PASS` without spaces. Your normal Gmail password does not work.

### Start

```bash
node server.js
```

Open http://localhost:3000. The terminal shows one of these lines about email:

- `[EMAIL] Ready - emails are sent as ...` the 6-digit codes are really emailed
- `[EMAIL] PRACTICE MODE ... Missing: ...` no email settings: **no email is sent, the code is printed in the terminal**
- `[EMAIL] Cannot use the email server: ...` the settings are wrong; the message says what to fix

Send one test email: `node test-email.js your@email.com`

---

## 🧰 Troubleshooting

**The 6-digit code does not arrive**
1. Read the server terminal. In practice mode the code is printed there.
2. Run `node test-email.js your@email.com` and read the message.
3. Check the spam folder. Edited `.env`? Stop the server (`Ctrl + C`) and start it again.

**`EADDRINUSE` (port 3000 already in use)** Stop the old server with `Ctrl + C`, or on Windows run `taskkill /IM node.exe /F`.

**`Database not connected`** Start MongoDB and check `MONGODB_URI`.

**`fetch is not defined`** Update Node.js to version 18 or newer.

---

## 🙏 Credits

Puzzles from the **Banana API** by Marc Conrad: https://marcconrad.com/uob/banana/doc.php