// Username/password authentication, player progress and leaderboard.

const express = require('express'); //Import authentication libraries
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { mongoose, User } = require('./db');

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
  best: u.best || {}
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

// Registration route
router.post('/register', dbUp, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const avatar = Math.max(0, Math.min(5, Math.floor(Number(req.body.avatar) || 0)));

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3 to 16 letters, numbers or underscores.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password needs 8+ characters.'
      });
    }

    const usernameKey = username.toLowerCase();

    const existing = await User.findOne({ usernameKey });

    if (existing) {
      return res.status(409).json({
        error: 'That username is taken.'
      });
    }

    const explorerId = 'BMV-' + crypto.randomInt(10000, 100000);

    const user = await User.create({
      username,
      usernameKey,
      passwordHash: await bcrypt.hash(password, 10),
      explorerId,
      avatar
    });

    setSession(res, user);

    res.status(201).json({
      user: pub(user)
    });

  } catch (err) {
    console.error('Registration error:', err.message);

    if (err.code === 11000) {
      return res.status(409).json({
        error: 'That username is taken.'
      });
    }

    res.status(500).json({
      error: 'Could not create the account.'
    });
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