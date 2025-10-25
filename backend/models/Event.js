const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  registrationData: {
    type: Object,
    default: {}
  },
  attended: {
    type: Boolean,
    default: false
  },
  attendanceDate: {
    type: Date
  }
  ,
  // Points awarded to this user at registration time
  pointsAwarded: {
    type: Number,
    default: 0
  }
});

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // NEW FIELD: Last date to register
  lastDateToRegister: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value <= this.date;
      },
      message: 'Last date to register must be before or equal to event date'
    }
  },
  registrationLink: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['tree-planting', 'beach-cleanup', 'workshop', 'conference', 'protest', 'fundraiser', 'other'],
    default: 'other'
  },
  organizer: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  pointsReward: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrations: [registrationSchema]
}, {
  timestamps: true
});

eventSchema.index({ date: 1, isActive: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ lastDateToRegister: 1 });

// Updated virtual for registration open status
eventSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date();
});

eventSchema.virtual('registrationOpen').get(function() {
  const now = new Date();
  const registrationClosed = this.lastDateToRegister && now > this.lastDateToRegister;
  
  return this.isActive && 
         this.date > now && 
         !registrationClosed &&
         (this.maxParticipants === 0 || this.currentParticipants < this.maxParticipants);
});

eventSchema.virtual('daysUntilRegistrationCloses').get(function() {
  if (!this.lastDateToRegister) return null;
  const now = new Date();
  const diffTime = this.lastDateToRegister - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

eventSchema.virtual('registrationStatus').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.lastDateToRegister && new Date() > this.lastDateToRegister) return 'closed';
  if (this.maxParticipants > 0 && this.currentParticipants >= this.maxParticipants) return 'full';
  if (this.registrationOpen) return 'open';
  return 'closed';
});

eventSchema.methods.addRegistration = function(userId, userName, userEmail, extraData = {}, pointsAwarded = 0) {
  if (!this.registrationOpen) {
    throw new Error('Registration is closed for this event');
  }

  const existingRegistration = this.registrations.find(reg => 
    reg.userId.toString() === userId.toString()
  );

  if (existingRegistration) {
    throw new Error('User already registered for this event');
  }

  this.registrations.push({
    userId,
    userName,
    userEmail,
    registrationData: extraData,
    pointsAwarded: pointsAwarded
  });

  this.currentParticipants += 1;
  return this.save();
};

eventSchema.methods.removeRegistration = function(userId) {
  const registrationIndex = this.registrations.findIndex(reg => 
    reg.userId.toString() === userId.toString()
  );

  if (registrationIndex === -1) {
    throw new Error('User not registered for this event');
  }

  // Store the registration before removing it (in case we need points info)
  const removedRegistration = this.registrations[registrationIndex];
  
  this.registrations.splice(registrationIndex, 1);
  this.currentParticipants = Math.max(0, this.currentParticipants - 1);

  return this.save().then(() => removedRegistration);
};

eventSchema.statics.getUpcomingEvents = function(limit = 10) {
  return this.find({
    date: { $gte: new Date() },
    isActive: true
  })
  .sort({ date: 1 })
  .limit(limit)
  .populate('createdBy', 'name email')
  .exec();
};

// NEW: Get events statistics for admin
eventSchema.statics.getEventsStatistics = async function() {
  const now = new Date();
  const totalEvents = await this.countDocuments({ isActive: true });
  const upcomingEvents = await this.countDocuments({ 
    date: { $gte: now }, 
    isActive: true 
  });
  const pastEvents = await this.countDocuments({ 
    date: { $lt: now }, 
    isActive: true 
  });
  
  const eventsWithOpenRegistration = await this.countDocuments({
    isActive: true,
    date: { $gte: now },
    lastDateToRegister: { $gte: now },
    $expr: {
      $or: [
        { $eq: ['$maxParticipants', 0] },
        { $lt: ['$currentParticipants', '$maxParticipants'] }
      ]
    }
  });

  const totalRegistrations = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$currentParticipants' } } }
  ]);

  const registrationsByCategory = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: '$currentParticipants' } } }
  ]);

  return {
    totalEvents,
    upcomingEvents,
    pastEvents,
    eventsWithOpenRegistration,
    totalRegistrations: totalRegistrations[0]?.total || 0,
    registrationsByCategory
  };
};

module.exports = mongoose.model('Event', eventSchema);