const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  addComplaintNote,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createComplaintValidator,
  updateComplaintValidator,
} = require('../validators/complaintValidators');

// Protect all routes in this router
router.use(protect);

router
  .route('/')
  .post(authorize('User'), upload.array('attachments', 5), createComplaintValidator, createComplaint)
  .get(getComplaints);

router
  .route('/:id')
  .get(getComplaintById)
  .put(upload.array('attachments', 5), updateComplaintValidator, updateComplaint)
  .delete(deleteComplaint);

router.post('/:id/notes', protect, authorize('Agent', 'Admin'), addComplaintNote);

module.exports = router;
