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

// Every Explorer ID must be unique.
userSchema.index({ explorerId: 1 }, { unique: true });

module.exports = {
  mongoose,
  User: mongoose.model('User', userSchema)
};