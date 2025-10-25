const express = require('express');
const {
  getStudentModules,
  getStudentQuizzes,
  getStudentChallenges,
  getStudentChallengeProgress
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Student-specific routes
router.get('/modules', protect, getStudentModules);
router.get('/quizzes', protect, getStudentQuizzes);
router.get('/challenges', protect, getStudentChallenges);
router.get('/challenges/progress', protect, getStudentChallengeProgress);

module.exports = router;