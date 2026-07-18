const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');

// @desc    Submit feedback for a complaint
// @route   POST /api/feedback
// @access  Private (Owner user only)
const submitFeedback = async (req, res, next) => {
  const { complaintId, rating, comments } = req.body;

  try {
    if (!complaintId) {
      res.status(400);
      return next(new Error('Complaint ID is required'));
    }

    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      return next(new Error('Rating must be an integer between 1 and 5'));
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Owner validation: only the user who submitted the ticket can provide feedback
    if (complaint.user.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('Only the owner of the complaint can submit feedback'));
    }

    // Status validation: must be Resolved or Closed
    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      res.status(400);
      return next(new Error('Feedback can only be submitted for Resolved or Closed complaints'));
    }

    // Check if feedback already exists for this complaint
    const existingFeedback = await Feedback.findOne({ complaint: complaintId });
    if (existingFeedback) {
      res.status(400);
      return next(new Error('Feedback has already been submitted for this complaint'));
    }

    const feedback = await Feedback.create({
      complaint: complaintId,
      user: req.user._id,
      rating,
      comments,
    });

    // Trigger notification to the assigned agent
    const { createNotification } = require('../utils/notificationHelper');
    if (complaint.assignedTo) {
      await createNotification(
        complaint.assignedTo,
        `New client rating left on resolved ticket ${complaint.ticketId}: ${rating} stars`,
        `/complaints/${complaint._id}`
      );
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for a specific complaint
// @route   GET /api/feedback/:complaintId
// @access  Private (Owner user, assigned agent, or admin)
const getFeedbackByComplaintId = async (req, res, next) => {
  const { complaintId } = req.params;

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Authorization checks
    const isAdmin = req.user.role === 'Admin';
    const isOwner = complaint.user.toString() === req.user._id.toString();
    const isAssignedAgent = complaint.assignedTo && complaint.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner && !isAssignedAgent) {
      res.status(403);
      return next(new Error('Not authorized to view feedback for this complaint'));
    }

    const feedback = await Feedback.findOne({ complaint: complaintId })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated feedback stats
// @route   GET /api/feedback/stats
// @access  Private (Admin only)
const getFeedbackStats = async (req, res, next) => {
  try {
    // 1. Overall stats
    const overallStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const averageRating = overallStats.length > 0 ? parseFloat(overallStats[0].averageRating.toFixed(2)) : 0;
    const totalRatings = overallStats.length > 0 ? overallStats[0].totalRatings : 0;

    // 2. Rating distribution (1 to 5)
    const distributionStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionStats.forEach((stat) => {
      distribution[stat._id] = stat.count;
    });

    // 3. Category ratings via join with complaints
    const categoryStats = await Feedback.aggregate([
      {
        $lookup: {
          from: 'complaints',
          localField: 'complaint',
          foreignField: '_id',
          as: 'complaintDetails',
        },
      },
      { $unwind: '$complaintDetails' },
      {
        $group: {
          _id: '$complaintDetails.category',
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryRatings = categoryStats.map((stat) => ({
      category: stat._id,
      averageRating: parseFloat(stat.averageRating.toFixed(2)),
      count: stat.count,
    }));

    res.status(200).json({
      success: true,
      stats: {
        averageRating,
        totalRatings,
        distribution,
        categoryRatings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my feedback history (for customers)
// @route   GET /api/feedback/my/history
// @access  Private
const getMyFeedbackHistory = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user._id })
      .populate('complaint', 'ticketId title status category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByComplaintId,
  getFeedbackStats,
  getMyFeedbackHistory,
};
