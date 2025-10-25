// backend/controllers/leaderboardController.js - UPDATED

const User = require('../models/User');

// Helper function to get date range for timeframes
function getDateRange(timeframe) {
  const now = new Date();
  const startDate = new Date();
  
  switch(timeframe) {
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'all':
    default:
      return null; // No date filter for all time
  }
  
  return startDate;
}

// Get user leaderboard with timeframes and pagination
exports.getUserLeaderboard = async (req, res, next) => {
    try {
        const { timeframe = 'all', page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Determine which points field to use
        let pointsField = 'points';
        if (timeframe === 'monthly') pointsField = 'monthlyPoints';
        if (timeframe === 'weekly') pointsField = 'weeklyPoints';

        const users = await User.find({ 
            $or: [
                { role: 'student' },
                { role: { $exists: false } }
            ]
        })
        .select(`name points monthlyPoints weeklyPoints modulesCompleted school streak quizAttempts ${pointsField}`)
        .sort({ [pointsField]: -1, modulesCompleted: -1, streak: -1 })
        .skip(skip)
        .limit(limitNum);

        const totalCount = await User.countDocuments({ 
            $or: [
                { role: 'student' },
                { role: { $exists: false } }
            ]
        });

        const usersWithPlainQuizAttempts = users.map(user => {
            let quizAttemptsObj = {};
            if (user.quizAttempts) {
                if (typeof user.quizAttempts.size === 'number' && typeof user.quizAttempts.entries === 'function') {
                    quizAttemptsObj = Object.fromEntries(user.quizAttempts.entries());
                } else {
                    quizAttemptsObj = user.quizAttempts;
                }
            }

            return {
                id: user._id,
                name: user.name,
                points: user[pointsField], // Use the appropriate points field
                monthlyPoints: user.monthlyPoints,
                weeklyPoints: user.weeklyPoints,
                modulesCompleted: user.modulesCompleted,
                school: user.school,
                streak: user.streak,
                quizAttempts: quizAttemptsObj
            };
        });

        res.json({
            success: true,
            count: usersWithPlainQuizAttempts.length,
            total: totalCount,
            page: pageNum,
            pages: Math.ceil(totalCount / limitNum),
            data: usersWithPlainQuizAttempts
        });
    } catch (error) {
        next(error);
    }
};

// Get user's rank in leaderboard
exports.getUserRank = async (req, res, next) => {
  try {
    const { timeframe = 'all', userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const dateRange = getDateRange(timeframe);
    let rank = 1;

    if (dateRange && timeframe !== 'all') {
      // Count users with higher timeframe points
      const usersWithHigherPoints = await User.countDocuments({
        $and: [
          {
            $or: [
              { role: 'student' },
              { role: { $exists: false } }
            ]
          },
          {
            'pointsHistory.earnedAt': { $gte: dateRange }
          },
          {
            $expr: {
              $gt: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$pointsHistory',
                          as: 'history',
                          cond: { $gte: ['$$history.earnedAt', dateRange] }
                        }
                      },
                      as: 'filteredHistory',
                      in: '$$filteredHistory.points'
                    }
                  }
                },
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: { $arrayElemAt: [{$filter: {input: '$pointsHistory', as: 'h', cond: {$eq: ['$$h._id', userId]}}}, 0] }?.pointsHistory || [],
                          as: 'history',
                          cond: { $gte: ['$$history.earnedAt', dateRange] }
                        }
                      },
                      as: 'filteredHistory',
                      in: '$$filteredHistory.points'
                    }
                  }
                }
              ]
            }
          }
        ]
      });
      rank = usersWithHigherPoints + 1;
    } else {
      // Count users with higher total points
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const usersWithHigherPoints = await User.countDocuments({
        $and: [
          {
            $or: [
              { role: 'student' },
              { role: { $exists: false } }
            ]
          },
          {
            $or: [
              { points: { $gt: currentUser.points } },
              {
                $and: [
                  { points: { $eq: currentUser.points } },
                  { modulesCompleted: { $gt: currentUser.modulesCompleted } }
                ]
              },
              {
                $and: [
                  { points: { $eq: currentUser.points } },
                  { modulesCompleted: { $eq: currentUser.modulesCompleted } },
                  { streak: { $gt: currentUser.streak } }
                ]
              }
            ]
          }
        ]
      });
      rank = usersWithHigherPoints + 1;
    }

    res.json({
      success: true,
      data: {
        rank,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get school leaderboard for current user's school only
exports.getSchoolLeaderboard = async (req, res, next) => {
  try {
    const { school, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!school) {
      return res.status(400).json({
        success: false,
        message: 'School parameter is required'
      });
    }

    const users = await User.find({ 
      school: school,
      $or: [
        { role: 'student' },
        { role: { $exists: false } }
      ]
    })
    .select('name points modulesCompleted streak')
    .sort({ points: -1, modulesCompleted: -1, streak: -1 })
    .skip(skip)
    .limit(limitNum);

    const totalCount = await User.countDocuments({ 
      school: school,
      $or: [
        { role: 'student' },
        { role: { $exists: false } }
      ]
    });

    const usersWithRank = users.map((user, index) => ({
      id: user._id,
      name: user.name,
      points: user.points,
      modulesCompleted: user.modulesCompleted,
      streak: user.streak,
      rank: skip + index + 1
    }));

    res.json({
      success: true,
      count: usersWithRank.length,
      total: totalCount,
      page: pageNum,
      pages: Math.ceil(totalCount / limitNum),
      data: usersWithRank
    });
  } catch (error) {
    next(error);
  }
};