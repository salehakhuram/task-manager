const express = require('express');
const { getDashboard, getCalendarEvents } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getDashboard);
router.get('/calendar', getCalendarEvents);

module.exports = router;
