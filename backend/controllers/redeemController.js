const Reward = require('../models/Reward');
const User = require('../models/User');
const Redemption = require('../models/Redemption');

// @desc    Get all rewards
// @route   GET /api/redeem
// @access  Public
exports.getRewards = async (req, res, next) => {
  try {
    const rewards = await Reward.find({ isActive: true });

    res.json({
      success: true,
      count: rewards.length,
      data: rewards
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Redeem a reward
// @route   POST /api/redeem/:rewardId
// @access  Private
exports.redeemReward = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.rewardId);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }

    const user = await User.findById(req.user.id);

    if (user.points < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        message: 'Not enough points to redeem this reward'
      });
    }

    // Check if reward is in stock
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This reward is out of stock'
      });
    }

    // Deduct points from user
    user.points -= reward.pointsRequired;
    await user.save();

    // Decrease stock if applicable
    if (reward.stock !== null) {
      reward.stock -= 1;
      await reward.save();
    }

    // Create redemption record
    const redemption = await Redemption.create({
      user: req.user.id,
      reward: req.params.rewardId,
      pointsSpent: reward.pointsRequired
    });

    res.json({
      success: true,
      message: `Successfully redeemed ${reward.name}`,
      data: {
        reward: reward.name,
        pointsSpent: reward.pointsRequired,
        remainingPoints: user.points,
        redemptionId: redemption._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get redemption history for current user
// @route   GET /api/redeem/history
// @access  Private
exports.getRedemptionHistory = async (req, res, next) => {
  try {
    const redemptions = await Redemption.find({ user: req.user.id })
      .populate('reward', 'name description pointsRequired category image')
      .sort({ redeemedAt: -1 });

    res.json({
      success: true,
      count: redemptions.length,
      data: redemptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all redemptions
// @route   GET /api/redeem/admin/redemptions
// @access  Private/Admin
exports.getAllRedemptions = async (req, res, next) => {
  try {
    const redemptions = await Redemption.find()
      .populate('user', 'name email')
      .populate('reward', 'name description pointsRequired category')
      .sort({ redeemedAt: -1 });

    res.json({
      success: true,
      count: redemptions.length,
      data: redemptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Create a new reward
// @route   POST /api/redeem/admin/rewards
// @access  Private/Admin
exports.createReward = async (req, res, next) => {
  try {
    // Add createdBy field
    req.body.createdBy = req.user.id;
    
    const reward = await Reward.create(req.body);

    res.status(201).json({
      success: true,
      data: reward
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Update a reward
// @route   PUT /api/redeem/admin/rewards/:id
// @access  Private/Admin
exports.updateReward = async (req, res, next) => {
  try {
    // Add updatedBy and updatedAt fields
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();
    
    let reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }

    reward = await Reward.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: reward
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Delete a reward
// @route   DELETE /api/redeem/admin/rewards/:id
// @access  Private/Admin
exports.deleteReward = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }

    await Reward.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Reward deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Update redemption status
// @route   PUT /api/redeem/admin/redemptions/:id
// @access  Private/Admin
exports.updateRedemptionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    let redemption = await Redemption.findById(req.params.id);

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: 'Redemption not found'
      });
    }

    // If status is being changed to completed, set completedAt
    if (status === 'completed' && redemption.status !== 'completed') {
      req.body.completedAt = Date.now();
    }

    redemption = await Redemption.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    ).populate('user', 'name email').populate('reward', 'name');

    res.json({
      success: true,
      data: redemption,
      message: 'Redemption status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};