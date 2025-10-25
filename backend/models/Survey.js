const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a survey title'],
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a survey description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  organization: {
    type: String,
    required: [true, 'Please add an organization name'],
    maxlength: [100, 'Organization name cannot be more than 100 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['waste-reduction', 'energy-conservation', 'water-preservation', 'sustainable-living', 'biodiversity', 'climate-action']
  },
  points: {
    type: Number,
    required: true,
    min: [0, 'Points cannot be negative']
  },
  duration: {
    type: String,
    required: true,
    default: '10-15 minutes'
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['multiple-choice', 'checkbox', 'scale', 'text', 'number']
    },
    options: [String],
    required: {
      type: Boolean,
      default: false
    },
    min: Number,
    max: Number,
    labels: [String]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  targetAudience: {
    type: [String],
    enum: ['student', 'teacher', 'all'],
    default: ['student']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  submissions: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    responses: mongoose.Schema.Types.Mixed,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    pointsEarned: {
      type: Number,
      default: 0
    }
  }],
  totalSubmissions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
SurveySchema.index({ isActive: 1, targetAudience: 1 });
SurveySchema.index({ createdBy: 1 });

module.exports = mongoose.model('Survey', SurveySchema);