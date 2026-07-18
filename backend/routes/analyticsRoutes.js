const express = require('express');
const router = express.Router();
const {
  getAdminDashboardData,
  getAdminReportData,
  exportComplaintsCSV,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/admin-dashboard', authorize('Admin'), getAdminDashboardData);
router.get('/report-data', authorize('Admin'), getAdminReportData);
router.get('/export/csv', authorize('Admin'), exportComplaintsCSV);

module.exports = router;
