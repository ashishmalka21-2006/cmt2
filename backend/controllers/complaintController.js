const Complaint = require('../models/Complaint');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { createNotification } = require('../utils/notificationHelper');
const sendEmail = require('../utils/sendEmail');

// Helper to delete attachments from disk
const deleteFile = (fileStr) => {
  const filePath = path.join(__dirname, '../', fileStr);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Failed to delete file ${fileStr}: ${err.message}`);
    }
  }
};

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (User only)
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments.push('uploads/' + file.filename);
      });
    }

    const complaint = await Complaint.create({
      user: req.user._id,
      createdBy: req.user._id,
      title,
      description,
      category,
      priority: priority || 'Low',
      attachments,
    });

    // 1. Dispatch real-time notification to filer
    await createNotification(
      req.user._id,
      `Your complaint ticket ${complaint.ticketId} has been successfully filed.`,
      `/complaints/${complaint._id}`
    );

    // 2. Dispatch Email notification to filer
    try {
      await sendEmail({
        to: req.user.email,
        subject: `Complaint Filed Successfully - ${complaint.ticketId}`,
        text: `Hello ${req.user.name},\n\nYour complaint ticket "${complaint.title}" has been successfully filed with Ticket ID: ${complaint.ticketId}.\n\nCategory: ${complaint.category}\nPriority: ${complaint.priority}\n\nYou can track updates and chat with our agents here: http://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub Support Team`,
      });
    } catch (emailErr) {
      console.error(`Filer email alert failed: ${emailErr.message}`);
    }

    // 3. Dispatch real-time & email notifications to Admins
    try {
      const admins = await User.find({ role: 'Admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          `New complaint ticket filed: ${complaint.ticketId} - "${complaint.title}"`,
          `/complaints/${complaint._id}`
        );
        await sendEmail({
          to: admin.email,
          subject: `[New Ticket] ${complaint.ticketId} - ${complaint.title}`,
          text: `Hello ${admin.name},\n\nA new complaint ticket has been submitted.\n\nTicket ID: ${complaint.ticketId}\nFiler: ${req.user.name} (${req.user.email})\nCategory: ${complaint.category}\nPriority: ${complaint.priority}\nDescription: ${complaint.description}\n\nView details: http://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub System`,
        });
      }
    } catch (adminErr) {
      console.error(`Admin alerts dispatch failed: ${adminErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (error) {
    // Clean up uploaded files in case of db save error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => deleteFile('uploads/' + file.filename));
    }
    next(error);
  }
};

// @desc    Get all complaints (filtered by role and query filters)
// @route   GET /api/complaints
// @access  Private (User, Agent, Admin)
const getComplaints = async (req, res, next) => {
  try {
    let query = {};

    // 1. Role-based filtering
    if (req.user.role === 'User') {
      query.user = req.user._id;
    }

    // 2. Query param filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // For agents, they might want to filter specifically by their assignments
    if (req.user.role === 'Agent' && req.query.assignedToMe === 'true') {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo === 'null' ? null : req.query.assignedTo;
    }

    // 3. Search filter (matching title or ticketId)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { ticketId: searchRegex },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint details
// @route   GET /api/complaints/:id
// @access  Private (Authorized User, Agent, Admin)
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name email');

    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Check authorization: User can only view their own
    if (
      req.user.role === 'User' &&
      complaint.user._id.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      return next(new Error('Not authorized to view this complaint'));
    }

    res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint
// @route   PUT /api/complaints/:id
// @access  Private
const updateComplaint = async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Check permissions and filter update fields based on role
    const updateData = {};

    if (req.user.role === 'User') {
      // Users can only update their own complaints
      if (complaint.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Not authorized to update this complaint'));
      }

      // Users can only edit if status is Pending
      if (complaint.status !== 'Pending') {
        res.status(400);
        return next(new Error('Cannot edit complaints that are already assigned or processing'));
      }

      // Allow users to edit details
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.priority) updateData.priority = req.body.priority;

      // Handle adding new attachments
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map((file) => 'uploads/' + file.filename);
        updateData.attachments = [...complaint.attachments, ...newAttachments];
      }
    } else {
      // Agents & Admins can update status, priority, category, and assignment
      if (req.user.role === 'Agent') {
        if (req.body.assignedTo !== undefined) {
          const targetAgent = req.body.assignedTo === 'null' ? null : req.body.assignedTo;
          // Agents can only assign to themselves (claim) or unassign themselves
          if (targetAgent && String(targetAgent) !== String(req.user._id)) {
            res.status(403);
            return next(new Error('Agents can only assign complaints to themselves'));
          }
          // Cannot claim if already assigned to someone else
          if (complaint.assignedTo && String(complaint.assignedTo) !== String(req.user._id)) {
            res.status(400);
            return next(new Error('This complaint is already assigned to another agent'));
          }
        } else {
          // If modifying status/priority/etc. without changing assignedTo, agent must be the one assigned
          if (!complaint.assignedTo || String(complaint.assignedTo) !== String(req.user._id)) {
            res.status(403);
            return next(new Error('Not authorized: This complaint is not assigned to you'));
          }
        }
      }

      if (req.body.category) updateData.category = req.body.category;
      if (req.body.priority) updateData.priority = req.body.priority;
      
      if (req.body.status) {
        updateData.status = req.body.status;
        
        // If status changed to Resolved, mark resolved time
        if (req.body.status === 'Resolved') {
          updateData.resolvedAt = Date.now();
        } else {
          // If status changes back, clear resolvedAt
          updateData.resolvedAt = null;
        }
      }

      if (req.body.assignedTo !== undefined) {
        // Can be null (unassigned) or User ID
        updateData.assignedTo = req.body.assignedTo === 'null' ? null : req.body.assignedTo;
        
        // If newly assigned and status is still Pending, move to In Progress if Agent claims it, otherwise Assigned
        if (updateData.assignedTo && complaint.status === 'Pending') {
          updateData.status = req.user.role === 'Agent' ? 'In Progress' : 'Assigned';
        }
      }
    }

    const statusChanged = req.body.status && req.body.status !== complaint.status;
    const assignedChanged = req.body.assignedTo !== undefined && req.body.assignedTo !== 'null' && String(req.body.assignedTo) !== String(complaint.assignedTo);

    complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name email');

    // Trigger Notifications & Emails
    if (statusChanged) {
      // 1. Dispatch real-time alert
      await createNotification(
        complaint.user._id,
        `Your complaint ticket ${complaint.ticketId} status was updated to "${complaint.status}"`,
        `/complaints/${complaint._id}`
      );

      // 2. Dispatch email notification
      try {
        if (complaint.status === 'Resolved') {
          await sendEmail({
            to: complaint.user.email,
            subject: `Complaint Resolved - ${complaint.ticketId}`,
            text: `Hello ${complaint.user.name},\n\nYour complaint ticket "${complaint.title}" (Ticket ID: ${complaint.ticketId}) has been successfully resolved.\n\nPlease log in to review the resolution and submit your feedback:\nhttp://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub Support Team`,
          });
        } else {
          await sendEmail({
            to: complaint.user.email,
            subject: `Complaint Status Updated - ${complaint.ticketId}`,
            text: `Hello ${complaint.user.name},\n\nYour complaint ticket "${complaint.title}" (Ticket ID: ${complaint.ticketId}) status has been updated to "${complaint.status}".\n\nYou can track details here:\nhttp://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub Team`,
          });
        }
      } catch (err) {
        console.error(`Status change email dispatch failed: ${err.message}`);
      }
    }

    if (assignedChanged && complaint.assignedTo) {
      // 1. Dispatch alerts to the Agent
      await createNotification(
        complaint.assignedTo._id,
        `You have been assigned to complaint ticket ${complaint.ticketId}`,
        `/complaints/${complaint._id}`
      );

      try {
        await sendEmail({
          to: complaint.assignedTo.email,
          subject: `[New Assignment] Complaint Ticket ${complaint.ticketId}`,
          text: `Hello ${complaint.assignedTo.name},\n\nYou have been assigned to handle complaint ticket "${complaint.title}".\n\nTicket ID: ${complaint.ticketId}\nClient: ${complaint.user.name} (${complaint.user.email})\nPriority: ${complaint.priority}\n\nView and start work here:\nhttp://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub Team`,
        });
      } catch (agentEmailErr) {
        console.error(`Agent assignment email failed: ${agentEmailErr.message}`);
      }

      // 2. Dispatch alerts to the Client
      await createNotification(
        complaint.user._id,
        `Your complaint ticket ${complaint.ticketId} has been assigned to agent ${complaint.assignedTo.name}`,
        `/complaints/${complaint._id}`
      );

      try {
        await sendEmail({
          to: complaint.user.email,
          subject: `Agent Assigned to Your Complaint - ${complaint.ticketId}`,
          text: `Hello ${complaint.user.name},\n\nYour complaint ticket "${complaint.title}" (Ticket ID: ${complaint.ticketId}) has been assigned to agent ${complaint.assignedTo.name} who will begin resolving your issue shortly.\n\nYou can chat with them directly here:\nhttp://localhost:5173/complaints/${complaint._id}\n\nBest regards,\nResolveHub Support Team`,
        });
      } catch (userEmailErr) {
        console.error(`User assignment email failed: ${userEmailErr.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint,
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => deleteFile('uploads/' + file.filename));
    }
    next(error);
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private (Admin, or User if Pending)
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Check authorization:
    // Admin can delete anything. Creator can delete only if status is Pending.
    const isAdmin = req.user.role === 'Admin';
    const isCreator = complaint.user.toString() === req.user._id.toString();

    if (!isAdmin) {
      if (!isCreator) {
        res.status(403);
        return next(new Error('Not authorized to delete this complaint'));
      }
      if (complaint.status !== 'Pending') {
        res.status(400);
        return next(new Error('Cannot delete complaints that are already assigned or processing'));
      }
    }

    // Delete attachments from storage first
    if (complaint.attachments && complaint.attachments.length > 0) {
      complaint.attachments.forEach((filename) => deleteFile(filename));
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to complaint log
// @route   POST /api/complaints/:id/notes
// @access  Private (Agent or Admin only)
const addComplaintNote = async (req, res, next) => {
  const { text } = req.body;

  try {
    if (!text || text.trim() === '') {
      res.status(400);
      return next(new Error('Note text is required'));
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      res.status(404);
      return next(new Error('Complaint not found'));
    }

    // Append note
    complaint.notes.push({
      text,
      addedBy: req.user._id,
    });

    await complaint.save();

    // Re-query to return populated note
    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      complaint: updatedComplaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  addComplaintNote,
};
