const express = require('express');
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All session routes require authentication
router.use(authMiddleware);

router.get('/', sessionController.getSession);
router.put('/', sessionController.saveSession);
router.delete('/', sessionController.clearSession);

module.exports = router;
