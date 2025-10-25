const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Populate the user with all fields including role and school
    req.user = await User.findById(decoded.id).select('+role +school +name +email');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('🔐 Authenticated User:', {
      id: req.user.id,
      role: req.user.role,
      school: req.user.school,
      name: req.user.name
    });
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Make sure to export the function correctly
module.exports = {
  protect
};
