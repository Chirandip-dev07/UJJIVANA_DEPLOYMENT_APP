const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a lesson title'],
        trim: true,
        maxlength: [100, 'Lesson title cannot be more than 100 characters']
    },
    content: {
        type: String,
        required: [true, 'Please add lesson content']
    },
    duration: {
        type: Number, // in minutes
        required: true,
        min: [1, 'Duration must be at least 1 minute']
    },
    order: {
        type: Number,
        required: true,
        min: [1, 'Order must be at least 1']
    }
});

const ModuleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a module title'],
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Green Habits',
            'Global Warming',
            'Biodiversity',
            'Sustainable Development',
            'Renewable Energy',
            'Waste Management'
        ]
    },
    lessons: [LessonSchema],
    estimatedTime: {
        type: Number, // total minutes
        required: true
    },
    points: {
        type: Number,
        required: true,
        min: [0, 'Points cannot be negative']
    },
    badge: {
        type: String
    },
    school: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate estimated time before saving
ModuleSchema.pre('save', function(next) {
    if (this.lessons && this.lessons.length > 0) {
        this.estimatedTime = this.lessons.reduce((total, lesson) => total + lesson.duration, 0);
    }
    next();
});

module.exports = mongoose.model('Module', ModuleSchema);