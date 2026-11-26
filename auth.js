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
  hasEmail: !!u.email,                // the email code is used at every login
  emailMasked: maskEmail(u.email)     // a***@gmail.com
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
const CODE_MINUTES = 10;     // sign-up code: works for 10 minutes
const OTP_MINUTES = 5;       // login one-time code (OTP): works for 5 minutes
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

// ---------- Email code as a second login step (another two-factor option) ----------
// Makes a new 6-digit code, saves it scrambled with an expiry time, and emails it.
const sendLoginOtp = async (user, purpose) => {
  const code = String(crypto.randomInt(100000, 1000000));

  user.emailOtpHash = hashCode(user._id, 'otp:' + code);
  user.emailOtpExpires = Date.now() + OTP_MINUTES * 60 * 1000;
  user.emailOtpTries = 0;
  user.emailOtpSentAt = Date.now();
  await user.save();

  await mailer.sendCode(user.email, user.username, code, OTP_MINUTES, purpose);
};

// Seconds still to wait before another code can be sent (0 = can send now)
const otpWait = user => Math.max(0, Math.ceil(
  ((user.emailOtpSentAt || 0) + RESEND_SECONDS * 1000 - Date.now()) / 1000
));

// Checks a code from the email. Every try counts and a code works only once.
const checkEmailOtp = async (user, codeIn) => {
  const code = String(codeIn || '').replace(/\s/g, '');

  if (!user.emailOtpHash || Date.now() > user.emailOtpExpires)
    return { ok: false, status: 400, error: 'That code has expired. Ask for a new code.' };

  if (user.emailOtpTries >= CODE_TRIES)
    return { ok: false, status: 429, error: 'Too many wrong codes. Ask for a new code.' };

  user.emailOtpTries += 1;

  const good =
    /^\d{6}$/.test(code) &&
    crypto.timingSafeEqual(
      Buffer.from(hashCode(user._id, 'otp:' + code)),
      Buffer.from(user.emailOtpHash)
    );

  if (!good) {
    await user.save();
    const left = CODE_TRIES - user.emailOtpTries;
    return {
      ok: false,
      status: 400,
      error: left > 0
        ? 'Wrong code. ' + left + ' tries left.'
        : 'Too many wrong codes. Ask for a new code.'
    };
  }

  user.emailOtpHash = '';
  user.emailOtpExpires = 0;
  user.emailOtpTries = 0;
  await user.save();
  return { ok: true };
};

// A random Explorer ID (BMV-12345) that no other player has.
const freeExplorerId = async () => {
  let id;
  do {
    id = 'BMV-' + crypto.randomInt(10000, 100000);
  } while (await User.exists({ explorerId: id }));
  return id;
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

    // Explorer ID: use the one shown on the register page if it is still free,
    // otherwise make a new unique one.
    let explorerId = String(req.body.explorerId || '');
    if (!/^BMV-[1-9]\d{4}$/.test(explorerId) || await User.exists({ explorerId })) {
      explorerId = await freeExplorerId();
    }

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
      email: maskEmail(email),
      explorerId: user.explorerId,    // public (also shown on the leaderboard)
      avatar: user.avatar
    });

  } catch (err) {
    console.error('Registration error:', err.message);

    if (err.code === 11000) {
      const key = err.keyPattern || {};
      return res.status(409).json({
        error: key.emailKey
          ? 'That email is already used.'
          : key.explorerId
            ? 'Please press Create Account again.'
            : 'That username is taken.'
      });
    }

    res.status(500).json({
      error: 'Could not create the account.'
    });
  }
});

// EXPLORER ID PREVIEW: a free ID to show on the register page
router.get('/explorer-id', dbUp, async (req, res) => {
  try {
    res.json({ explorerId: await freeExplorerId() });
  } catch (err) {
    res.status(500).json({ error: 'Could not make an Explorer ID.' });
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

    // Two-factor: the password is right, now an emailed one-time code (OTP) is needed.
    // Every account has a verified email, so the code is required at every login.
    if (user.email) {
      const code = String(req.body.code || '').trim();

      if (!code) {
        // Step 2 starts: no session yet. The OTP is emailed right now.
        let sent = false;
        if (otpWait(user) === 0) {
          try {
            await sendLoginOtp(user, 'login');
            sent = true;
          } catch (mailErr) {
            console.error('Email error:', mailErr.message);
          }
        }
        return res.json({
          twoFactor: true,
          email: maskEmail(user.email),
          sent
        });
      }

      const r = await checkEmailOtp(user, code);

      if (!r.ok) {
        return res.status(r.status === 429 ? 429 : 401).json({
          error: r.error,
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

// EMAIL CODE AT LOGIN: sends a new login code (needs the password)
router.post('/login/email-code', dbUp, async (req, res) => {
  try {
    const user = await findWithPassword(req.body);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!user.email) {
      return res.status(400).json({
        error: 'This account has no email address.'
      });
    }

    const wait = otpWait(user);

    if (wait > 0) {
      return res.status(429).json({
        error: 'Please wait ' + wait + ' seconds before asking for a new code.'
      });
    }

    try {
      await sendLoginOtp(user, 'login');
    } catch (mailErr) {
      console.error('Email error:', mailErr.message);
      return res.status(502).json({ error: 'Could not send the email.' });
    }

    res.json({ ok: true, email: maskEmail(user.email) });

  } catch (err) {
    console.error('Email code error:', err.message);
    res.status(500).json({ error: 'Could not send the code.' });
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