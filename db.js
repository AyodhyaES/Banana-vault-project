// MongoDB connection and Player model
const mongoose = require('mongoose');

const uri =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/banana_vault';

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err.message));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 16
  },

  usernameKey: {
    type: String,
    required: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  explorerId: {
    type: String,
    required: true
  },

  avatar: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Email code (OTP) needed at every login
  emailOtpHash: { type: String, default: '' },         // the code is saved scrambled
  emailOtpExpires: { type: Number, default: 0 },
  emailOtpTries: { type: Number, default: 0 },
  emailOtpSentAt: { type: Number, default: 0 },

  // Email verification (accounts made before this feature count as verified)
  email: { type: String, trim: true, maxlength: 254 },
  emailKey: { type: String },                          // lower-case copy for lookups
  emailVerified: { type: Boolean, default: true },
  emailCodeHash: { type: String, default: '' },        // the code is saved scrambled
  emailCodeExpires: { type: Number, default: 0 },
  emailCodeTries: { type: Number, default: 0 },
  emailCodeSentAt: { type: Number, default: 0 },

  coins: { type: Number, default: 20 },
  lives: { type: Number, default: 3 },
  score: { type: Number, default: 0 },
  hints: { type: Number, default: 1 },

  keys: { type: [String], default: [] },
  unlocked: { type: Number, default: 1 },
  done: { type: [Number], default: [] },

  best: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, { timestamps: true });

// Unique username, ignoring uppercase/lowercase differences.
// Partial index allows older records without usernameKey to remain.
userSchema.index(
  { usernameKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      usernameKey: { $type: 'string' }
    }
  }
);

// Unique email address, ignoring uppercase/lowercase differences.
userSchema.index(
  { emailKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      emailKey: { $type: 'string' }
    }
  }
);

// Sign-ups that are never verified are deleted automatically after 24 hours.
userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60,
    partialFilterExpression: { emailVerified: false }
  }
);

// Every Explorer ID must be unique.
userSchema.index({ explorerId: 1 }, { unique: true });

module.exports = {
  mongoose,
  User: mongoose.model('User', userSchema)
};