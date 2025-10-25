const express = require('express');
const { 
    getStudentsBySchool, 
    getTeacherStats, 
    getSchoolLeaderboard,
    getRecentActivity  // Add this import
} = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/teacher');

const router = express.Router();

// Teacher dashboard routes
router.get('/students', protect, requireTeacher, getStudentsBySchool);
router.get('/stats', protect, requireTeacher, getTeacherStats);
router.get('/leaderboard', protect, requireTeacher, getSchoolLeaderboard);
router.get('/recent-activity', protect, requireTeacher, getRecentActivity);  // Add this route

module.exports = router;