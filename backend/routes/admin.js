const express = require('express');
const {
  getAllUsers,
  getUsersBySchool,
  getAllSchools,
  updateUser,
  deleteUser,
  getAllRewards,
  createReward,
  updateReward,
  deleteReward,
  getAllRedemptions,
  getRedemptionStats,
  toggleModuleStatus,
  toggleQuizStatus,
  deleteModuleAdmin,
  deleteQuizAdmin,
  createGeneralQuiz,
  setDailyQuiz
} = require('../controllers/adminController');

// Import challenge-related functions from adminController
const {
  getAllChallenges,
  getChallengeStats: getAdminChallengeStats,
  createChallengeAsAdmin,
  updateChallengeAsAdmin,
  deleteChallengeAsAdmin,
  bulkUpdateChallenges
} = require('../controllers/adminController');

// Import from challengeController
const { getChallengeAnalytics } = require('../controllers/challengeController');

const { protect } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(requireAdmin);

// User Management
router.get('/users', getAllUsers);
router.get('/schools', getAllSchools);
router.get('/schools/:school/users', getUsersBySchool);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Reward Management
router.get('/rewards', getAllRewards);
router.post('/rewards', createReward);
router.put('/rewards/:id', updateReward);
router.delete('/rewards/:id', deleteReward);

// Redemption Management
router.get('/redemptions', getAllRedemptions);
router.get('/redemptions/stats', getRedemptionStats);

// Content Management
router.put('/modules/:id/toggle', toggleModuleStatus);
router.put('/quizzes/:id/toggle', toggleQuizStatus);
router.delete('/modules/:id', deleteModuleAdmin);
router.delete('/quizzes/:id', deleteQuizAdmin);

// Quiz Management
router.post('/quizzes/general', createGeneralQuiz);
router.post('/quizzes/:id/daily', setDailyQuiz);

// Challenge Management Routes
router.get('/challenges', getAllChallenges);
router.get('/challenges/stats', getAdminChallengeStats);
router.post('/challenges', createChallengeAsAdmin);
router.put('/challenges/:id', updateChallengeAsAdmin);
router.delete('/challenges/:id', deleteChallengeAsAdmin);
router.post('/challenges/bulk-update', bulkUpdateChallenges);
// router.get('/challenges/:id/analytics', getChallengeAnalytics);

module.exports = router;