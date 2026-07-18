const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a complaint chat room
    socket.on('join_room', (complaintId) => {
      socket.join(complaintId);
      console.log(`User ${socket.id} joined room: ${complaintId}`);
    });

    // Join a user notification room
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
      console.log(`User socket ${socket.id} joined notification room: ${userId}`);
    });

    // Listen for chat messages
    socket.on('send_message', (data) => {
      // data: { complaintId, senderId, senderName, message, createdAt }
      io.to(data.complaintId).emit('receive_message', data);
    });

    // Notify agent/user of complaint status updates
    socket.on('complaint_status_update', (data) => {
      // data: { complaintId, status, updatedBy }
      io.to(data.complaintId).emit('status_updated', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
