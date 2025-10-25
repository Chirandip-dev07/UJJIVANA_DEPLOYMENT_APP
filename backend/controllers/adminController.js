const User = require('../models/User');
const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const UserProgress = require('../models/UserProgress');

// @desc Get all users (admin only)
// @route GET /api/admin/users
// @access Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({})
            .select('name email phone school rollNumber role points modulesCompleted streak createdAt')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get users by school
// @route GET /api/admin/schools/:school/users
// @access Private/Admin
exports.getUsersBySchool = async (req, res, next) => {
    try {
        const { school } = req.params;
        
        // URL decode the school name in case it has spaces or special characters
        const decodedSchool = decodeURIComponent(school);
        
        const users = await User.find({ 
            school: { $regex: new RegExp(decodedSchool, 'i') } 
        })
        .select('name email phone school rollNumber role points modulesCompleted streak createdAt quizAttempts')
        .sort({ role: -1, name: 1 }); // Teachers first, then students

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get all schools
// @route GET /api/admin/schools
// @access Private/Admin
exports.getAllSchools = async (req, res, next) => {
    try {
        const schools = await User.aggregate([
            { 
                $match: { 
                    school: { $exists: true, $ne: '' } 
                } 
            },
            {
                $group: {
                    _id: '$school',
                    teacherCount: {
                        $sum: { $cond: [{ $eq: ['$role', 'teacher'] }, 1, 0] }
                    },
                    studentCount: {
                        $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] }
                    },
                    totalPoints: { $sum: '$points' },
                    userCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            count: schools.length,
            data: schools
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update user (admin only)
// @route PUT /api/admin/users/:id
// @access Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, phone, school, rollNumber, role } = req.body;

        // Check if email already exists for other users
        if (email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: req.params.id } 
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists for another user'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                name, 
                email, 
                phone, 
                school, 
                rollNumber, 
                role,
                updatedAt: Date.now()
            },
            {
                new: true,
                runValidators: true
            }
        ).select('name email phone school rollNumber role points modulesCompleted streak createdAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete user (admin only)
// @route DELETE /api/admin/users/:id
// @access Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            data: {},
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Reward Management Functions

// @desc Get all rewards with filtering
// @route GET /api/admin/rewards
// @access Private/Admin
exports.getAllRewards = async (req, res, next) => {
    try {
        const { type, category, isActive } = req.query;
        let query = {};

        if (type) query.type = type;
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const rewards = await Reward.find(query)
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: rewards.length,
            data: rewards
        });
    } catch (error) {
        next(error);
    }
};

// @desc Create a new reward
// @route POST /api/admin/rewards
// @access Private/Admin
exports.createReward = async (req, res, next) => {
    try {
        req.body.createdBy = req.user.id;
        
        const reward = await Reward.create(req.body);
        await reward.populate('createdBy', 'name');

        res.status(201).json({
            success: true,
            data: reward,
            message: 'Reward created successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc Update a reward
// @route PUT /api/admin/rewards/:id
// @access Private/Admin
exports.updateReward = async (req, res, next) => {
    try {
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
        }).populate('createdBy', 'name').populate('updatedBy', 'name');

        res.json({
            success: true,
            data: reward,
            message: 'Reward updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete a reward
// @route DELETE /api/admin/rewards/:id
// @access Private/Admin
exports.deleteReward = async (req, res, next) => {
    try {
        const reward = await Reward.findById(req.params.id);

        if (!reward) {
            return res.status(404).json({
                success: false,
                message: 'Reward not found'
            });
        }

        // Check if there are any redemptions for this reward
        const redemptionsCount = await Redemption.countDocuments({ reward: req.params.id });

        if (redemptionsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete reward with existing redemptions'
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

// @desc Get all redemptions with filters
// @route GET /api/admin/redemptions
// @access Private/Admin
exports.getAllRedemptions = async (req, res, next) => {
    try {
        const { status, rewardType, page = 1, limit = 20 } = req.query;
        let query = {};

        if (status) query.status = status;

        const skip = (page - 1) * limit;

        let redemptionsQuery = Redemption.find(query)
            .populate('user', 'name email school')
            .populate('reward')
            .sort({ redeemedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // If rewardType filter is provided, we need to filter after populating
        let redemptions = await redemptionsQuery;
        
        if (rewardType) {
            redemptions = redemptions.filter(redemption => 
                redemption.reward && redemption.reward.type === rewardType
            );
        }

        const total = await Redemption.countDocuments(query);

        res.json({
            success: true,
            count: redemptions.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: redemptions
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get admin rewards statistics
// @route GET /api/admin/redemptions/stats
// @access Private/Admin
exports.getRedemptionStats = async (req, res, next) => {
    try {
        // Reward statistics
        const totalActiveRewards = await Reward.countDocuments({ isActive: true });
        const totalInactiveRewards = await Reward.countDocuments({ isActive: false });
        const totalRewards = totalActiveRewards + totalInactiveRewards;

        // Redemption statistics
        const totalRedemptions = await Redemption.countDocuments();
        const pendingRedemptions = await Redemption.countDocuments({ status: 'pending' });
        const completedRedemptions = await Redemption.countDocuments({ status: 'completed' });
        
        const totalPointsSpent = await Redemption.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$pointsSpent' } } }
        ]);

        // Breakdown by reward type
        const productRewards = await Reward.countDocuments({ type: 'product', isActive: true });
        const couponRewards = await Reward.countDocuments({ type: 'coupon', isActive: true });

        const popularRewards = await Redemption.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$reward',
                    count: { $sum: 1 },
                    totalPoints: { $sum: '$pointsSpent' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'rewards',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'reward'
                }
            },
            { $unwind: '$reward' }
        ]);

        res.json({
            success: true,
            data: {
                // New reward statistics
                totalActiveRewards,
                totalInactiveRewards,
                totalRewards,
                productRewards,
                couponRewards,
                
                // Redemption statistics (keeping for reference)
                totalRedemptions,
                pendingRedemptions,
                completedRedemptions,
                totalPointsSpent: totalPointsSpent[0]?.total || 0,
                popularRewards
            }
        });
    } catch (error) {
        next(error);
    }
};
// Admin module and quiz management
exports.toggleModuleStatus = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Admin can toggle any module regardless of school
    module.isActive = !module.isActive;
    await module.save();

    res.json({
      success: true,
      data: module,
      message: `Module ${module.isActive ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleQuizStatus = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Admin can toggle any quiz regardless of school
    quiz.isActive = !quiz.isActive;
    await quiz.save();

    res.json({
      success: true,
      data: quiz,
      message: `Quiz ${quiz.isActive ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteModuleAdmin = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Delete associated progress records
    await UserProgress.deleteMany({ module: req.params.id });
    await Module.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Module deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuizAdmin = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    await Quiz.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.createGeneralQuiz = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      school: 'admin', // Set a default school for admin-created quizzes
      requiresModuleCompletion: false,
      isDailyQuestion: req.body.isDailyQuestion || false
    };

    const quiz = await Quiz.create(quizData);
    
    res.status(201).json({
      success: true,
      data: quiz,
      message: 'General quiz created successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.setDailyQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Reset previous daily questions
    await Quiz.updateMany(
      { isDailyQuestion: true },
      { isDailyQuestion: false }
    );

    // Set this quiz as daily question
    quiz.isDailyQuestion = true;
    quiz.dailyDate = new Date().toISOString().split('T')[0];
    await quiz.save();

    res.json({
      success: true,
      data: quiz,
      message: 'Daily quiz set successfully'
    });
  } catch (error) {
    next(error);
  }
};
// Challenge Management for Admin
exports.getAllChallenges = async (req, res, next) => {
  try {
    const { school, isActive, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Filter by school if provided
    if (school && school !== 'all') {
      query.school = school;
    }
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const skip = (page - 1) * limit;
    
    const challenges = await Challenge.find(query)
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email school')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Challenge.countDocuments(query);
    
    // Calculate statistics
    const totalChallenges = await Challenge.countDocuments();
    const activeChallenges = await Challenge.countDocuments({ isActive: true });
    const totalParticipants = await Challenge.aggregate([
      { $unwind: '$participants' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      count: challenges.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      stats: {
        totalChallenges,
        activeChallenges,
        totalParticipants: totalParticipants[0]?.count || 0
      },
      data: challenges
    });
  } catch (error) {
    next(error);
  }
};

exports.getChallengeStats = async (req, res, next) => {
  try {
    // Overall challenge statistics
    const totalChallenges = await Challenge.countDocuments();
    const activeChallenges = await Challenge.countDocuments({ isActive: true });
    
    // Challenges by category
    const challengesByCategory = await Challenge.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Challenges by completion type
    const challengesByType = await Challenge.aggregate([
      {
        $group: {
          _id: '$completionCriteria.type',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Participation statistics
    const participationStats = await Challenge.aggregate([
      {
        $project: {
          participantCount: { $size: '$participants' },
          completedCount: {
            $size: {
              $filter: {
                input: '$participants',
                as: 'participant',
                cond: { $eq: ['$$participant.completed', true] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: '$participantCount' },
          totalCompleted: { $sum: '$completedCount' },
          avgParticipationRate: { $avg: '$participantCount' },
          avgCompletionRate: {
            $avg: {
              $cond: [
                { $eq: ['$participantCount', 0] },
                0,
                { $divide: ['$completedCount', '$participantCount'] }
              ]
            }
          }
        }
      }
    ]);
    
    // Recent challenges (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentChallenges = await Challenge.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        totalChallenges,
        activeChallenges,
        inactiveChallenges: totalChallenges - activeChallenges,
        challengesByCategory,
        challengesByType,
        participationStats: participationStats[0] || {
          totalParticipants: 0,
          totalCompleted: 0,
          avgParticipationRate: 0,
          avgCompletionRate: 0
        },
        recentChallenges
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createChallengeAsAdmin = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      pointsReward,
      duration,
      completionCriteria,
      isActive = true,
      school = 'admin',
      startDate
    } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }
    
    const challengeData = {
      title,
      description,
      category: category || 'sustainable-living',
      pointsReward: pointsReward || 100,
      duration: duration || 7,
      completionCriteria: completionCriteria || {
        type: 'custom',
        target: 10,
        requiresSubmission: false
      },
      isActive,
      school,
      createdBy: req.user.id,
      startDate: startDate ? new Date(startDate) : new Date()
    };
    
    // Calculate end date based on duration
    if (duration) {
      const endDate = new Date(challengeData.startDate);
      endDate.setDate(endDate.getDate() + duration);
      challengeData.endDate = endDate;
    }
    
    const challenge = await Challenge.create(challengeData);
    await challenge.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      data: challenge,
      message: 'Challenge created successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateChallengeAsAdmin = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Update challenge data
    const updatedChallenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email')
     .populate('participants.user', 'name email school');
    
    res.json({
      success: true,
      data: updatedChallenge,
      message: 'Challenge updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteChallengeAsAdmin = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Check if there are participants
    if (challenge.participants && challenge.participants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete challenge with active participants. Deactivate it instead.'
      });
    }
    
    await Challenge.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      data: {},
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateChallenges = async (req, res, next) => {
  try {
    const { action, challengeIds, data } = req.body;
    
    if (!action || !challengeIds || !Array.isArray(challengeIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action, challengeIds array, and data are required'
      });
    }
    
    let updateQuery = {};
    let message = '';
    
    switch (action) {
      case 'activate':
        updateQuery = { isActive: true };
        message = 'Challenges activated successfully';
        break;
      case 'deactivate':
        updateQuery = { isActive: false };
        message = 'Challenges deactivated successfully';
        break;
      case 'update':
        updateQuery = data;
        message = 'Challenges updated successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }
    
    const result = await Challenge.updateMany(
      { _id: { $in: challengeIds } },
      updateQuery
    );
    
    res.json({
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      },
      message
    });
  } catch (error) {
    next(error);
  }
};