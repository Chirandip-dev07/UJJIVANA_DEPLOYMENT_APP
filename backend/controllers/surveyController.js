const Survey = require('../models/Survey');
const User = require('../models/User');
const { updateUserPoints } = require('../utils/pointsUtils');

// @desc    Get all surveys
// @route   GET /api/surveys
// @access  Public
exports.getSurveys = async (req, res, next) => {
  try {
    const surveys = await Survey.find({ isActive: true });

    res.json({
      success: true,
      count: surveys.length,
      data: surveys
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a survey
// @route   POST /api/surveys
// @access  Private/Teacher
exports.createSurvey = async (req, res, next) => {
  try {
    const survey = await Survey.create(req.body);

    res.status(201).json({
      success: true,
      data: survey
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark survey as completed
// @route   POST /api/surveys/:id/complete
// @access  Private
exports.completeSurvey = async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    // Check if already completed
    const user = await User.findById(req.user.id);
    const alreadyCompleted = (user.completedSurveys || []).some(s => s.toString() === survey._id.toString());

    if (!alreadyCompleted) {
      // Update user points using the utility function
      await updateUserPoints(
        req.user.id,
        survey.points,
        'survey_completed',
        `Completed survey: ${survey.title}`,
        survey._id
      );

      // Record completed survey for the user
      user.completedSurveys = user.completedSurveys || [];
      user.completedSurveys.push(survey._id);
      await user.save();
    }

    res.json({
      success: true,
      message: `Survey completed! You earned ${survey.points} points.`,
      data: {
        pointsEarned: survey.points,
        totalPoints: user.points
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit survey responses (frontend-friendly endpoint)
// @route   POST /api/surveys/submit
// @access  Private
exports.submitSurvey = async (req, res, next) => {
  try {
    const surveyId = req.params.id;
    const { responses } = req.body;
    if (!surveyId) {
      return res.status(400).json({ success: false, message: 'surveyId is required' });
    }

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    // For now, we don't persist individual responses (could be added later)

    // Update user points and completedSurveys
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyCompleted = (user.completedSurveys || []).some(s => s.toString() === survey._id.toString());
    if (!alreadyCompleted) {
      // Update user points using the utility function
      await updateUserPoints(
        req.user.id,
        survey.points || 0,
        'survey_completed',
        `Completed survey: ${survey.title}`,
        survey._id
      );

      // Record completed survey for the user
      user.completedSurveys = user.completedSurveys || [];
      user.completedSurveys.push(survey._id);
      await user.save();
    }

    res.json({
      success: true,
      data: {
        pointsEarned: alreadyCompleted ? 0 : (survey.points || 0),
        totalPoints: user.points,
        alreadyCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};