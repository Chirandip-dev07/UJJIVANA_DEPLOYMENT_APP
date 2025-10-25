const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { updateUserPoints } = require('../utils/pointsUtils');

// @desc    Get all challenges
// @route   GET /api/challenges
// @access  Public
// Update getChallenges to filter by school for students
exports.getChallenges = async (req, res, next) => {
  try {
    let query = {};
    
    // Only show custom-type challenges (we've removed other types)
    query['completionCriteria.type'] = 'custom';

    // Admin can see all custom challenges
    if (req.user && req.user.role === 'admin' && req.user.school === 'ADMIN') {
      // No school filter for admin - show all custom challenges
    }
    // For regular users, filter by school
    else if (req.user && req.user.school) {
      query.school = req.user.school;
    } else {
      // No user or no school - return active challenges only
      query.isActive = true;
    }
    
    const challenges = await Challenge.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: challenges.length,
      data: challenges
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's challenge progress
// @route   GET /api/challenges/user-progress
// @access  Private
exports.getUserChallengeProgress = async (req, res, next) => {
  try {
    const query = { isActive: true };
        if (req.user && req.user.school) {
            query.school = req.user.school;
        }

        const challenges = await Challenge.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

    const user = await User.findById(req.user.id);
    
    const challengesWithProgress = await Promise.all(
      challenges.map(async (challenge) => {
        const participant = challenge.participants.find(
          p => p.user.toString() === req.user.id
        );
        
        // Only 'custom' completion is supported now. Compute progress from submissions
        let progress = 0;
        let canComplete = false;

        // If this custom challenge requires submission, count approved submissions for this participant
        if (challenge.completionCriteria?.requiresSubmission) {
          const participantSub = participant?.submissions || [];
          const approvedCount = participantSub.filter(s => s.status === 'approved').length;
          progress = approvedCount;
        } else {
          // Non-submission custom challenges: use participant progress if available
          progress = participant?.progress || 0;
        }

        canComplete = progress >= (challenge.completionCriteria?.target || 1);
        const isCompleted = participant?.completedAt !== undefined;
        
        return {
          ...challenge.toObject(),
          progress,
          target: challenge.completionCriteria.target,
          isCompleted,
          canComplete: !isCompleted && canComplete,
          participantInfo: participant
        };
      })
    );

    res.json({
      success: true,
      count: challengesWithProgress.length,
      data: challengesWithProgress
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create a new challenge
// @route POST /api/challenges
// @access Private/Teacher
exports.createChallenge = async (req, res, next) => {
    try {
        const challengeData = {
            ...req.body,
            createdBy: req.user.id,
            school: req.user.school
        };

        const challenge = await Challenge.create(challengeData);
        
        // Populate createdBy field
        await challenge.populate('createdBy', 'name');
        
        res.status(201).json({
            success: true,
            data: challenge
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a challenge
// @route   PUT /api/challenges/:id
// @access  Private/Teacher
exports.updateChallenge = async (req, res, next) => {
  try {
    console.log('=== UPDATE CHALLENGE REQUEST ===');
    console.log('User making request:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });

    // First, get the challenge WITHOUT population to see the raw createdBy value
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    console.log('Challenge found:', {
      id: challenge._id,
      title: challenge.title,
      rawCreatedBy: challenge.createdBy, // This is the raw ObjectId
      createdByType: typeof challenge.createdBy,
      createdByString: challenge.createdBy.toString(),
      school: challenge.school
    });

    // SIMPLE ADMIN CHECK - If user is admin, allow regardless of anything else
    if (req.user.role === 'admin') {
      console.log('✅ ADMIN ACCESS GRANTED - Updating challenge');
      
      const updatedChallenge = await Challenge.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        {
          new: true,
          runValidators: true
        }
      );
      
      console.log('✅ Challenge updated successfully');
      return res.json({
        success: true,
        data: updatedChallenge
      });
    }

    // For non-admin users, check if they created the challenge
    // Convert both to string for safe comparison
    const challengeCreatorId = challenge.createdBy.toString();
    const requestUserId = req.user.id.toString();
    
    console.log('Checking ownership:', {
      challengeCreatorId,
      requestUserId,
      isOwner: challengeCreatorId === requestUserId
    });

    if (challengeCreatorId !== requestUserId) {
      console.log('❌ PERMISSION DENIED: User does not own this challenge');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this challenge'
      });
    }

    console.log('✅ User owns challenge - allowing update');
    const updatedChallenge = await Challenge.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: updatedChallenge
    });
  } catch (error) {
    console.error('❌ Error in updateChallenge:', error);
    next(error);
  }
};
// @desc    Complete a challenge
// @route   POST /api/challenges/:id/complete
// @access  Private
exports.completeChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const existingParticipant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (existingParticipant && existingParticipant.completedAt) {
      return res.status(400).json({
        success: false,
        message: 'Challenge already completed'
      });
    }

    // Use updateUserPoints to update all point fields including weekly, monthly, and history
    await updateUserPoints(
      req.user.id,
      challenge.pointsReward,
      'challenge_completed',
      `Completed challenge: ${challenge.title}`,
      challenge._id
    );

    const user = await User.findById(req.user.id);
    user.addBadge(
      `Challenge Champion: ${challenge.title}`,
      `Completed the ${challenge.title} challenge and earned ${challenge.pointsReward} points`
    );

    await user.save();

    if (existingParticipant) {
      existingParticipant.completedAt = new Date();
    } else {
      challenge.participants.push({
        user: req.user.id,
        completedAt: new Date(),
        progress: challenge.completionCriteria.target
      });
    }

    await challenge.save();

    // Get updated user to return current points
    const updatedUser = await User.findById(req.user.id);

    res.json({
      success: true,
      message: `Challenge completed! You earned ${challenge.pointsReward} points.`,
      data: {
        pointsEarned: challenge.pointsReward,
        totalPoints: updatedUser.points,
        weeklyPoints: updatedUser.weeklyPoints,
        monthlyPoints: updatedUser.monthlyPoints
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete a challenge
// @route   DELETE /api/challenges/:id
// @access  Private/Teacher
exports.deleteChallenge = async (req, res, next) => {
  try {
    console.log('=== DELETE CHALLENGE REQUEST ===');
    console.log('User making request:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });

    // Get the challenge without population
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    console.log('Challenge found:', {
      id: challenge._id,
      title: challenge.title,
      rawCreatedBy: challenge.createdBy,
      createdByType: typeof challenge.createdBy,
      createdByString: challenge.createdBy.toString(),
      school: challenge.school
    });

    // SIMPLE ADMIN CHECK - If user is admin, allow regardless of anything else
    if (req.user.role === 'admin') {
      console.log('✅ ADMIN ACCESS GRANTED - Deleting challenge');
      
      await Challenge.findByIdAndDelete(req.params.id);
      console.log('✅ Challenge deleted successfully');
      
      return res.json({
        success: true,
        data: {},
        message: 'Challenge deleted successfully'
      });
    }

    // For non-admin users, check ownership
    const challengeCreatorId = challenge.createdBy.toString();
    const requestUserId = req.user.id.toString();
    
    console.log('Checking ownership:', {
      challengeCreatorId,
      requestUserId,
      isOwner: challengeCreatorId === requestUserId
    });

    if (challengeCreatorId !== requestUserId) {
      console.log('❌ PERMISSION DENIED: User does not own this challenge');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this challenge'
      });
    }

    console.log('✅ User owns challenge - allowing delete');
    await Challenge.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteChallenge:', error);
    next(error);
  }
};
// @desc    Get challenge statistics
// @route   GET /api/challenges/stats
// @access  Private
exports.getChallengeStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    const totalChallenges = await Challenge.countDocuments({ isActive: true });
    const completedChallenges = await Challenge.countDocuments({
      'participants.user': req.user.id,
      'participants.completedAt': { $exists: true }
    });
    
    const pointsFromChallenges = await Challenge.aggregate([
      {
        $match: {
          'participants.user': mongoose.Types.ObjectId(req.user.id),
          'participants.completedAt': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$pointsReward' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalChallenges,
        completedChallenges,
        pointsFromChallenges: pointsFromChallenges[0]?.totalPoints || 0,
        completionRate: totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
