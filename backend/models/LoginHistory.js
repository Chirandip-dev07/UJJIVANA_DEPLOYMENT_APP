// backend/models/LoginHistory.js
const mongoose = require('mongoose');

const LoginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  loginDate: {
    type: Date,
    default: Date.now
  },
  challengeId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Challenge'
  }
}, {
  timestamps: true
});

// Index for efficient streak calculations
LoginHistorySchema.index({ user: 1, loginDate: -1 });

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);