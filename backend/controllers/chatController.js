const Chat = require('../models/Chat');
const Complaint = require('../models/Complaint');
const { getIO } = require('../socket/socketHandler');

// @desc    Get chat history for a complaint
// @route   GET /api/chat/:complaintId
// @access  Private (Owner user, assigned agent, or admin)
const getChatMessages = async (req, res, next) => {
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
      return next(new Error('Not authorized to access chat logs for this complaint'));
    }

    const messages = await Chat.find({ complaint: complaintId })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send chat message
// @route   POST /api/chat
// @access  Private (Owner user, assigned agent, or admin)
const sendChatMessage = async (req, res, next) => {
  const { complaintId, message } = req.body;

  try {
    if (!message || message.trim() === '') {
      res.status(400);
      return next(new Error('Message content is required'));
    }

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
      return next(new Error('Not authorized to send messages in this chat'));
    }

    // Enforce that tickets must be Assigned, In Progress, or Resolved (usually, if Closed, block chat)
    if (complaint.status === 'Closed') {
      res.status(400);
      return next(new Error('This complaint is closed. Conversational chat is locked.'));
    }

    // Store message
    const chat = await Chat.create({
      complaint: complaintId,
      sender: req.user._id,
      message,
    });

    // Populate sender details
    await chat.populate('sender', 'name role');

    // Broadcast message to the socket room in real-time
    try {
      const io = getIO();
      io.to(complaintId).emit('receive_message', chat);
    } catch (socketError) {
      console.error(`Real-time socket emit failed: ${socketError.message}`);
    }

    // Trigger Notifications for the counterparty
    const { createNotification } = require('../utils/notificationHelper');
    const recipientId = isOwner ? complaint.assignedTo : complaint.user;
    if (recipientId) {
      const displayMsg = message.length > 30 ? message.slice(0, 30) + '...' : message;
      await createNotification(
        recipientId,
        `New chat message in ticket ${complaint.ticketId}: "${displayMsg}"`,
        `/complaints/${complaint._id}`
      );
    }

    res.status(201).json({
      success: true,
      message: chat,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatMessages,
  sendChatMessage,
};
