// Username/password authentication, player progress and leaderboard.

const express = require('express'); //Import authentication libraries
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { mongoose, User } = require('./db');
const mailer = require('./mailer');

const router = express.Router();

//JWT Secret and Cookie Configuration
const SECRET = process.env.JWT_SECRET || 'change-this-jwt-secret';

const COOKIE = {
  httpOnly: true,   //Prevents JavaScript from accessing the cookie.
  sameSite: 'lax', //Helps protect against cross-site request attacks.
  secure: process.env.NODE_ENV === 'production', //Sends cookies over HTTPS in production.
  maxAge: 7 * 24 * 60 * 60 * 1000 //Sets the cookie lifetime to seven days.
};


// ---------- Two-factor authentication (TOTP, RFC 6238) ----------
// Works with Google Authenticator, Microsoft Authenticator and Authy.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30; // a new code every 30 seconds

const b32encode = buf => {
  let bits = '', out = '';
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5)
    out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
};

const b32decode = text => {
  let bits = '';
  for (const ch of text.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(ch);
    if (v >= 0) bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
};

// 6-digit code for one time step
const totpCode = (secret, step) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
};

// Returns the matching time step, or 0 if the code is wrong or was already used.
// One step before and after is accepted for small clock differences.
const checkTotp = (user, code) => {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c) || !user.twoFactorSecret) return 0;
  const now = Math.floor(Date.now() / 1000 / STEP);
  for (const step of [now - 1, now, now + 1]) {
    if (step > (user.twoFactorLastStep || 0) &&
        crypto.timingSafeEqual(Buffer.from(totpCode(user.twoFactorSecret, step)), Buffer.from(c)))
      return step;
  }
  return 0;
};

// Public player information.

const pub = u => ({
  username: u.username,
  name: u.username,
  explorerId: u.explorerId,
  avatar: u.avatar,
  joined: u.createdAt,
  coins: u.coins,
  lives: u.lives,
  score: u.score,
  hints: u.hints,
  keys: u.keys,
  unlocked: u.unlocked,
  done: u.done,
  best: u.best || {},
  twoFactor: !!u.twoFactorEnabled
});

//Dtabase  connection middleware
const dbUp = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database not connected'
    });
  }
  next();
};

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const data = jwt.verify(token, SECRET);
    const user = await User.findById(data.id);

    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Not logged in' });
  }
};

// JWT session management 
// Creates a JWT using the player's database ID and stores it in a cookie.
const setSession = (res, user) => {
  const token = jwt.sign(
    { id: user._id.toString() },
    SECRET,
    { expiresIn: '7d' }
  );

  return res.cookie('token', token, COOKIE);
};

//Health Check Route
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1
  });
});

// ---------- Email verification at sign-up ----------
const CODE_MINUTES = 10;     // a code works for 10 minutes
const CODE_TRIES = 5;        // 5 wrong tries, then a new code is needed
const RESEND_SECONDS = 60;   // wait before asking for another code

// Simple, safe email check (no spaces or HTML characters)
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

// "alex@gmail.com" -> "a***@gmail.com"
const maskEmail = e => String(e || '').replace(/^(.)[^@]*(@.*)$/, '$1***$2');

// Codes are saved scrambled (HMAC), never as plain numbers.
const hashCode = (id, code) =>
  crypto.createHmac('sha256', SECRET).update(String(id) + ':' + code).digest('hex');

// Makes a new 6-digit code, saves it scrambled with an expiry time, and emails it.
const sendNewCode = async user => {
  const code = String(crypto.randomInt(100000, 1000000));

  user.emailCodeHash = hashCode(user._id, code);
  user.emailCodeExpires = Date.now() + CODE_MINUTES * 60 * 1000;
  user.emailCodeTries = 0;
  user.emailCodeSentAt = Date.now();
  await user.save();

  await mailer.sendCode(user.email, user.username, code, CODE_MINUTES);
};

// Finds a player by username and checks the password (null if wrong).
const findWithPassword = async body => {
  const user = await User.findOne({
    usernameKey: String(body.username || '').trim().toLowerCase()
  });

  if (!user || !(await bcrypt.compare(String(body.password || ''), user.passwordHash)))
    return null;

  return user;
};

