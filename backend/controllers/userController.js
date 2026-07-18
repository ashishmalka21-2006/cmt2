const User = require('../models/User');

// @desc    Get user profile details
// @route   GET /api/users/profile
// @access  Private (Any authenticated user)
const getUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401);
      return next(new Error('User not found'));
    }
    
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Admin only test data
// @route   GET /api/users/admin-only
// @access  Private (Admin role only)
const getAdminOnlyData = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Access granted. Welcome to the Admin Restricted Area.',
      timestamp: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all agents
// @route   GET /api/users/agents
// @access  Private (Agent or Admin)
const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'Agent' }).select('name email');
    res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  getAdminOnlyData,
  getAgents,
};
