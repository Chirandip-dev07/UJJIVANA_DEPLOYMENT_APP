const User = require('../models/User');

exports.requireTeacher = async (req, res, next) => {
    try {
        // Get user from database to check role
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Teacher or admin access required'
            });
        }
        
        next();
    } catch (error) {
        console.error('Teacher middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error checking teacher privileges'
        });
    }
};