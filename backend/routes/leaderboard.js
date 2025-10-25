// backend/routes/leaderboard.js - UPDATED

const express = require('express');
const { 
  getUserLeaderboard, 
  getSchoolLeaderboard,
  getUserRank 
} = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/users', getUserLeaderboard);
router.get('/schools', getSchoolLeaderboard);
router.get('/user-rank', getUserRank);

module.exports = router;