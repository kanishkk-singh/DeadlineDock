const express = require('express');
const router = express.Router();
const TasksController = require('../controllers/tasksController');
const authMiddleware = require('../middleware/auth');

// All task routes require auth
router.use(authMiddleware);

router.get('/',           TasksController.getAll);
router.post('/',          TasksController.create);
router.patch('/:id',      TasksController.update);
router.delete('/:id',     TasksController.delete);
router.post('/reorder',   TasksController.reorder);
router.get('/ai-suggest', TasksController.aiSuggest);

module.exports = router;
