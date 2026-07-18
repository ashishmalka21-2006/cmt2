const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// @desc    Get Admin Dashboard Analytics
// @route   GET /api/analytics/admin-dashboard
// @access  Private (Admin only)
const getAdminDashboardData = async (req, res, next) => {
  try {
    // 1. Counts for Cards
    const totalUsers = await User.countDocuments({ role: 'User' });
    const totalAgents = await User.countDocuments({ role: 'Agent' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const resolvedComplaints = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });

    // 2. Monthly Complaints (past 6 months)
    const monthlyStats = await Complaint.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]);

    const monthsNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyComplaints = monthlyStats.map((stat) => {
      const year = stat._id.year;
      const monthIdx = stat._id.month - 1;
      const label = `${monthsNames[monthIdx]} ${year}`;
      return {
        label,
        count: stat.count,
      };
    });

    // 3. Category-wise Complaints
    const categoryStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryComplaints = categoryStats.map((stat) => ({
      category: stat._id,
      count: stat.count,
    }));

    // Ensure all main categories exist in the list
    ['Technical', 'Billing', 'Service', 'Other'].forEach((cat) => {
      if (!categoryComplaints.some((c) => c.category === cat)) {
        categoryComplaints.push({ category: cat, count: 0 });
      }
    });

    // 4. Agent Performance (tickets assigned, resolved, and avg satisfaction feedback rating)
    const agentStats = await Complaint.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $lookup: {
          from: 'feedbacks',
          localField: '_id',
          foreignField: 'complaint',
          as: 'feedbackDoc',
        },
      },
      {
        $unwind: {
          path: '$feedbackDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          totalAssigned: { $sum: 1 },
          resolvedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0],
            },
          },
          averageRating: { $avg: '$feedbackDoc.rating' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agentInfo',
        },
      },
      { $unwind: '$agentInfo' },
      {
        $project: {
          name: '$agentInfo.name',
          email: '$agentInfo.email',
          totalAssigned: 1,
          resolvedCount: 1,
          averageRating: { $ifNull: [{ $round: ['$averageRating', 2] }, 0] },
        },
      },
    ]);

    // Add back any agents who have 0 assignments
    const allAgentsList = await User.find({ role: 'Agent' }).select('name email');
    const agentPerformance = allAgentsList.map((agent) => {
      const match = agentStats.find((s) => s._id.toString() === agent._id.toString());
      if (match) {
        return match;
      }
      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        totalAssigned: 0,
        resolvedCount: 0,
        averageRating: 0,
      };
    });

    // 5. Recent Activities (fetch system notifications)
    const recentActivities = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name role');

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalUsers,
          totalAgents,
          pendingComplaints,
          resolvedComplaints,
        },
        monthlyComplaints,
        categoryComplaints,
        agentPerformance,
        recentActivities,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Admin Analytics & Report Summary
