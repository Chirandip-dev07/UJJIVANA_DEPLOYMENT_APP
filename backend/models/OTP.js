const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create TTL index for automatic expiration
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate OTP
OTPSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate verification token
OTPSchema.statics.generateVerificationToken = function() {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = mongoose.model('OTP', OTPSchema);