const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getFeedbackByComplaintId,
  getFeedbackStats,
  getMyFeedbackHistory,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Submit feedback (accessible to clients who own the ticket)
router.post('/', submitFeedback);

// View average stats (accessible to Admins only)
router.get('/stats', authorize('Admin'), getFeedbackStats);

// Get my feedback history (must be before :complaintId)
router.get('/my/history', getMyFeedbackHistory);

// View feedback for a specific complaint (accessible to Owner, Agent, or Admin)
router.get('/:complaintId', getFeedbackByComplaintId);

module.exports = router;
