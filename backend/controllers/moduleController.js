const Module = require('../models/Module');
const UserProgress = require('../models/UserProgress');
const { updateUserPoints } = require('../utils/pointsUtils');

// @desc Get all modules (for students)
// @route GET /api/modules
// @access Public
exports.getModules = async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    if (req.user && req.user.school) {
      if (req.user.role === 'admin' && req.user.school === 'ADMIN') {
        // Admin sees all modules
      } else {
        // Students/teachers see admin modules + their school modules
        query.$or = [
          { school: 'ADMIN' },
          { school: req.user.school }
        ];
      }
    } else {
      // Non-logged in users only see admin modules
      query.school = 'ADMIN';
    }

    console.log('Module query for user:', {
      userId: req.user?.id,
      school: req.user?.school,
      role: req.user?.role,
      query: query
    });

    const modules = await Module.find(query).select('-lessons.content');
    
    console.log('Found modules:', modules.length);
    
    res.json({
      success: true,
      count: modules.length,
      data: modules
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all modules including inactive (for teachers)
// @route GET /api/modules/teacher/list
// @access Private/Teacher
exports.getTeacherModules = async (req, res, next) => {
  try {
    let query = {};
    
    // For admin users, show all modules
    if (req.user.role === 'admin' && req.user.school === 'ADMIN') {
      // No school filter - show all modules
      console.log('Admin user - loading all modules');
    } else {
      // For teachers, only show their school's modules
      query.school = req.user.school;
      console.log(`Teacher user - loading modules for school: ${req.user.school}`);
    }
    
    const modules = await Module.find(query).sort({ createdAt: -1 });
    console.log(`Found ${modules.length} modules`);
    
    res.json({
      success: true,
      count: modules.length,
      data: modules
    });
  } catch (error) {
    console.error('Error in getTeacherModules:', error);
    next(error);
  }
};


// @desc Create a new module
// @route POST /api/modules
// @access Private/Teacher
exports.createModule = async (req, res, next) => {
    try {
        console.log('Creating module with data:', req.body);
        
        // Validate that lessons are provided
        if (!req.body.lessons || !Array.isArray(req.body.lessons) || req.body.lessons.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please add at least one lesson to the module'
            });
        }

        // Add school and createdBy fields
        const moduleData = {
            ...req.body,
            createdBy: req.user.id,
            school: req.user.school
        };

        // Calculate estimated time from lessons
        if (moduleData.lessons) {
            moduleData.estimatedTime = moduleData.lessons.reduce((total, lesson) => {
                return total + (lesson.duration || 0);
            }, 0);
        }

        const module = await Module.create(moduleData);
        
        // Populate createdBy field for response
        await module.populate('createdBy', 'name');
        
        console.log('Module created successfully:', module._id);
        
        res.status(201).json({
            success: true,
            data: module
        });
    } catch (error) {
        console.error('Error creating module:', error);
        next(error);
    }
};

// @desc Update a module
// @route PUT /api/modules/:id
// @access Private/Teacher
exports.updateModule = async (req, res, next) => {
    try {
        let module = await Module.findById(req.params.id);
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }

        // Check if the module belongs to the teacher's school
        if (module.school !== req.user.school) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this module'
            });
        }

        // Calculate estimated time if lessons are updated
        if (req.body.lessons) {
            req.body.estimatedTime = req.body.lessons.reduce((total, lesson) => {
                return total + (lesson.duration || 0);
            }, 0);
        }

        module = await Module.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            data: module
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete a module
// @route DELETE /api/modules/:id
// @access Private/Teacher
exports.deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Allow admin to delete any module
    if (req.user.role === 'admin' && req.user.school === 'ADMIN') {
      await UserProgress.deleteMany({ module: req.params.id });
      await Module.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        data: {}
      });
    }

    // For non-admin users, check school permission
    if (module.school !== req.user.school) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this module'
      });
    }

    await UserProgress.deleteMany({ module: req.params.id });
    await Module.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle module active status
