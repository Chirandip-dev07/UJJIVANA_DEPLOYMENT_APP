const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be longer than 20 characters']
  },
  school: {
    type: String,
    maxlength: [100, 'School name cannot be longer than 100 characters']
  },
  rollNumber: {
    type: String,
    maxlength: [20, 'Roll number cannot be longer than 20 characters']
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  emailVerified: {
  type: Boolean,
  default: false
},
phoneVerified: {
  type: Boolean,
  default: false
},
verificationTokens: {
  email: String,
  phone: String
},
  points: {
    type: Number,
    default: 0
  },
  monthlyPoints: {
        type: Number,
        default: 0
    },
    weeklyPoints: {
        type: Number,
        default: 0
    },
    lastMonthlyReset: {
        type: Date,
        default: Date.now
    },
    lastWeeklyReset: {
        type: Date,
        default: Date.now
    },
  modulesCompleted: {
    type: Number,
    default: 0
  },
  badges: [{
    name: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      default: "Earned for completing challenges"
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be longer than 500 characters']
  },
  linkedin: {
    type: String,
    maxlength: [100, 'LinkedIn URL cannot be longer than 100 characters']
  },
  twitter: {
    type: String,
    maxlength: [100, 'Twitter URL cannot be longer than 100 characters']
  },
  facebook: {
    type: String,
    maxlength: [100, 'Facebook URL cannot be longer than 100 characters']
  },
  instagram: {
    type: String,
    maxlength: [100, 'Instagram URL cannot be longer than 100 characters']
  },
  website: {
    type: String,
    maxlength: [100, 'Website URL cannot be longer than 100 characters']
  },
  // avatar field was removed during revert of upload feature
  location: {
    type: String,
    maxlength: [100, 'Location cannot be longer than 100 characters']
  },
  interests: [{
    type: String
  }]
});

// Track quiz attempts as a Map of quizId -> score and completed surveys
// These fields are intentionally declared on the schema so Mongoose will persist them
UserSchema.add({
  quizAttempts: {
    type: Map,
    of: Number,
    default: {}
  },
  completedSurveys: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Survey'
  }],
  streak: {
    type: Number,
    default: 0
  },
  lastDailyQuestion: {
    type: Date
  },
  lastLogin: {
    type: Date
  }
  ,
  // Points history embedded per-user to remove separate PointsHistory model
  pointsHistory: [{
    points: { type: Number, required: true },
    type: { type: String, enum: ['module_completed','quiz_completed','daily_question','challenge_completed','reward_redemption','initial_migration','event_registration','survey_completed','other'], default: 'other' },
    description: { type: String },
    relatedId: { type: mongoose.Schema.ObjectId },
    challengeId: { type: mongoose.Schema.ObjectId, ref: 'Challenge' },
    earnedAt: { type: Date, default: Date.now }
  }]
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add badge to user with description
UserSchema.methods.addBadge = function(badgeName, description = '') {
  const existingBadge = this.badges.find(b => b.name === badgeName);
  if (!existingBadge) {
    this.badges.push({
      name: badgeName,
      description: description,
      earnedAt: new Date()
    });
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', UserSchema);