// Registration route: creates an UNVERIFIED account and emails a 6-digit code.
router.post('/register', dbUp, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const avatar = Math.max(0, Math.min(5, Math.floor(Number(req.body.avatar) || 0)));

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3 to 16 letters, numbers or underscores.'
      });
    }

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password needs 8+ characters.'
      });
    }

    const usernameKey = username.toLowerCase();
    const emailKey = email.toLowerCase();

    if (await User.findOne({ usernameKey })) {
      return res.status(409).json({
        error: 'That username is taken.'
      });
    }

    if (await User.findOne({ emailKey })) {
      return res.status(409).json({
        error: 'That email is already used.'
      });
    }

    // Explorer ID: pick a random number until no other player has it.
    let explorerId;
    do {
      explorerId = 'BMV-' + crypto.randomInt(10000, 100000);
    } while (await User.exists({ explorerId }));

    const user = await User.create({
      username,
      usernameKey,
      email,
      emailKey,
      emailVerified: false,            // no login until the code is confirmed
      passwordHash: await bcrypt.hash(password, 10),
      explorerId,
      avatar
    });

    try {
      await sendNewCode(user);
    } catch (mailErr) {
      console.error('Email error:', mailErr.message);
      await User.deleteOne({ _id: user._id });   // so the player can try again
      return res.status(502).json({
        error: 'Could not send the email. Check the address and try again.'
      });
    }

    // No session cookie yet: the player must verify the email first.
    res.status(201).json({
      verify: true,
      email: maskEmail(email)
    });

  } catch (err) {
    console.error('Registration error:', err.message);

    if (err.code === 11000) {
      return res.status(409).json({
        error: err.keyPattern && err.keyPattern.emailKey
          ? 'That email is already used.'
          : 'That username is taken.'
      });
    }

    res.status(500).json({
      error: 'Could not create the account.'
    });
  }
});

// VERIFY EMAIL: the player types the 6-digit code from the email.
router.post('/verify-email', dbUp, async (req, res) => {
  try {
    const user = await findWithPassword(req.body);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Only for accounts that are waiting for verification
    // (a verified account must use /login so two-step login is not skipped).
    if (user.emailVerified !== false) {
      return res.status(400).json({
        error: 'This account is already verified. Please log in.'
      });
    }

    const code = String(req.body.code || '').replace(/\s/g, '');

    if (user.emailCodeTries >= CODE_TRIES) {
      return res.status(429).json({
        error: 'Too many wrong codes. Press "Send a new code".'
      });
    }

    if (!user.emailCodeHash || Date.now() > user.emailCodeExpires) {
      return res.status(400).json({
        error: 'That code has expired. Press "Send a new code".'
      });
    }

    user.emailCodeTries += 1;   // every try counts

    const good =
      /^\d{6}$/.test(code) &&
      crypto.timingSafeEqual(
        Buffer.from(hashCode(user._id, code)),
        Buffer.from(user.emailCodeHash)
      );

    if (!good) {
      await user.save();
      const left = CODE_TRIES - user.emailCodeTries;
      return res.status(400).json({
        error: left > 0
          ? 'Wrong code. ' + left + ' tries left.'
          : 'Too many wrong codes. Press "Send a new code".'
      });
    }

    user.emailVerified = true;
    user.emailCodeHash = '';
    user.emailCodeExpires = 0;
    user.emailCodeTries = 0;
    await user.save();

    setSession(res, user);

    res.json({ user: pub(user) });

  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).json({ error: 'Could not verify the email.' });
  }
});

// RESEND CODE: a new code (one request per minute)
router.post('/resend-code', dbUp, async (req, res) => {
  try {
    const user = await findWithPassword(req.body);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.emailVerified !== false) {
      return res.status(400).json({
        error: 'This account is already verified. Please log in.'
      });
    }

    const wait = Math.ceil(
      ((user.emailCodeSentAt || 0) + RESEND_SECONDS * 1000 - Date.now()) / 1000
    );

    if (wait > 0) {
      return res.status(429).json({
        error: 'Please wait ' + wait + ' seconds before asking for a new code.'
      });
    }

    try {
      await sendNewCode(user);
    } catch (mailErr) {
      console.error('Email error:', mailErr.message);
      return res.status(502).json({ error: 'Could not send the email.' });
    }

    res.json({ ok: true, email: maskEmail(user.email) });

  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ error: 'Could not send a new code.' });
  }
});

// LOGIN route
router.post('/login', dbUp, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const user = await User.findOne({
      usernameKey: username.toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: 'Invalid username or password.'
      });
    }

    // Email not verified yet: ask for the code from the email first.
    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Please verify your email first.',
        verify: true,
        email: maskEmail(user.email)
      });
    }

    // Two-factor: the password is right, now the 6-digit code is needed.
    if (user.twoFactorEnabled) {
      const code = String(req.body.code || '').trim();

      if (!code) return res.json({ twoFactor: true });   // no session yet

      const step = checkTotp(user, code);

      if (!step) {
        return res.status(401).json({
          error: 'Wrong code. Try the newest code from your app.',
          twoFactor: true
        });
      }

      user.twoFactorLastStep = step;
      await user.save();
    }

    setSession(res, user);

    res.json({
      user: pub(user)
    });

  } catch (err) {
    console.error('Login error:', err.message);

    res.status(500).json({
      error: 'Login failed.'
    });
  }
});

