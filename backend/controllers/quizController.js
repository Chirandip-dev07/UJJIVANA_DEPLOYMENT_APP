const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Module = require('../models/Module');
const { updateUserPoints } = require('../utils/pointsUtils');

// @desc Get all quizzes
// @route GET /api/quizzes
// @access Public
exports.getQuizzes = async (req, res, next) => {
  try {
    // For students, use student-specific endpoint
    if (req.user && req.user.role === 'student') {
      const { getStudentQuizzes } = require('./studentController');
      return getStudentQuizzes(req, res, next);
    }

    // Original logic for teachers/admins
    let query = {};
    if (req.user && req.user.role === 'admin') {
      if (req.user.school === 'ADMIN') {
        // no filter for global admin
      } else {
        query.school = req.user.school;
      }
    } else if (req.user && req.user.school) {
      query.school = req.user.school;
    }

    if (req.user && req.user.role === 'student') {
      query.isActive = true;
    }

    const quizzes = await Quiz.find(query)
      .populate('module', 'title category')
      .select('-questions.correctAnswer');
    
    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    next(error);
  }
};

// @desc Teacher: Create a general quiz (not tied to a module)
// @route POST /api/quizzes
// @access Private/Teacher
exports.createGeneralQuiz = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      school: req.user.school || 'ADMIN', // Ensure school is set
      requiresModuleCompletion: false
    };
    
    const quiz = await Quiz.create(quizData);
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error creating general quiz:', error);
    next(error);
  }
};


// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Public
exports.getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('module', 'title category')
      .select('-questions.correctAnswer');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quizzes for a specific module
// @route   GET /api/quizzes/module/:moduleId
// @access  Private
// Update getModuleQuizzes to filter by school
exports.getModuleQuizzes = async (req, res, next) => {
    try {
        const { moduleId } = req.params;
        
        // Verify module belongs to user's school
        const module = await Module.findById(moduleId);
        if (!module || (req.user && module.school !== req.user.school)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to module quizzes'
            });
        }

        const quizzes = await Quiz.find({
            module: moduleId,
            isActive: true,
            school: req.user.school // Add school filter
        }).select('-questions.correctAnswer');

        res.json({
            success: true,
            count: quizzes.length,
            data: quizzes
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Teacher: Create quiz for a module
// @route   POST /api/quizzes/module/:moduleId
// @access  Private/Teacher
exports.createModuleQuiz = async (req, res, next) => {
    try {
        const { moduleId } = req.params;
        
        // Verify the module exists and belongs to teacher's school
        const module = await Module.findById(moduleId);
        if (!module || module.school !== req.user.school) {
            return res.status(404).json({
                success: false,
                message: 'Module not found or access denied'
            });
        }

        const quizData = {
            ...req.body,
            module: moduleId,
            school: req.user.school,
            requiresModuleCompletion: true // Ensure this is set for module-based quizzes
        };

        const quiz = await Quiz.create(quizData);
        
        res.status(201).json({
            success: true,
            data: quiz
        });
    } catch (error) {
        console.error('Error creating module quiz:', error);
        next(error);
    }
};

// @desc    Submit quiz answers
// @route   POST /api/quizzes/:id/submit
// @access  Private
exports.submitQuiz = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;
    const userId = req.user.id;

    console.log(`📝 Quiz submission started: user ${userId}, quiz ${quizId}`);

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required'
      });
    }

    const quiz = await Quiz.findById(quizId).populate('questions');
    if (!quiz) {
      console.log('❌ Quiz not found');
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if user has already attempted this quiz
    const existingAttempt = await QuizAttempt.findOne({
      user: userId,
      quiz: quizId
    });

    let score = 0;
    let totalPoints = 0;
    const answerResults = [];

    quiz.questions.forEach((question, index) => {
      totalPoints += question.points || 10;
      const userAnswer = answers && answers.find(a => a.questionIndex === index);
      if (userAnswer && userAnswer.answerIndex === question.correctAnswer) {
        score += question.points || 10;
        answerResults.push({
          questionIndex: index,
          answerIndex: userAnswer.answerIndex,
          isCorrect: true,
          points: question.points || 10
        });
      } else {
        answerResults.push({
          questionIndex: index,
          answerIndex: userAnswer ? userAnswer.answerIndex : -1,
          isCorrect: false,
          points: 0
        });
      }
    });

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    console.log(`📊 Quiz scored: ${score}/${totalPoints} (${percentage}%)`);

    let quizAttempt = null;
    // Only persist attempts where the user scored more than 0.
    if (score > 0) {
      quizAttempt = new QuizAttempt({
        user: userId,
        quiz: quizId,
        score: score,
        totalPoints: totalPoints,
        answers: answerResults,
        percentage: percentage,
        submittedAt: new Date(),
        isFirstAttempt: !existingAttempt
      });

      await quizAttempt.save();
      console.log('✅ Quiz attempt saved to QuizAttempt collection');
    } else {
      console.log('ℹ️ Quiz attempt not saved because score is 0');
    }

    // Update user's quizAttempts and award points
    let pointsAwarded = 0;
    if (score > 0) {
      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ User not found for updating quiz attempts');
      } else {
        // Update quizAttempts in user document
        if (!user.quizAttempts) {
          user.quizAttempts = new Map();
        }

        let quizAttemptsMap;
        if (user.quizAttempts instanceof Map) {
          quizAttemptsMap = user.quizAttempts;
        } else {
          quizAttemptsMap = new Map(Object.entries(user.quizAttempts || {}));
        }

        // Store the quiz attempt
        quizAttemptsMap.set(quizId.toString(), score);
        user.quizAttempts = quizAttemptsMap;

        // Award points only for first attempt
        if (!existingAttempt) {
          pointsAwarded = score;
          user.points += pointsAwarded;
          user.monthlyPoints += pointsAwarded;
          user.weeklyPoints += pointsAwarded;

          // Add to points history
          user.pointsHistory.push({
            points: pointsAwarded,
            type: 'quiz_completed',
            description: `Completed quiz: ${quiz.title}`,
            earnedAt: new Date()
          });
          console.log('✅ First attempt - points awarded');
        } else {
          console.log('ℹ️ Quiz revisited - attempt recorded but no points awarded');
        }

        await user.save();
        console.log('✅ User quizAttempts and points updated');
      }
    }

    res.json({
      success: true,
      data: {
        score,
        totalPoints,
        percentage: Math.round(percentage),
        answers: answerResults,
        attemptId: quizAttempt ? quizAttempt._id : null,
        pointsAwarded: pointsAwarded,
        isFirstAttempt: !existingAttempt
      },
      message: existingAttempt ? 
        `Quiz revisited! Score: ${score}/${totalPoints} points.` :
        `Quiz completed! You scored ${score}/${totalPoints} points and earned ${pointsAwarded} points.`
    });

  } catch (error) {
    console.error('❌ Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz: ' + error.message
    });
  }
};

// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Private/Teacher
exports.updateQuiz = async (req, res, next) => {
  try {
    let quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if user has permission to update this quiz
    if (quiz.school !== req.user.school && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this quiz'
      });
    }

    // Update the quiz
    quiz = await Quiz.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Get daily question
// @route   GET /api/quizzes/daily
// @access  Public
exports.getDailyQuestion = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // First, try to find today's daily quiz
    let dailyQuiz = await Quiz.findOne({
      isDailyQuestion: true,
      dailyDate: today,
      isActive: true
    }).select('-questions.correctAnswer');

    // If no daily quiz for today, find any active daily quiz and assign it to today
    if (!dailyQuiz) {
      dailyQuiz = await Quiz.findOne({
        isDailyQuestion: true,
        isActive: true
      }).select('-questions.correctAnswer');
      
      if (dailyQuiz) {
        dailyQuiz.dailyDate = today;
        await dailyQuiz.save();
      }
    }

    if (!dailyQuiz) {
      return res.status(404).json({
        success: false,
        message: 'No daily question available'
      });
    }

    const dailyQuestion = {
      quizId: dailyQuiz._id,
      question: dailyQuiz.questions[0]?.question || 'No question available',
      options: dailyQuiz.questions[0]?.options || [],
      points: dailyQuiz.questions[0]?.points || 0
    };

    res.json({
      success: true,
      data: dailyQuestion
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Submit daily question answer
// @route   POST /api/quizzes/daily/submit
// @access  Private
exports.submitDailyQuestion = async (req, res, next) => {
  try {
    const { quizId, answerIndex } = req.body;
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz || !quiz.isDailyQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Daily question not found'
      });
    }

    const today = new Date().toDateString();
    const user = await User.findById(req.user.id);
    
    // Additional check - if lastDailyQuestion exists and is today
    if (user.lastDailyQuestion && new Date(user.lastDailyQuestion).toDateString() === today) {
      return res.status(400).json({
        success: false,
        message: 'Daily question already attempted, come back tomorrow'
      });
    }

    const isCorrect = answerIndex === quiz.questions[0].correctAnswer;
    const pointsEarned = 5; // Fixed 5 points for daily question

    await updateUserPoints(
      req.user.id,
      pointsEarned,
      'daily_question',
      `Daily question: ${isCorrect ? 'Correct' : 'Incorrect'}`,
      quizId
    );

    const updatedUser = await User.findById(req.user.id);
    updatedUser.lastDailyQuestion = new Date();

    // Update streak based on correctness
    if (isCorrect) {
      updatedUser.streak = (updatedUser.streak || 0) + 1;
    } else {
      updatedUser.streak = 0;
    }

    await updatedUser.save();

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: quiz.questions[0].correctAnswer,
        pointsEarned,
        streak: user.streak
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Mark a quiz as daily question
// @route   POST /api/quizzes/:id/daily
// @access  Private/Teacher
exports.markAsDailyQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Setting quiz ${id} as daily question for ${today}`);
    
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // First, clear any existing daily quiz for today
    await Quiz.updateMany(
      { dailyDate: today },
      { $set: { dailyDate: null } }
    );
    
    // Set this quiz as today's daily question
    quiz.isDailyQuestion = true;
    quiz.dailyDate = today;
    await quiz.save();
    
    console.log(`Successfully set quiz "${quiz.title}" as daily question`);
    
    res.json({
      success: true,
      message: 'Quiz set as daily question successfully',
      data: quiz
    });
  } catch (error) {
    console.error('Error in markAsDailyQuestion:', error);
    next(error);
  }
};

// @desc    Toggle quiz status (active/inactive)
// @route   PUT /api/quizzes/:id/toggle
// @access  Private/Teacher
exports.toggleQuizStatus = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
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

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private/Teacher
exports.deleteQuiz = async (req, res, next) => {
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
exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('module', 'title')
      .populate('questions');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
};

exports.createQuiz = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      createdBy: req.user.id
    };

    const quiz = await Quiz.create(quizData);
    await quiz.populate('module', 'title');

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark module as complete when quiz is passed
// @route   POST /api/quizzes/:id/complete-module
// @access  Private
exports.completeModuleOnQuizPass = async (req, res, next) => {
  try {
    const { quizId, score } = req.body;
    
    const quiz = await Quiz.findById(quizId).populate('module');
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    // Check if the quiz is associated with a module
    if (!quiz.module) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not associated with any module'
      });
    }
    
    // Check if score meets the passing threshold (80% by default)
    const passingThreshold = 0.8; // 80%
    const percentageScore = score / quiz.totalPoints;
    
    if (percentageScore >= passingThreshold) {
      // Check if module progress exists
      let moduleProgress = await UserProgress.findOne({
        user: req.user.id,
        module: quiz.module._id
      });
      
      if (!moduleProgress) {
        // Create new progress record for the module
        moduleProgress = await UserProgress.create({
          user: req.user.id,
          module: quiz.module._id,
          completedLessons: [],
          currentLesson: 0,
          isCompleted: true,
          earnedPoints: quiz.module.points,
          completedBy: 'quiz' // Track how the module was completed
        });
      } else if (!moduleProgress.isCompleted) {
        // Update existing progress to mark as completed
        moduleProgress.isCompleted = true;
        moduleProgress.earnedPoints = quiz.module.points;
        moduleProgress.completedBy = 'quiz';
        await moduleProgress.save();
      }
      
      // Update user's total points and modules completed count
      const user = await User.findById(req.user.id);
      
      // Only add points if this is the first completion
      if (!moduleProgress.isCompleted) {
        user.points += quiz.module.points;
        user.modulesCompleted += 1;
        await user.save();
      }
      
      return res.json({
        success: true,
        data: {
          moduleCompleted: true,
          module: quiz.module.title,
          pointsEarned: quiz.module.points
        }
      });
    } else {
      return res.json({
        success: true,
        data: {
          moduleCompleted: false,
          message: `Score of ${Math.round(percentageScore * 100)}% is below the passing threshold of ${passingThreshold * 100}%`
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
