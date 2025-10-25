const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Get approved reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get approved reviews with user info, sorted by newest first
    const reviews = await Review.find({ status: 'approved' })
      .populate('user', 'name role points badges')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Review.countDocuments({ status: 'approved' });

    res.json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest 3 approved reviews
// @route   GET /api/reviews/latest
// @access  Public
exports.getLatestReviews = async (req, res, next) => {
  try {
    // Get latest 3 approved reviews with user info
    const reviews = await Review.find({ status: 'approved' })
      .populate('user', 'name role points badges')
      .sort({ createdAt: -1 })
      .limit(3);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a new review
// @route   POST /api/reviews
// @access  Private
exports.submitReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    // Check if user has already submitted a review
    const existingReview = await Review.findOne({ 
      user: req.user.id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review'
      });
    }

    // Create new review
    const review = await Review.create({
      user: req.user.id,
      rating,
      comment
    });

    // Populate user info
    await review.populate('user', 'name role points badges');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's review
// @route   GET /api/reviews/my-review
// @access  Private
exports.getMyReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({ user: req.user.id })
      .populate('user', 'name role points badges');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'You have not submitted any review yet'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's review
// @route   PUT /api/reviews/my-review
// @access  Private
exports.updateMyReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    let review = await Review.findOne({ user: req.user.id });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update review
    review.rating = rating;
    review.comment = comment;
    review.status = 'pending'; // Reset status to pending for moderation
    review.updatedAt = Date.now();

    await review.save();

    // Populate user info
    await review.populate('user', 'name role points badges');

    res.json({
      success: true,
      message: 'Review updated successfully. It will be visible after approval.',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user's review
// @route   DELETE /api/reviews/my-review
// @access  Private
exports.deleteMyReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({ user: req.user.id });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(review._id);

    res.json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews (admin only)
// @route   GET /api/reviews/admin
// @access  Private/Admin
exports.getAllReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    // Build query
    const query = {};
    if (status) query.status = status;

    const reviews = await Review.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review status (admin only)
// @route   PUT /api/reviews/admin/:id
// @access  Private/Admin
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = status;
    review.updatedAt = Date.now();

    await review.save();

    // Populate user info
    await review.populate('user', 'name email role');

    res.json({
      success: true,
      message: `Review ${status} successfully`,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (admin only)
// @route   DELETE /api/reviews/admin/:id
// @access  Private/Admin
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Get reviews for admin moderation
// @route   GET /api/reviews/admin/pending
// @access  Private/Admin
exports.getPendingReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ status: 'pending' })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a review
// @route   PUT /api/reviews/admin/approve/:id
// @access  Private/Admin
exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = 'approved';
    review.updatedAt = Date.now();
    await review.save();

    // Populate user info
    await review.populate('user', 'name email role');

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a review
// @route   PUT /api/reviews/admin/reject/:id
// @access  Private/Admin
exports.rejectReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = 'rejected';
    review.updatedAt = Date.now();
    await review.save();

    // Populate user info
    await review.populate('user', 'name email role');

    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a review (admin only)
// @route   DELETE /api/reviews/admin/:id
// @access  Private/Admin
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};