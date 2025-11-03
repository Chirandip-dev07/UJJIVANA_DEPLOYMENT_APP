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
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');


if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid email service configured');
}
// Configure Twilio Verify API
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('Twilio Verify API configured');
} else {
  console.warn('Twilio credentials not configured. Phone OTPs will be logged to console only.');
}

// @desc    Send OTP to email using SendGrid
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

    console.log(`📧 Attempting to send OTP to: ${email}`);

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

    // Send email using SendGrid
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      try {
        console.log(`🔧 SendGrid Configuration:`);
        console.log(`   - API Key: ${process.env.SENDGRID_API_KEY ? 'Present' : 'Missing'}`);
        console.log(`   - From Email: ${process.env.SENDGRID_FROM_EMAIL}`);
        
        const msg = {
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'Ujjivana'
          },
          subject: 'Verify Your Email - Ujjivana',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background: white;">
                    <!-- Header -->
                    <div style="background: linear-gradient(45deg, #2ecc71, #27ae60); padding: 30px 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Ujjivana</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">Environmental Education Platform</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #2ecc71; text-align: center; margin-bottom: 30px;">Email Verification Required</h2>
                        
                        <p style="font-size: 16px;">Hello,</p>
                        
                        <p style="font-size: 16px;">You're just one step away from joining Ujjivana! Use the verification code below to complete your registration:</p>
                        
                        <!-- OTP Box -->
                        <div style="text-align: center; margin: 40px 0;">
                            <div style="display: inline-block; background: #f8f9fa; padding: 20px 40px; border-radius: 10px; border: 2px solid #e9ecef;">
                                <div style="font-size: 36px; font-weight: bold; color: #2ecc71; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
                            </div>
                        </div>
                        
                        <p style="font-size: 16px; color: #666;">
                            <strong>Important:</strong> This code will expire in 10 minutes. 
                            If you didn't request this verification, please ignore this email.
                        </p>
                        
                        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                            <p style="font-size: 14px; color: #999; text-align: center;">
                                Ujjivana - Gamifying environmental education for a sustainable future<br>
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
          `,
          text: `Your Ujjivana verification code is: ${otp}. This code will expire in 10 minutes.`,
          mail_settings: {
            sandbox_mode: {
              enable: false // Make sure this is false
            }
          }
        };

        console.log(`📤 Sending email via SendGrid to: ${email}`);
        
        await sgMail.send(msg);
        console.log(`✅ Email sent successfully to: ${email}`);

        res.status(200).json({
          success: true,
          message: 'OTP sent successfully to your email'
        });

      } catch (emailError) {
        console.error('❌ SendGrid error:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response ? emailError.response.body : 'No response body'
        });
        
        // Even if email fails, OTP is still generated
        console.log(`OTP for ${email}: ${otp}`);
        
        res.status(200).json({
          success: true,
          message: 'OTP generated successfully (email service temporarily unavailable)',
          debug: { otp }
        });
      }
    } else {
      // SendGrid not configured
      console.log(`OTP for ${email}: ${otp} (SendGrid not configured)`);
      
      res.status(200).json({
        success: true,
        message: 'OTP generated successfully',
        debug: { otp }
      });
    }

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
// @desc    Send OTP to phone using Twilio Verify API
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

    // Clean phone number
    const cleanPhone = phone.replace(/\s+/g, '');

    // Basic phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number with country code (e.g., +1234567890)'
      });
    }

    // Generate verification token (we'll use this, but NOT an OTP)
    const verificationToken = OTP.generateVerificationToken();
    
    // Set expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone: cleanPhone, type: 'phone' });

    // Send SMS using Twilio Verify API
    if (twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const verification = await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications
          .create({
            to: cleanPhone,
            channel: 'sms',
            locale: 'en'
          });

        console.log(`✅ Twilio Verify API: SMS sent to ${cleanPhone}, SID: ${verification.sid}`);
        
        // Create OTP record with a placeholder - we don't know the actual OTP
        // Twilio handles the OTP generation and verification
        await OTP.create({
          phone: cleanPhone,
          otp: 'twilio_handle', // Placeholder since Twilio generates the actual OTP
          type: 'phone',
          expiresAt,
          verificationToken
        });

        res.status(200).json({
          success: true,
          message: 'Verification code sent via SMS'
        });

      } catch (verifyError) {
        console.error('❌ Twilio Verify API failed:', verifyError.message);
        
        // FALLBACK: If Twilio fails, use our own OTP system
        const otp = OTP.generateOTP();
        
        // Create OTP record with actual OTP for fallback
        await OTP.create({
          phone: cleanPhone,
          otp, // Real OTP for fallback
          type: 'phone',
          expiresAt,
          verificationToken
        });

        console.log(`📞 Fallback OTP for ${cleanPhone}: ${otp}`);
        
        res.status(200).json({
          success: true,
          message: 'OTP generated successfully (SMS service temporarily unavailable)',
          debug: { otp }
        });
      }
    } else {
      // Twilio not configured - use our own OTP system
      const otp = OTP.generateOTP();
      
      await OTP.create({
        phone: cleanPhone,
        otp, // Real OTP
        type: 'phone',
        expiresAt,
        verificationToken
      });

      console.log(`OTP for ${cleanPhone}: ${otp} (Twilio not configured)`);
      
      res.status(200).json({
        success: true,
        message: 'OTP generated successfully',
        debug: { otp }
      });
    }

  } catch (error) {
    console.error('Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};
// @desc    Verify phone OTP using Twilio Verify API
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

    // Clean phone number
    const cleanPhone = phone.replace(/\s+/g, '');

    // First try Twilio Verify API if configured
    if (twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const verificationCheck = await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks
          .create({
            to: cleanPhone,
            code: otp
          });

        console.log(`Twilio Verify API: Verification status for ${cleanPhone}: ${verificationCheck.status}`);

        if (verificationCheck.status === 'approved') {
          // Find and update the existing OTP record instead of creating a new one
          const otpRecord = await OTP.findOne({ 
            phone: cleanPhone, 
            type: 'phone',
            verified: false
          });

          if (otpRecord) {
            // Update the existing record
            otpRecord.verified = true;
            await otpRecord.save();

            console.log(`✅ Phone verification successful for ${cleanPhone}`);
            
            return res.status(200).json({
              success: true,
              message: 'Phone number verified successfully',
              verificationToken: otpRecord.verificationToken
            });
          } else {
            // If no existing OTP record found, create one with proper fields
            const verificationToken = OTP.generateVerificationToken();
            const newOtpRecord = await OTP.create({
              phone: cleanPhone,
              otp: 'twilio_verified', // Mark as verified by Twilio
              type: 'phone',
              verified: true,
              verificationToken: verificationToken,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            });

            console.log(`✅ Created new verified OTP record for ${cleanPhone}`);
            
            return res.status(200).json({
              success: true,
              message: 'Phone number verified successfully',
              verificationToken: verificationToken
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid OTP or OTP expired'
          });
        }

      } catch (verifyError) {
        console.error('Twilio Verify API check error:', verifyError);
        // Fall through to our own OTP verification
      }
    }

    // Fallback: Use our own OTP verification (for when Twilio is not configured)
    const otpRecord = await OTP.findOne({ 
      phone: cleanPhone, 
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
