const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/requireAdmin');

router.get('/upcoming', eventController.getUpcomingEvents);
router.get('/user/registered', eventController.getUserRegisteredEvents);
router.get('/statistics', eventController.getEventsStatisticsPublic);
router.get('/:id', eventController.getEventById);

router.use(auth.protect);

router.post('/:id/register', eventController.registerForEvent);
router.delete('/:id/unregister', eventController.unregisterFromEvent);

router.use(adminAuth);

router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);
router.get('/admin/all', eventController.getAllEvents);
router.get('/admin/statistics', eventController.getEventsStatistics); // NEW ROUTE
router.get('/:id/registrations', eventController.getEventRegistrations);
router.post('/:id/registrations/:registrationId/confirm', eventController.confirmAttendance);
router.post('/:id/attendance/bulk', eventController.bulkMarkAttendance);


module.exports = router;