const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  toggleComplete,
  deleteTask,
  getCategories,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/categories/list', getCategories);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.patch('/:id/toggle', toggleComplete);

module.exports = router;
