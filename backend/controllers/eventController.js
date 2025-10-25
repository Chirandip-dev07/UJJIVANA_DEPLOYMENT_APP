const Event = require('../models/Event');
const User = require('../models/User');
const { updateUserPoints } = require('../utils/pointsUtils');

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await Event.getUpcomingEvents(limit);
    
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
};

// Get event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('registrations.userId', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: error.message
    });
  }
};

// Enhanced version with category-wise attendance (optional)
exports.getEventsStatistics = async (req, res) => {
  try {
    const now = new Date();
    
    // Basic counts
    const totalEvents = await Event.countDocuments({ isActive: true });
    const upcomingEvents = await Event.countDocuments({ 
      date: { $gte: now }, 
      isActive: true 
    });
    const pastEvents = await Event.countDocuments({ 
      date: { $lt: now }, 
      isActive: true 
    });
    
    const eventsWithOpenRegistration = await Event.countDocuments({
      isActive: true,
      date: { $gte: now },
      lastDateToRegister: { $gte: now },
      $expr: {
        $or: [
          { $eq: ['$maxParticipants', 0] },
          { $lt: ['$currentParticipants', '$maxParticipants'] }
        ]
      }
    });

    // Get all events with registrations for detailed calculations
    const allEvents = await Event.find({ isActive: true }).populate('registrations.userId', 'name email');

    // Calculate total registrations and attendance
    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalPossibleAttendances = 0;

    // Calculate registrations by category with attendance
    const categoryStats = {};
    
    allEvents.forEach(event => {
      totalRegistrations += event.currentParticipants;
      const eventRegistrations = event.registrations;
      totalPossibleAttendances += eventRegistrations.length;
      
      const eventAttended = eventRegistrations.filter(reg => reg.attended).length;
      totalAttended += eventAttended;

      // Category statistics
      if (!categoryStats[event.category]) {
        categoryStats[event.category] = {
          registrations: 0,
          attended: 0
        };
      }
      categoryStats[event.category].registrations += eventRegistrations.length;
      categoryStats[event.category].attended += eventAttended;
    });

    // Convert category stats to array format
    const registrationsByCategory = Object.entries(categoryStats).map(([category, stats]) => ({
      _id: category,
      count: stats.registrations,
      attended: stats.attended,
      attendanceRate: stats.registrations > 0 ? Math.round((stats.attended / stats.registrations) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Calculate overall attendance rate
    const averageAttendance = totalPossibleAttendances > 0 
      ? Math.round((totalAttended / totalPossibleAttendances) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalEvents,
        upcomingEvents,
        pastEvents,
        eventsWithOpenRegistration,
        totalRegistrations,
        registrationsByCategory,
        averageAttendance,
        totalAttended,
        totalPossibleAttendances
      }
    });
  } catch (error) {
    console.error('Get events statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events statistics',
      error: error.message
    });
  }
};

// Update registration function to check lastDateToRegister
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if registration is closed due to lastDateToRegister
    const now = new Date();
    if (event.lastDateToRegister && now > event.lastDateToRegister) {
      return res.status(400).json({
        success: false,
        message: 'Registration period has ended for this event'
      });
    }

    if (!event.registrationOpen) {
      return res.status(400).json({
        success: false,
        message: 'Registration is closed for this event'
      });
    }

    const user = await User.findById(req.user.id);
    const pointsToAward = event.pointsReward || 0;
    await event.addRegistration(
      req.user.id,
      user.name,
      user.email,
      req.body.registrationData || {},
      pointsToAward
    );

    // Award points to user using the new utility function
    if (pointsToAward > 0) {
      await updateUserPoints(
        req.user.id,
        pointsToAward,
        'event_registration',
        `Registered for event: ${event.name}`,
        event._id
      );
    }

    res.json({
      success: true,
      message: 'Successfully registered for event',
      data: {
        event: event.name,
        registrationLink: event.registrationLink,
        pointsAwarded: event.pointsReward
      }
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
// Public statistics (no admin auth required)
exports.getEventsStatisticsPublic = async (req, res) => {
    try {
        const now = new Date();
        const totalEvents = await Event.countDocuments({ isActive: true });
        const upcomingEvents = await Event.countDocuments({ 
            date: { $gte: now }, 
            isActive: true 
        });
        const pastEvents = await Event.countDocuments({ 
            date: { $lt: now }, 
            isActive: true 
        });
        
        const eventsWithOpenRegistration = await Event.countDocuments({
            isActive: true,
            date: { $gte: now },
            lastDateToRegister: { $gte: now },
            $expr: {
                $or: [
                    { $eq: ['$maxParticipants', 0] },
                    { $lt: ['$currentParticipants', '$maxParticipants'] }
                ]
            }
        });

        const totalRegistrations = await Event.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$currentParticipants' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalEvents,
                upcomingEvents,
                pastEvents,
                eventsWithOpenRegistration,
                totalRegistrations: totalRegistrations[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Get public events statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching events statistics',
            error: error.message
        });
    }
};
// Unregister from event
exports.unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const removedRegistration = await event.removeRegistration(req.user.id);

    // If registration had points awarded, deduct them using the utility function
    if (removedRegistration && removedRegistration.pointsAwarded && removedRegistration.pointsAwarded > 0) {
      await updateUserPoints(
        req.user.id,
        -removedRegistration.pointsAwarded,
        'event_registration',
        `Unregistered from event: ${event.name}`,
        event._id
      );
    }

    res.json({
      success: true,
      message: 'Successfully unregistered from event'
    });

  } catch (error) {
    console.error('Event unregistration error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// Get user's registered events
exports.getUserRegisteredEvents = async (req, res) => {
  try {
    const events = await Event.find({
      'registrations.userId': req.user.id,
      isActive: true
    })
    .sort({ date: 1 })
    .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user events',
      error: error.message
    });
  }
};

// Create event (Admin only)
exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user.id
    };

    const event = new Event(eventData);
    await event.save();

    await event.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating event',
      error: error.message
    });
  }
};

