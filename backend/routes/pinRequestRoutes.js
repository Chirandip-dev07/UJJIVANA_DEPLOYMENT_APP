const express = require('express');
const PinRequest = require('../models/PinRequest');
const EcoPin = require('../models/EcoPin');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const router = express.Router();

// Submit a pin request (student)
router.post('/', protect, async (req, res, next) => {
    try {
        const pinRequestData = {
            ...req.body,
            requestedBy: req.user.id
        };

        const pinRequest = await PinRequest.create(pinRequestData);

        res.status(201).json({
            success: true,
            data: pinRequest,
            message: 'Pin request submitted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Get user's pin requests (student)
router.get('/my-requests', protect, async (req, res, next) => {
    try {
        const pinRequests = await PinRequest.find({ requestedBy: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: pinRequests.length,
            data: pinRequests
        });
    } catch (error) {
        next(error);
    }
});

// Get all pin requests (admin only)
router.get('/admin', protect, requireAdmin, async (req, res, next) => {
    try {
        const { status } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const pinRequests = await PinRequest.find(query)
            .populate('requestedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: pinRequests.length,
            data: pinRequests
        });
    } catch (error) {
        next(error);
    }
});

// Approve pin request (admin only)
// Approve pin request (admin only)
router.put('/:id/approve', protect, requireAdmin, async (req, res, next) => {
    try {
        const { adminNotes } = req.body;
        
        const pinRequest = await PinRequest.findById(req.params.id);
        if (!pinRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pin request not found'
            });
        }

        // Update request status
        pinRequest.status = 'approved';
        pinRequest.adminNotes = adminNotes;
        pinRequest.approvedAt = Date.now();
        await pinRequest.save();

        // Create eco pin from approved request
        const ecoPinData = {
            title: pinRequest.title,
            type: pinRequest.type,
            description: pinRequest.description,
            address: pinRequest.address,
            contact: pinRequest.contact,
            website: pinRequest.website,
            latitude: pinRequest.latitude,
            longitude: pinRequest.longitude,
            whatsapp: pinRequest.whatsapp,
            discord: pinRequest.discord,
            createdBy: pinRequest.requestedBy,
            isActive: true
        };

        const ecoPin = await EcoPin.create(ecoPinData);
        
        // Populate the createdBy field for frontend display
        await ecoPin.populate('createdBy', 'name email');

        res.json({
            success: true,
            data: {
                pinRequest,
                ecoPin
            },
            message: 'Pin request approved and eco pin created successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Reject pin request (admin only)
router.put('/:id/reject', protect, requireAdmin, async (req, res, next) => {
    try {
        const { adminNotes } = req.body;
        
        const pinRequest = await PinRequest.findById(req.params.id);
        if (!pinRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pin request not found'
            });
        }

        if (!adminNotes) {
            return res.status(400).json({
                success: false,
                message: 'Admin notes are required when rejecting a request'
            });
        }

        pinRequest.status = 'rejected';
        pinRequest.adminNotes = adminNotes;
        pinRequest.rejectedAt = Date.now();
        await pinRequest.save();

        res.json({
            success: true,
            data: pinRequest,
            message: 'Pin request rejected successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;