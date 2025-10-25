const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module',
    required: true
  },
  lesson: {
    type: mongoose.Schema.ObjectId
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  completedLessons: {
    type: [Number], // Array of numbers
    default: []     // Default to empty array
  },
  timeSpent: {
    type: Number,
    default: 0 // in minutes
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

UserProgressSchema.index({ user: 1, module: 1 });
UserProgressSchema.index({ user: 1, isCompleted: 1 });

module.exports = mongoose.model('UserProgress', UserProgressSchema);