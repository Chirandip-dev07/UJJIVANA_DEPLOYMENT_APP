const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a challenge title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a challenge description']
  },
  pointsReward: {
    type: Number,
    required: true,
    default: 100,
    min: [1, 'Points reward must be at least 1']
  },
  category: {
    type: String,
    required: true,
    enum: ['waste-reduction', 'energy-conservation', 'water-preservation', 'biodiversity', 'sustainable-living'],
    default: 'custom'
  },
  duration: {
    type: Number,
    required: true,
    default: 7,
    min: [1, 'Duration must be at least 1 day']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  school: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  completionCriteria: {
    type: {
    type: String,
    required: true,
    enum: ['custom'], // Only custom remains
    default: 'custom'
  },
    target: {
      type: Number,
      required: true,
      default: 10,
      min: [1, 'Target must be at least 1']
    },
    // For custom criteria with submission requirement
    requiresSubmission: {
      type: Boolean,
      default: false
    },
    submissionType: {
      type: String,
      enum: ['text', 'image', 'file', 'any'],
      default: 'any'
    },
    submissionInstructions: {
      type: String,
      maxlength: [500, 'Instructions cannot be more than 500 characters']
    },
    // For other custom criteria
    moduleId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Module'
    },
    quizId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Quiz'
    }
  },
  participants: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    // For custom challenges with submission requirement
    submissions: [{
      submission: String,
      description: String,
      submittedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      reviewedAt: Date,
      feedback: String,
      pointsAwarded: {
        type: Number,
        default: 0
      }
    }],
    approvedSubmissions: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ChallengeSchema.pre('save', function(next) {
  if (this.isModified('duration') || this.isNew) {
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.duration);
    this.endDate = endDate;
  }
  next();
});
// Add this to the ChallengeSchema
ChallengeSchema.pre('save', function(next) {
  // Set requiresSubmission based on completion type
  if (this.completionCriteria.type === 'custom') {
    this.completionCriteria.requiresSubmission = true;
    this.completionCriteria.submissionType = this.completionCriteria.submissionType || 'any';
  } else {
    this.completionCriteria.requiresSubmission = false;
  }
  
  // Calculate end date based on duration
  if (this.isModified('duration') || this.isNew) {
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + this.duration);
    this.endDate = endDate;
  }
  
  next();
});

// Add method to check if challenge is active
ChallengeSchema.methods.isActiveChallenge = function() {
  const now = new Date();
  return this.isActive && 
         (!this.startDate || this.startDate <= now) && 
         (!this.endDate || this.endDate >= now);
};

module.exports = mongoose.model('Challenge', ChallengeSchema);