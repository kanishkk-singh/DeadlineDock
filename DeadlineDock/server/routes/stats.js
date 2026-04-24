const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/',           StatsController.get);
router.post('/award',     StatsController.award);
router.patch('/',         StatsController.update);
router.get('/analytics',  StatsController.analytics);

module.exports = router;