// @route PUT /api/modules/:id/toggle
// @access Private/Teacher
exports.toggleModuleStatus = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Allow admin to toggle any module regardless of school
    if (req.user.role === 'admin' && req.user.school === 'ADMIN') {
      // Admin can toggle any module
      module.isActive = !module.isActive;
      await module.save();
      return res.json({
        success: true,
        data: module
      });
    }

    // For non-admin users, check school permission
    if (module.school !== req.user.school) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this module'
      });
    }

    module.isActive = !module.isActive;
    await module.save();

    res.json({
      success: true,
      data: module
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single module
// @route GET /api/modules/:id
// @access Public
exports.getModule = async (req, res, next) => {
    try {
        const module = await Module.findById(req.params.id);
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }

        res.json({
            success: true,
            data: module
        });
    } catch (error) {
        next(error);
    }
};
// @desc Get user progress for a module
// @route GET /api/modules/:id/progress
// @access Private
exports.getModuleProgress = async (req, res, next) => {
  try {
    console.log('Getting module progress:', {
      userId: req.user.id,
      moduleId: req.params.id
    });
    
    let progress = await UserProgress.findOne({
      user: req.user.id,
      module: req.params.id
    }).populate('module');
    
    console.log('Found progress:', {
      _id: progress?._id,
      completedLessons: progress?.completedLessons,
      isCompleted: progress?.isCompleted
    });
    
    if (!progress) {
      console.log('No progress found, creating new record');
      progress = await UserProgress.create({
        user: req.user.id,
        module: req.params.id,
        completedLessons: [],
        currentLesson: 0,
        isCompleted: false,
        earnedPoints: 0
      });
      await progress.populate('module');
    }
    
    // REMOVED: The problematic "fixing" logic that was resetting completedLessons
    
    console.log('Returning progress:', {
      progressId: progress._id,
      completedLessons: progress.completedLessons,
      isCompleted: progress.isCompleted
    });
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting module progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting module progress',
      error: error.message
    });
  }
};
// @desc Update lesson progress
// @route PUT /api/modules/:id/progress
// @access Private
exports.updateLessonProgress = async (req, res, next) => {
  try {
    const { lessonIndex, isCompleted } = req.body;
    const moduleId = req.params.id;
    const userId = req.user.id;

    console.log('=== UPDATE LESSON PROGRESS START ===');
    console.log('Request details:', {
      userId,
      moduleId,
      lessonIndex,
      isCompleted
    });

    // Find or create progress record
    let progress = await UserProgress.findOne({
      user: userId,
      module: moduleId
    });

    if (!progress) {
      console.log('No progress found, creating new record');
      progress = new UserProgress({
        user: userId,
        module: moduleId,
        completedLessons: isCompleted ? [parseInt(lessonIndex)] : [],
        currentLesson: parseInt(lessonIndex),
        isCompleted: false,
        earnedPoints: 0
      });
    } else {
      console.log('Found existing progress:', {
        progressId: progress._id,
        currentCompletedLessons: progress.completedLessons,
        currentIsCompleted: progress.isCompleted
      });

      // Ensure completedLessons is an array
      if (!progress.completedLessons || !Array.isArray(progress.completedLessons)) {
        console.log('Initializing completedLessons array');
        progress.completedLessons = [];
      }

      // Handle lesson completion
      if (isCompleted) {
        const lessonIndexNum = parseInt(lessonIndex);
        
        // Check if already completed
        if (!progress.completedLessons.includes(lessonIndexNum)) {
          console.log(`Adding lesson ${lessonIndexNum} to completedLessons`);
          progress.completedLessons.push(lessonIndexNum);
          
          // Remove duplicates and sort
          progress.completedLessons = [...new Set(progress.completedLessons)].sort((a, b) => a - b);
          console.log('Updated completedLessons:', progress.completedLessons);
        } else {
          console.log(`Lesson ${lessonIndexNum} already completed`);
        }
      }

      // Update current lesson and timestamp
      progress.currentLesson = parseInt(lessonIndex);
      progress.lastAccessed = new Date();
    }

    // Save the progress
    console.log('Saving progress...');
    const savedProgress = await progress.save();
    console.log('Progress saved successfully:', {
      progressId: savedProgress._id,
      completedLessons: savedProgress.completedLessons,
      isCompleted: savedProgress.isCompleted
    });

    // Populate module data
    await savedProgress.populate('module');
    
    console.log('=== UPDATE LESSON PROGRESS END ===');

    res.json({
      success: true,
      data: savedProgress,
      message: 'Lesson progress updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating lesson progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lesson progress',
      error: error.message
    });
  }
};
// Add this temporary debug function to moduleController.js
exports.debugProgress = async (req, res, next) => {
  try {
    const { moduleId, userId } = req.params;
    
    console.log('Debug progress for:', { moduleId, userId });
    
    const progress = await UserProgress.findOne({
      user: userId,
      module: moduleId
    });
    
    const module = await Module.findById(moduleId);
    
    res.json({
      success: true,
      data: {
        progress: progress,
        module: {
          _id: module?._id,
          title: module?.title,
          lessonsCount: module?.lessons?.length
        }
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    next(error);
  }
};
// @desc Complete module
// @route PUT /api/modules/:id/complete
// @access Private
exports.completeModule = async (req, res, next) => {
  try {
    console.log('=== COMPLETE MODULE START ===');
    console.log('completeModule called', {
      userId: req.user && req.user.id,
      moduleId: req.params.id
    });

    const progress = await UserProgress.findOne({
      user: req.user.id,
      module: req.params.id
    }).populate('module');

    console.log('Found progress:', {
      progressId: progress?._id,
      completedLessons: progress?.completedLessons,
      isCompleted: progress?.isCompleted,
      module: progress?.module?._id
    });

    if (!progress) {
      console.log('❌ Progress not found');
      return res.status(404).json({
        success: false,
        message: 'Progress not found'
      });
    }

    // Check if all lessons are completed
    const module = await Module.findById(req.params.id);
    if (!module) {
      console.log('❌ Module not found');
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    console.log('Module lessons:', module.lessons?.length);
    console.log('Progress completed lessons:', progress.completedLessons?.length);

    const totalLessons = module.lessons ? module.lessons.length : 0;
    const completedLessons = progress.completedLessons ? progress.completedLessons.length : 0;
    
    console.log(`Completion check: ${completedLessons}/${totalLessons} lessons completed`);

    if (completedLessons !== totalLessons) {
      console.log('❌ Cannot complete module: not all lessons completed');
      return res.status(400).json({
        success: false,
        message: `Cannot complete module. Please complete all ${totalLessons} lessons first.`,
        completed: completedLessons,
        total: totalLessons
      });
    }

    if (progress.isCompleted) {
      console.log('ℹ️ Module already completed');
      return res.status(400).json({
        success: false,
        message: 'Module already completed'
      });
    }

    console.log('✅ All lessons completed, marking module as complete');

    const wasAlreadyCompleted = !!progress.isCompleted;
    progress.isCompleted = true;
    progress.earnedPoints = progress.module.points || 0;
    progress.lastAccessed = new Date();

    console.log('Saving progress...');
    const savedProgress = await progress.save();
    console.log('Progress saved:', {
      progressId: savedProgress._id.toString(),
      isCompleted: savedProgress.isCompleted,
      earnedPoints: savedProgress.earnedPoints
    });

    if (!wasAlreadyCompleted) {
      console.log('Updating user points and badges...');
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (user) {
        // Use the new updateUserPoints utility function
        await updateUserPoints(
          req.user.id,
          progress.module.points || 0,
          'module_completed',
          `Completed ${progress.module.title}`,
          progress.module._id
        );

        user.modulesCompleted = (user.modulesCompleted || 0) + 1;

        console.log('User before badge:', {
          points: user.points,
          modulesCompleted: user.modulesCompleted
        });

        const badgeName = `${progress.module.category} Expert`;
        if (typeof user.addBadge === 'function') {
          user.addBadge(badgeName, `Awarded for completing ${progress.module.title}`);
        } else {
          if (!Array.isArray(user.badges)) user.badges = [];
          const exists = user.badges.find(b => b && (b.name === badgeName || b === badgeName));
          if (!exists) {
            user.badges.push({
              name: badgeName,
              description: `Awarded for completing ${progress.module.title}`,
              earnedAt: new Date()
            });
          }
        }

        await user.save();
        console.log('User updated:', {
          userId: user._id.toString(),
          points: user.points,
          modulesCompleted: user.modulesCompleted
        });
      }
    }

    console.log('Finding module quizzes...');
    const Quiz = require('../models/Quiz');
    const moduleQuizzes = await Quiz.find({
      module: req.params.id,
      isActive: true
    }).select('title description');

    console.log('Found quizzes:', moduleQuizzes.length);

    console.log('=== COMPLETE MODULE END ===');

    res.json({
      success: true,
      data: savedProgress,
      message: `Module completed! You earned ${progress.module.points} points.`,
      quizzesAvailable: moduleQuizzes.length > 0,
      quizzes: moduleQuizzes
    });
  } catch (error) {
    console.error('❌ Error in completeModule:', error);
    next(error);
  }
};
exports.checkModuleCompletion = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    const userId = req.user.id;

    console.log('Checking module completion:', { moduleId, userId });

    const module = await Module.findById(moduleId);
    const progress = await UserProgress.findOne({
      user: userId,
      module: moduleId
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const totalLessons = module.lessons ? module.lessons.length : 0;
    const completedLessons = progress?.completedLessons ? progress.completedLessons.length : 0;
    const canComplete = completedLessons === totalLessons && totalLessons > 0 && !progress?.isCompleted;

    res.json({
      success: true,
      data: {
        canComplete,
        completedLessons,
        totalLessons,
        isCompleted: progress?.isCompleted || false,
        progress: progress
      }
    });
  } catch (error) {
    console.error('Error checking module completion:', error);
    next(error);
  }
};
exports.debugProgress = async (req, res, next) => {
    try {
        const moduleId = req.params.id;
        const userId = req.user.id;

        console.log('🐛 DEBUG PROGRESS:', { userId, moduleId });

        const progress = await UserProgress.findOne({
            user: userId,
            module: moduleId
        }).populate('module');

        if (!progress) {
            return res.json({
                success: true,
                data: null,
                message: 'No progress found'
            });
        }

        const totalLessons = progress.module.lessons.length;
        const completedLessons = progress.completedLessons ? progress.completedLessons.length : 0;

        res.json({
            success: true,
            data: {
                progress: progress,
                stats: {
                    totalLessons,
                    completedLessons,
                    isCompleted: progress.isCompleted,
                    canComplete: completedLessons >= totalLessons
                }
            }
        });

    } catch (error) {
        console.error('❌ Error debugging progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error debugging progress',
            error: error.message
        });
    }
};
exports.refreshProgress = async (req, res, next) => {
    try {
        const moduleId = req.params.id;
        const userId = req.user.id;

        console.log('🔄 REFRESHING PROGRESS:', { userId, moduleId });

        const progress = await UserProgress.findOne({
            user: userId,
            module: moduleId
        }).populate('module');

        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }

        console.log('📊 Refreshed progress:', {
            completedLessons: progress.completedLessons,
            isCompleted: progress.isCompleted
        });

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('❌ Error refreshing progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing progress',
            error: error.message
        });
    }
};
// @desc Get completed modules for current user
// @route GET /api/modules/completed
// @access Private
exports.getCompletedModulesForUser = async (req, res, next) => {
    try {
        // Find user progress documents marked completed and populate module title
        const progresses = await UserProgress.find({ 
            user: req.user.id, 
            isCompleted: true 
        }).populate('module', 'title');

        const completed = progresses
            .filter(p => p.module)
            .map(p => ({ id: p.module._id, title: p.module.title }));

        res.json({
            success: true,
            count: completed.length,
            data: completed
        });
    } catch (error) {
        next(error);
    }
};
// Add these new student-specific functions to moduleController.js

exports.getStudentModules = async (req, res, next) => {
  try {
    console.log('Getting student modules for:', {
      userId: req.user.id,
      school: req.user.school,
      role: req.user.role
    });

    // Only show modules from ADMIN or student's school
    const query = {
      isActive: true,
      $or: [
        { school: 'ADMIN' },
        { school: req.user.school }
      ]
    };

    console.log('Student module query:', query);

    const modules = await Module.find(query)
      .select('-lessons.content')
      .sort({ createdAt: -1 });

    console.log(`Found ${modules.length} modules for student`);

    // Get progress for each module
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        try {
          const progress = await UserProgress.findOne({
            user: req.user.id,
            module: module._id
          });

          const moduleObj = module.toObject();
          
          // Ensure lessons exists and is an array
          const lessons = moduleObj.lessons || [];
          const completedLessons = progress?.completedLessons || [];
          
          // Calculate completion percentage safely
          const completionPercentage = lessons.length > 0 ? 
            (completedLessons.length / lessons.length) * 100 : 0;
          
          // Check if module can be completed
          const canComplete = completedLessons.length === lessons.length && 
                             lessons.length > 0 &&
                             !progress?.isCompleted;

          moduleObj.progress = progress || {
            completedLessons: [],
            isCompleted: false,
            currentLesson: 0
          };
          moduleObj.completionPercentage = completionPercentage;
          moduleObj.canComplete = canComplete;

          return moduleObj;
        } catch (error) {
          console.error(`Error processing module ${module._id}:`, error);
          // Return a safe module object even if there's an error
          return {
            ...module.toObject(),
            progress: {
              completedLessons: [],
              isCompleted: false,
              currentLesson: 0
            },
            completionPercentage: 0,
            canComplete: false
          };
        }
      })
    );

    console.log(`Processed ${modulesWithProgress.length} modules for student`);

    res.json({
      success: true,
      count: modulesWithProgress.length,
      data: modulesWithProgress
    });
  } catch (error) {
    console.error('Error in getStudentModules:', error);
    next(error);
  }
};
exports.validateModuleCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    const progress = await UserProgress.findOne({
      user: req.user.id,
      module: id
    });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          canComplete: false,
          completedLessons: 0,
          totalLessons: module.lessons ? module.lessons.length : 0,
          message: 'Start the module to begin completion'
        }
      });
    }

    // Safely check lessons
    const totalLessons = module.lessons ? module.lessons.length : 0;
    const completedLessons = progress.completedLessons ? progress.completedLessons.length : 0;
    
    const canComplete = completedLessons === totalLessons && 
                       totalLessons > 0 &&
                       !progress.isCompleted;

    res.json({
      success: true,
      data: {
        canComplete,
        completedLessons,
        totalLessons,
        isCompleted: progress.isCompleted
      }
    });
  } catch (error) {
    console.error('Error validating module completion:', error);
    next(error);
  }
};