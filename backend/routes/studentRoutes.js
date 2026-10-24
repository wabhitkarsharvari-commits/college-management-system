
const express = require('express');
const ctrl = require('../controllers/studentController');
const dashboardCtrl = require('../controllers/studentDashboardController');
const resumeCtrl = require('../controllers/resumeController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole('admin', 'faculty'), ctrl.list);

// Student profile
router.get('/me', requireRole('student'), ctrl.getMe);

// Student dashboard endpoints
router.get('/attendance', requireRole('student'), dashboardCtrl.attendance);
router.get('/marks', requireRole('student'), dashboardCtrl.marks);
router.get('/placements', requireRole('student'), dashboardCtrl.placements);
router.get('/applications', requireRole('student'), dashboardCtrl.applications);
router.post('/applications', requireRole('student'), dashboardCtrl.apply);

// Resume builder
router.get('/resume',  requireRole('student'), resumeCtrl.getResume);
router.put('/resume',  requireRole('student'), resumeCtrl.saveResume);

// Existing admin routes — unchanged
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
