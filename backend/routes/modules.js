const express = require('express');
const {
  getModules,
  getModule,
  getModuleProgress,
  updateLessonProgress,
  completeModule,
  getCompletedModulesForUser,
  getTeacherModules,
  createModule,
  updateModule,
  deleteModule,
  toggleModuleStatus,
  // Add the new functions
  getStudentModules,
  checkModuleCompletion,
  validateModuleCompletion
} = require('../controllers/moduleController');
const { protect } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/teacher');

const router = express.Router();

// Existing routes
router.get('/', getModules);
router.get('/completed', protect, getCompletedModulesForUser);
router.get('/:id', getModule);
router.get('/:id/progress', protect, getModuleProgress);
router.put('/:id/progress', protect, updateLessonProgress);
router.put('/:id/complete', protect, completeModule);

// Teacher routes
router.get('/teacher/list', protect, requireTeacher, getTeacherModules);
router.post('/', protect, requireTeacher, createModule);
router.put('/:id', protect, requireTeacher, updateModule);
router.delete('/:id', protect, requireTeacher, deleteModule);
router.put('/:id/toggle', protect, requireTeacher, toggleModuleStatus);

// New student-specific routes
router.get('/student/all', protect, getStudentModules);
router.get('/:id/can-complete', protect, validateModuleCompletion);
// Add this route with the others
router.get('/:id/completion-status', protect, checkModuleCompletion);

module.exports = router;