// Update event (Admin only)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating event',
      error: error.message
    });
  }
};

// Delete event (Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: error.message
    });
  }
};

// Get all events (Admin only)
exports.getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, upcoming } = req.query;
    
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
    }

    const events = await Event.find(query)
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('registrations.userId', 'name email');

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// Get event registrations (Admin only)
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.userId', 'name email phone school');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: {
        event: {
          name: event.name,
          date: event.date,
          location: event.location
        },
        registrations: event.registrations,
        totalRegistrations: event.registrations.length
      }
    });
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Confirm attendance (Admin only)
exports.confirmAttendance = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registration = event.registrations.id(req.params.registrationId);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    registration.attended = true;
    registration.attendanceDate = new Date();
    
    await event.save();

    res.json({
      success: true,
      message: 'Attendance confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm attendance error:', error);
    res.status(400).json({
      success: false,
      message: 'Error confirming attendance',
      error: error.message
    });
  }
};
// Add this method to eventController.js
// Add this method to the eventController.js
exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { attendanceData } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Bulk attendance update for event:', event.name);
    console.log('Attendance data received:', attendanceData);

    // Update attendance for each user
    for (const attendance of attendanceData) {
      const registration = event.registrations.find(reg => {
        // Handle both string userId and object userId
        const regUserId = reg.userId.toString ? reg.userId.toString() : reg.userId;
        const attUserId = attendance.userId._id ? attendance.userId._id.toString() : attendance.userId.toString();
        return regUserId === attUserId;
      });
      
      if (registration) {
        registration.attended = attendance.attended;
        registration.attendanceDate = attendance.attended ? new Date() : null;
        console.log(`Updated attendance for user ${attendance.userId._id || attendance.userId}: ${attendance.attended}`);
      } else {
        console.log(`Registration not found for user: ${attendance.userId._id || attendance.userId}`);
      }
    }

    await event.save();

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: {
        updatedCount: attendanceData.length
      }
    });

  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};