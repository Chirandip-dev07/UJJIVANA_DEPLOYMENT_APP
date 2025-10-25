const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { updateUserPoints } = require('../utils/pointsUtils');

// Student submits work for a custom challenge
exports.submitChallengeWork = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { submission, description } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if this is a custom challenge that requires submission
    if (challenge.completionCriteria.type !== 'custom' || !challenge.completionCriteria.requiresSubmission) {
      return res.status(400).json({
        success: false,
        message: 'This challenge does not accept submissions'
      });
    }

    // Find or create participant
    let participant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      participant = {
        user: req.user.id,
        joinedAt: new Date(),
        progress: 0,
        completed: false,
        submissions: [],
        approvedSubmissions: 0
      };
      challenge.participants.push(participant);
      // Get the newly added participant
      participant = challenge.participants[challenge.participants.length - 1];
    }

    // Add submission
    participant.submissions.push({
      submission,
      description,
      submittedAt: new Date(),
      status: 'pending'
    });

    await challenge.save();

    res.json({
      success: true,
      message: 'Work submitted successfully! Waiting for teacher approval.',
      data: participant.submissions[participant.submissions.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// Teacher reviews submission for custom challenge
exports.reviewSubmission = async (req, res, next) => {
  try {
    const { challengeId, participantId, submissionId } = req.params;
    const { status, feedback, pointsAwarded } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review submissions'
      });
    }

    const participant = challenge.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    const submission = participant.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.status = status;
    submission.feedback = feedback;
    submission.reviewedAt = new Date();

    // Handle bonus points awarded by teacher
    if (pointsAwarded && pointsAwarded > 0) {
      submission.pointsAwarded = pointsAwarded;
      
      // Award bonus points immediately using updateUserPoints
      await updateUserPoints(
        participant.user,
        pointsAwarded,
        'other',
        `Bonus points for submission in challenge: ${challenge.title}`,
        challenge._id
      );
    }

    if (status === 'approved') {
      participant.approvedSubmissions = (participant.approvedSubmissions || 0) + 1;

      const progressPercentage = Math.min(100,
        (participant.approvedSubmissions / challenge.completionCriteria.target) * 100
      );

      participant.progress = progressPercentage;

      if (progressPercentage >= 100 && !participant.completed) {
        participant.completed = true;
        participant.completedAt = new Date();
        
        // Award challenge completion points using updateUserPoints
        await updateUserPoints(
          participant.user,
          challenge.pointsReward,
          'challenge_completed',
          `Completed challenge: ${challenge.title}`,
          challenge._id
        );

        // Add badge for challenge completion
        const user = await User.findById(participant.user);
        user.addBadge(
          `Challenge Champion: ${challenge.title}`,
          `Completed the ${challenge.title} challenge and earned ${challenge.pointsReward} points`
        );
        await user.save();
      }
    }

    await challenge.save();

    // Get updated user data to return current points
    const updatedUser = await User.findById(participant.user);

    res.json({
      success: true,
      message: `Submission ${status} successfully`,
      data: {
        submission,
        participant: {
          progress: participant.progress,
          approvedSubmissions: participant.approvedSubmissions,
          completed: participant.completed
        },
        userPoints: {
          totalPoints: updatedUser.points,
          weeklyPoints: updatedUser.weeklyPoints,
          monthlyPoints: updatedUser.monthlyPoints
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
// Get submissions for a custom challenge (teacher view)
exports.getChallengeSubmissions = async (req, res, next) => {
  try {
    const { challengeId } = req.params;

    const challenge = await Challenge.findById(challengeId)
            .populate({
                path: 'participants.user',
                select: 'name email school', // Make sure this includes 'name'
                model: 'User'
            })
            .select('title completionCriteria participants');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Only return if it's a custom challenge with submission requirement
    if (challenge.completionCriteria.type !== 'custom' || !challenge.completionCriteria.requiresSubmission) {
      return res.status(400).json({
        success: false,
        message: 'This challenge does not accept submissions'
      });
    }

    // Filter participants with submissions
    const submissions = [];
    challenge.participants.forEach(participant => {
      if (participant.submissions) {
        participant.submissions.forEach(submission => {
          submissions.push({
            _id: submission._id,
            challengeId: challenge._id,
            challengeTitle: challenge.title,
            participant: {
              _id: participant._id,
              user: participant.user,
              progress: participant.progress,
              approvedSubmissions: participant.approvedSubmissions,
              completed: participant.completed
            },
            submission: submission.submission,
            description: submission.description,
            status: submission.status,
            submittedAt: submission.submittedAt,
            reviewedAt: submission.reviewedAt,
            feedback: submission.feedback,
            pointsAwarded: submission.pointsAwarded
          });
        });
      }
    });

    // Sort by submission date (newest first)
    submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// Get student's own submissions for custom challenges
exports.getMySubmissions = async (req, res, next) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user.id,
      'completionCriteria.type': 'custom',
      'completionCriteria.requiresSubmission': true
    })
    .select('title completionCriteria participants')
    .populate('createdBy', 'name');

    const mySubmissions = [];

    challenges.forEach(challenge => {
      const participant = challenge.participants.find(
        p => p.user.toString() === req.user.id
      );
      
      if (participant && participant.submissions) {
        participant.submissions.forEach(submission => {
          mySubmissions.push({
            challengeTitle: challenge.title,
            challengeId: challenge._id,
            createdBy: challenge.createdBy,
            submission: submission.submission,
            description: submission.description,
            status: submission.status,
            submittedAt: submission.submittedAt,
            reviewedAt: submission.reviewedAt,
            feedback: submission.feedback,
            pointsAwarded: submission.pointsAwarded
          });
        });
      }
    });

    // Sort by submission date (newest first)
    mySubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json({
      success: true,
      count: mySubmissions.length,
      data: mySubmissions
    });
  } catch (error) {
    next(error);
  }
};