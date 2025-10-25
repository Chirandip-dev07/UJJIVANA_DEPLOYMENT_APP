const express = require('express');
const EcoPin = require('../models/EcoPin');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const router = express.Router();

// Get all eco pins
router.get('/pins', async (req, res, next) => {
    try {
        const pins = await EcoPin.find({ isActive: true }).sort({ createdAt: -1 });
        res.json({
            success: true,
            count: pins.length,
            data: pins
        });
    } catch (error) {
        next(error);
    }
});

// Create new eco pin
router.post('/pins', protect, requireAdmin, async (req, res, next) => {
    try {
        const pinData = {
            ...req.body,
            createdBy: req.user.id
        };
        
        const pin = await EcoPin.create(pinData);
        res.status(201).json({
            success: true,
            data: pin,
            message: 'Eco pin created successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Update eco pin
router.put('/pins/:id', protect, requireAdmin, async (req, res, next) => {
    try {
        let pin = await EcoPin.findById(req.params.id);
        if (!pin) {
            return res.status(404).json({
                success: false,
                message: 'Eco pin not found'
            });
        }

        pin = await EcoPin.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            data: pin,
            message: 'Eco pin updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Delete eco pin
router.delete('/pins/:id', protect, requireAdmin, async (req, res, next) => {
    try {
        const pin = await EcoPin.findById(req.params.id);
        if (!pin) {
            return res.status(404).json({
                success: false,
                message: 'Eco pin not found'
            });
        }

        await EcoPin.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            data: {},
            message: 'Eco pin deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;