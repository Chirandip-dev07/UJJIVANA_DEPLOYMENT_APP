const express = require('express');
const Challenge = require('../models/Challenge');
const { protect } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/teacher');

const router = express.Router();
// Test route to verify admin status
router.get('/test/admin-status', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role,
        school: req.user.school,
        name: req.user.name
      },
      isAdmin: req.user.role === 'admin',
      message: 'Admin status check'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin status'
    });
  }
});

// @desc Get all active challenges
// @route GET /api/challenges
// @access Public
router.get('/', async (req, res, next) => {
    try {
        // For students, only show active challenges from their school
        const query = { isActive: true };
        if (req.user && req.user.school) {
            query.school = req.user.school;
        }

        const challenges = await Challenge.find(query)
            .populate('createdBy', 'name')
            .select('-participants');

        res.json({
            success: true,
            count: challenges.length,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
});

// @desc    Get challenges for current user
// @route   GET /api/challenges/my-challenges
// @access  Private
router.get('/my-challenges', protect, async (req, res, next) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user.id,
      isActive: true
    })
      .populate('createdBy', 'name')
      .select('title description points category duration participants');

    res.json({
      success: true,
      count: challenges.length,
      data: challenges
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Join a challenge
// @route   POST /api/challenges/:id/join
// @access  Private
router.post('/:id/join', protect, async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if user already joined
    const alreadyJoined = challenge.participants.some(
      participant => participant.user.toString() === req.user.id
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this challenge'
      });
    }

    // Add user to participants
    challenge.participants.push({
      user: req.user.id,
      progress: 0,
      completed: false
    });

    await challenge.save();

    res.json({
      success: true,
      message: 'Successfully joined the challenge',
      data: challenge
    });
  } catch (error) {
    next(error);
  }
});

// @desc Create a new challenge (Teacher only)
// @route POST /api/challenges
// @access Private/Teacher
router.post('/', protect, requireTeacher, async (req, res, next) => {
    try {
        console.log('Received challenge creation request:', req.body);
        console.log('User creating challenge:', req.user.id, req.user.school);

        // Validate required fields
        if (!req.body.title) {
            return res.status(400).json({
                success: false,
                message: 'Challenge title is required'
            });
        }

        if (!req.body.description) {
            return res.status(400).json({
                success: false,
                message: 'Challenge description is required'
            });
        }

        // Add createdBy and school fields
        const challengeData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category || 'custom',
            pointsReward: req.body.pointsReward || 100,
            duration: req.body.duration || 7,
            completionCriteria: req.body.completionCriteria || {
                type: 'custom',
                target: 10
            },
            isActive: req.body.isActive !== false, // default to true
            createdBy: req.user.id,
            school: req.user.school
        };

        console.log('Creating challenge with data:', challengeData);

        const challenge = await Challenge.create(challengeData);
        
        // Populate createdBy field for response
        await challenge.populate('createdBy', 'name');
        
        console.log('Challenge created successfully:', challenge._id);
        
        res.status(201).json({
            success: true,
            data: challenge
        });
    } catch (error) {
        console.error('Error creating challenge:', error);
        
        // Mongoose validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }
        
        // Mongoose duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Challenge with this title already exists'
            });
        }
        
        next(error);
    }
});
// Direct admin override route for testing
router.put('/:id/admin-override', protect, async (req, res) => {
  try {
    console.log('=== ADMIN OVERRIDE ROUTE ===');
    console.log('User:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });

    // Only allow admins to use this route
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for override'
      });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    console.log('Updating challenge with override:', req.body);
    
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
      data: updatedChallenge,
      message: 'Challenge updated via admin override'
    });
  } catch (error) {
    console.error('Admin override error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in admin override'
    });
  }
});
// Update the admin override route to handle both PUT and DELETE
router.put('/:id/admin-override', protect, async (req, res) => {
  try {
    console.log('=== ADMIN OVERRIDE ROUTE (PUT) ===');
    console.log('User:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });

    // Only allow admins to use this route
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for override'
      });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    console.log('Updating challenge with override:', req.body);
    
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
      data: updatedChallenge,
      message: 'Challenge updated via admin override'
    });
  } catch (error) {
    console.error('Admin override error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in admin override'
    });
  }
});

// Add DELETE admin override route
router.delete('/:id/admin-override', protect, async (req, res) => {
  try {
    console.log('=== ADMIN OVERRIDE ROUTE (DELETE) ===');
    console.log('User:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });

    // Only allow admins to use this route
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for override'
      });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    console.log('Deleting challenge via admin override');
    
    await Challenge.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {},
      message: 'Challenge deleted via admin override'
    });
  } catch (error) {
    console.error('Admin override delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in admin override delete'
    });
  }
});
// @desc    Update challenge progress
// @route   PUT /api/challenges/:id/progress
// @access  Private
router.put('/:id/progress', protect, async (req, res, next) => {
  try {
    const { progress } = req.body;
    
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Find participant
    const participant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'You are not participating in this challenge'
      });
    }

    // Update progress
    participant.progress = Math.min(100, Math.max(0, progress));
    
    // Check if completed
    if (participant.progress >= 100) {
      participant.completed = true;
    }

    await challenge.save();

    res.json({
      success: true,
      data: participant
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update a challenge (Teacher only)
// @route   PUT /api/challenges/:id
// @access  Private/Teacher
router.put('/:id', protect, requireTeacher, async (req, res, next) => {
  try {
    let challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if user is the creator
    if (challenge.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this challenge'
      });
    }

    challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    next(error);
  }
});
// Add this route for admin challenge management with filtering
// Admin route for all challenges (without filters)
router.get('/admin/all', protect, async (req, res, next) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin' || req.user.school !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const challenges = await Challenge.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: challenges.length,
      data: challenges
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get challenges created by the current teacher (include inactive and participants)
// @route   GET /api/challenges/teacher
// @access  Private/Teacher
router.get('/teacher', protect, requireTeacher, async (req, res, next) => {
  try {
    // Return challenges created by this teacher, include participants and their user info
    const challenges = await Challenge.find({ createdBy: req.user.id })
      .populate('participants.user', 'name email')
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
});

// @desc    Delete a challenge (Teacher only)
// @route   DELETE /api/challenges/:id
// @access  Private/Teacher
router.delete('/:id', protect, requireTeacher, async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if user is the creator
    if (challenge.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this challenge'
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
});

module.exports = router;
