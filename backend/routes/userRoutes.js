const express = require('express');
const router = express.Router();
const { getUserProfile, getAdminOnlyData, getAgents } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/profile', protect, getUserProfile);
router.get('/admin-only', protect, authorize('Admin'), getAdminOnlyData);
router.get('/agents', protect, authorize('Agent', 'Admin'), getAgents);

module.exports = router;
