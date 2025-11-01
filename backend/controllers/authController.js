const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, school, rollNumber, emailVerificationToken, phoneVerificationToken } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify email OTP if provided
    if (emailVerificationToken) {
      const emailOTP = await OTP.findOne({ 
        email, 
        verificationToken: emailVerificationToken,
        type: 'email',
        verified: true
      });

      if (!emailOTP) {
        return res.status(400).json({
          success: false,
          message: 'Email verification required or invalid verification token'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email verification is required'
      });
    }

    // Verify phone OTP if provided
    let phoneVerified = false;
    if (phoneVerificationToken && phone) {
      const phoneOTP = await OTP.findOne({ 
        phone, 
        verificationToken: phoneVerificationToken,
        type: 'phone',
        verified: true
      });

      phoneVerified = !!phoneOTP;
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with student role
    const user = await User.create({
      name,
      email,
      password,
      phone,
      school,
      rollNumber,
      role: 'student', // Explicitly set to student
      emailVerified: true, // Mark email as verified
      phoneVerified: phoneVerified // Mark phone as verified if OTP was provided
    });

    // Clean up used OTPs
    await OTP.deleteMany({ 
      $or: [
        { email, type: 'email' },
        { phone, type: 'phone' }
      ]
    });

    // Create token
    const token = generateToken(user._id);

    const quizAttempts = user.quizAttempts instanceof Map ? Object.fromEntries(user.quizAttempts) : (user.quizAttempts || {});
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        rollNumber: user.rollNumber,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak,
        badges: user.badges,
        quizAttempts,
        completedSurveys: user.completedSurveys || [],
        lastDailyQuestion: user.lastDailyQuestion || null,
        lastLogin: user.lastLogin || null,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Default error
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    // Update streak and last login
    const today = new Date().toDateString();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toDateString() : null;
    
    if (lastLogin !== today) {
      // Check if yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastLogin === yesterday.toDateString()) {
        user.streak += 1;
      } else {
        user.streak = 1;
      }
      user.lastLogin = new Date();
      await user.save();
    }

    // Create token
    const token = generateToken(user._id);
    // Ensure quizAttempts is a plain object when returning to client
    const quizAttempts = user.quizAttempts instanceof Map ? Object.fromEntries(user.quizAttempts) : (user.quizAttempts || {});

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        rollNumber: user.rollNumber,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak,
        badges: user.badges,
        quizAttempts,
        completedSurveys: user.completedSurveys || [],
        lastDailyQuestion: user.lastDailyQuestion || null,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};
// @desc    Update quiz attempts and points
// @route   POST /api/auth/update-quiz-attempt
// @access  Private
exports.updateQuizAttempt = async (req, res, next) => {
  try {
    const { quizId, score, points, type, description } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update quizAttempts
    if (!user.quizAttempts) {
      user.quizAttempts = new Map();
    }

    let quizAttemptsMap;
    if (user.quizAttempts instanceof Map) {
      quizAttemptsMap = user.quizAttempts;
    } else {
      quizAttemptsMap = new Map(Object.entries(user.quizAttempts || {}));
    }

    quizAttemptsMap.set(quizId.toString(), score);
    user.quizAttempts = quizAttemptsMap;

    // Update points if provided
    if (points && points > 0) {
      user.points += points;
      user.monthlyPoints += points;
      user.weeklyPoints += points;

      user.pointsHistory.push({
        points: points,
        type: type,
        description: description,
        earnedAt: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      data: {
        points: user.points,
        monthlyPoints: user.monthlyPoints,
        weeklyPoints: user.weeklyPoints,
        quizAttempts: Object.fromEntries(user.quizAttempts)
      }
    });
  } catch (error) {
    console.error('Update quiz attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quiz attempt'
    });
  }
};
// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    const quizAttempts = user.quizAttempts instanceof Map ? Object.fromEntries(user.quizAttempts) : (user.quizAttempts || {});
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        rollNumber: user.rollNumber,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak,
        badges: user.badges,
        quizAttempts,
        completedSurveys: user.completedSurveys || [],
        lastDailyQuestion: user.lastDailyQuestion || null,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      school: req.body.school,
      bio: req.body.bio,
      linkedin: req.body.linkedin,
      twitter: req.body.twitter,
      facebook: req.body.facebook,
      instagram: req.body.instagram,
      website: req.body.website,
      location: req.body.location,
      interests: req.body.interests
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    const quizAttempts = user.quizAttempts instanceof Map ? Object.fromEntries(user.quizAttempts) : (user.quizAttempts || {});
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        bio: user.bio,
        linkedin: user.linkedin,
        twitter: user.twitter,
        facebook: user.facebook,
        instagram: user.instagram,
        website: user.website,
        location: user.location,
        interests: user.interests,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak,
        badges: user.badges,
        quizAttempts,
        completedSurveys: user.completedSurveys || [],
        lastDailyQuestion: user.lastDailyQuestion || null,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    // Create token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
};

