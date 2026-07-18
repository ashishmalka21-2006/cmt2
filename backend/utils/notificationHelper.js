const Notification = require('../models/Notification');
const { getIO } = require('../socket/socketHandler');

const createNotification = async (userId, text, link = '') => {
  try {
    const notification = await Notification.create({
      user: userId,
      text,
      link,
    });

    // Broadcast in real-time if Socket.io is running
    try {
      const io = getIO();
      // Emit directly to the user's room (named by their userId)
      io.to(userId.toString()).emit('receive_notification', notification);
    } catch (socketErr) {
      // socket.io not initialized yet or not running (safely ignore in local offline/seeding tests)
    }

    return notification;
  } catch (error) {
    console.error(`Failed to create notification: ${error.message}`);
    return null;
  }
};

module.exports = {
  createNotification,
};
