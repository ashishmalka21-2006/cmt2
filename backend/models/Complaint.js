const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A complaint must be associated with a user'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A complaint must be associated with a creator'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a complaint title'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      enum: {
        values: ['Technical', 'Billing', 'Service', 'Other'],
        message: '{VALUE} is not a valid category. Choose from Technical, Billing, Service, or Other.',
      },
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid priority. Choose Low, Medium, or High.',
      },
      default: 'Low',
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
        message: '{VALUE} is not a valid status.',
      },
      default: 'Pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attachments: [
      {
        type: String, // Filenames or URLs for uploads
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    notes: [
      {
        text: {
          type: String,
          required: [true, 'Note text cannot be empty'],
          trim: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Note must have an author'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto-generate a unique ticket ID before validation
complaintSchema.pre('validate', function (next) {
  if (!this.ticketId) {
    const prefix = 'TKT';
    const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    this.ticketId = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
