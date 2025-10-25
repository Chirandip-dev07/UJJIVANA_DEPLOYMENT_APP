const express = require('express');
const {
  submitChallengeWork,
  reviewSubmission,
  getChallengeSubmissions,
  getMySubmissions
} = require('../controllers/submissionController');
const { protect } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/teacher');

const router = express.Router();

// Student routes
router.post('/challenge/:challengeId/submit', protect, submitChallengeWork);
router.get('/my-submissions', protect, getMySubmissions);

// Teacher routes
router.get('/challenge/:challengeId/submissions', protect, requireTeacher, getChallengeSubmissions);
router.put('/challenge/:challengeId/participant/:participantId/submission/:submissionId/review', 
  protect, requireTeacher, reviewSubmission);

module.exports = router;