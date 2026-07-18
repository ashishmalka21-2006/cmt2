const express = require('express');
const router = express.Router();
const { getChatMessages, sendChatMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', sendChatMessage);
router.get('/:complaintId', getChatMessages);

module.exports = router;
