// backend/models/QuizAttempt.js
const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true
  },
  answers: [{
    questionIndex: Number,
    answerIndex: Number,
    isCorrect: Boolean,
    points: Number
  }],
  percentage: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate percentage before saving
QuizAttemptSchema.pre('save', function(next) {
  if (this.score && this.totalPoints) {
    this.percentage = (this.score / this.totalPoints) * 100;
  }
  next();
});

// Index for efficient querying
QuizAttemptSchema.index({ user: 1, submittedAt: -1 });
QuizAttemptSchema.index({ user: 1, quiz: 1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);