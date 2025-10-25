const express = require('express');
const {
  getQuizzes,
  getQuiz,
  submitQuiz,
  getDailyQuestion,
  submitDailyQuestion,
  getModuleQuizzes,
  createModuleQuiz,
  createGeneralQuiz,
  markAsDailyQuestion,
  toggleQuizStatus,
  deleteQuiz,
  completeModuleOnQuizPass,
  updateQuiz // Add this
} = require('../controllers/quizController');
const { protect } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/teacher');

const router = express.Router();

// IMPORTANT: Put specific routes before parameterized routes
router.get('/daily', getDailyQuestion);
router.post('/daily/submit', protect, submitDailyQuestion);
const { requireAdmin } = require('../middleware/admin');

// Regular routes
// Add this route with the other routes
router.put('/:id', protect, requireTeacher, updateQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.get('/module/:moduleId', protect, getModuleQuizzes);
router.post('/module/:moduleId', protect, requireTeacher, createModuleQuiz);
router.post('/', protect, requireTeacher, createGeneralQuiz);  // Add this route for general quizzes
router.post('/:id/submit', protect, submitQuiz);
router.put('/:id/toggle', protect, requireTeacher, toggleQuizStatus);
router.delete('/:id', protect, requireTeacher, deleteQuiz);
router.post('/complete-module', protect, completeModuleOnQuizPass);
router.post('/:id/daily', protect, requireAdmin, markAsDailyQuestion);

module.exports = router;