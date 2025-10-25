// backend/models/PointsHistory.js
const mongoose = require('mongoose');

const PointsHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'module_completed', 
      'quiz_completed', 
      'daily_question', 
      'challenge_completed', 
      'reward_redemption',
      'initial_migration',
      'other'
    ],
    default: 'other'
  },
  description: {
    type: String,
    required: true
  },
  relatedId: {
    type: mongoose.Schema.ObjectId
  },
  challengeId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Challenge'
  },
  earnedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying by user and date
PointsHistorySchema.index({ user: 1, earnedAt: -1 });
PointsHistorySchema.index({ user: 1, type: 1, earnedAt: -1 });

module.exports = mongoose.model('PointsHistory', PointsHistorySchema);