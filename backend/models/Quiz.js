const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: Number, // index of the correct option
    required: true
  },
  points: {
    type: Number,
    default: 10
  }
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a quiz title']
  },
  description: {
    type: String
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module'
  },
  school: {
        type: String,
        required: true
    },
  questions: [QuestionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // in minutes
    default: 10
  },
  isDailyQuestion: {
    type: Boolean,
    default: false
  },
  dailyDate: {
    type: String // YYYY-MM-DD format for daily questions
  },
  requiresModuleCompletion: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total points before saving
QuizSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  next();
});

module.exports = mongoose.model('Quiz', QuizSchema);
