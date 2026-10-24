const express = require('express');
const ctrl = require('../controllers/courseController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin'), ctrl.list);
router.get('/mine', requireRole('faculty', 'student'), ctrl.mine); // above "/:id"
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;