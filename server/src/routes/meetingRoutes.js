const express = require('express');
const {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getMeetings).post(createMeeting);
router.route('/:id').get(getMeeting).put(updateMeeting).delete(deleteMeeting);

module.exports = router;
