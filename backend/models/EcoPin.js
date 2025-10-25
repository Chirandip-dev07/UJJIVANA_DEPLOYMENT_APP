const mongoose = require('mongoose');

const EcoPinSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a pin title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    type: {
        type: String,
        required: true,
        enum: ['pollution', 'park', 'project', 'club'],
        default: 'park'
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    contact: {
        type: String,
        maxlength: [50, 'Contact cannot be longer than 50 characters']
    },
    whatsapp: {
        type: String,
        validate: {
            validator: function(url) {
                if (!url) return true; // Optional field
                return /^https?:\/\/.+\..+/.test(url);
            },
            message: 'Please provide a valid WhatsApp group URL'
        }
    },
    discord: {
        type: String,
        validate: {
            validator: function(url) {
                if (!url) return true; // Optional field
                return /^https?:\/\/.+\..+/.test(url);
            },
            message: 'Please provide a valid Discord server URL'
        }
    },
    website: {
        type: String,
        validate: {
            validator: function(url) {
                if (!url) return true;
                return /^https?:\/\/.+\..+/.test(url);
            },
            message: 'Please provide a valid website URL'
        }
    },
    image: {
        type: String,
        validate: {
            validator: function(url) {
                if (!url) return true;
                return /^https?:\/\/.+\..+/.test(url);
            },
            message: 'Please provide a valid image URL'
        }
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
    },
    updatedAt: {
        type: Date
    }
});

EcoPinSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.type === 'club') {
        if (!this.whatsapp && !this.discord) {
            const err = new Error('For eco clubs, either WhatsApp group link or Discord server link is required');
            next(err);
            return;
        }
    }
    next();
});
module.exports = mongoose.model('EcoPin', EcoPinSchema);