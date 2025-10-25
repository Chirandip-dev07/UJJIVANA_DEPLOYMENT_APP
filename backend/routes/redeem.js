const express = require('express');
const {
  getRewards,
  redeemReward,
  getRedemptionHistory,
  getAllRedemptions,
  createReward,
  updateReward,
  deleteReward,
  updateRedemptionStatus
} = require('../controllers/redeemController');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Public routes
router.get('/', getRewards);

// User routes
router.post('/:rewardId', protect, redeemReward);
router.get('/history', protect, getRedemptionHistory);

// Admin routes
router.get('/admin/redemptions', protect, requireAdmin, getAllRedemptions);
router.post('/admin/rewards', protect, requireAdmin, createReward);
router.put('/admin/rewards/:id', protect, requireAdmin, updateReward);
router.delete('/admin/rewards/:id', protect, requireAdmin, deleteReward);
router.put('/admin/redemptions/:id', protect, requireAdmin, updateRedemptionStatus);

module.exports = router;