// @desc    Register teacher (special endpoint for teacher registration)
// @route   POST /api/auth/register/teacher
// @access  Public
exports.registerTeacher = async (req, res, next) => {
  try {
    const { name, email, password, phone, school, emailVerificationToken, phoneVerificationToken } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify email OTP if provided
    if (emailVerificationToken) {
      const emailOTP = await OTP.findOne({ 
        email, 
        verificationToken: emailVerificationToken,
        type: 'email',
        verified: true
      });

      if (!emailOTP) {
        return res.status(400).json({
          success: false,
          message: 'Email verification required or invalid verification token'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email verification is required'
      });
    }

    // Verify phone OTP if provided
    let phoneVerified = false;
    if (phoneVerificationToken && phone) {
      const phoneOTP = await OTP.findOne({ 
        phone, 
        verificationToken: phoneVerificationToken,
        type: 'phone',
        verified: true
      });

      phoneVerified = !!phoneOTP;
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create teacher user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      school,
      role: 'teacher', // Force role to be teacher
      emailVerified: true,
      phoneVerified: phoneVerified
    });

    // Clean up used OTPs
    await OTP.deleteMany({ 
      $or: [
        { email, type: 'email' },
        { phone, type: 'phone' }
      ]
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during teacher registration'
    });
  }
};

// @desc    Register admin (special endpoint for admin registration)
// @route   POST /api/auth/register/admin
// @access  Private/Admin (you might want to protect this with a super admin check)
exports.registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone, school } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      school,
      role: 'admin' // Force role to be admin
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        role: user.role,
        points: user.points,
        modulesCompleted: user.modulesCompleted,
        streak: user.streak
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin registration'
    });
  }
};
// Reset periodic points
exports.resetPeriodicPoints = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { monthly, weekly } = req.body;

        const updateFields = {};
        
        if (monthly) {
            updateFields.monthlyPoints = 0;
            updateFields.lastMonthlyReset = new Date();
        }
        
        if (weekly) {
            updateFields.weeklyPoints = 0;
            updateFields.lastWeeklyReset = new Date();
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true }
        ).select('points monthlyPoints weeklyPoints streak modulesCompleted');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Update user points (with monthly and weekly tracking)
exports.updatePoints = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { points, type, description } = req.body;

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update all point fields
        user.points += points;
        user.monthlyPoints += points;
        user.weeklyPoints += points;

        // Add to points history
        user.pointsHistory.push({
            points: points,
            type: type,
            description: description,
            earnedAt: new Date()
        });

        await user.save();

        res.json({
            success: true,
            data: {
                points: user.points,
                monthlyPoints: user.monthlyPoints,
                weeklyPoints: user.weeklyPoints
            }
        });
    } catch (error) {
        next(error);
    }
};
const OTP = require('../models/OTP');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure email transporter with better settings
let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
    // Add retry logic
    retries: 3,
    retryDelay: 1000
  });

  // Verify transporter configuration with better error handling
  transporter.verify(function(error, success) {
    if (error) {
      console.error('Email transporter configuration error:', error);
    } else {
      console.log('Email transporter is ready to send messages');
    }
  });
} else {
  console.warn('Email credentials not configured. OTPs will be logged to console only.');
}

// @desc    Send OTP to email - Improved version
// @route   POST /api/auth/send-email-otp
// @access  Public
exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate OTP and verification token
    const otp = OTP.generateOTP();
    const verificationToken = OTP.generateVerificationToken();
    
    // Set expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email, type: 'email' });

    // Create new OTP
    await OTP.create({
      email,
      otp,
      type: 'email',
      expiresAt,
      verificationToken
    });

    // Try to send email, but don't fail if email service is down
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Ujjivana" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Ujjivana - Email Verification OTP',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
              <div style="text-align: center; background: linear-gradient(45deg, #2ecc71, #27ae60); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Ujjivana</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Email Verification</p>
              </div>
              <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #2ecc71; text-align: center;">Your Verification Code</h2>
                <p>Hello,</p>
                <p>Use the following OTP to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: #f1f1f1; padding: 15px 30px; border-radius: 8px; border: 2px dashed #2ecc71;">
                    <span style="font-size: 32px; font-weight: bold; color: #2ecc71; letter-spacing: 5px;">${otp}</span>
                  </div>
                </div>
                <p>This OTP will expire in <strong>10 minutes</strong>.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                  Ujjivana - Gamifying environmental education for a sustainable future
                </p>
              </div>
            </div>
          `
        });
        console.log(`OTP email sent to: ${email}`);
      } catch (emailError) {
        console.error('Email sending failed, but OTP is still generated:', emailError);
        // Don't throw error - just log it
      }
    } else {
      console.warn('Email transporter not configured');
    }

    // Always return success and log OTP for development
    console.log(`OTP for ${email}: ${otp}`);
    
    res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      // Include OTP in development for testing
      debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });

  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OTP'
    });
  }
};

// @desc    Verify email OTP
// @route   POST /api/auth/verify-email-otp
// @access  Public
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find the OTP record
    const otpRecord = await OTP.findOne({ 
      email, 
      otp, 
      type: 'email',
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP not found'
      });
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      verificationToken: otpRecord.verificationToken
    });

  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

// @desc    Send OTP to phone
// @route   POST /api/auth/send-phone-otp
// @access  Public
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Generate OTP and verification token
    const otp = OTP.generateOTP();
    const verificationToken = OTP.generateVerificationToken();
    
    // Set expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone, type: 'phone' });

    // Create new OTP
    await OTP.create({
      phone,
      otp,
      type: 'phone',
      expiresAt,
      verificationToken
    });

    // In production, integrate with SMS service like Twilio
    console.log(`OTP for ${phone}: ${otp}`); // Remove this in production

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      // Remove this in production - only for development
      debug: { otp }
    });

  } catch (error) {
    console.error('Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// @desc    Verify phone OTP
// @route   POST /api/auth/verify-phone-otp
// @access  Public
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Find the OTP record
    const otpRecord = await OTP.findOne({ 
      phone, 
      otp, 
      type: 'phone',
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP not found'
      });
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      verificationToken: otpRecord.verificationToken
    });

  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};