// @route   GET /api/analytics/report-data
// @access  Private (Admin only)
const getAdminReportData = async (req, res, next) => {
  try {
    // 1. Core Average Resolution Time (in hours)
    const resolutionStats = await Complaint.aggregate([
      { $match: { status: { $in: ['Resolved', 'Closed'] }, resolvedAt: { $ne: null } } },
      {
        $project: {
          timeHrs: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60 * 60, // ms to hours
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTimeHrs: { $avg: '$timeHrs' },
        },
      },
    ]);
    const averageResolutionTimeHrs = resolutionStats.length > 0 ? parseFloat(resolutionStats[0].avgTimeHrs.toFixed(2)) : 0;

    // 2. Average User Feedback rating score
    const ratingStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 },
        },
      },
    ]);
    const averageFeedbackRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(2)) : 0;
    const totalFeedbacksCount = ratingStats.length > 0 ? ratingStats[0].totalCount : 0;

    // 3. Category Detailed analysis (Total, Resolved, Avg Resolution Time, Avg Feedback)
    const categoryAnalysis = await Complaint.aggregate([
      {
        $lookup: {
          from: 'feedbacks',
          localField: '_id',
          foreignField: 'complaint',
          as: 'feedbackDoc',
        },
      },
      {
        $unwind: {
          path: '$feedbackDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          category: 1,
          status: 1,
          resolutionTimeHrs: {
            $cond: [
              { $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $ne: ['$resolvedAt', null] }] },
              { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] },
              null,
            ],
          },
          rating: '$feedbackDoc.rating',
        },
      },
      {
        $group: {
          _id: '$category',
          totalCount: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
          },
          avgResolutionTimeHrs: { $avg: '$resolutionTimeHrs' },
          avgRating: { $avg: '$rating' },
        },
      },
      {
        $project: {
          category: '$_id',
          totalCount: 1,
          resolvedCount: 1,
          avgResolutionTimeHrs: { $ifNull: [{ $round: ['$avgResolutionTimeHrs', 2] }, 0] },
          avgRating: { $ifNull: [{ $round: ['$avgRating', 2] }, 0] },
        },
      },
    ]);

    // Ensure all main categories are represented
    const mainCategories = ['Technical', 'Billing', 'Service', 'Other'];
    const categoryResults = mainCategories.map((cat) => {
      const match = categoryAnalysis.find((c) => c.category === cat);
      if (match) return match;
      return {
        category: cat,
        totalCount: 0,
        resolvedCount: 0,
        avgResolutionTimeHrs: 0,
        avgRating: 0,
      };
    });

    // 4. Monthly trend
    const monthlyStats = await Complaint.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]);
    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyComplaints = monthlyStats.map((stat) => {
      const label = `${monthsNames[stat._id.month - 1]} ${stat._id.year}`;
      return { label, count: stat.count };
    });

    // 5. Agent Performance
    const agentStats = await Complaint.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $lookup: {
          from: 'feedbacks',
          localField: '_id',
          foreignField: 'complaint',
          as: 'feedbackDoc',
        },
      },
      {
        $unwind: {
          path: '$feedbackDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          totalAssigned: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
          },
          averageRating: { $avg: '$feedbackDoc.rating' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agentInfo',
        },
      },
      { $unwind: '$agentInfo' },
      {
        $project: {
          name: '$agentInfo.name',
          email: '$agentInfo.email',
          totalAssigned: 1,
          resolvedCount: 1,
          averageRating: { $ifNull: [{ $round: ['$averageRating', 2] }, 0] },
        },
      },
    ]);

    const allAgentsList = await User.find({ role: 'Agent' }).select('name email');
    const agentPerformance = allAgentsList.map((agent) => {
      const match = agentStats.find((s) => s._id.toString() === agent._id.toString());
      if (match) return match;
      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        totalAssigned: 0,
        resolvedCount: 0,
        averageRating: 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalComplaints: await Complaint.countDocuments(),
          averageResolutionTimeHrs,
          averageFeedbackRating,
          totalFeedbacksCount,
        },
        categoryResults,
        monthlyComplaints,
        agentPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Complaints Data to CSV
// @route   GET /api/analytics/export/csv
// @access  Private (Admin only)
const exportComplaintsCSV = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const feedbacks = await Feedback.find();
    // Index feedbacks by complaint ID for fast lookups
    const feedbackMap = {};
    feedbacks.forEach((f) => {
      feedbackMap[f.complaint.toString()] = f;
    });

    // Write CSV Headers
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel formatting
    csvContent += 'Ticket ID,Title,Category,Priority,Status,Filer Name,Filer Email,Assigned Agent,Created Date,Resolved Date,Resolution Time (Hrs),Feedback Rating,Feedback Comments\n';

    // Loop complaints and append rows
    complaints.forEach((c) => {
      const feedback = feedbackMap[c._id.toString()] || null;
      
      const ticketId = c.ticketId;
      const title = `"${c.title.replace(/"/g, '""')}"`;
      const category = c.category;
      const priority = c.priority;
      const status = c.status;
      const filerName = c.user ? c.user.name : 'Unknown';
      const filerEmail = c.user ? c.user.email : 'N/A';
      const agentName = c.assignedTo ? c.assignedTo.name : 'Unassigned';
      const createdDate = new Date(c.createdAt).toLocaleString();
      const resolvedDate = c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : 'N/A';
      const resolutionHrs = c.resolvedAt ? ((c.resolvedAt - c.createdAt) / (1000 * 60 * 60)).toFixed(2) : 'N/A';
      const rating = feedback ? feedback.rating : 'N/A';
      const comments = feedback ? `"${feedback.comments.replace(/"/g, '""')}"` : 'N/A';

      csvContent += `${ticketId},${title},${category},${priority},${status},${filerName},${filerEmail},${agentName},${createdDate},${resolvedDate},${resolutionHrs},${rating},${comments}\n`;
    });

    // Stream download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=complaints_export_report.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardData,
  getAdminReportData,
  exportComplaintsCSV,
};
