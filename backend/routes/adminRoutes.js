const express = require('express');
const ctrl = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/stats', ctrl.stats);
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.saveSettings);

module.exports = router;
