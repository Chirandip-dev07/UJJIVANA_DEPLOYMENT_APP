const express = require('express');
const Survey = require('../models/Survey');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const surveyController = require('../controllers/surveyController'); // Add this import

const router = express.Router();

// Use controller functions for non-admin routes
router.get('/', protect, surveyController.getSurveys);

router.get('/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    if (req.user.role !== 'admin') {
      const { submissions, ...surveyData } = survey.toObject();
      return res.json({
        success: true,
        data: surveyData
      });
    }

    res.json({
      success: true,
      data: survey
    });
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching survey'
    });
  }
});

// Use controller function for survey submission
router.post('/:id/submit', protect, surveyController.submitSurvey);

// Admin routes remain unchanged
router.get('/admin/all', protect, requireAdmin, async (req, res) => {
  try {
    const surveys = await Survey.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: surveys.length,
      data: surveys
    });
  } catch (error) {
    console.error('Get all surveys error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching surveys'
    });
  }
});

// Use controller function for survey creation
router.post('/admin', protect, requireAdmin, surveyController.createSurvey);

router.put('/admin/:id', protect, requireAdmin, async (req, res) => {
  try {
    let survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    survey = await Survey.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: survey
    });
  } catch (error) {
    console.error('Update survey error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating survey'
    });
  }
});

router.delete('/admin/:id', protect, requireAdmin, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    await Survey.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Survey deleted successfully'
    });
  } catch (error) {
    console.error('Delete survey error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting survey'
    });
  }
});

router.get('/admin/:id/submissions', protect, requireAdmin, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate('submissions.user', 'name email school role');
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    res.json({
      success: true,
      data: {
        survey: {
          _id: survey._id,
          title: survey.title,
          description: survey.description
        },
        submissions: survey.submissions
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching submissions'
    });
  }
});

module.exports = router;