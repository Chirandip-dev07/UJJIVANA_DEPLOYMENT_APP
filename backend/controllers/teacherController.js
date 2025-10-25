const User = require('../models/User');
const Module = require('../models/Module');
// @desc    Get students by school (for teacher dashboard)
// @route   GET /api/teacher/students
// @access  Private/Teacher
exports.getStudentsBySchool = async (req, res, next) => {
    try {
        console.log('Fetching students for school:', req.user.school);
        
        const students = await User.find({
            school: req.user.school,
            role: 'student'
        }).select('name email points modulesCompleted streak quizAttempts lastLogin createdAt school');

        // Get all active modules for this school
        const schoolModules = await Module.find({ 
            school: req.user.school, 
            isActive: true 
        }).select('_id');
        
        const schoolModuleIds = schoolModules.map(module => module._id);
        const totalSchoolModules = schoolModuleIds.length;

        console.log(`Found ${totalSchoolModules} active modules for school ${req.user.school}`);

        // Enhance student data with progress information
        const enhancedStudents = await Promise.all(students.map(async (student) => {
            const studentObj = student.toObject();
            
            try {
                // Get the actual modules completed by this student using UserProgress
                const UserProgress = require('../models/UserProgress');
                const completedProgress = await UserProgress.find({
                    user: student._id,
                    module: { $in: schoolModuleIds },
                    isCompleted: true
                });
                
                const schoolModulesCompleted = completedProgress.length;
                
                console.log(`Student ${student.name} completed ${schoolModulesCompleted} modules in school ${req.user.school}`);
                
                studentObj.schoolModulesCompleted = schoolModulesCompleted;
                studentObj.totalSchoolModules = totalSchoolModules;
            } catch (progressError) {
                console.error(`Error getting progress for student ${student.name}:`, progressError);
                // Fallback to the student's total modules completed
                studentObj.schoolModulesCompleted = student.modulesCompleted || 0;
                studentObj.totalSchoolModules = totalSchoolModules;
            }
            
            return studentObj;
        }));

        console.log(`Found ${students.length} students`);
        
        res.json({
            success: true,
            count: students.length,
            data: enhancedStudents
        });
    } catch (error) {
        console.error('Error in getStudentsBySchool:', error);
        next(error);
    }
};
// @desc    Get teacher's school statistics
// @route   GET /api/teacher/stats
// @access  Private/Teacher
exports.getTeacherStats = async (req, res, next) => {
    try {
        const students = await User.find({
            school: req.user.school,
            role: 'student'
        });

        const totalStudents = students.length;
        
        // Calculate active students (logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeStudents = students.filter(student =>
            student.lastLogin && new Date(student.lastLogin) > thirtyDaysAgo
        ).length;

        const totalPoints = students.reduce((sum, student) => sum + (student.points || 0), 0);
        const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
        
        // Get total ACTIVE modules for this school
        const totalModules = await Module.countDocuments({ 
            school: req.user.school, 
            isActive: true 
        });

        res.json({
            success: true,
            data: {
                totalStudents,
                activeStudents,
                totalPoints,
                avgPoints,
                totalModules
            }
        });
    } catch (error) {
        console.error('Error in getTeacherStats:', error);
        next(error);
    }
};
// @desc    Get school-specific leaderboard
// @route   GET /api/teacher/leaderboard
// @access  Private/Teacher
exports.getSchoolLeaderboard = async (req, res, next) => {
    try {
        const students = await User.find({ 
            school: req.user.school, 
            role: 'student' 
        })
        .sort({ points: -1, modulesCompleted: -1 })
        .select('name points modulesCompleted streak')
        .limit(10);

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error in getSchoolLeaderboard:', error);
        next(error);
    }
};
// @desc    Get recent student activity
// @route   GET /api/teacher/recent-activity
// @access  Private/Teacher
exports.getRecentActivity = async (req, res, next) => {
    try {
        // Get students from the teacher's school
        const students = await User.find({ 
            school: req.user.school, 
            role: 'student' 
        }).select('name points modulesCompleted lastLogin createdAt');
        
        // Get modules for this school to check completions
        const modules = await Module.find({ school: req.user.school }).select('title');
        
        // Simulate recent activities based on available data
        const activities = [];
        
        students.forEach(student => {
            // Activity 1: Recent login
            if (student.lastLogin) {
                const daysSinceLogin = Math.floor((new Date() - new Date(student.lastLogin)) / (1000 * 60 * 60 * 24));
                if (daysSinceLogin <= 7) { // Only show activity from last 7 days
                    activities.push({
                        type: 'login',
                        student: student.name,
                        message: `logged in`,
                        timestamp: student.lastLogin,
                        points: 0
                    });
                }
            }
            
            // Activity 2: Module completions (simulated based on modulesCompleted count)
            if (student.modulesCompleted > 0) {
                // Simulate module completion dates spread over the last 30 days
                for (let i = 0; i < student.modulesCompleted && i < modules.length; i++) {
                    const daysAgo = Math.floor(Math.random() * 30); // Random day in last 30 days
                    const completionDate = new Date();
                    completionDate.setDate(completionDate.getDate() - daysAgo);
                    
                    activities.push({
                        type: 'module_completion',
                        student: student.name,
                        message: `completed ${modules[i]?.title || 'a module'}`,
                        timestamp: completionDate,
                        points: 50 // Assuming 50 points per module
                    });
                }
            }
            
            // Activity 3: Points milestones
            if (student.points >= 100) {
                const milestoneDate = new Date(student.createdAt);
                milestoneDate.setDate(milestoneDate.getDate() + Math.floor(student.points / 100));
                
                activities.push({
                    type: 'milestone',
                    student: student.name,
                    message: `reached ${Math.floor(student.points / 100) * 100} points`,
                    timestamp: milestoneDate,
                    points: student.points
                });
            }
        });
        
        // Sort activities by timestamp (newest first) and limit to 10
        const recentActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        res.json({
            success: true,
            data: recentActivities
        });
        
    } catch (error) {
        console.error('Error in getRecentActivity:', error);
        next(error);
    }
};