// TWO-FACTOR: step 1 - make a secret key for the authenticator app
router.post('/2fa/setup', dbUp, auth, async (req, res) => {
  try {
    if (req.user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'Two-step login is already on.'
      });
    }

    const secret = b32encode(crypto.randomBytes(20));

    req.user.twoFactorSecret = secret;   // not active until a code is confirmed
    req.user.twoFactorLastStep = 0;
    await req.user.save();

    const issuer = 'Banana Mystery Vault';
    const otpauth =
      'otpauth://totp/' + encodeURIComponent(issuer + ':' + req.user.username) +
      '?secret=' + secret + '&issuer=' + encodeURIComponent(issuer);

    // Optional QR image: works if the "qrcode" package is installed (npm install qrcode).
    let qr = null;
    try { qr = await require('qrcode').toDataURL(otpauth); } catch (e) {}

    res.json({ secret, otpauth, qr });

  } catch (err) {
    console.error('2FA setup error:', err.message);
    res.status(500).json({ error: 'Could not start the set-up.' });
  }
});

// TWO-FACTOR: step 2 - the player types the first code to prove it works
router.post('/2fa/enable', dbUp, auth, async (req, res) => {
  try {
    const step = checkTotp(req.user, req.body.code);

    if (!step) {
      return res.status(400).json({
        error: 'That code is not correct. Try the newest code.'
      });
    }

    req.user.twoFactorEnabled = true;
    req.user.twoFactorLastStep = step;
    await req.user.save();

    res.json({ ok: true });

  } catch (err) {
    console.error('2FA enable error:', err.message);
    res.status(500).json({ error: 'Could not turn on two-step login.' });
  }
});

// TWO-FACTOR: turning it off needs the password AND a current code
router.post('/2fa/disable', dbUp, auth, async (req, res) => {
  try {
    const passwordOk = await bcrypt.compare(
      String(req.body.password || ''),
      req.user.passwordHash
    );
    const step = checkTotp(req.user, req.body.code);

    if (!req.user.twoFactorEnabled || !passwordOk || !step) {
      return res.status(401).json({
        error: 'Wrong password or code.'
      });
    }

    req.user.twoFactorEnabled = false;
    req.user.twoFactorSecret = '';
    req.user.twoFactorLastStep = 0;
    await req.user.save();

    res.json({ ok: true });

  } catch (err) {
    console.error('2FA disable error:', err.message);
    res.status(500).json({ error: 'Could not turn off two-step login.' });
  }
});

// CURRENT PLAYER
router.get('/me', dbUp, auth, (req, res) => {
  res.json({
    user: pub(req.user)
  });
});

// LOGOUT -Clears the authentication cookie when the player logs out.
router.post('/logout', (req, res) => {
  res.clearCookie('token').json({ ok: true });
});

// SAVE GAME PROGRESS
const int = (value, min, max, fallback) => {
  const number = Math.floor(Number(value));

  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
};

router.put('/progress', dbUp, auth, async (req, res) => {
  try {
    const body = req.body || {};
    const user = req.user;

    user.coins = int(body.coins, 0, 1000000, user.coins);
    user.lives = int(body.lives, 0, 5, user.lives);
    user.score = int(body.score, 0, 10000000, user.score);
    user.hints = int(body.hints, 0, 99, user.hints);
    user.unlocked = int(body.unlocked, 1, 3, user.unlocked);

    if (Array.isArray(body.keys)) {
      user.keys = body.keys
        .filter(k => typeof k === 'string')
        .slice(0, 3)
        .map(k => k.slice(0, 30));
    }

    if (Array.isArray(body.done)) {
      user.done = [
        ...new Set(
          body.done
            .map(Number)
            .filter(n => Number.isInteger(n) && n >= 1 && n <= 3)
        )
      ];
    }

    if (body.best && typeof body.best === 'object') {
      const best = {};

      for (const level of [1, 2, 3]) {
        if (Number.isFinite(Number(body.best[level]))) {
          best[level] = int(body.best[level], 0, 1000000, 0);
        }
      }

      user.best = best;
      user.markModified('best');
    }

    await user.save();

    res.json({ ok: true });

  } catch (err) {
    console.error('Progress save error:', err.message);

    res.status(500).json({
      error: 'Could not save progress.'
    });
  }
});

// LEADERBOARD
router.get('/leaderboard', dbUp, async (req, res) => {
  try {
    let myId = null;

    try {
      const token = req.cookies && req.cookies.token;
      if (token) {
        myId = jwt.verify(token, SECRET).id;
      }
    } catch (err) {}

    const players = await User.find()
      .sort({ score: -1 })
      .limit(20);

    res.json({
      players: players.map(user => ({
        name: user.username,
        score: user.score,
        done: user.done.length,
        me: user._id.toString() === myId,
        avatar: user.avatar,
        explorerId: user.explorerId
      }))
    });

  } catch (err) {
    res.status(500).json({
      error: 'Could not load leaderboard.'
    });
  }
});

module.exports = router;