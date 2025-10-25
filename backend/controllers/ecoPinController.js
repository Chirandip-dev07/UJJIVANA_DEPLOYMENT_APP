const EcoPin = require('../models/EcoPin');

// Get all eco pins
exports.getEcoPins = async (req, res, next) => {
  try {
    const { type, lat, lng, radius = 10 } = req.query; // radius in km
    
    let query = { isActive: true };
    
    // Filter by type if provided
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // If coordinates provided, filter by proximity
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusInRadians = parseFloat(radius) / 6371; // Convert km to radians
      
      query['location.lat'] = {
        $gte: latitude - radiusInRadians,
        $lte: latitude + radiusInRadians
      };
      query['location.lng'] = {
        $gte: longitude - radiusInRadians,
        $lte: longitude + radiusInRadians
      };
    }
    
    // For non-admin users, show only their school's pins or admin pins
    if (req.user && req.user.role !== 'admin') {
      query.$or = [
        { school: req.user.school },
        { school: 'ADMIN' }
      ];
    }
    
    const ecoPins = await EcoPin.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: ecoPins.length,
      data: ecoPins
    });
  } catch (error) {
    next(error);
  }
};

// Get eco pin by ID
exports.getEcoPin = async (req, res, next) => {
  try {
    const ecoPin = await EcoPin.findById(req.params.id)
      .populate('createdBy', 'name');
    
    if (!ecoPin) {
      return res.status(404).json({
        success: false,
        message: 'Eco pin not found'
      });
    }
    
    res.json({
      success: true,
      data: ecoPin
    });
  } catch (error) {
    next(error);
  }
};

// Create new eco pin
exports.createEcoPin = async (req, res, next) => {
  try {
    const ecoPinData = {
      ...req.body,
      createdBy: req.user.id,
      school: req.user.school
    };
    
    const ecoPin = await EcoPin.create(ecoPinData);
    await ecoPin.populate('createdBy', 'name');
    
    res.status(201).json({
      success: true,
      data: ecoPin,
      message: 'Eco pin created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update eco pin
exports.updateEcoPin = async (req, res, next) => {
  try {
    let ecoPin = await EcoPin.findById(req.params.id);
    
    if (!ecoPin) {
      return res.status(404).json({
        success: false,
        message: 'Eco pin not found'
      });
    }
    
    // Check if user owns the pin or is admin
    if (ecoPin.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this pin'
      });
    }
    
    ecoPin = await EcoPin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'name');
    
    res.json({
      success: true,
      data: ecoPin,
      message: 'Eco pin updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete eco pin
exports.deleteEcoPin = async (req, res, next) => {
  try {
    const ecoPin = await EcoPin.findById(req.params.id);
    
    if (!ecoPin) {
      return res.status(404).json({
        success: false,
        message: 'Eco pin not found'
      });
    }
    
    // Check if user owns the pin or is admin
    if (ecoPin.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this pin'
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
};

// Get eco pin statistics
exports.getEcoPinStats = async (req, res, next) => {
  try {
    const stats = await EcoPin.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object for easier access
    const statsObj = {
      pollution: 0,
      park: 0,
      project: 0,
      'eco-club': 0,
      total: 0
    };
    
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
      statsObj.total += stat.count;
    });
    
    res.json({
      success: true,
      data: statsObj
    });
  } catch (error) {
    next(error);
  }
};