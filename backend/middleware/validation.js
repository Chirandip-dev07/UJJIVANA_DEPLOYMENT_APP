// middleware/validation.js
exports.handleValidationErrors = (req, res, next) => {
  // Simple validation - we'll handle validation in controllers instead
  next();
};

exports.validateRegistration = (req, res, next) => {
  // Basic validation
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and password'
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }
  
  next();
};

exports.validateLogin = (req, res, next) => {
  // Basic validation
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }
  
  next();
};
