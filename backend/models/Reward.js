const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a reward name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    pointsRequired: {
        type: Number,
        required: [true, 'Please add points required'],
        min: [1, 'Points required must be at least 1']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Eco Product', 'Discount Coupon', 'Merchandise', 'Experience', 'Other']
    },
    type: {
        type: String,
        required: [true, 'Please specify reward type'],
        enum: ['product', 'coupon'],
        default: 'product'
    },
    // Product specific fields
    productId: {
        type: String,
        sparse: true,
        unique: true
    },
    cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative']
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    // Coupon specific fields
    couponCode: {
        type: String,
        sparse: true,
        unique: true,
        uppercase: true
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100%']
    },
    expiryDate: {
        type: Date,
        validate: {
            validator: function(date) {
                return !date || date > new Date();
            },
            message: 'Expiry date must be in the future'
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
    isLimited: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    updatedAt: {
        type: Date
    },
    updatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }
});

// Generate productId or couponCode before saving
RewardSchema.pre('save', function(next) {
    if (this.isNew) {
        if (this.type === 'product' && !this.productId) {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 5);
            this.productId = `PROD_${timestamp}_${random}`.toUpperCase();
        }
        if (this.type === 'coupon' && !this.couponCode) {
            const random = Math.random().toString(36).substr(2, 8).toUpperCase();
            this.couponCode = `UJJI${random}`;
        }
    }
    
    // Set updatedAt timestamp
    if (this.isModified()) {
        this.updatedAt = Date.now();
    }
    
    next();
});

// Validate that required fields are present based on type
RewardSchema.pre('save', function(next) {
    if (this.type === 'product') {
        if (this.cost === undefined || this.cost < 0) {
            return next(new Error('Cost is required for products and must be non-negative'));
        }
        if (this.stock === undefined || this.stock < 0) {
            return next(new Error('Stock is required for products and must be non-negative'));
        }
    }
    
    if (this.type === 'coupon') {
        if (!this.discountPercentage || this.discountPercentage < 1 || this.discountPercentage > 100) {
            return next(new Error('Valid discount percentage (1-100) is required for coupons'));
        }
        if (!this.expiryDate) {
            return next(new Error('Expiry date is required for coupons'));
        }
    }
    
    next();
});

// Index for better query performance
RewardSchema.index({ type: 1, isActive: 1 });
RewardSchema.index({ category: 1 });
RewardSchema.index({ productId: 1 }, { sparse: true });
RewardSchema.index({ couponCode: 1 }, { sparse: true });
RewardSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Reward', RewardSchema);