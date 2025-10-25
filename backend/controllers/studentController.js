const Challenge = require('../models/Challenge');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const mongoose = require('mongoose');

// Get modules accessible to students (admin modules + their school's teacher modules)
exports.getStudentModules = async (req, res, next) => {
    try {
        const query = {
            isActive: true,
            $or: [
                { school: 'ADMIN' },
                { school: req.user.school }
            ]
        };

        console.log('Student modules query:', query);
        
        const modules = await Module.find(query).select('-lessons.content');
        
        console.log('Found modules for student:', modules.length);
        modules.forEach(module => {
            console.log(`- ${module.title} (${module._id}) - School: ${module.school}, Active: ${module.isActive}`);
        });
        
        res.json({
            success: true,
            count: modules.length,
            data: modules
        });
    } catch (error) {
        console.error('Error in getStudentModules:', error);
        next(error);
    }
};

// Get quizzes accessible to students with completion status
exports.getStudentQuizzes = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    const query = {
      isActive: true,
      $or: [
        { school: 'ADMIN' },
        { school: req.user.school }
      ]
    };

    const quizzes = await Quiz.find(query)
      .populate('module', 'title category')
      .select('-questions.correctAnswer');

    // Get user's quiz attempts
    const quizAttempts = user.quizAttempts || {};
    const quizAttemptsObj = quizAttempts instanceof Map ? 
      Object.fromEntries(quizAttempts) : quizAttempts;

    // Check module completion for module-based quizzes
    const quizzesWithStatus = await Promise.all(
      quizzes.map(async (quiz) => {
        const quizObj = quiz.toObject();
        
        // Check if user has attempted this quiz
        quizObj.hasAttempted = !!quizAttemptsObj[quiz._id.toString()];
        
        // For module-based quizzes, check if module is completed
        if (quiz.module) {
          const ModuleProgress = require('../models/UserProgress');
          const moduleProgress = await ModuleProgress.findOne({
            user: req.user.id,
            module: quiz.module._id,
            isCompleted: true
          });
          quizObj.isModuleCompleted = !!moduleProgress;
          quizObj.canAttempt = !!moduleProgress; // Can only attempt if module completed
        } else {
          // General quizzes can always be attempted
          quizObj.isModuleCompleted = true;
          quizObj.canAttempt = true;
        }
        
        return quizObj;
      })
    );
    
    res.json({
      success: true,
      count: quizzesWithStatus.length,
      data: quizzesWithStatus
    });
  } catch (error) {
    next(error);
  }
};

// Get student's challenge progress
exports.getStudentChallengeProgress = async (req, res, next) => {
  try {
    const query = {
      isActive: true,
      $or: [
        { school: 'ADMIN' },
        { school: req.user.school }
      ]
    };

    const challenges = await Challenge.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const challengesWithProgress = await Promise.all(
      challenges.map(async (challenge) => {
        const participant = challenge.participants.find(
          p => p.user.toString() === req.user.id
        );

        let progress = 0;
        let canComplete = false;
        let currentValue = 0;
        let requiresTeacherValidation = false;

        // Only handle custom challenges
        if (challenge.completionCriteria.requiresSubmission) {
          requiresTeacherValidation = true;
          if (participant) {
            currentValue = participant.approvedSubmissions || 0;
            progress = Math.min(100, (currentValue / challenge.completionCriteria.target) * 100);
          }
        }

        canComplete = progress >= 100;
        const isCompleted = participant?.completed || false;

        return {
          ...challenge.toObject(),
          progress,
          currentValue,
          target: challenge.completionCriteria.target,
          isCompleted,
          canComplete: !isCompleted && canComplete,
          participantInfo: participant,
          challengeType: challenge.completionCriteria.type,
          requiresTeacherValidation,
          customChallengeConfig: challenge.completionCriteria
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
// Get student challenges (simple version without progress)
exports.getStudentChallenges = async (req, res, next) => {
  try {
    const query = { 
      isActive: true,
      $or: [
        { school: 'ADMIN' },
        { school: req.user.school }
      ]
    };

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