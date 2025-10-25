const express = require('express');
const {
  register,
  registerTeacher,
  login,
  getMe,
  updateDetails,
  updatePassword,
  resetPeriodicPoints,
  updateQuizAttempt,
    updatePoints,
  registerAdmin,
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();


// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});
// @desc Admin: Get all users
// @route GET /api/auth/admin/users
// @access Private/Admin
router.get('/admin/users', protect, requireAdmin, async (req, res, next) => {
    try {
        const users = await User.find({})
            .select('name email phone school rollNumber role points modulesCompleted streak createdAt')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
});

// @desc Admin: Update user
// @route PUT /api/auth/admin/users/:id
// @access Private/Admin
router.put('/admin/users/:id', protect, requireAdmin, async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});
// Make sure all routes are properly defined
router.post('/register', validateRegistration, register);
router.post('/register/teacher', validateRegistration, registerTeacher);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/reset-periodic-points', protect, resetPeriodicPoints);
router.post('/update-points', protect, updatePoints);
router.post('/update-quiz-attempt', protect, updateQuizAttempt);
// Uncomment and define requireAdmin/registerAdmin if you need admin registration
router.post('/register/admin', protect, requireAdmin, registerAdmin);
router.post('/send-email-otp', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/send-phone-otp', sendPhoneOTP);
router.post('/verify-phone-otp', verifyPhoneOTP);
// Avatar upload endpoint removed during revert

module.exports = router;
