const User = require('../models/User');

/**
 * Updates user points including monthly and weekly tracking, and records in points history
 * @param {string} userId - The user's ID
 * @param {number} points - Points to add (can be negative for deductions)
 * @param {string} type - Type of points earning (e.g., 'module_completed', 'quiz_completed')
 * @param {string} description - Description of the points earning
 * @param {string} relatedId - Related document ID (optional)
 * @returns {Promise<User>} Updated user document
 */
async function updateUserPoints(userId, points, type, description, relatedId = null) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();

  // Check and handle weekly reset
  const lastWeekly = new Date(user.lastWeeklyReset);
  const weekDiff = Math.floor((now - lastWeekly) / (1000 * 60 * 60 * 24 * 7));
  if (weekDiff >= 1) {
    user.weeklyPoints = 0;
    user.lastWeeklyReset = now;
  }

  // Check and handle monthly reset
  const lastMonthly = new Date(user.lastMonthlyReset);
  const monthDiff = (now.getFullYear() - lastMonthly.getFullYear()) * 12 + now.getMonth() - lastMonthly.getMonth();
  if (monthDiff >= 1) {
    user.monthlyPoints = 0;
    user.lastMonthlyReset = now;
  }

  // Update points
  user.points += points;
  user.monthlyPoints += points;
  user.weeklyPoints += points;

  // Add to points history
  user.pointsHistory.push({
    points,
    type,
    description,
    relatedId,
    earnedAt: now
  });

  await user.save();
  return user;
}

module.exports = {
  updateUserPoints
};
