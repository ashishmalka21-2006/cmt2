const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Chat message must belong to a complaint'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Chat message must have a sender'],
    },
    message: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster retrieval of chat logs sorted by creation date per complaint
chatSchema.index({ complaint: 1, createdAt: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
