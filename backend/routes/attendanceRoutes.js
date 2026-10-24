
const express = require('express');
const ctrl = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('faculty'));

router.get('/course/:courseId', ctrl.list);
router.post('/', ctrl.save);

module.exports = router;
