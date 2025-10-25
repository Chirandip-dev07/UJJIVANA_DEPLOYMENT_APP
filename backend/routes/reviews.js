const express = require('express');
const {
  getReviews,
  getLatestReviews,
  submitReview,
  getMyReview,
  updateMyReview,
  deleteMyReview,
  getPendingReviews,
  getAllReviews,
  approveReview,
  rejectReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Public routes
router.get('/', getReviews);
router.get('/latest', getLatestReviews);

// User routes (protected)
router.post('/', protect, submitReview);
router.get('/my-review', protect, getMyReview);
router.put('/my-review', protect, updateMyReview);
router.delete('/my-review', protect, deleteMyReview);

// Admin routes
// Admin: list/filter all reviews (supports ?status=approved|rejected|pending)
router.get('/admin', protect, requireAdmin, getAllReviews);

router.get('/admin/pending', protect, requireAdmin, getPendingReviews);
router.put('/admin/approve/:id', protect, requireAdmin, approveReview);
router.put('/admin/reject/:id', protect, requireAdmin, rejectReview);
router.delete('/admin/:id', protect, requireAdmin, deleteReview);

module.exports = router;