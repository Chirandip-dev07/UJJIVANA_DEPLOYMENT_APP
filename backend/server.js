const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const moduleRoutes = require('./routes/modules');
const quizRoutes = require('./routes/quizzes');
const leaderboardRoutes = require('./routes/leaderboard');
const redeemRoutes = require('./routes/redeem');
const reviewRoutes = require('./routes/reviews');
const challengeRoutes = require('./routes/challenges');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');
const ecoMapRoutes = require('./routes/ecoMap');
const studentRoutes = require('./routes/student');
const submissionRoutes = require('./routes/submissions');
const pinRequestRoutes = require('./routes/pinRequestRoutes'); // Add this line
const surveyRoutes = require('./routes/surveys');
const eventRoutes = require('./routes/events');

connectDB();

const app = express();

app.use(cors());
app.options('*', cors());

app.get('/api/debug/progress/:moduleId/:userId', async (req, res) => {
    try {
        const { moduleId, userId } = req.params;
        
        console.log('Debug progress for:', { moduleId, userId });
        
        const UserProgress = require('./models/UserProgress');
        const Module = require('./models/Module');
        
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
        res.status(500).json({
            success: false,
            message: 'Debug error',
            error: error.message
        });
    }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/redeem', redeemRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/eco-map', ecoMapRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/pin-requests', pinRequestRoutes); // Add this line
app.use('/api/surveys', surveyRoutes);
app.use('/api/events', eventRoutes);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api', (req, res) => {
    res.json({ message: 'Ujjivana API is working! Use /api/health, /api/auth, etc.' });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Ujjivana backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/*', (req, res) => {
    console.log(`404 Error: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'API route not found',
        requestedUrl: req.originalUrl
    });
});

// Catch all handler: send back index.html for any non-API routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: messages
        });
    }
    if (error.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value entered'
        });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Resource not found'
        });
    }
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
    }
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
        console.log(`API base: http://localhost:${PORT}/api`);
    });
}

app.on('error', (err) => {
    console.log('Server error:', err);
});

process.on('unhandledRejection', (err, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', err);
});

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception thrown:', err);
    process.exit(1);
});

module.exports = app; // For testing
